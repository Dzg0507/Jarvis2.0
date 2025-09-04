import 'dotenv/config';

export const config = {
    server: {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    },
    ai: {
        apiKey: process.env.API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
        // Using a Google Generative AI model
        modelName: process.env.AI_MODEL_NAME || 'gemini-1.5-flash',
        // Removing the baseURL that points to Together AI
    },
    mcp: {
        serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:8080',
    },
    stableDiffusion: {
        enabled: process.env.SD_ENABLED === 'true',
        serverUrl: process.env.SD_SERVER_URL || 'http://localhost:5001',
        preload: process.env.SD_PRELOAD === 'true',
        fallbackToOpenAI: process.env.SD_FALLBACK_OPENAI === 'true',
        priority: process.env.SD_PRIORITY ? parseInt(process.env.SD_PRIORITY, 10) : 1,
        maxRetries: process.env.SD_MAX_RETRIES ? parseInt(process.env.SD_MAX_RETRIES, 10) : 2,
        healthTimeout: process.env.SD_HEALTH_TIMEOUT ? parseInt(process.env.SD_HEALTH_TIMEOUT, 10) : 3000,
        forceStableDiffusion: process.env.SD_FORCE_ONLY === 'true'
    }
};

if (!config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set. Please add it to your .env file.");
}