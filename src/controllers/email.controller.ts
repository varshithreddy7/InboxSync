import { Request, Response } from 'express';
import prisma from '../config/database';

//All the email retrieval and querying operations are managed by the EmailController
class EmailController {
  
  //This Handler: Retrieve a collection of email records and it Supports query parameters for narrowing results by account and folder
  async getEmails(req: Request, res: Response) {
    try {
      const { account = 'account1', folder = 'INBOX', limit = 100 } = req.query;
      
      // This Keep pagination within sensible limits
      const resultLimit = Math.min(parseInt(limit as string) || 100, 500);
      
      console.log(`Attempting to pull messages - Source: ${account}, Location: ${folder}, Max count: ${resultLimit}`);
      
      // Query database for matching records
      const records = await prisma.email.findMany({
        where: {
          account: account as string,
          folder: folder as string,
        },
        orderBy: { date: 'desc' },
        take: resultLimit,
      });
      
      console.log(`Retrieved ${records.length} message records from storage`);
      
      res.json({
        success: true,
        total: records.length,
        items: records,
      });
    } catch (err) {
      console.error('Failed to retrieve messages:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Unable to retrieve messages',
      });
    }
  }
  
  //This Handler: Fetch a single email record by its unique identifier

  async getEmailById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID parameter must be provided',
        });
      }
      
      console.log(`Searching for message with ID: ${id}`);
      
      const record = await prisma.email.findUnique({
        where: { id },
      });
      
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Message not located',
        });
      }
      
      res.json({
        success: true,
        item: record,
      });
    } catch (err) {
      console.error('Search operation failed:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Search operation encountered an error',
      });
    }
  }
  
  //This Handler: Get aggregated data for a specific email account
  async getEmailsByAccount(req: Request, res: Response) {
    try {
      const { account } = req.params;
      
      if (!account) {
        return res.status(400).json({
          success: false,
          message: 'Account identifier is mandatory',
        });
      }
      
      console.log(`Gathering metrics for mailbox: ${account}`);
      
      const totalRecords = await prisma.email.count({
        where: { account },
      });
      
      const categorization = await prisma.email.groupBy({
        by: ['category'],
        where: { account },
        _count: true,
      });
      
      res.json({
        success: true,
        mailbox: account,
        messageCount: totalRecords,
        breakdown: categorization.map((grp) => ({
          type: grp.category || 'Unclassified',
          quantity: grp._count,
        })),
      });
    } catch (err) {
      console.error('Aggregation failed:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Aggregation operation failed',
      });
    }
  }
  
  //This Handler: Retrieve messages from a specified folder
  async getEmailsByFolder(req: Request, res: Response) {
    try {
      const { folder } = req.params;
      const { account = 'account1' } = req.query;
      
      if (!folder) {
        return res.status(400).json({
          success: false,
          message: 'Folder designation required',
        });
      }
      
      console.log(`Accessing folder: ${folder} from account: ${account}`);
      
      const records = await prisma.email.findMany({
        where: {
          folder,
          account: account as string,
        },
        orderBy: { date: 'desc' },
        take: 100,
      });
      
      res.json({
        success: true,
        folderName: folder,
        messageCount: records.length,
        items: records,
      });
    } catch (err) {
      console.error('Folder retrieval failed:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Folder access failed',
      });
    }
  }
  
  //THis Handler: Execute complex search with multiple matching criteria
  async filterEmails(req: Request, res: Response) {
    try {
      const {
        account = 'account1',
        folder,
        category,
        from,
        subject,
        startDate,
        endDate,
        limit = 100,
      } = req.body;
      
      console.log(`Executing search query on account: ${account}`);
      
      // Construct dynamic query parameters
      const conditions: any = {
        account,
      };
      
      if (folder) conditions.folder = folder;
      if (category) conditions.category = category;
      if (from) conditions.from = { contains: from, mode: 'insensitive' };
      if (subject) conditions.subject = { contains: subject, mode: 'insensitive' };
      
      // Apply temporal constraints if specified
      if (startDate || endDate) {
        conditions.date = {};
        if (startDate) conditions.date.gte = new Date(startDate);
        if (endDate) conditions.date.lte = new Date(endDate);
      }
      
      const resultLimit = Math.min(parseInt(limit) || 100, 500);
      
      const results = await prisma.email.findMany({
        where: conditions,
        orderBy: { date: 'desc' },
        take: resultLimit,
      });
      
      res.json({
        success: true,
        resultCount: results.length,
        appliedCriteria: { account, folder, category, from, subject, startDate, endDate },
        items: results,
      });
    } catch (err) {
      console.error('Search execution failed:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Search operation failed',
      });
    }
  }
  
  //This Handler: Retrieve comprehensive summary statistics
  async getStats(req: Request, res: Response) {
    try {
      const overallCount = await prisma.email.count();
      const acc1Messages = await prisma.email.count({ where: { account: 'account1' } });
      const acc2Messages = await prisma.email.count({ where: { account: 'account2' } });
      const processedCount = await prisma.email.count({ where: { indexed: true } });
      const alertCount = await prisma.email.count({ where: { notified: true } });
      
      // Gather type breakdown
      const typeBreakdown = await prisma.email.groupBy({
        by: ['category'],
        _count: true,
      });
      
      res.json({
        success: true,
        analytics: {
          overallMessages: overallCount,
          accountOneTotal: acc1Messages,
          accountTwoTotal: acc2Messages,
          processedMessages: processedCount,
          alertsGenerated: alertCount,
        },
        typeDistribution: typeBreakdown.map((entry) => ({
          type: entry.category || 'Undefined',
          count: entry._count,
        })),
      });
    } catch (err) {
      console.error('Statistics calculation failed:', err);
      res.status(500).json({
        success: false,
        message: err instanceof Error ? err.message : 'Statistics retrieval failed',
      });
    }
  }
}

export default new EmailController();
