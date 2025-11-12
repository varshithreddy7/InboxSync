import { ImapFlow } from "imapflow";
import { EventEmitter } from "stream";
import prisma from "../config/database";
const { simpleParser } = require('mailparser');

//Interface representing parsed message data structure

export interface MailMessage {
  id: string;
  messageId: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  date: Date;
  folder: string;
  account: string;
}

// MailboxConnector will handles IMAP protocol operations and email synchronization
class MailboxConnector extends EventEmitter {
  private connections: Map<string, ImapFlow> = new Map();
  private processedMessages: Set<string> = new Set();

  //This Establishes connection to mailbox and begins synchronization
  
  async connectAccount(emailAddress: string, loginPassword: string, sessionId: string) {
    try {
      console.log(`Initiating IMAP link to: ${emailAddress}`);
      
      const mailClient = new ImapFlow({
        host: this.resolveMailProvider(emailAddress),
        port: 993,
        secure: true,
        auth: {
          user: emailAddress,
          pass: loginPassword
        }
      });

      this.connections.set(sessionId, mailClient);
      
      mailClient.on('error', (connectionErr) => {
        console.error(`Connection disrupted for session ${sessionId}:`, connectionErr.message);
        this.reinitializeConnection(sessionId, emailAddress, loginPassword);
      });

      await mailClient.connect();
      console.log(`Successfully linked to mailbox: ${emailAddress}`);

      // Checks for connection status
      await prisma.syncState.upsert({
        where: { account: sessionId },
        update: { lastSync: new Date(), status: 'idle' },
        create: {
          account: sessionId,
          lastSync: new Date(),
          status: 'idle',
        }
      });

      // Load historical messages from recent period
      await this.loadHistoricalMessages(mailClient, sessionId);

      // Activate real-time notification mechanism
      await this.activateRealtimeNotifications(mailClient, sessionId);
    } catch (error) {
      console.error("Connection initialization encountered issues:", error);
    }
  }

  //Gets messages from past 30 days and stores them
  private async loadHistoricalMessages(mailClient: ImapFlow, sessionId: string) {
    try {
      const thirtyDaysBack = new Date();
      thirtyDaysBack.setDate(thirtyDaysBack.getDate() - 30);

      // Access primary inbox
      const inboxDetails = await mailClient.mailboxOpen('INBOX');
      console.log(`Mailbox ready: ${inboxDetails.exists} stored messages available`);

      // Locate messages from past month
      const searchOutput = await mailClient.search({
        since: thirtyDaysBack,
      });
      
      const messageIds = Array.isArray(searchOutput) ? searchOutput : [];

      console.log(`Located ${messageIds.length} messages within timeframe`);
      
      if (!messageIds || messageIds.length === 0) {
        await mailClient.mailboxClose();
        return;
      }

      // Iterate through and process each message
      for await (const msg of mailClient.fetch(messageIds, { envelope: true, source: true })) {
        try {
          const parsedMsg: any = await simpleParser(msg.source);
          const recipients = Array.isArray(parsedMsg.to) 
            ? parsedMsg.to.map((r: any) => r.text).join(', ')
            : parsedMsg.to?.text || '';
          
          const msgPayload: MailMessage = {
            id: `${sessionId}-${msg.uid}`,
            messageId: parsedMsg.messageId || `${sessionId}-${msg.uid}`,
            from: parsedMsg.from?.text || "No Sender",
            to: recipients,
            subject: parsedMsg.subject || '[No Subject Line]',
            text: parsedMsg.text || '',
            html: parsedMsg.html || undefined,
            date: parsedMsg.date || new Date(),
            folder: "INBOX",
            account: sessionId,
          };

          if (!this.processedMessages.has(msgPayload.id)) {
            this.processedMessages.add(msgPayload.id);

            // Commit to database
            await prisma.email.upsert({
              where: { id: msgPayload.id },
              update: msgPayload,
              create: msgPayload,
            });

            console.log(`Archived message: "${msgPayload.subject}"`);
            this.emit('email', msgPayload);
          }
        } catch (parseErr) {
          console.error("Message processing encountered error:", parseErr);
        }
      }
      
      await mailClient.mailboxClose();
    } catch (error) {
      console.error("Historical message loading failed:", error);
    }
  }

  //Initiates monitoring for new incoming messages
  private async activateRealtimeNotifications(mailClient: ImapFlow, sessionId: string) {
    try {
      console.log(`Enabling live notifications for ${sessionId}`);

      // Listen for mailbox changes
      (mailClient as any).on('exists', async () => {
        console.log(`Mailbox activity detected for ${sessionId}`);

        const inboxDetails = await mailClient.mailboxOpen('INBOX');
        const searchOutput = await mailClient.search({ seen: false });
        const messageIds = Array.isArray(searchOutput) ? searchOutput : [];

        if (messageIds && messageIds.length > 0) {
          for await (const msg of mailClient.fetch(messageIds, { envelope: true, source: true })) {
            try {
              const parsedMsg: any = await simpleParser(msg.source);
              const recipients = Array.isArray(parsedMsg.to) 
                ? parsedMsg.to.map((r: any) => r.text).join(', ')
                : parsedMsg.to?.text || '';
              
              const msgPayload: MailMessage = {
                id: `${sessionId}-${msg.uid}`,
                messageId: parsedMsg.messageId || `${sessionId}-${msg.uid}`,
                from: parsedMsg.from?.text || 'No Sender',
                to: recipients,
                subject: parsedMsg.subject || '[No Subject Line]',
                text: parsedMsg.text || '',
                html: parsedMsg.html || undefined,
                date: parsedMsg.date || new Date(),
                folder: 'INBOX',
                account: sessionId,
              };

              if (!this.processedMessages.has(msgPayload.id)) {
                this.processedMessages.add(msgPayload.id);
                await prisma.email.create({ data: msgPayload });
                this.emit('email', msgPayload);
              }
            } catch (parseErr) {
              console.error('Real-time message parsing failed:', parseErr);
            }
          }
        }

        await mailClient.mailboxClose();
      });

      // Keep connection active
      await mailClient.idle();
    } catch (error) {
      console.error('Real-time notification activation failed:', error);
    }
  }

  //Determines IMAP server based on email domain
  private resolveMailProvider(emailAddress: string): string {
    if (emailAddress.includes('gmail.com')) return 'imap.gmail.com';
    if (emailAddress.includes('outlook.com')) return 'imap-mail.outlook.com';
    if (emailAddress.includes('yahoo.com')) return 'imap.mail.yahoo.com';
    return 'imap.gmail.com';
  }

  // Attempts to restore lost connection after delay
  private async reinitializeConnection(sessionId: string, emailAddress: string, loginPassword: string) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await this.connectAccount(emailAddress, loginPassword, sessionId);
  }

  // Terminates connection for specified session
  async closeConnection(sessionId: string) {
    const mailClient = this.connections.get(sessionId);
    if (mailClient) {
      await mailClient.logout();
      this.connections.delete(sessionId);
    }
  }
}

export default new MailboxConnector();
