"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDynamicJarvisContext = getDynamicJarvisContext;
exports.callTool = callTool;
exports.getAvailableTools = getAvailableTools;
exports.clearToolsCache = clearToolsCache;
const config_1 = require("../config");
const MCP_SERVER_URL = config_1.config.mcp.serverUrl;
let toolsCache = null;
let toolsContextCache = null;
async function initializeToolsCache() {
    if (toolsCache !== null) {
        return;
    }
    try {
        console.log('[MCP Client] Initializing tools cache...');
        const response = await fetch(`${MCP_SERVER_URL}/tools`);
        if (!response.ok) {
            throw new Error(`Failed to fetch tools: ${response.statusText}`);
        }
        const data = await response.json();
        toolsCache = data.tools || [];
        console.log(`[MCP Client] Tools cache initialized with ${toolsCache.length} tools`);
    }
    catch (error) {
        console.error('[MCP Client] Error initializing tools cache:', error);
        toolsCache = [];
    }
}
async function getDynamicJarvisContext() {
    if (!toolsCache) {
        await initializeToolsCache();
    }
    if (!toolsCache) {
        throw new Error('Failed to initialize tools cache');
    }
    if (toolsContextCache) {
        return toolsContextCache;
    }
    try {
        console.log('[MCP Client] Fetching tools from MCP server...');
        const response = await fetch(`${MCP_SERVER_URL}/tools`);
        if (!response.ok) {
            throw new Error(`Failed to fetch tools: ${response.statusText}`);
        }
        const data = await response.json();
        const tools = data.tools || [];
        toolsCache = tools;
        console.log(`[MCP Client] Loaded ${tools.length} tools`);
        const toolDescriptions = toolsCache.map(tool => {
            const schemaStr = JSON.stringify(tool.inputSchema, null, 2);
            return `## ${tool.name}
Description: ${tool.description}
Usage: TOOL_CALL: ${tool.name}(${generateExampleArgs(tool.inputSchema)})
Input Schema: ${schemaStr}`;
        }).join('\n\n');
        toolsContextCache = `You have access to the following tools. To use a tool, respond with exactly this format:
TOOL_CALL: tool_name(arg1: "value1", arg2: "value2")

Available Tools:
${toolDescriptions}

Important: 
- Use the exact format shown above for tool calls
- Always provide the tool result in your final response to the user
- If a tool fails, explain what went wrong and suggest alternatives`;
        return toolsContextCache;
    }
    catch (error) {
        console.error('[MCP Client] Error fetching tools:', error);
        return 'No tools available due to connection error.';
    }
}
function generateExampleArgs(schema) {
    if (!schema || !schema.properties) {
        return '';
    }
    const examples = [];
    for (const [key, value] of Object.entries(schema.properties)) {
        const prop = value;
        let exampleValue = '';
        switch (prop.type) {
            case 'string':
                exampleValue = `"example_${key}"`;
                break;
            case 'number':
                exampleValue = '123';
                break;
            case 'boolean':
                exampleValue = 'true';
                break;
            case 'array':
                exampleValue = '["item1", "item2"]';
                break;
            case 'object':
                exampleValue = '{}';
                break;
            default:
                exampleValue = `"${key}_value"`;
        }
        examples.push(`${key}: ${exampleValue}`);
    }
    return examples.join(', ');
}
async function callTool(toolName, args) {
    if (!toolsCache) {
        await initializeToolsCache();
    }
    if (!toolsCache) {
        throw new Error('Tools cache not available');
    }
    try {
        console.log(`[MCP Client] Calling tool: ${toolName} with args:`, args);
        const response = await fetch(`${MCP_SERVER_URL}/call-tool`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: toolName,
                arguments: args,
            }),
        });
        if (!response.ok) {
            throw new Error(`Tool call failed: ${response.statusText}`);
        }
        const result = await response.json();
        console.log(`[MCP Client] Tool result:`, result);
        return result;
    }
    catch (error) {
        console.error(`[MCP Client] Error calling tool ${toolName}:`, error);
        throw error;
    }
}
async function getAvailableTools() {
    if (toolsCache) {
        return toolsCache;
    }
    try {
        const response = await fetch(`${MCP_SERVER_URL}/tools`);
        if (!response.ok) {
            throw new Error(`Failed to fetch tools: ${response.statusText}`);
        }
        const data = await response.json();
        toolsCache = data.tools || [];
        return toolsCache;
    }
    catch (error) {
        console.error('[MCP Client] Error fetching available tools:', error);
        return [];
    }
}
function clearToolsCache() {
    toolsCache = null;
    toolsContextCache = null;
}
