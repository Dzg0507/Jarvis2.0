import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  server: z.object({
    port: z.number().default(3000),
    host: z.string().default('localhost'),
  }),
  ai: z.object({
    apiKey: z.string().min(1, "API_KEY is required"),
    modelName: z.string().default('gemini-1.5-flash'),
    openaiApiKey: z.string().optional(),
    maxRetries: z.number().default(3),
    timeout: z.number().default(30000),
  }),
  mcp: z.object({
    serverUrl: z.string().url().default('http://localhost:8080'),
    timeout: z.number().default(10000),
    maxRetries: z.number().default(3),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    enableFileLogging: z.boolean().default(false),
  }),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const rawConfig = {
    server: {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
      host: process.env.HOST || 'localhost',
    },
    ai: {
      apiKey: process.env.API_KEY || '',
      modelName: process.env.AI_MODEL_NAME || 'gemini-1.5-flash',
      openaiApiKey: process.env.OPENAI_API_KEY,
      maxRetries: process.env.AI_MAX_RETRIES ? parseInt(process.env.AI_MAX_RETRIES) : 3,
      timeout: process.env.AI_TIMEOUT ? parseInt(process.env.AI_TIMEOUT) : 30000,
    },
    mcp: {
      serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:8080',
      timeout: process.env.MCP_TIMEOUT ? parseInt(process.env.MCP_TIMEOUT) : 10000,
      maxRetries: process.env.MCP_MAX_RETRIES ? parseInt(process.env.MCP_MAX_RETRIES) : 3,
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
    },
  };

  return configSchema.parse(rawConfig);
}

export const config = loadConfig();