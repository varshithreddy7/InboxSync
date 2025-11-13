import { PrismaClient } from '@prisma/client';
import ragService from '../src/services/rag.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with sample emails...');

  const account1Email = process.env.IMAP_EMAIL_1 || 'account1@example.com';
  const account2Email = process.env.IMAP_EMAIL_2 || 'account2@example.com';

  const sampleEmails = [
    {
      id: 'account1-int1',
      messageId: '<msg1@gmail.com>',
      from: 'john.smith@techcorp.com',
      to: account1Email,
      subject: 'Re: Product Demo Request',
      text: 'Hi! I would love to schedule a demo. Are you available Tuesday at 2 PM? Looking forward to it!',
      date: new Date('2025-11-12T10:30:00Z'),
      folder: 'INBOX',
      account: 'account1',
      category: 'Interested',
      indexed: true,
      notified: true,
    },
    {
      id: 'account1-int2',
      messageId: '<msg2@gmail.com>',
      from: 'lisa.williams@startup.io',
      to: account1Email,
      subject: 'Interesting features!',
      text: 'Your product looks interesting. Can you tell me more about pricing? We have a team of 20 people.',
      date: new Date('2025-11-12T09:15:00Z'),
      folder: 'INBOX',
      account: 'account1',
      category: 'Interested',
      indexed: true,
      notified: true,
    },
    {
      id: 'account1-meet1',
      messageId: '<msg3@gmail.com>',
      from: 'sarah.johnson@enterprise.com',
      to: account1Email,
      subject: 'Meeting Confirmed - Nov 15',
      text: 'Perfect! I have booked our meeting for November 15th at 3 PM. Calendar invite sent!',
      date: new Date('2025-11-11T14:20:00Z'),
      folder: 'INBOX',
      account: 'account1',
      category: 'Meeting Booked',
      indexed: true,
      notified: false,
    },
    {
      id: 'account1-not1',
      messageId: '<msg5@gmail.com>',
      from: 'marketing@competitor.com',
      to: account1Email,
      subject: 'Thanks, but not right now',
      text: 'Thanks for reaching out. We are currently using a competitor and happy with it.',
      date: new Date('2025-11-10T09:15:00Z'),
      folder: 'INBOX',
      account: 'account1',
      category: 'Not Interested',
      indexed: true,
      notified: false,
    },
    {
      id: 'account1-spam1',
      messageId: '<msg7@gmail.com>',
      from: 'promo@newsletter.com',
      to: account1Email,
      subject: '50% OFF - Black Friday Sale!!!',
      text: 'URGENT! Get 50% OFF on all products! Limited time! Click here NOW!',
      date: new Date('2025-11-09T08:00:00Z'),
      folder: 'INBOX',
      account: 'account1',
      category: 'Spam',
      indexed: true,
      notified: false,
    },
    {
      id: 'account1-ooo1',
      messageId: '<msg9@gmail.com>',
      from: 'michael.davis@firm.com',
      to: account1Email,
      subject: 'Out of Office Reply',
      text: 'I am out of office until November 20th. I will respond upon my return.',
      date: new Date('2025-11-07T16:45:00Z'),
      folder: 'INBOX',
      account: 'account1',
      category: 'Out of Office',
      indexed: true,
      notified: false,
    },
  ];

  for (const email of sampleEmails) {
    await prisma.email.upsert({
      where: { id: email.id },
      update: email,
      create: email,
    });
    console.log(`✅ Created: ${email.subject}`);
  }

  console.log('🌱 Seeding complete!');

  // Training examples for RAG
  console.log('🤖 Adding RAG training data...');
  
  const trainingExamples = [
    {
      topic: 'Job Interview',
      emailBody: 'Hi, your resume has been shortlisted. When will be a good time for you to attend the technical interview?',
      suggestedReply: 'Thank you for shortlisting my profile! I am available for a technical interview. I am flexible with my schedule, so any time that works for you is great. Please let me know the date and time, and share the meeting link if possible.',
      account: 'account1',
    },
    {
      topic: 'Product Demo',
      emailBody: 'We are interested in your product. Can you provide a demo for our team?',
      suggestedReply: 'Absolutely! I would be happy to schedule a demo for your team. I have availability next week. Would Tuesday at 2 PM or Thursday at 10 AM work better for you? The demo will take about 30 minutes.',
      account: 'account1',
    },
    {
      topic: 'Partnership Proposal',
      emailBody: 'We think our companies could collaborate. Are you interested in exploring a partnership?',
      suggestedReply: 'Thank you for reaching out! A partnership sounds interesting. I would love to learn more about what you have in mind. Can we schedule a call this week to discuss the details?',
      account: 'account1',
    },
  ];

  for (const example of trainingExamples) {
    try {
      await ragService.addTrainingData(
        example.topic,
        example.emailBody,
        example.suggestedReply,
        example.account
      );
      console.log(`✅ Added training: ${example.topic}`);
    } catch (error) {
      console.error(`❌ Failed to add training: ${example.topic}`, error);
    }
  }

  console.log('🤖 RAG training data complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
