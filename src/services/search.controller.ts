import { Request, Response } from 'express';
import elasticsearchService from '../services/elasticsearch.service';
import prisma from '../config/database';

// SearchController - Handles search and filtering operations
class SearchController {
  // POST /api/search , Full-text search with multi-field matching
  async searchEmails(req: Request, res: Response) {
    try {
      const { query, account = 'account1', folder, category, from, limit = 100 } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      console.log(`Searching for: "${query}" in ${account}`);

      const searchResults = await elasticsearchService.searchEmails(query, {
        account,
        folder,
        category,
        from,
        limit,
      });

      res.json({
        success: true,
        query,
        total: searchResults.total,
        results: searchResults.results,
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Search failed',
      });
    }
  }

  // POST /api/search/filter, Advanced filtering with multiple criteria
  async filterEmails(req: Request, res: Response) {
    try {
      const {
        account = 'account1',
        folder,
        category,
        isIndexed,
        isNotified,
        limit = 100,
      } = req.body;

      console.log(`Filtering emails for account: ${account}`);

      const filterResults = await elasticsearchService.filterEmails({
        account,
        folder,
        category,
        isIndexed,
        isNotified,
        limit,
      });

      res.json({
        success: true,
        total: filterResults.total,
        results: filterResults.results,
      });
    } catch (error) {
      console.error('Filter error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Filtering failed',
      });
    }
  }

  //GET /api/search/stats/:account, Get email statistics and aggregations
  async getStatistics(req: Request, res: Response) {
    try {
      const { account } = req.params;

      if (!account) {
        return res.status(400).json({
          success: false,
          message: 'Account parameter is required',
        });
      }

      console.log(`Getting statistics for account: ${account}`);

      const aggregations = await elasticsearchService.getAggregations(account);

      res.json({
        success: true,
        account,
        statistics: aggregations,
      });
    } catch (error) {
      console.error('Statistics error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Statistics retrieval failed',
      });
    }
  }

  // POST /api/search/index-emails, Index existing emails from PostgreSQL to Elasticsearch
  async indexExistingEmails(req: Request, res: Response) {
    try {
      const { account = 'account1' } = req.body;

      console.log(`Starting email indexing for ${account}`);

      // Get all emails from PostgreSQL
      const emails = await prisma.email.findMany({
        where: { account },
      });

      if (emails.length === 0) {
        return res.json({
          success: true,
          message: 'No emails to index',
          indexed: 0,
        });
      }

      // Bulk index to Elasticsearch
      await elasticsearchService.bulkIndexEmails(emails);

      // Update indexed flag in PostgreSQL
      await prisma.email.updateMany({
        where: { account },
        data: { indexed: true },
      });

      console.log(`Indexed ${emails.length} emails`);

      res.json({
        success: true,
        message: `Successfully indexed ${emails.length} emails`,
        indexed: emails.length,
      });
    } catch (error) {
      console.error('Indexing error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Indexing failed',
      });
    }
  }
}

export default new SearchController();
