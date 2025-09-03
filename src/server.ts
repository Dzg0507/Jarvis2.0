import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { logger } from './utils/logger';
import { rateLimiter, securityHeaders } from './middleware/security';
import { validateRequest, chatRequestSchema } from './middleware/validation.js';
import { ChatService } from './services/chat-service.js';
import { JarvisError } from './types/errors.js';

// Initialize services
const chatService = new ChatService();

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(rateLimiter());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Chat endpoint with validation
app.post('/api/chat', 
  validateRequest(chatRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await chatService.processChat(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof JarvisError) {
    logger.error('Jarvis error', { code: error.code, message: error.message, details: error.details });
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details
    });
  }

  logger.error('Unhandled error', error);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
