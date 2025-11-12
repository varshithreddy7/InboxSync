import { Request, Response } from 'express';
import aiService from '../services/ai.service';
import prisma from '../config/database';
import webhookService from '../services/webhook.service'; 

//AIController - Handles  email categorization endpoints with auto-webhook triggering
class AIController {
   //POST /api/ai/categorize,  a single email and trigger webhook if Interested
  async categorizingEmail(req: Request, res: Response) {
    try {
      const { emailId, subject, body, from } = req.body;

      if (!subject || !body || !from) {
        return res.status(400).json({
          success: false,
          message: 'Subject, body, and from are required',
        });
      }

      console.log(`AI: Categorizing email - ${emailId}`);

      const categorization = await aiService.categorizingEmail(subject, body, from);

      // Update email in database
      if (emailId) {
        await prisma.email.update({
          where: { id: emailId },
          data: { category: categorization.category },
        });

        // AUTO-TRIGGER: Send webhook if categorized as Interested
        if (categorization.category === 'Interested') {
          const email = await prisma.email.findUnique({
            where: { id: emailId },
          });

          if (email && !email.notified) {
            console.log(`Auto-triggering webhook for Interested email: ${emailId}`);
            const webhookSent = await webhookService.sendInterestedNotification({
              ...email,
              category: email.category || 'Unknown', // Ensure category is a string
            });

            if (webhookSent) {
              await prisma.email.update({
                where: { id: emailId },
                data: { notified: true },
              });
              console.log(`Webhook sent and email marked as notified`);
            }
          }
        }
      }

      res.json({
        success: true,
        emailId,
        categorization,
        webhookSent: categorization.category === 'Interested',
      });
    } catch (error) {
      console.error('Categorization error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Categorization failed',
      });
    }
  }

  //POST /api/ai/categorize-batch,  Categorize multiple emails and trigger webhooks for Interested ones
  async categorizeEmailsBatch(req: Request, res: Response) {
    try {
      const { emails } = req.body;

      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Emails array is required',
        });
      }

      console.log(`AI: Batch categorizing ${emails.length} emails`);

      const results = await aiService.categorizeEmailsBatch(emails);
      let webhooksTriggered = 0;

      // Update all emails in database
      for (const result of results) {
        const email = emails[result.id];
        if (email.id) {
          await prisma.email.update({
            where: { id: email.id },
            data: { category: result.category },
          });

          // AUTO-TRIGGER: Send webhook if Interested
          if (result.category === 'Interested') {
            const fullEmail = await prisma.email.findUnique({
              where: { id: email.id },
            });

            if (fullEmail && !fullEmail.notified) {
              const webhookSent = await webhookService.sendInterestedNotification({
                ...fullEmail,
                category: fullEmail.category || 'Unknown', // Ensure category is a string
              });
              
              if (webhookSent) {
                await prisma.email.update({
                  where: { id: email.id },
                  data: { notified: true },
                });
                webhooksTriggered++;
              }
            }
          }
        }
      }

      res.json({
        success: true,
        processed: results.length,
        webhooksTriggered,
        results,
      });
    } catch (error) {
      console.error('Batch categorization error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Batch categorization failed',
      });
    }
  }

  //POST /api/ai/auto-categorize, Auto-categorize all uncategorized emails
  async autoCategorizeAll(req: Request, res: Response) {
    try {
      const { account = 'account1' } = req.body;

      console.log(`AI: Auto-categorizing all emails for ${account}`);

      // Get uncategorized emails
      const uncategorized = await prisma.email.findMany({
        where: {
          account,
          category: null,
        },
        take: 50, // Limit to avoid timeout
      });

      if (uncategorized.length === 0) {
        return res.json({
          success: true,
          message: 'No uncategorized emails',
          processed: 0,
        });
      }

      console.log(`Processing ${uncategorized.length} uncategorized emails`);

      // Categorize each email
      let categorized = 0;
      for (const email of uncategorized) {
        try {
          const result = await aiService.categorizingEmail(
            email.subject,
            email.text,
            email.from
          );

          await prisma.email.update({
            where: { id: email.id },
            data: { category: result.category },
          });

          categorized++;
        } catch (error) {
          console.error(`Failed to categorize ${email.id}:`, error);
        }
      }

      res.json({
        success: true,
        message: `Successfully categorized ${categorized} emails`,
        processed: categorized,
        total: uncategorized.length,
      });
    } catch (error) {
      console.error('Auto-categorization error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Auto-categorization failed',
      });
    }
  }

  //GET /api/ai/categories, Get list of valid categories
  async getCategories(req: Request, res: Response) {
    try {
      const stats = aiService.getCategoryStats();

      res.json({
        success: true,
        categories: stats.categories,
        descriptions: stats.description,
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get categories',
      });
    }
  }

  //GET /api/ai/stats/:account,  Get categorization stats for account
  async getCategoryStats(req: Request, res: Response) {
    try {
      const { account } = req.params;

      if (!account) {
        return res.status(400).json({
          success: false,
          message: 'Account parameter is required',
        });
      }

      // Get category breakdown
      const stats = await prisma.email.groupBy({
        by: ['category'],
        where: { account },
        _count: true,
      });

      res.json({
        success: true,
        account,
        stats: stats.map((s) => ({
          category: s.category || 'Uncategorized',
          count: s._count,
        })),
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

export default new AIController();
