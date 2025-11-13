import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class RAGService {
  // Create embedding for text using OpenAI
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw error;
    }
  }

  // Add training data with embedding
  async addTrainingData(
    topic: string,
    emailBody: string,
    suggestedReply: string,
    account: string
  ) {
    try {
      const embedding = await this.createEmbedding(emailBody);
      
      // Store embedding as vector (raw SQL for pgvector)
      const trainingData = await prisma.$executeRaw`
        INSERT INTO "TrainingData" (id, topic, "emailBody", "suggestedReply", embedding, account, "createdAt")
        VALUES (gen_random_uuid(), ${topic}, ${emailBody}, ${suggestedReply}, ${`[${embedding.join(',')}]`}::vector, ${account}, NOW())
      `;

      console.log(`Training data added: ${topic}`);
      return trainingData;
    } catch (error) {
      console.error('Error adding training data:', error);
      throw error;
    }
  }

  // Find similar training data using vector similarity (RAW SQL)
  async findSimilarTrainingData(
    emailText: string,
    account: string,
    limit: number = 3
  ): Promise<any[]> {
    try {
      const emailEmbedding = await this.createEmbedding(emailText);
      const embeddingString = `[${emailEmbedding.join(',')}]`;

      // Use raw SQL for vector similarity search
      const similar = await prisma.$queryRaw`
        SELECT 
          id, 
          topic, 
          "emailBody", 
          "suggestedReply", 
          account,
          1 - (embedding::vector <=> ${embeddingString}::vector) as similarity
        FROM "TrainingData"
        WHERE account = ${account}
        ORDER BY embedding::vector <=> ${embeddingString}::vector
        LIMIT ${limit}
      ` as any[];

      return similar;
    } catch (error) {
      console.error('Error finding similar training data:', error);
      return [];
    }
  }

  // Generate suggested reply using RAG
  async generateSuggestedReply(
    emailId: string,
    subject: string,
    emailBody: string,
    account: string
  ) {
    try {
      console.log(`RAG: Generating reply for: ${subject}`);

      // Find similar training data
      const similarData = await this.findSimilarTrainingData(emailBody, account);

      if (similarData.length === 0) {
        console.warn('No similar training data found');
        return {
          reply: 'Thank you for your email. I will get back to you soon.',
          confidence: 0.3,
        };
      }

      // Build context from similar training data
      const context = similarData
        .map((data) => `Topic: ${data.topic}\nOriginal: ${data.emailBody}\nSuggested Reply: ${data.suggestedReply}`)
        .join('\n\n---\n\n');

      // Generate reply with GPT-4o-mini using RAG context
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: `You are an expert email reply assistant. Based on the training examples below, generate a professional and contextual reply to the email.

TRAINING EXAMPLES:
${context}

Guidelines:
- Match the tone and style of the training examples
- Keep reply concise (2-3 sentences max)
- Be professional and friendly`,
          },
          {
            role: 'user',
            content: `Generate a reply to this email:\n\nSubject: ${subject}\n\nBody: ${emailBody}`,
          },
        ],
      });

      const suggestedReply = response.choices[0].message.content || 'Unable to generate reply';

      // Store suggested reply using raw SQL to avoid Prisma client issues
      await prisma.$executeRaw`
        INSERT INTO "SuggestedReply" (id, "emailId", subject, reply, confidence, "createdAt")
        VALUES (gen_random_uuid(), ${emailId}, ${subject}, ${suggestedReply}, ${0.85}, NOW())
      `;

      console.log(`Reply generated`);

      return {
        reply: suggestedReply,
        confidence: 0.85,
      };
    } catch (error) {
      console.error('Error generating reply:', error);
      return {
        reply: 'Unable to generate reply at this time.',
        confidence: 0,
      };
    }
  }

  // Get suggested reply for email
  async getSuggestedReply(emailId: string) {
    try {
      const result = await prisma.$queryRaw`
        SELECT id, "emailId", subject, reply, confidence, "createdAt"
        FROM "SuggestedReply"
        WHERE "emailId" = ${emailId}
        ORDER BY "createdAt" DESC
        LIMIT 1
      ` as any[];
      
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error getting suggested reply:', error);
      return null;
    }
  }
}

export default new RAGService();