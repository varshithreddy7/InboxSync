import express, { Router } from 'express';
import emailController from '../controllers/email.controller';

// Message API Routes will defines REST endpoints for email operations
const messageRoutes: Router = express.Router();

// Retrieve all messages with filtering capabilities
messageRoutes.get('/', emailController.getEmails.bind(emailController));

export default messageRoutes;
