"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToolConfig = getToolConfig;
const zod_1 = require("zod");
const paper_generator_js_1 = __importDefault(require("../tools/paper-generator.js"));
const index_js_1 = require("../tools/index.js");
const config_js_1 = require("../config.js");
function getToolConfig(genAI, ttsClient) {
    const model = genAI.getGenerativeModel({ model: config_js_1.config.ai.modelName });
    const toolImplementations = [];
    const defineTool = (name, definition, implementation) => {
        toolImplementations.push({ name, definition, implementation });
    };
    // --- All other tool definitions remain the same ---
    defineTool("clipboard_add", { title: "Add to Clipboard", description: "Adds a new text entry to the clipboard history.", inputSchema: { text: zod_1.z.string() } }, async ({ text }) => ({ content: [{ type: "text", text: (0, index_js_1.addToClipboard)(text) }] }));
    defineTool("clipboard_read", { title: "Read Clipboard", description: "Reads the entire clipboard history.", inputSchema: {} }, async () => ({ content: [{ type: "text", text: (0, index_js_1.readClipboardHistory)() }] }));
    defineTool("clipboard_search", { title: "Search Clipboard", description: "Searches the clipboard history for a given query.", inputSchema: { query: zod_1.z.string() } }, async ({ query }) => ({ content: [{ type: "text", text: (0, index_js_1.searchClipboard)(query) }] }));
    defineTool("clipboard_clear", { title: "Clear Clipboard", description: "Clears the entire clipboard history.", inputSchema: {} }, async () => ({ content: [{ type: "text", text: (0, index_js_1.clearClipboardHistory)() }] }));
    defineTool("fs_list", { description: "Lists files and directories.", inputSchema: { path: zod_1.z.string() } }, async ({ path }) => ({ content: [{ type: "text", text: await (0, index_js_1.listFiles)(path) }] }));
    defineTool("fs_read", { description: "Reads the content of a file.", inputSchema: { path: zod_1.z.string() } }, async ({ path }) => ({ content: [{ type: "text", text: await (0, index_js_1.readFile)(path) }] }));
    defineTool("web_search", { description: "Searches the web and returns a summary of the top results.", inputSchema: { query: zod_1.z.string() } }, async ({ query }) => ({ content: [{ type: "text", text: await (0, index_js_1.web_search)(query, model) }] }));
    defineTool("web_read", { description: "Reads a webpage.", inputSchema: { url: zod_1.z.string() } }, async ({ url }) => ({ content: [{ type: "text", text: await (0, index_js_1.view_text_website)(url) }] }));
    defineTool("save_note", { description: "Saves a note to the notepad.", inputSchema: { note_content: zod_1.z.string() } }, async ({ note_content }) => ({ content: [{ type: "text", text: await (0, index_js_1.save_note)(note_content) }] }));
    defineTool("read_notes", { description: "Reads all notes from the notepad.", inputSchema: {} }, async () => ({ content: [{ type: "text", text: await (0, index_js_1.read_notes)() }] }));
    defineTool("calculator", {
        description: "Evaluates a mathematical expression. Supports basic arithmetic.",
        inputSchema: {
            expression: zod_1.z.string().describe("The mathematical expression to solve.")
        }
    }, async ({ expression }) => ({ content: [{ type: "text", text: await (0, index_js_1.calculate)(expression) }] }));
    defineTool("get_current_datetime", {
        description: "Gets the current date, time, and day of the week.",
        inputSchema: {}
    }, async () => ({ content: [{ type: "text", text: await (0, index_js_1.getCurrentDateTime)() }] }));
    defineTool("paper_generator", { description: "Generates a research paper.", inputSchema: { topic: zod_1.z.string() } }, async ({ topic }) => {
        const paperGenerator = new paper_generator_js_1.default({ model, web_search: (q) => (0, index_js_1.web_search)(q, model), view_text_website: index_js_1.view_text_website });
        const paper = await paperGenerator.generate(topic);
        return { content: [{ type: "text", text: paper }] };
    });
    defineTool("save_speech_to_file", { description: "Synthesizes text and saves it as an MP3 file.", inputSchema: { text: zod_1.z.string(), filename: zod_1.z.string() } }, async ({ text, filename }) => ({ content: [{ type: "text", text: await (0, index_js_1.save_speech_to_file)(text, filename, ttsClient) }] }));
    // --- START OF MODIFICATION ---
    // This is the new, more detailed definition for the video_search tool.
    defineTool("video_search", {
        description: "Searches for videos and returns a list of results with thumbnails.",
        inputSchema: {
            query: zod_1.z.string().describe("The primary search term for the videos."),
            options: zod_1.z.object({
                maxResults: zod_1.z.number().optional().describe("Maximum number of results to return. Defaults to 10."),
                duration: zod_1.z.enum(['short', 'medium', 'long']).optional().describe("Filter by video duration."),
                sortBy: zod_1.z.enum(['relevance', 'date']).optional().describe("Sort results by relevance or date (most recent). 'date' is best for recent uploads.")
            }).optional().describe("Optional parameters to refine the search.")
        }
    }, async ({ query, options }) => ({ content: [{ type: "text", text: await (0, index_js_1.video_search)(query, options) }] }));
    // --- END OF MODIFICATION ---
    return { toolImplementations };
}
