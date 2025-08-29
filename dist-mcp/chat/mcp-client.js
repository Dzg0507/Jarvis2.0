"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicJarvisContextPromise = void 0;
exports.initializeJarvisContext = initializeJarvisContext;
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const prompt_js_1 = require("./prompt.js");
const config_js_1 = require("../config.js");
const MCP_SERVER_URL = config_js_1.config.mcp.serverUrl;
// --- Deferred Promise Pattern ---
let resolveJarvisContext;
exports.dynamicJarvisContextPromise = new Promise((resolve) => {
    resolveJarvisContext = resolve;
});
// ---
// --- NEW FUNCTION TO CREATE DETAILED PARAMETER DESCRIPTIONS ---
function generateSchemaDescription(schema, indent = '  ') {
    if (!schema || !schema.properties)
        return `${indent}None`;
    const describeProperty = (key, prop) => {
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
        .map(([key, value]) => describeProperty(key, value))
        .join('\n');
}
async function initializeMcpClient() {
    console.log('[MCPClient] Initializing MCP client to discover tools...');
    try {
        const transport = new streamableHttp_js_1.StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));
        const client = new index_js_1.Client({ name: "jarvis-chat-handler", version: "1.0.0" });
        await client.connect(transport);
        console.log('[MCPClient] Connected to MCP server.');
        const responsePayload = await client.listTools();
        // THIS LINE HAS BEEN REMOVED TO CLEAN UP THE LOGS
        // console.log('[MCPClient] Raw tools object received from server:', JSON.stringify(responsePayload, null, 2));
        const toolsArray = responsePayload.tools;
        if (!Array.isArray(toolsArray)) {
            throw new Error('MCP server tool list response is not in the expected format (expected an array).');
        }
        console.log('[MCPClient] Discovered tools:', toolsArray.map(t => t.name));
        const toolListString = toolsArray.map((tool, index) => {
            const paramsDescription = generateSchemaDescription(tool.inputSchema);
            return `${index + 1}. **'${tool.name}'**: ${tool.description}\n   * **Parameters:**\n${paramsDescription}`;
        }).join('\n\n');
        const baseContext = (0, prompt_js_1.buildBasePrompt)(toolListString);
        console.log("[MCPClient] Successfully built dynamic Jarvis context.");
        return baseContext;
    }
    catch (error) {
        console.error("[MCPClient] Failed to initialize MCP client or discover tools:", error);
        return "Error: Could not connect to MCP server to discover tools. Tool usage will not be available.";
    }
}
async function initializeJarvisContext() {
    const context = await initializeMcpClient();
    resolveJarvisContext(context);
    console.log("[MCPClient] Dynamic Jarvis context promise has been resolved.");
}
