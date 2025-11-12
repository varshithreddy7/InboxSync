import express from "express";
import dotenv from "dotenv";
import messageRoutes from "./routes/emailRoutes";
import searchRoutes from "./routes/searchRoutes";
import aiRoutes from "./routes/aiRoutes";
import webhookController from "./controllers/webhook.controller";
import webhookRoutes from "./routes/webhookRoutes";
// Load environment variables
dotenv.config();

// Application Setup - Initializes Express server and configures middleware
const webApp = express();
const serverPort = process.env.PORT || 3000;

// Middleware setup
webApp.use(express.json());

// API Routes Registration
webApp.use('/api/messages', messageRoutes);
webApp.use('/api/search', searchRoutes); 
webApp.use('/api/ai', aiRoutes);
webApp.use('/api/webhook', webhookRoutes);
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
