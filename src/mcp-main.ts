import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as textToSpeech from '@google-cloud/text-to-speech';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { setupMcpServer } from './mcp/mcp-server.js';
import { getToolConfig } from './mcp/tool-registrar.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';

import { handleChat } from './chat/chathandler.js';

function zodToJsonSchema(schema: any): any {
  if (!schema || !schema._def) {
    return { type: 'string' }; // default for non-Zod schemas
  }

  if (schema._def.typeName === 'ZodObject') {
    const properties: any = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(schema._def.shape)) {
      const val = value as any;
      properties[key] = zodToJsonSchema(val);
      if (val._def && val._def.typeName !== 'ZodOptional') {
        required.push(key);
      }
    }
    return {
      type: 'object',
      properties,
      required
    };
  } else if (schema._def.typeName === 'ZodString') {
    return { type: 'string' };
  } else if (schema._def.typeName === 'ZodNumber') {
    return { type: 'number' };
  } else if (schema._def.typeName === 'ZodBoolean') {
    return { type: 'boolean' };
  } else if (schema._def.typeName === 'ZodArray') {
    return {
      type: 'array',
      items: zodToJsonSchema(schema._def.type)
    };
  } else if (schema._def.typeName === 'ZodOptional') {
    return zodToJsonSchema(schema._def.innerType);
  } else if (schema._def.typeName === 'ZodEnum') {
    return {
      type: 'string',
      enum: schema._def.values
    };
  } else {
    return { type: 'string' }; // default
  }
}

