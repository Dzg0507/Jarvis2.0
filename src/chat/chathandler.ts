import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import { Request, Response } from 'express';
import { dynamicJarvisContextPromise } from './mcp-client.js';
import { config } from '../config.js';
import fetch from 'node-fetch';
import { promises as fs } from 'fs'; // Added
import path from 'path'; // Added

const chatHistoryFile = path.join(process.cwd(), 'chat_history.txt'); // Added

if (!config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set");
}
const genAI = new GoogleGenerativeAI(config.ai.apiKey);
const model = genAI.getGenerativeModel({ model: config.ai.modelName as string });
const MCP_SERVER_URL = config.mcp.serverUrl;

let chat: ChatSession | null = null;
let dynamicToolsContext: string | null = null;
let currentPersonaPrompt: string | null = null;

// This promise now only resolves with the tool definitions
dynamicJarvisContextPromise.then((context: string) => {
    dynamicToolsContext = context;
    console.log('[ChatHandler] Tool context loaded.');
});

// This function creates a new chat session with a specific persona
async function initializeChatWithPersona(personaPrompt: string) {
    if (!dynamicToolsContext) {
        throw new Error("Tool context is not available yet.");
    }
    // Combine the selected persona prompt with the tool definitions
    const fullSystemPrompt = `${personaPrompt}\n\n# AVAILABLE REAL TOOLS (USE THEM):\n${dynamicToolsContext}`;

    chat = model.startChat({
        history: [{ role: 'user', parts: [{ text: fullSystemPrompt }] }, {role: 'model', parts: [{text: "Understood. I am online and ready."}]}],
        generationConfig: { maxOutputTokens: 8192 },
    });
    currentPersonaPrompt = personaPrompt;
    console.log(`[ChatHandler] New chat session initialized with persona: "${personaPrompt.substring(0, 50)}..."`);
}

// Function to parse SSE stream
async function parseSSEStream(response: any): Promise<any> {
    const text = await response.text();
    const lines = text.split('\n');
    let jsonData = null;

    for (const line of lines) {
        if (line.startsWith('data: ')) {
            try {
                const data = line.substring(6).trim(); // Remove 'data: ' prefix
                if (data) {
                    jsonData = JSON.parse(data);
                    break; // We only need the first JSON data
                }
            } catch (e) {
                console.error('Failed to parse SSE data:', line, e);
            }
        }
    }

    return jsonData;
}

export async function handleChat(req: Request, res: Response) {
    if (!MCP_SERVER_URL) {
        console.error('[ChatHandler] MCP server URL not configured');
        return res.status(500).json({ error: 'MCP server not configured' });
    }

    // Wait for the tool context to be initialized
    await dynamicJarvisContextPromise;

    if (!dynamicToolsContext) {
        console.warn('[ChatHandler] Chat received before tool context was initialized.');
        return res.status(503).json({ error: 'Jarvis is still initializing tools. Please try again in a moment.' });
    }

    // Now expecting a 'persona' field from the frontend
    const { prompt, persona }: { prompt: string, persona?: string } = req.body;
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

        let finalResponse = "";
        let keepReasoning = true;
        const maxTurns = 10;
        let turns = 0;
        let currentPrompt = prompt;

        while (keepReasoning && turns < maxTurns) {
            turns++;
            const result = await (chat as ChatSession).sendMessage(currentPrompt);
            const response = result.response;
            const text = response.text().trim();

            let toolCall: any = null;
            try {
                // First, try to parse the entire response as raw JSON
                toolCall = JSON.parse(text);
            } catch (e) {
                // If that fails, look for a JSON block inside markdown
                const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (jsonMatch && jsonMatch[1]) {
                    try {
                        toolCall = JSON.parse(jsonMatch[1].trim());
                    } catch (innerError) {
                        toolCall = null;
                    }
                }
            }

            // --- ENHANCED VALIDATION HANDSHAKE ---
            if (
                toolCall &&
                typeof toolCall === 'object' &&
                !Array.isArray(toolCall) &&
                typeof toolCall.tool === 'string' &&
                typeof toolCall.parameters === 'object' &&
                toolCall.parameters !== null
            ) {
                const { tool: toolName, parameters: args } = toolCall;

                // Proper MCP JSON-RPC 2.0 request format
                const jsonRpcRequest = {
                    jsonrpc: "2.0",
                    method: "tools/call",
                    params: {
                        name: toolName,
                        arguments: args
                    },
                    id: 1 // Simple numeric ID as required by MCP spec
                };

                console.log('[ChatHandler] Sending MCP request:', JSON.stringify(jsonRpcRequest, null, 2));

                try {
                    // Create AbortController for timeout
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout for web search

                    const mcpResponse = await fetch(MCP_SERVER_URL, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json, text/event-stream'
                        },
                        body: JSON.stringify(jsonRpcRequest),
                        signal: controller.signal
                    });

                    clearTimeout(timeout);

                    if (!mcpResponse.ok) {
                        console.error('[ChatHandler] MCP server response:', mcpResponse.status, mcpResponse.statusText);
                        const responseText = await mcpResponse.text();
                        console.error('[ChatHandler] MCP response body:', responseText);
                        throw new Error(`MCP server error: ${mcpResponse.status} - ${mcpResponse.statusText}`);
                    }

                    // Check if response is SSE or JSON
                    const contentType = mcpResponse.headers.get('content-type') || '';
                    let mcpResult: any;

                    if (contentType.includes('text/event-stream')) {
                        // Parse SSE stream
                        mcpResult = await parseSSEStream(mcpResponse);
                        console.log('[ChatHandler] Parsed SSE result:', JSON.stringify(mcpResult, null, 2));
                    } else {
                        // Parse as JSON
                        mcpResult = await mcpResponse.json();
                        console.log('[ChatHandler] JSON result:', JSON.stringify(mcpResult, null, 2));
                    }

                    if (mcpResult && mcpResult.error) {
                        console.error('MCP Error:', mcpResult.error);
                        throw new Error(`Tool execution error: ${mcpResult.error.message}`);
                    }

                    // Extract the tool result from the MCP response
                    let toolResult = '';
                    if (mcpResult && mcpResult.result && mcpResult.result.content && Array.isArray(mcpResult.result.content)) {
                        toolResult = mcpResult.result.content[0]?.text || '';
                    } else if (mcpResult && mcpResult.result) {
                        toolResult = JSON.stringify(mcpResult.result);
                    } else {
                        toolResult = 'No result returned from tool';
                    }

                    try {
                        const parsedResult = JSON.parse(toolResult);
                        if (Array.isArray(parsedResult) && parsedResult[0]?.thumbnail) {
                            finalResponse = toolResult;
                            keepReasoning = false;
                            continue;
                        }
                    } catch (e) { /* Not a JSON object, continue reasoning */ }

                    currentPrompt = `Tool Result:\n${toolResult}\n\nBased on this result, provide a helpful response to the user's original request: "${prompt}"`;
                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        console.error('MCP Timeout Error: Request took too long');
                        throw new Error('Tool server timeout - please try again');
                    }
                    console.error('MCP Communication Error:', error);
                    throw new Error('Failed to communicate with tool server');
                }
            } else {
                finalResponse = text;
                keepReasoning = false;
            }
        }

        if (turns >= maxTurns) {
            finalResponse = "Sorry, I got stuck in a reasoning loop. Could you rephrase?";
        }

        res.json({ response: finalResponse });

    } catch (error) {
        console.error('[ChatHandler] Critical error:', error);
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
}