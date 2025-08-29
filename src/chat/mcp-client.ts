import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { buildBasePrompt } from './prompt.js';
import { config } from '../config.js';

const MCP_SERVER_URL = config.mcp.serverUrl;

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
        const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));
        const client = new Client({ name: "jarvis-chat-handler", version: "1.0.0" });
        await client.connect(transport);
        console.log('[MCPClient] Connected to MCP server.');

        const responsePayload: any = await client.listTools();
        
        // THIS LINE HAS BEEN REMOVED TO CLEAN UP THE LOGS
        // console.log('[MCPClient] Raw tools object received from server:', JSON.stringify(responsePayload, null, 2));
        
        const toolsArray: McpTool[] = responsePayload.tools; 
        if (!Array.isArray(toolsArray)) {
            throw new Error('MCP server tool list response is not in the expected format (expected an array).');
        }
        
        console.log('[MCPClient] Discovered tools:', toolsArray.map(t => t.name));

        const toolListString: string = toolsArray.map((tool, index) => {
            const paramsDescription = generateSchemaDescription(tool.inputSchema);
            return `${index + 1}. **'${tool.name}'**: ${tool.description}\n   * **Parameters:**\n${paramsDescription}`;
        }).join('\n\n');

        const baseContext = buildBasePrompt(toolListString);
        console.log("[MCPClient] Successfully built dynamic Jarvis context.");
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