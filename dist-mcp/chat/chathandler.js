"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChat = handleChat;
const generative_ai_1 = require("@google/generative-ai");
const mcp_client_js_1 = require("./mcp-client.js");
const config_js_1 = require("../config.js");
const node_fetch_1 = __importDefault(require("node-fetch"));
if (!config_js_1.config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(config_js_1.config.ai.apiKey);
const model = genAI.getGenerativeModel({ model: config_js_1.config.ai.modelName });
const MCP_SERVER_URL = config_js_1.config.mcp.serverUrl;
let chat = null;
let dynamicToolsContext = null;
let currentPersonaPrompt = null;
// This promise now only resolves with the tool definitions
mcp_client_js_1.dynamicJarvisContextPromise.then((context) => {
    dynamicToolsContext = context;
    console.log('[ChatHandler] Tool context loaded.');
});
// This function creates a new chat session with a specific persona
async function initializeChatWithPersona(personaPrompt) {
    if (!dynamicToolsContext) {
        throw new Error("Tool context is not available yet.");
    }
    // Combine the selected persona prompt with the tool definitions
    const fullSystemPrompt = `${personaPrompt}\n\n# AVAILABLE REAL TOOLS (USE THEM):\n${dynamicToolsContext}`;
    chat = model.startChat({
        history: [{ role: 'user', parts: [{ text: fullSystemPrompt }] }, { role: 'model', parts: [{ text: "Understood. I am online and ready." }] }],
        generationConfig: { maxOutputTokens: 8192 },
    });
    currentPersonaPrompt = personaPrompt;
    console.log(`[ChatHandler] New chat session initialized with persona: "${personaPrompt.substring(0, 50)}..."`);
}
async function handleChat(req, res) {
    if (!dynamicToolsContext) {
        console.warn('[ChatHandler] Chat received before tool context was initialized.');
        return res.status(503).json({ error: 'Jarvis is still initializing tools. Please try again in a moment.' });
    }
    // Now expecting a 'persona' field from the frontend
    const { prompt, persona } = req.body;
    console.log(`[ChatHandler] Received prompt: "${prompt}"`);
    if (!prompt) {
        return res.status(400).json({ error: 'No prompt provided.' });
    }
    try {
        // If the chat doesn't exist, or if the persona has changed, re-initialize the chat session
        if (!chat || (persona && persona !== currentPersonaPrompt)) {
            const newPersona = persona || 'You are a helpful AI assistant.'; // Default fallback
            await initializeChatWithPersona(newPersona);
        }
        // The reasoning loop for tool usage remains the same
        let finalResponse = "";
        let keepReasoning = true;
        const maxTurns = 10;
        let turns = 0;
        let currentPrompt = prompt;
        while (keepReasoning && turns < maxTurns) {
            turns++;
            const result = await chat.sendMessage(currentPrompt);
            const response = result.response;
            const text = response.text().trim();
            let toolCall = null;
            try {
                // First, try to parse the entire response as raw JSON
                toolCall = JSON.parse(text);
            }
            catch (e) {
                // If that fails, look for a JSON block inside markdown
                const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (jsonMatch && jsonMatch[1]) {
                    try {
                        toolCall = JSON.parse(jsonMatch[1].trim());
                    }
                    catch (innerError) {
                        // The block exists but contains invalid JSON, so we treat it as text
                        toolCall = null;
                    }
                }
            }
            if (toolCall && toolCall.tool) {
                const { tool: toolName, ...args } = toolCall;
                const jsonRpcRequest = {
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: { name: toolName, arguments: args.parameters || args },
                    id: `chat_${Date.now()}`
                };
                const mcpResponse = await (0, node_fetch_1.default)(MCP_SERVER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jsonRpcRequest)
                });
                if (!mcpResponse.ok) {
                    throw new Error(`MCP server error: ${mcpResponse.status}`);
                }
                const mcpResult = await mcpResponse.json();
                if (mcpResult.error) {
                    throw new Error(`Tool execution error: ${mcpResult.error.message}`);
                }
                const toolResult = mcpResult.result.content[0].text;
                try {
                    const parsedResult = JSON.parse(toolResult);
                    if (Array.isArray(parsedResult) && parsedResult[0]?.thumbnail) {
                        finalResponse = toolResult;
                        keepReasoning = false;
                        continue;
                    }
                }
                catch (e) { /* Not a JSON object, continue reasoning */ }
                currentPrompt = `Tool Result:\n${toolResult}\n\nBased on this result, provide a helpful response to the user's original request: "${prompt}"`;
            }
            else {
                finalResponse = text;
                keepReasoning = false;
            }
        }
        if (turns >= maxTurns) {
            finalResponse = "Sorry, I got stuck in a reasoning loop. Could you rephrase?";
        }
        res.json({ response: finalResponse });
    }
    catch (error) {
        console.error('[ChatHandler] Critical error:', error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
}
