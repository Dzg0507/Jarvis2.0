import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as textToSpeech from '@google-cloud/text-to-speech';
import { getToolConfig } from './tool-registrar.js';
import { config } from '../config.js';

interface ToolImplementation {
    name: string;
    definition: any;
    implementation: (input: any) => Promise<any>;
}

export async function setupMcpServer(ttsClient: textToSpeech.TextToSpeechClient): Promise<McpServer> {
    console.log('[MCPServer] Setting up MCP server...');
    const genAI = new GoogleGenerativeAI(config.ai.apiKey as string);

    // Get the tool configurations and implementations
    const { toolImplementations } = getToolConfig(genAI, ttsClient);

    // Create the server WITHOUT tools in the constructor
    const mcpServer = new McpServer({
        name: "jarvis-mcp-server-consolidated",
        version: "1.1.0",
    });

    // Register each tool implementation with the server instance
    console.log('[MCPServer] Registering tools...');
    toolImplementations.forEach(({ name, definition, implementation }: ToolImplementation) => {
        console.log(`[MCPServer] - Registering tool: '${name}'`);
        mcpServer.registerTool(name, definition, implementation);
    });

    console.log('[MCPServer] MCP server setup complete.');
    return mcpServer;
}