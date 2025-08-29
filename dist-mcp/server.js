"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServers = startServers;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const child_process_1 = require("child_process");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const elevenlabs_1 = require("elevenlabs");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const chathandler_js_1 = require("./chat/chathandler.js");
const mcp_server_js_1 = require("./mcp/mcp-server.js");
const mcp_client_js_1 = require("./chat/mcp-client.js");
const video_search_js_1 = require("./tools/video-search.js");
// --- ElevenLabs Client Initialization ---
if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY environment variable not set");
}
const elevenlabs = new elevenlabs_1.ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});
async function startServers() {
    console.log('[Server] Starting servers...');
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use((0, cors_1.default)({
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
        const tempFilePath = path_1.default.join(os_1.default.tmpdir(), `script_${Date.now()}.py`);
        fs_1.default.writeFile(tempFilePath, code, (writeErr) => {
            if (writeErr) {
                console.error('[Server] Error writing temp file:', writeErr);
                return res.status(500).json({ error: 'Failed to write script to disk.' });
            }
            (0, child_process_1.execFile)('python', [tempFilePath], (execErr, stdout, stderr) => {
                fs_1.default.unlink(tempFilePath, (unlinkErr) => {
                    if (unlinkErr)
                        console.error('[Server] Error deleting temp file:', unlinkErr);
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
            const resultsString = await (0, video_search_js_1.video_search)(query);
            const results = JSON.parse(resultsString);
            res.json(results);
        }
        catch (error) {
            console.error('[Server] Direct video search error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: `Failed to perform video search: ${errorMessage}` });
        }
    });
    app.post('/chat', (req, res) => {
        console.log('[Server] Received request for /chat');
        (0, chathandler_js_1.handleChat)(req, res);
    });
    app.get('/api/get-voices', async (req, res) => {
        console.log('[Server] Received request for /api/get-voices');
        try {
            const voices = await elevenlabs.voices.getAll();
            res.json(voices.voices.map((v) => ({
                name: v.name,
                voice_id: v.voice_id,
                category: v.category,
                description: v.description,
            })));
        }
        catch (error) {
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
            const audio = await elevenlabs.generate({
                voice: voice_id,
                text,
                model_id: "eleven_turbo_v2"
            });
            const chunks = [];
            for await (const chunk of audio) {
                chunks.push(chunk);
            }
            const content = Buffer.concat(chunks);
            const base64Audio = content.toString('base64');
            res.json({ audioContent: base64Audio });
        }
        catch (error) {
            console.error('[Server] ElevenLabs TTS Error:', error);
            res.status(500).json({ error: 'Failed to synthesize speech with ElevenLabs.' });
        }
    });
    app.get('/health', (req, res) => {
        console.log('[Server] Received request for /health');
        res.status(200).send('OK');
    });
    const mainServer = app.listen(3001, () => {
        console.log('[Server] Main server listening on http://localhost:3000');
    });
    // MCP Server
    console.log('[Server] Setting up MCP server...');
    const ttsClientPlaceholder = {};
    const mcpServer = await (0, mcp_server_js_1.setupMcpServer)(ttsClientPlaceholder);
    const mcpApp = (0, express_1.default)();
    mcpApp.use(express_1.default.json());
    mcpApp.use((0, cors_1.default)({
        origin: '*',
        exposedHeaders: ['Mcp-Session-Id'],
        allowedHeaders: ['Content-Type', 'mcp-session-id'],
    }));
    mcpApp.post('/mcp', async (req, res) => {
        console.log(`[Server] Received request for /mcp with method: ${req.body.method}`);
        try {
            const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
            res.on('close', () => { transport.close(); });
            await mcpServer.connect(transport);
            await transport.handleRequest(req, res, req.body);
        }
        catch (error) {
            console.error('[Server] Error handling MCP request:', error);
            if (!res.headersSent) {
                res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
            }
        }
    });
    const mcpAppServer = mcpApp.listen(8080, () => {
        console.log('[Server] MCP Server is running on port 8080');
        console.log('[Server] Initializing Jarvis context...');
        (0, mcp_client_js_1.initializeJarvisContext)();
    });
    return [mainServer, mcpAppServer];
}
// Add this line to the end of the file
startServers();
