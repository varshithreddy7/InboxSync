import axios from "axios";
import { timeStamp } from "console";

// Webhook-notifier - This will send webhook notifications for interested emails
class WebhookNotifier {
  private webhookUrl: string;
  private maxRetries = 3;
  private retryDelay = 2000; 
  constructor() {
    this.webhookUrl = process.env.WEBHOOK_URL || "";

    if (!this.webhookUrl) console.warn("WEBHOOK_URL not configured in .env");
  }

  // Sends webhook notification for interested email
  async sendInterestedNotification(emailData: {
    id: string;
    subject: string;
    from: string;
    to: string;
    text: string;
    date: Date;
    account: string;
    category: string;
  }): Promise<boolean> {
    if (!this.webhookUrl) {
      console.warn('WebhookUrl not configured Will be skipping notification');
      return false;
    }
    try {
      console.log(`Sending Notifications for intrested email: ${emailData.subject}`);

      const payload = {
        event: 'EMAIL_CATEGORIZED_INTERESTED',
        timeStamp: new Date().toISOString(),
        email: {
          id: emailData.id,
          subject: emailData.subject,
          from: emailData.from,
          to: emailData.to,
          preview: emailData.text.substring(0, 200),
          date: emailData.date,
          account: emailData.account,
          category: emailData.category,
        }
      };

      const sucess = await this.sendWithRetry(payload);
      if (sucess) {
        console.log(`Webhook has been sent sucessfully for: ${emailData.subject}`);
      } else {
        console.error(`Webhook failed after ${this.maxRetries} attempts`);
      }

      return sucess;
    } catch (error) {
      console.error(`Error sending webhook:`, error);
      return false;
    }
  }

  //Send webhook with retry logic
  private async sendWithRetry(payload: any, attempt = 1): Promise<boolean> {
    try {
      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ReachInbox-webhook/1.0',
        },
        timeout: 5000,
      });
      if (response.status >= 200 && response.status < 300) {
        console.log(`Webhook delivered (attempt ${attempt}): ${response.status}`);
        return true;
      }
      throw new Error(`Webhook returned status ${response.status}`);
    } catch (error) {
      console.error(`Webhook attempt ${attempt} failed:`, error instanceof Error ? error.message : error);

      if (attempt < this.maxRetries) {
        console.log(`Retrying in ${this.retryDelay}ms... (attempt ${attempt + 1}/${this.maxRetries})`);
        await this.delay(this.retryDelay);
        return this.sendWithRetry(payload, attempt + 1);
      }

      return false;
    }
  }
  // Delay helper for retry logic
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Send test webhook
  async sendTestWebhook(): Promise<boolean> {
    const testPayload = {
      event: 'WEBHOOK_TEST',
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook from ReachInbox',
    };

    console.log('Sending test webhook...');
    return this.sendWithRetry(testPayload);
  }

  //Get webhook configuration
  getConfig() {
    return {
      webhookUrl: this.webhookUrl ? 'configured' : 'not configured',
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
    };
  }
}

export default new WebhookNotifier();
