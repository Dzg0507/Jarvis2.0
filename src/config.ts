import 'dotenv/config';

export const config = {
    server: {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    },
    ai: {
        apiKey: process.env.API_KEY,
        // Using a Google Generative AI model
        modelName: process.env.AI_MODEL_NAME || 'gemini-1.5-flash',
        // Removing the baseURL that points to Together AI
    },
    mcp: {
        serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:8080/mcp',
    }
};

if (!config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set. Please add it to your .env file.");
}