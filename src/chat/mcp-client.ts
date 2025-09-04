import { config } from '../config';
import { ToolResult } from '../types/mcp.js';

const MCP_SERVER_URL = config.mcp.serverUrl;

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

let toolsCache: ToolDefinition[] | null = null;
let toolsContextCache: string | null = null;

async function initializeToolsCache(): Promise<void> {
  if (toolsCache !== null) {
    return; // Already initialized
  }

  const maxRetries = 5;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[MCP Client] Initializing tools cache (attempt ${attempt}/${maxRetries})...`);
      const response = await fetch(`${MCP_SERVER_URL}/tools`);

      if (!response.ok) {
        throw new Error(`Failed to fetch tools: ${response.statusText}`);
      }

      const data = await response.json();
      toolsCache = data.tools || [];
      console.log(`[MCP Client] Tools cache initialized with ${toolsCache!.length} tools`);
      return; // Success!
    } catch (error) {
      console.error(`[MCP Client] Error initializing tools cache (attempt ${attempt}):`, error);

      if (attempt < maxRetries) {
        console.log(`[MCP Client] Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('[MCP Client] All retry attempts failed, setting empty tools cache');
        toolsCache = []; // Set to empty array to avoid repeated initialization attempts
      }
    }
  }
}

export async function getDynamicJarvisContext(): Promise<string> {
  if (!toolsCache) {
    await initializeToolsCache();
  }

  // Add null check
  if (!toolsCache) {
    throw new Error('Failed to initialize tools cache');
  }

  if (toolsContextCache) {
    return toolsContextCache;
  }

  try {
    const maxRetries = 3;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[MCP Client] Fetching tools from MCP server (attempt ${attempt}/${maxRetries})...`);
        const response = await fetch(`${MCP_SERVER_URL}/tools`);

        if (!response.ok) {
          throw new Error(`Failed to fetch tools: ${response.statusText}`);
        }

        const data = await response.json();
        const tools = data.tools || [];
        toolsCache = tools;

        console.log(`[MCP Client] Loaded ${tools.length} tools`);
        break; // Success, exit retry loop
      } catch (error) {
        console.error(`[MCP Client] Error fetching tools (attempt ${attempt}):`, error);

        if (attempt < maxRetries) {
          console.log(`[MCP Client] Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.error('[MCP Client] All retry attempts failed for fetching tools');
          throw error;
        }
      }
    }

    // Generate context string
    const toolDescriptions = (toolsCache as ToolDefinition[]).map(tool => {
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
  } catch (error) {
    console.error('[MCP Client] Error fetching tools:', error);
    return 'No tools available due to connection error.';
  }
}

function generateExampleArgs(schema: any): string {
  if (!schema || !schema.properties) {
    return '';
  }

  const examples: string[] = [];
  for (const [key, value] of Object.entries(schema.properties)) {
    const prop = value as any;
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

export async function callTool(toolName: string, args: any): Promise<ToolResult> {
  if (!toolsCache) {
    await initializeToolsCache();
  }
  
  // Add null check
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
  } catch (error) {
    console.error(`[MCP Client] Error calling tool ${toolName}:`, error);
    throw error;
  }
}

export async function getAvailableTools(): Promise<ToolDefinition[]> {
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

    return toolsCache!;
  } catch (error) {
    console.error('[MCP Client] Error fetching available tools:', error);
    return [];
  }
}

export function clearToolsCache(): void {
  toolsCache = null;
  toolsContextCache = null;
}
