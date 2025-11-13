import express, { Router } from 'express';
import ragController from '../controllers/rag.controller';

const ragRoutes: Router = express.Router();

ragRoutes.post('/add-training', ragController.addTrainingData.bind(ragController));
ragRoutes.post('/suggest-reply', ragController.suggestReply.bind(ragController));
ragRoutes.get('/suggested-reply/:emailId', ragController.getSuggestedReply.bind(ragController));
ragRoutes.post('/bulk-training', ragController.addBulkTraining.bind(ragController));

export default ragRoutes;