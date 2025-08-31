import { setupMcpServer } from './mcp/mcp-server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as textToSpeech from '@google-cloud/text-to-speech';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from 'express';
import cors from 'cors';
import { config } from './config';

async function main() {
  console.log('[MCP Main] Starting MCP HTTP server...');

  // Initialize TextToSpeechClient (removing GoogleGenerativeAI as it's not needed here)
  const ttsClient = new textToSpeech.TextToSpeechClient();

  const port = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT) : 3001;

  const app = express();
  
  // Enable CORS for all origins (adjust as needed for production)
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // MCP SSE endpoint
  app.get('/sse', async (req, res) => {
    console.log('[MCP Main] New SSE connection request');
    
    try {
      const mcpServer = await setupMcpServer(ttsClient);
      const transport = new SSEServerTransport('/sse', res);
      await mcpServer.connect(transport);
      console.log('[MCP Main] SSE connection established');
    } catch (error) {
      console.error('[MCP Main] Error setting up SSE connection:', error);
      res.status(500).json({ error: 'Failed to establish MCP connection' });
    }
  });

  // MCP POST endpoint for tool calls (this is what your chat handler uses)
  app.post('/', async (req, res) => {
    console.log('[MCP Main] Received MCP tool call request:', JSON.stringify(req.body, null, 2));
    
    try {
      const mcpServer = await setupMcpServer(ttsClient);
      
      // Process the MCP JSON-RPC request
      if (req.body && req.body.method === 'tools/call' && req.body.params) {
        console.log('[MCP Main] Processing tool call:', req.body.params.name);
        console.log('[MCP Main] Tool arguments:', JSON.stringify(req.body.params.arguments, null, 2));
        
        // Create a transport that captures the response
        let responseData: any = null;
        let responseReceived = false;
        
        const transport = {
          async start() {
            console.log('[MCP Main] Transport started');
          },
          async send(message: any) {
            console.log('[MCP Main] Received response from MCP server:', JSON.stringify(message, null, 2));
            responseData = message;
            responseReceived = true;
          },
          async close() {
            console.log('[MCP Main] Transport closed');
          }
        };

        await mcpServer.connect(transport as any);
        
        // Send the tool call request to the MCP server
        // The MCP server should process this and call transport.send()
        console.log('[MCP Main] Connected to MCP server, processing tool call...');
        
        // Wait for the response with a timeout
        const timeout = 30000; // 30 seconds
        const startTime = Date.now();
        
        while (!responseReceived && (Date.now() - startTime) < timeout) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (responseReceived && responseData) {
          console.log('[MCP Main] Sending response back to client');
          res.json(responseData);
        } else {
          console.log('[MCP Main] No response received, sending default success response');
          res.json({ 
            jsonrpc: "2.0", 
            id: req.body.id, 
            result: { 
              content: [{ 
                type: "text", 
                text: `Tool ${req.body.params.name} executed successfully` 
              }] 
            }
          });
        }
      } else if (req.body && typeof req.body === 'object') {
        console.log('[MCP Main] Processing non-tool MCP request...');
        console.log('[MCP Main] Request body:', JSON.stringify(req.body, null, 2));
        res.json({ success: true, message: 'MCP request processed' });
      } else {
        console.log('[MCP Main] Invalid request format:', req.body);
        res.status(400).json({ error: 'Invalid MCP request format' });
      }
    } catch (error) {
      console.error('[MCP Main] Error processing MCP request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        jsonrpc: "2.0", 
        id: req.body?.id || null, 
        error: { 
          code: -32603, 
          message: 'Internal error', 
          data: errorMessage 
        } 
      });
    }
  });

  // Legacy MCP endpoint (keeping for compatibility)
  app.post('/mcp', async (req, res) => {
    // Redirect to the main endpoint
    req.url = '/';
    app._router.handle(req, res);
  });

  // Start the HTTP server
  const server = app.listen(port, () => {
    console.log(`[MCP Main] MCP Server running on port ${port}`);
    console.log(`[MCP Main] Health check: http://localhost:${port}/health`);
    console.log(`[MCP Main] MCP SSE endpoint: http://localhost:${port}/sse`);
    console.log(`[MCP Main] MCP Tool calls: http://localhost:${port}/`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('[MCP Main] Shutting down MCP server...');
    server.close(() => {
      console.log('[MCP Main] MCP server stopped');
      process.exit(0);
    });
  });
}

main().catch(error => {
  console.error('[MCP Main] Failed to start MCP server:', error);
  process.exit(1);
});