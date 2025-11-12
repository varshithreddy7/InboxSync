import express, { Router } from 'express';
import searchController from '../services/search.controller';

// Search API Routes - Define all search and filtering endpoints
const searchRoutes: Router = express.Router();

// Full-text search
searchRoutes.post('/', searchController.searchEmails.bind(searchController));

// Advanced filtering
searchRoutes.post('/filter', searchController.filterEmails.bind(searchController));

// Statistics and aggregations
searchRoutes.get('/stats/:account', searchController.getStatistics.bind(searchController));

// Index existing emails to Elasticsearch
searchRoutes.post('/index-emails', searchController.indexExistingEmails.bind(searchController));


export default searchRoutes;
