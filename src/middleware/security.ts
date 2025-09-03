import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// Simple rate limiting implementation
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(windowMs: number = 15 * 60 * 1000, max: number = 100) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientIp);
    
    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientIp, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (clientData.count >= max) {
      logger.warn('Rate limit exceeded', { ip: clientIp, count: clientData.count });
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    clientData.count++;
    next();
  };
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

export function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    logger.warn('Invalid API key attempt', { ip: req.ip });
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  next();
}