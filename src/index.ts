import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import messageRoutes from "./routes/emailRoutes";
import searchRoutes from "./routes/searchRoutes";
import aiRoutes from "./routes/aiRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import ragRoutes from "./routes/ragRoutes";
// Load environment variables
dotenv.config();

// Application Setup - Initializes Express server and configures middleware
const webApp = express();
const serverPort = process.env.PORT || 3000;

const corsOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || '']
  : ['http://localhost:5173'];

webApp.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware setup
webApp.use(express.json());

// API Routes Registration
webApp.use('/api/messages', messageRoutes);
webApp.use('/api/search', searchRoutes); 
webApp.use('/api/ai', aiRoutes);
webApp.use('/api/webhook', webhookRoutes);
webApp.use('/api/rag', ragRoutes);
// Health check endpoint - validates application availability
webApp.get('/status', (req, res) => {
    res.json({
        operational: true,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Server initialization
webApp.listen(serverPort, () => {
    console.log(`✓ Server operational on port ${serverPort}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});
