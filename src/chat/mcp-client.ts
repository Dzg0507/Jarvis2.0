import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { spawn } from 'child_process';
import { buildBasePrompt } from './prompt.js';
import { config } from '../config.js';

interface McpTool {
    name: string;
    description: string;
    inputSchema?: any; // Using 'any' for flexibility with the schema structure
}

// --- Deferred Promise Pattern ---
let resolveJarvisContext: (context: string) => void;

export const dynamicJarvisContextPromise = new Promise<string>((resolve) => {
    resolveJarvisContext = resolve;
});
// ---

// --- NEW FUNCTION TO CREATE DETAILED PARAMETER DESCRIPTIONS ---
function generateSchemaDescription(schema: any, indent = '  '): string {
    if (!schema || !schema.properties) return `${indent}None`;

    const describeProperty = (key: string, prop: any): string => {
        let details = [];
        if (prop.description) {
            details.push(prop.description);
        }
        if (prop.type) {
            details.push(`type: ${prop.type}`);
        }
        if (prop.enum) {
            details.push(`options: [${prop.enum.join(', ')}]`);
        }
        
        let description = `${indent}- **${key}**`;
        if (details.length > 0) {
            description += ` (${details.join('; ')})`;
        }
        
        if (prop.type === 'object' && prop.properties) {
            const subProps = Object.entries(prop.properties)
                .map(([subKey, subVal]) => describeProperty(subKey, subVal))
                .join('\n');
            description += `:\n${subProps.replace(/^/gm, `${indent}`)}`;
        }
        return description;
    };

    return Object.entries(schema.properties)
        .map(([key, value]) => describeProperty(key, value as any))
        .join('\n');
}


async function initializeMcpClient(): Promise<string> {
    console.log('[MCPClient] Initializing MCP client to discover tools...');
    try {
        const client = new Client({
            name: "jarvis-chat-client",
            version: "1.0.0",
        });

        const transport = new (await import('@modelcontextprotocol/sdk/client/sse.js')).SSEClientTransport(new URL(config.mcp.serverUrl));
        await client.connect(transport);

        console.log('[MCPClient] Connected to MCP server, discovering tools...');
        const tools = await client.listTools();

        const toolListString = tools.map((tool: McpTool) => {
            const schemaDesc = tool.inputSchema ? generateSchemaDescription(tool.inputSchema) : '  None';
            return `* **'${tool.name}'**: ${tool.description}\n   * **Parameters:**\n${schemaDesc}`;
        }).join('\n\n');

        const baseContext = buildBasePrompt(toolListString);
        console.log("[MCPClient] Successfully built Jarvis context from discovered tools.");
        return baseContext;
    } catch (error) {
        console.error("[MCPClient] Failed to initialize MCP client or discover tools:", error);
        return "Error: Could not connect to MCP server to discover tools. Tool usage will not be available.";
    }
}

export async function initializeJarvisContext() {
    const context = await initializeMcpClient();
    resolveJarvisContext(context);
    console.log("[MCPClient] Dynamic Jarvis context promise has been resolved.");
}
