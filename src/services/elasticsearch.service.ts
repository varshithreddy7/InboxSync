import { Client } from '@elastic/elasticsearch';

// ElasticsearchIndexer - Handles email indexing and full-text search
class ElasticsearchIndexer {
  private client: Client;
  private indexName = 'emails';

  constructor() {
    const elasticSearchUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

    this.client = new Client({
      node: elasticSearchUrl,
      requestTimeout: 30000,
    });

    this.initializeIndex();
  }

  // Initialize Elasticsearch index with proper mapping
  private async initializeIndex() {
    try {
      const indexExists = await this.client.indices.exists({ index: this.indexName });

      if (!indexExists) {
        console.log(`Creating Elasticsearch index: ${this.indexName}`);

        await (this.client.indices.create as any)({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                messageId: { type: 'keyword' },
                from: { type: 'text', analyzer: 'standard' },
                to: { type: 'text', analyzer: 'standard' },
                subject: { type: 'text', analyzer: 'standard' },
                text: { type: 'text', analyzer: 'standard' },
                html: { type: 'text', analyzer: 'standard' },
                date: { type: 'date' },
                folder: { type: 'keyword' },
                account: { type: 'keyword' },
                category: { type: 'keyword' },
                indexed: { type: 'boolean' },
                notified: { type: 'boolean' },
                createdAt: { type: 'date' },
              },
            },
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
            },
          },
        });

        console.log(`Elasticsearch index created: ${this.indexName}`);
      } else {
        console.log(`Elasticsearch index exists: ${this.indexName}`);
      }
    } catch (error) {
      console.error('Failed to initialize Elasticsearch index:', error);
    }
  }

  // Index a single email
  async indexEmail(emailData: any) {
    try {
      await (this.client.index as any)({
        index: this.indexName,
        id: emailData.id,
        body: emailData,
      });

      console.log(`Indexed email: ${emailData.subject}`);
    } catch (error) {
      console.error('Error indexing email:', error);
    }
  }

  // Bulk index multiple emails
  async bulkIndexEmails(emails: any[]) {
    try {
      const bulkBody = emails.flatMap((email) => [
        { index: { _index: this.indexName, _id: email.id } },
        email,
      ]);

      const response = await (this.client.bulk as any)({ body: bulkBody });

      if ((response as any).errors) {
        console.error('Some emails failed to index');
      }

      console.log(`Bulk indexed ${emails.length} emails`);
      return response;
    } catch (error) {
      console.error('Error bulk indexing emails:', error);
    }
  }

  // Search emails with multi-field full-text search
  async searchEmails(
    searchQuery: string,
    filters: {
      account?: string;
      folder?: string;
      category?: string;
      from?: string;
      dateStart?: Date;
      dateEnd?: Date;
      limit?: number;
    }
  ) {
    try {
      const pageSize = Math.min(filters.limit || 100, 500);

      const mustClauses: any[] = [];

      if (filters.account) {
        mustClauses.push({ term: { account: filters.account } });
      }

      if (filters.folder) {
        mustClauses.push({ term: { folder: filters.folder } });
      }

      if (filters.category) {
        mustClauses.push({ term: { category: filters.category } });
      }

      if (filters.from) {
        mustClauses.push({ match: { from: filters.from } });
      }

      const dateRange: any = {};
      if (filters.dateStart) dateRange.gte = filters.dateStart;
      if (filters.dateEnd) dateRange.lte = filters.dateEnd;

      if (Object.keys(dateRange).length > 0) {
        mustClauses.push({ range: { date: dateRange } });
      }

      const query: any = {
        bool: {
          must: [
            {
              multi_match: {
                query: searchQuery,
                fields: ['subject^3', 'text^2', 'from', 'to'],
                fuzziness: 'AUTO',
              },
            },
            ...mustClauses,
          ],
        },
      };

      const response = await (this.client.search as any)({
        index: this.indexName,
        body: {
          query,
          size: pageSize,
          sort: [{ date: { order: 'desc' } }],
        },
      });

      const hits = (response as any).hits.hits.map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
      }));

      console.log(`🔍 Search found ${hits.length} results`);

      const total =
        typeof (response as any).hits.total === 'number'
          ? (response as any).hits.total
          : (response as any).hits.total?.value ?? 0;

      return {
        total,
        results: hits,
      };
    } catch (error) {
      console.error('Error searching emails:', error);
      return { total: 0, results: [] };
    }
  }

  // Advanced filter search
  async filterEmails(filters: {
    account: string;
    folder?: string;
    category?: string;
    isIndexed?: boolean;
    isNotified?: boolean;
    limit?: number;
  }) {
    try {
      const mustClauses: any[] = [{ term: { account: filters.account } }];

      if (filters.folder) {
        mustClauses.push({ term: { folder: filters.folder } });
      }

      if (filters.category) {
        mustClauses.push({ term: { category: filters.category } });
      }

      if (filters.isIndexed !== undefined) {
        mustClauses.push({ term: { indexed: filters.isIndexed } });
      }

      if (filters.isNotified !== undefined) {
        mustClauses.push({ term: { notified: filters.isNotified } });
      }

      const pageSize = Math.min(filters.limit || 100, 500);

      const response = await (this.client.search as any)({
        index: this.indexName,
        body: {
          query: { bool: { must: mustClauses } },
          size: pageSize,
          sort: [{ date: { order: 'desc' } }],
        },
      });

      const hits = (response as any).hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source,
      }));

      const total =
        typeof (response as any).hits.total === 'number'
          ? (response as any).hits.total
          : (response as any).hits.total?.value ?? 0;

      return {
        total,
        results: hits,
      };
    } catch (error) {
      console.error('Error filtering emails:', error);
      return { total: 0, results: [] };
    }
  }

  // Get aggregations (statistics)
  async getAggregations(account: string) {
    try {
      const response = await (this.client.search as any)({
        index: this.indexName,
        body: {
          query: { term: { account } },
          aggs: {
            categoryCounts: { terms: { field: 'category', size: 20 } },
            folderCounts: { terms: { field: 'folder', size: 20 } },
          },
          size: 0,
        },
      });

      return {
        categories: (response as any).aggregations?.categoryCounts?.buckets || [],
        folders: (response as any).aggregations?.folderCounts?.buckets || [],
      };
    } catch (error) {
      console.error('Error getting aggregations:', error);
      return { categories: [], folders: [] };
    }
  }

  // Delete an email from index
  async deleteEmail(emailId: string) {
    try {
      await (this.client.delete as any)({
        index: this.indexName,
        id: emailId,
      });

      console.log(`Deleted email from index: ${emailId}`);
    } catch (error) {
      console.error('Error deleting email:', error);
    }
  }
}

export default new ElasticsearchIndexer();
