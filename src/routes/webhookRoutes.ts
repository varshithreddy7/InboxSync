import express, { Router } from 'express';
import webhookController from '../controllers/webhook.controller';

// Webhook API Routes
const webhookRoutes: Router = express.Router();

// Test webhook
webhookRoutes.post('/test', webhookController.sendTestWebhook.bind(webhookController));

// Notify all Interested emails
webhookRoutes.post('/notify-interested', webhookController.notifyInterestedEmails.bind(webhookController));

// Get webhook config
webhookRoutes.get('/config', webhookController.getConfig.bind(webhookController));

// Get notification stats
webhookRoutes.get('/stats/:account', webhookController.getStats.bind(webhookController));

export default webhookRoutes;
