"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMcpServer = setupMcpServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const generative_ai_1 = require("@google/generative-ai");
const tool_registrar_js_1 = require("./tool-registrar.js");
const config_js_1 = require("../config.js");
async function setupMcpServer(ttsClient) {
    console.log('[MCPServer] Setting up MCP server...');
    const genAI = new generative_ai_1.GoogleGenerativeAI(config_js_1.config.ai.apiKey);
    // Get the tool configurations and implementations
    const { toolImplementations } = (0, tool_registrar_js_1.getToolConfig)(genAI, ttsClient);
    // Create the server WITHOUT tools in the constructor
    const mcpServer = new mcp_js_1.McpServer({
        name: "jarvis-mcp-server-consolidated",
        version: "1.1.0",
    });
    // Register each tool implementation with the server instance
    console.log('[MCPServer] Registering tools...');
    toolImplementations.forEach(({ name, definition, implementation }) => {
        console.log(`[MCPServer] - Registering tool: '${name}'`);
        mcpServer.registerTool(name, definition, implementation);
    });
    console.log('[MCPServer] MCP server setup complete.');
    return mcpServer;
}
