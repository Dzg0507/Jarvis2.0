import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../types/errors.js';

export const chatRequestSchema = z.object({
  prompt: z.string()
    .min(1, "Prompt cannot be empty")
    .max(10000, "Prompt too long")
    .refine(val => val.trim().length > 0, "Prompt cannot be only whitespace"),
  persona: z.string().optional(),
});

export const toolCallSchema = z.object({
  tool: z.string().min(1),
  parameters: z.record(z.any()),
});

export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        const validationError = new ValidationError(firstError.path.join('.'), firstError.message);
        return res.status(validationError.statusCode).json({
          error: validationError.message,
          code: validationError.code,
          details: validationError.details
        });
      }
      next(error);
    }
  };
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .trim();
}