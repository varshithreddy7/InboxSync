import { Request, Response } from 'express';
import webhookService from '../services/webhook.service';
import prisma from '../config/database';

// WebhookController - Handles webhook notifications and testing
class WebhookController {

  // POST /api/webhook/test, Send test webhook
  async sendTestWebhook(req: Request, res: Response) {
    try {
      console.log('Test webhook requested');

      const success = await webhookService.sendTestWebhook();

      if (success) {
        res.json({
          success: true,
          message: 'Test webhook sent successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Test webhook failed',
        });
      }
    } catch (error) {
      console.error('Test webhook error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Test webhook failed',
      });
    }
  }

  // POST /api/webhook/notify-interested, Manually trigger webhook for all Interested emails
  async notifyInterestedEmails(req: Request, res: Response) {
    try {
      const { account = 'account1' } = req.body;

      console.log(`Finding Interested emails for: ${account}`);

      // Get all Interested emails that haven't been notified
      const interestedEmails = await prisma.email.findMany({
        where: {
          account,
          category: 'Interested',
          notified: false,
        },
        take: 50,
      });

      if (interestedEmails.length === 0) {
        return res.json({
          success: true,
          message: 'No new Interested emails to notify',
          notified: 0,
        });
      }

      console.log(`Found ${interestedEmails.length} Interested emails`);

      let notifiedCount = 0;

      // Send webhook for each Interested email
      for (const email of interestedEmails) {
        const success = await webhookService.sendInterestedNotification({
          ...email,
          category: email.category || 'Unknown', 
        });

        if (success) {
          // Mark as notified
          await prisma.email.update({
            where: { id: email.id },
            data: { notified: true },
          });

          notifiedCount++;
        }
      }

      res.json({
        success: true,
        message: `Successfully sent ${notifiedCount} webhook notifications`,
        notified: notifiedCount,
        total: interestedEmails.length,
      });
    } catch (error) {
      console.error('Notify error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Notification failed',
      });
    }
  }

  // GET /api/webhook/config, Get webhook configuration
  async getConfig(req: Request, res: Response) {
    try {
      const config = webhookService.getConfig();

      res.json({
        success: true,
        config,
      });
    } catch (error) {
      console.error('Config error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get config',
      });
    }
  }

  //GET /api/webhook/stats/:account, Get webhook notification stats
  async getStats(req: Request, res: Response) {
    try {
      const { account } = req.params;

      const totalInterested = await prisma.email.count({
        where: { account, category: 'Interested' },
      });

      const notified = await prisma.email.count({
        where: { account, category: 'Interested', notified: true },
      });

      const pending = totalInterested - notified;

      res.json({
        success: true,
        account,
        stats: {
          totalInterested,
          notified,
          pending,
        },
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get stats',
      });
    }
  }
}

export default new WebhookController();
