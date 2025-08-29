import 'dotenv/config';
import express from 'express';
import { execFile } from 'child_process';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { handleChat } from './chat/chathandler.js';
import { setupMcpServer } from './mcp/mcp-server.js';
import { initializeJarvisContext } from './chat/mcp-client.js';
import { video_search } from './tools/video-search.js';

// Define Voice interface locally or use any if types aren't available
interface Voice {
    voice_id: string;
    name: string;
    [key: string]: any;
}

// --- ElevenLabs Client Initialization ---
if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY environment variable not set");
}
const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function startServers() {
    console.log('[Server] Starting servers...');
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(cors({
      origin: '*',
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'mcp-session-id'],
    }));

    // --- API Endpoints ---
    app.post('/execute', (req, res) => {
        console.log('[Server] Received request for /execute');
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'No code provided.' });
        }
        const tempFilePath = path.join(os.tmpdir(), `script_${Date.now()}.py`);
        fs.writeFile(tempFilePath, code, (writeErr) => {
            if (writeErr) {
                console.error('[Server] Error writing temp file:', writeErr);
                return res.status(500).json({ error: 'Failed to write script to disk.' });
            }
            execFile('python', [tempFilePath], (execErr, stdout, stderr) => {
                fs.unlink(tempFilePath, (unlinkErr) => {
                    if (unlinkErr) console.error('[Server] Error deleting temp file:', unlinkErr);
                });
                if (execErr) {
                    console.error(`[Server] execFile error: ${execErr}`);
                    return res.json({ output: stdout, error: stderr || execErr.message });
                }
                res.json({ output: stdout, error: stderr });
            });
        });
    });

    app.post('/direct-video-search', async (req, res) => {
        const { query } = req.body;
        console.log(`[Server] Received request for /direct-video-search with query: "${query}"`);
        if (!query) {
            return res.status(400).json({ error: 'No query provided.' });
        }
        try {
            const resultsString = await video_search(query);
            const results = JSON.parse(resultsString);
            res.json(results);
        } catch (error) {
            console.error('[Server] Direct video search error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: `Failed to perform video search: ${errorMessage}` });
        }
    });

    app.post('/chat', (req, res) => {
        console.log('[Server] Received request for /chat');
        handleChat(req, res);
    });
    
    app.get('/api/get-voices', async (req, res) => {
        console.log('[Server] Received request for /api/get-voices');
        try {
            const voicesResponse = await elevenlabs.voices.getAll();
            const voices = voicesResponse.voices;
            res.json(voices.map((v: any) => ({ 
                name: v.name, 
                voice_id: v.voice_id || v.voiceId || v.id 
            })));
        } catch (error) {
            console.error('[Server] Error fetching ElevenLabs voices:', error);
            res.status(500).json({ error: 'Failed to fetch voices from ElevenLabs.' });
        }
    });

    app.post('/tts', async (req, res) => {
        console.log('[Server] Received request for /tts');
        const { text, voice_id } = req.body;
        if (!text || !voice_id) {
            return res.status(400).json({ error: 'Text and voice_id are required.' });
        }

        try {
            const audioStream = await elevenlabs.textToSpeech.stream(
                voice_id,
                {
                    text,
                    modelId: "eleven_turbo_v2" 
                }
            );

            res.setHeader('Content-Type', 'audio/mpeg');
            
            const chunks: Buffer[] = [];
            for await (const chunk of audioStream) {
                chunks.push(Buffer.from(chunk));
            }
            const audioBuffer = Buffer.concat(chunks);
            res.send(audioBuffer);

        } catch (error) {
            console.error('[Server] ElevenLabs TTS Error:', error);
            res.status(500).json({ error: 'Failed to synthesize speech with ElevenLabs.' });
        }
    });

    app.get('/health', (req, res) => {
        console.log('[Server] Received request for /health');
        res.status(200).send('OK');
    });

    const mainServer = app.listen(3000, () => {
        console.log('[Server] Main server listening on http://localhost:3000');
    });

    // MCP Server
    console.log('[Server] Setting up MCP server...');
    const ttsClientPlaceholder: any = {};
    const mcpServer = await setupMcpServer(ttsClientPlaceholder);
    const mcpApp = express();
    mcpApp.use(express.json());
    mcpApp.use(cors({
      origin: '*',
      exposedHeaders: ['Mcp-Session-Id'],
      allowedHeaders: ['Content-Type', 'mcp-session-id'],
    }));

    mcpApp.post('/mcp', async (req, res) => {
      console.log(`[Server] Received request for /mcp with method: ${req.body.method}`);
      try {
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        res.on('close', () => { transport.close(); });
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('[Server] Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
        }
      }
    });

    const mcpAppServer = mcpApp.listen(8080, () => {
      console.log('[Server] MCP Server is running on port 8080');
      console.log('[Server] Initializing Jarvis context...');
      initializeJarvisContext();
    });

    return [mainServer, mcpAppServer];
}