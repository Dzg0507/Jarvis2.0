"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicJarvisContextPromise = void 0;
exports.initializeJarvisContext = initializeJarvisContext;
const prompt_js_1 = require("./prompt.js");
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
        // For now, return a basic context without connecting to MCP server
        // This will be updated once the MCP server setup is working properly
        console.log('[MCPClient] Using fallback tool discovery (MCP server connection pending).');
        // Return a basic context with some common tools
        const fallbackTools = [
            { name: 'web_search', description: 'Search the web for information' },
            { name: 'calculator', description: 'Perform mathematical calculations' },
            { name: 'fs_read', description: 'Read files from the filesystem' },
            { name: 'fs_write', description: 'Write files to the filesystem' }
        ];
        const toolListString = fallbackTools.map((tool, index) => {
            return `${index + 1}. **'${tool.name}'**: ${tool.description}\n   * **Parameters:**\n     - query (string; search query or file path)`;
        }).join('\n\n');
        const baseContext = (0, prompt_js_1.buildBasePrompt)(toolListString);
        console.log("[MCPClient] Successfully built fallback Jarvis context.");
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
