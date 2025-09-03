import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import { Request, Response } from 'express';
import { getDynamicJarvisContext, callTool } from './mcp-client.js';
import { config } from '../config.js';
import fetch from 'node-fetch';
import { promises as fs } from 'fs'; // Added
import path from 'path'; // Added
import { ToolResult, MCPResponse } from '../types/mcp.js';

const chatHistoryFile = path.join(process.cwd(), 'chat_history.txt');

if (!config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set");
}
const genAI = new GoogleGenerativeAI(config.ai.apiKey);
const model = genAI.getGenerativeModel({ model: config.ai.modelName as string });
const MCP_SERVER_URL = config.mcp.serverUrl;

let chat: ChatSession | null = null;
let dynamicToolsContext: string | null = null;
let currentPersonaPrompt: string | null = null;

// Initialize tool context
getDynamicJarvisContext().then((context: string) => {
    dynamicToolsContext = context;
    console.log('[ChatHandler] Tool context loaded.');
}).catch((error) => {
    console.error('[ChatHandler] Failed to load tool context:', error);
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
        // --- FIX IS HERE ---
        // Added temperature, topP, and topK for more stable and accurate responses.
        generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.2,
            topP: 0.9,
            topK: 40
        },
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
    console.log('[ChatHandler] Starting chat handler');

    if (!MCP_SERVER_URL) {
        console.error('[ChatHandler] MCP server URL not configured');
        return res.status(500).json({ error: 'MCP server not configured' });
    }
    console.log('[ChatHandler] MCP server URL configured:', MCP_SERVER_URL);

    console.log('[ChatHandler] Waiting for tool context...');
    try {
        // Add timeout to getDynamicJarvisContext
        const contextTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Context initialization timeout')), 10000)
        );

        await Promise.race([getDynamicJarvisContext(), contextTimeout]);
        console.log('[ChatHandler] Tool context promise resolved');
    } catch (error) {
        console.error('[ChatHandler] Error waiting for tool context:', error);
        return res.status(503).json({ error: 'Tool context initialization failed' });
    }

    if (!dynamicToolsContext) {
        console.warn('[ChatHandler] Chat received before tool context was initialized.');
        return res.status(503).json({ error: 'Jarvis is still initializing tools. Please try again in a moment.' });
    }
    console.log('[ChatHandler] Tool context available');

    // Now expecting a 'persona' field from the frontend
    const { prompt, persona }: { prompt: string, persona?: string } = req.body;
    console.log(`[ChatHandler] Received prompt: "${prompt}"`);
    console.log(`[ChatHandler] Received persona: "${persona}"`);

    if (!prompt) {
        console.error('[ChatHandler] No prompt provided');
        return res.status(400).json({ error: 'No prompt provided.' });
    }

    // Check for direct tool call (e.g., /video_search query)
    const toolMatch = prompt.match(/^\/(\w+)\s*(.*)$/);
    if (toolMatch) {
        const toolName = toolMatch[1];
        const argsString = toolMatch[2].trim();
        console.log(`[ChatHandler] Direct tool call detected: ${toolName} with args: "${argsString}"`);

        try {
            let args: any = {};
            if (toolName === 'video_search') {
                args = { query: argsString };
            } else {
                // For other tools, try to parse args as JSON or simple string
                try {
                    args = JSON.parse(argsString);
                } catch {
                    args = { input: argsString };
                }
            }

            const mcpResult = await callTool(toolName, args);
            console.log('[ChatHandler] Direct tool result:', JSON.stringify(mcpResult, null, 2));

            if (mcpResult && mcpResult.error) {
                console.error('MCP Error:', mcpResult.error);
                return res.status(500).json({ error: `Tool execution error: ${mcpResult.error.message}` });
            }

            let toolResult = '';
            if (mcpResult && mcpResult.content && Array.isArray(mcpResult.content)) {
                toolResult = mcpResult.content[0]?.text || '';
            } else if (mcpResult && mcpResult.error) {
                toolResult = `Error: ${mcpResult.error.message}`;
            } else if (mcpResult) {
                toolResult = JSON.stringify(mcpResult);
            } else {
                toolResult = 'No result returned from tool';
            }

            console.log('[ChatHandler] Returning direct tool result');
            return res.json({ response: toolResult });
        } catch (error: any) {
            console.error('[ChatHandler] Error in direct tool call:', error);
            return res.status(500).json({ error: 'Failed to execute tool.' });
        }
    }

    try {
        console.log('[ChatHandler] Checking chat session...');
        
        // If the chat doesn't exist, or if the persona has changed, re-initialize the chat session
        if (!chat || (persona && persona !== currentPersonaPrompt)) {
            console.log('[ChatHandler] Initializing chat with persona...');
            const newPersona = persona || 'You are a helpful AI assistant.'; // Default fallback
            
            try {
                await initializeChatWithPersona(newPersona);
                console.log('[ChatHandler] Chat initialized successfully');
            } catch (error) {
                console.error('[ChatHandler] Failed to initialize chat:', error);
                return res.status(500).json({ error: 'Failed to initialize chat session' });
            }
        }

        if (!chat) {
            console.error('[ChatHandler] Chat session is null after initialization');
            return res.status(500).json({ error: 'Chat session not available' });
        }

        console.log('[ChatHandler] Starting reasoning loop...');
        let finalResponse = "";
        let keepReasoning = true;
        const maxTurns = 10;
        let turns = 0;
        let currentPrompt = prompt;

        while (keepReasoning && turns < maxTurns) {
            turns++;
            console.log(`[ChatHandler] Turn ${turns}: Sending message to chat`);
            
            try {
                const result = await (chat as ChatSession).sendMessage(currentPrompt);
                const response = result.response;
                const text = response.text().trim();
                console.log(`[ChatHandler] Turn ${turns}: Received response:`, text.substring(0, 200) + '...');

                let toolCall: any = null;
                try {
                    // First, try to parse the entire response as raw JSON
                    toolCall = JSON.parse(text);
                    console.log('[ChatHandler] Parsed tool call from JSON:', toolCall);
                } catch (e) {
                    // If that fails, look for a JSON block inside markdown
                    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (jsonMatch && jsonMatch[1]) {
                        try {
                            toolCall = JSON.parse(jsonMatch[1].trim());
                            console.log('[ChatHandler] Parsed tool call from markdown:', toolCall);
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
                    console.log('[ChatHandler] Valid tool call detected:', toolCall);
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

                    console.log('[ChatHandler] Calling tool via MCP client:', toolName, args);

                    try {
                        // Use the MCP client's callTool method instead of direct HTTP
                        const mcpResult = await callTool(toolName, args);
                        console.log('[ChatHandler] MCP tool result:', JSON.stringify(mcpResult, null, 2));

                        if (mcpResult && mcpResult.error) {
                            console.error('MCP Error:', mcpResult.error);
                            throw new Error(`Tool execution error: ${mcpResult.error.message}`);
                        }

                        // Extract the tool result from the MCP response
                        let toolResult = '';
                        if (mcpResult && mcpResult.content && Array.isArray(mcpResult.content)) {
                            toolResult = mcpResult.content[0]?.text || '';
                        } else if (mcpResult && mcpResult.error) {
                            toolResult = `Error: ${mcpResult.error.message}`;
                        } else if (mcpResult) {
                            toolResult = JSON.stringify(mcpResult);
                        } else {
                            toolResult = 'No result returned from tool';
                        }

                        console.log('[ChatHandler] Tool result:', toolResult.substring(0, 200) + '...');

                        try {
                            const parsedResult = JSON.parse(toolResult);
                            if (Array.isArray(parsedResult) && parsedResult[0]?.thumbnail) {
                                finalResponse = toolResult;
                                keepReasoning = false;
                                continue;
                            }
                        } catch (e) { /* Not a JSON object, continue reasoning */ }

                        currentPrompt = `Tool Result:\n${toolResult}\n\nBased on this result, provide a helpful response to the user's original request: "${prompt}"`;
                        console.log('[ChatHandler] Continuing with tool result...');
                        
                    } catch (error: any) {
                        if (error.name === 'AbortError') {
                            console.error('MCP Timeout Error: Request took too long');
                            throw new Error('Tool server timeout - please try again');
                        }
                        console.error('MCP Communication Error:', error);
                        throw new Error('Failed to communicate with tool server');
                    }
                } else {
                    console.log('[ChatHandler] No valid tool call, using final response');
                    finalResponse = text;
                    keepReasoning = false;
                }
            } catch (turnError) {
                console.error(`[ChatHandler] Error in turn ${turns}:`, turnError);
                throw turnError;
            }
        }

        if (turns >= maxTurns) {
            console.warn('[ChatHandler] Hit max turns limit');
            finalResponse = "Sorry, I got stuck in a reasoning loop. Could you rephrase?";
        }

        console.log('[ChatHandler] Sending final response');
        res.json({ response: finalResponse });

    } catch (error) {
        console.error('[ChatHandler] Critical error:', error);
        console.error('[ChatHandler] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        res.status(500).json({ error: 'Failed to get response from AI.' });
    }
}
