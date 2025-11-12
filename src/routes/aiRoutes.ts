import express, { Router } from 'express';
import aiController from '../controllers/ai.controller';

const aiRoutes: Router = express.Router();

aiRoutes.post('/', aiController.categorizingEmail.bind(aiController));
aiRoutes.post('/batch', aiController.categorizeEmailsBatch.bind(aiController));
aiRoutes.post('/auto-categorize', aiController.autoCategorizeAll.bind(aiController));
aiRoutes.get('/categories', aiController.getCategories.bind(aiController));
aiRoutes.get('/stats/:account', aiController.getCategoryStats.bind(aiController));

export default aiRoutes;
