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
        serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:8080/mcp',
    }
};
if (!exports.config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set. Please add it to your .env file.");
}
if (!exports.config.ai.openaiApiKey) {
    console.warn("OPENAI_API_KEY environment variable not set. Image generation tool will not be available.");
}