async function main() {
  console.log('[MCP Main] Starting MCP server...');

  const ttsClient = new textToSpeech.TextToSpeechClient();
  const genAI = new GoogleGenerativeAI(config.ai.apiKey as string);
  const { toolImplementations } = getToolConfig(genAI, ttsClient);
  const mcpServer = await setupMcpServer(ttsClient);
  
  const port = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT) : 8080;
  const app = express();
  
  app.use(cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'mcp-session-id', 'Cache-Control'],
  }));
  app.use(express.json());

  // Add request logging middleware
  app.use((req, res, next) => {
    console.log(`[MCP Main] Incoming request: ${req.method} ${req.url}`);
    next();
  });

  // Helper function to handle SSE connections
  const handleSSEConnection = async (req: Request, res: Response) => {
    console.log('[MCP Main] Processing SSE connection');
    console.log('[MCP Main] Request headers:', req.headers);
    console.log('[MCP Main] Request query params:', req.query);
    
    try {
      // Set SSE headers immediately
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      });

      // Send initial connection event
      res.write('event: connected\ndata: {"type":"connected"}\n\n');

      // Create a new transport for each connection
      const transport = new StreamableHTTPServerTransport({ 
        sessionIdGenerator: () => Math.random().toString(36).substring(7)
      });
      
      // Handle connection cleanup
      const cleanup = () => {
        console.log('[MCP Main] Cleaning up SSE connection');
        try {
          transport.close();
        } catch (cleanupError) {
          console.error('[MCP Main] Error during cleanup:', cleanupError);
        }
      };
      
      req.on('close', cleanup);
      req.on('aborted', cleanup);
      res.on('close', cleanup);
      res.on('finish', cleanup);

      // Connect the MCP server to the transport
      await mcpServer.connect(transport);
      
      console.log('[MCP Main] MCP server connected to transport');
      
      // Keep the connection alive
      const keepAlive = setInterval(() => {
        if (!res.destroyed && !req.destroyed) {
          res.write('event: ping\ndata: {"type":"ping"}\n\n');
        } else {
          clearInterval(keepAlive);
          cleanup();
        }
      }, 30000); // Send ping every 30 seconds
      
      // Handle transport messages
      transport.onmessage = (message) => {
        if (!res.destroyed) {
          res.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
        }
      };

      // Don't call res.end() - keep the connection open for SSE
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[MCP Main] Error setting up SSE connection:', err);
      console.error('[MCP Main] Error stack:', err.stack);

      // Send error event if connection is still active
      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Connection failed', message: err.message }));
      } else if (!res.destroyed) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'Connection failed', message: err.message })}\n\n`);
      }
    }
  };

  // Root endpoint - return info for non-SSE requests, handle SSE for event-stream requests
  app.get('/', async (req, res) => {
    console.log('[MCP Main] Root endpoint hit');
    
    // Check if this is an SSE request
    const acceptHeader = req.headers.accept;
    if (acceptHeader && acceptHeader.includes('text/event-stream')) {
      console.log('[MCP Main] Handling as SSE connection');
      await handleSSEConnection(req, res);
    } else {
      console.log('[MCP Main] Returning basic server info');
      res.json({
        message: 'MCP Server is running',
        endpoints: {
          mcp: '/mcp',
          'mcp-sse': '/mcp/sse',
          'mcp-tools': '/mcp/tools',
          'mcp-call-tool': '/mcp/call-tool',
          chat: '/chat',
          health: '/health',
          tools: '/tools',
          'call-tool': '/call-tool'
        },
        status: 'healthy'
      });
    }
  });

  // Dedicated MCP SSE endpoint
  app.get('/mcp/sse', async (req, res) => {
    console.log('[MCP Main] Dedicated SSE endpoint hit');
    await handleSSEConnection(req, res);
  });

  // Chat endpoint
  app.post('/chat', (req, res) => {
    handleChat(req, res);
  });

  // Handle CORS preflight for all MCP endpoints
  app.options(['/mcp', '/mcp/sse', '/mcp/tools', '/mcp/call-tool', '/tools', '/call-tool'], (req, res) => {
    console.log('[MCP Main] CORS preflight request');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, mcp-session-id');
    res.sendStatus(200);
  });

  // MCP POST endpoint for JSON-RPC requests
  app.post('/mcp', async (req, res) => {
    console.log(`[MCP Main] Received POST request for /mcp with method: ${req.body?.method}`);
    try {
      // For POST requests, use the transport differently
      const transport = new StreamableHTTPServerTransport({ 
        sessionIdGenerator: undefined 
      });
      
      // Set up cleanup
      res.on('close', () => {
        try {
          transport.close();
        } catch (e) {
          console.error('[MCP Main] Cleanup error:', e);
        }
      });
      
      // Connect server to transport
      await mcpServer.connect(transport);
      
      // Handle the JSON-RPC request
      await transport.handleRequest(req, res, req.body);
      
    } catch (error) {
      console.error('[MCP Main] Error handling MCP POST request:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          jsonrpc: '2.0', 
          error: { code: -32603, message: 'Internal server error' }, 
          id: req.body?.id || null 
        });
      }
    }
  });

  // MCP GET endpoint for SSE connections
  app.get('/mcp', async (req, res) => {
    console.log('[MCP Main] Received GET request for /mcp (SSE connection)');
    await handleSSEConnection(req, res);
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Test endpoint
  app.get('/test-mcp', (req, res) => {
    console.log('[MCP Main] Test endpoint hit');
    res.json({
      message: 'MCP server is running',
      tools: 'available',
      timestamp: new Date().toISOString()
    });
  });

  // Tools endpoint for REST API
  app.get('/tools', (req, res) => {
    console.log('[MCP Main] Tools endpoint hit');
    const tools = toolImplementations.map(({ name, definition }) => ({
      name,
      description: definition.title || definition.description || name,
      inputSchema: zodToJsonSchema(definition.inputSchema)
    }));
    res.json({ tools });
  });

  // MCP tools endpoint
  app.get('/mcp/tools', (req, res) => {
    console.log('[MCP Main] MCP Tools endpoint hit');
    const tools = toolImplementations.map(({ name, definition }) => ({
      name,
      description: definition.title || definition.description || name,
      inputSchema: zodToJsonSchema(definition.inputSchema)
    }));
    res.json({ tools });
  });

  // Call tool endpoint for REST API
  app.post('/call-tool', async (req, res) => {
    console.log('[MCP Main] Call tool endpoint hit');
    try {
      const { name, arguments: args } = req.body;
      const tool = toolImplementations.find(t => t.name === name);
      if (!tool) {
        return res.status(404).json({ error: 'Tool not found' });
      }
      const result = await tool.implementation(args);
      res.json(result);
    } catch (error) {
      console.error('[MCP Main] Error calling tool:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // MCP call tool endpoint
  app.post('/mcp/call-tool', async (req, res) => {
    console.log('[MCP Main] MCP Call tool endpoint hit');
    try {
      const { name, arguments: args } = req.body;
      const tool = toolImplementations.find(t => t.name === name);
      if (!tool) {
        return res.status(404).json({ error: 'Tool not found' });
      }
      const result = await tool.implementation(args);
      res.json(result);
    } catch (error) {
      console.error('[MCP Main] Error calling MCP tool:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const server = app.listen(port, () => {
    console.log(`[MCP Main] Server running on port ${port}`);
    console.log(`[MCP Main] MCP endpoint: http://localhost:${port}/mcp`);
    console.log(`[MCP Main] MCP SSE endpoint: http://localhost:${port}/mcp/sse`);
    console.log(`[MCP Main] Chat endpoint: http://localhost:${port}/chat`);
    console.log(`[MCP Main] Root endpoint: http://localhost:${port}/`);
    
    // Server is ready
    console.log('[MCP Main] Server initialization complete');
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('[MCP Main] Shutting down server...');
    server.close(() => {
      console.log('[MCP Main] Server stopped.');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('[MCP Main] Received SIGTERM, shutting down gracefully...');
    server.close(() => {
      console.log('[MCP Main] Server stopped.');
      process.exit(0);
    });
  });
}

main().catch(error => {
  console.error('[MCP Main] Failed to start server:', error);
  process.exit(1);
});
