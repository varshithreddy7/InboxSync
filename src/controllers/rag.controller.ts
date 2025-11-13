import { Request, Response } from 'express';
import ragService from '../services/rag.service';
import prisma from '../config/database';

// RAG Controller - Handles suggested replies
class RAGController {
  // POST /api/rag/add-training, Add training data for RAG
  async addTrainingData(req: Request, res: Response) {
    try {
      const { topic, emailBody, suggestedReply, account } = req.body;

      if (!topic || !emailBody || !suggestedReply || !account) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required',
        });
      }

      const trainingData = await ragService.addTrainingData(
        topic,
        emailBody,
        suggestedReply,
        account
      );

      res.json({
        success: true,
        message: 'Training data added',
        data: trainingData,
      });
    } catch (error) {
      console.error('Error adding training data:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add training data',
      });
    }
  }

  // POST /api/rag/suggest-reply, Generate suggested reply for email
  async suggestReply(req: Request, res: Response) {
    try {
      const { emailId, subject, body, account } = req.body;

      if (!emailId || !subject || !body || !account) {
        return res.status(400).json({
          success: false,
          message: 'emailId, subject, body, and account are required',
        });
      }

      const suggestion = await ragService.generateSuggestedReply(
        emailId,
        subject,
        body,
        account
      );

      res.json({
        success: true,
        emailId,
        suggestedReply: suggestion.reply,
        confidence: suggestion.confidence,
      });
    } catch (error) {
      console.error('Error suggesting reply:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate reply',
      });
    }
  }

  //GET /api/rag/suggested-reply/:emailId, Get suggested reply for email
  async getSuggestedReply(req: Request, res: Response) {
    try {
      const { emailId } = req.params;

      const suggestedReply = await ragService.getSuggestedReply(emailId);

      if (!suggestedReply) {
        return res.json({
          success: false,
          message: 'No suggested reply found',
        });
      }

      res.json({
        success: true,
        data: suggestedReply,
      });
    } catch (error) {
      console.error('Error getting suggested reply:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get suggested reply',
      });
    }
  }

  // POST /api/rag/bulk-training, Add multiple training examples at once
  async addBulkTraining(req: Request, res: Response) {
    try {
      const { examples, account } = req.body;

      if (!Array.isArray(examples) || !account) {
        return res.status(400).json({
          success: false,
          message: 'examples array and account are required',
        });
      }

      let addedCount = 0;
      for (const example of examples) {
        try {
          await ragService.addTrainingData(
            example.topic,
            example.emailBody,
            example.suggestedReply,
            account
          );
          addedCount++;
        } catch (error) {
          console.error(`Failed to add training: ${example.topic}`);
        }
      }

      res.json({
        success: true,
        message: `Added ${addedCount} training examples`,
        added: addedCount,
        total: examples.length,
      });
    } catch (error) {
      console.error('Error adding bulk training:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add bulk training',
      });
    }
  }
}

export default new RAGController();