"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
exports.config = {
    server: {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    },
    ai: {
        apiKey: process.env.API_KEY,
        modelName: process.env.AI_MODEL_NAME || 'gemini-1.5-flash',
        openaiApiKey: process.env.OPENAI_API_KEY,
    },
    mcp: {
        serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:8080',
    },
    stableDiffusion: {
        serverUrl: process.env.SD_SERVER_URL || 'http://localhost:5001',
        enabled: process.env.SD_ENABLED !== 'false',
        preload: process.env.SD_PRELOAD === 'true',
        fallbackToOpenAI: process.env.SD_FALLBACK_OPENAI === 'true',
        priority: parseInt(process.env.SD_PRIORITY || '1'),
        maxRetries: parseInt(process.env.SD_MAX_RETRIES || '3'),
        healthCheckTimeout: parseInt(process.env.SD_HEALTH_TIMEOUT || '5000'),
        forceStableDiffusion: process.env.SD_FORCE_ONLY === 'true',
    }
};
if (!exports.config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set. Please add it to your .env file.");
}
if (!exports.config.ai.openaiApiKey) {
    console.warn("OPENAI_API_KEY environment variable not set. Image generation tool will not be available.");
}
