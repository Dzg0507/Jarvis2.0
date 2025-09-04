"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToolConfig = getToolConfig;
const zod_1 = require("zod");
const paper_generator_1 = __importDefault(require("../tools/paper-generator"));
const index_1 = require("../tools/index");
const image_generation_1 = require("../tools/image-generation");
const config_1 = require("../config");
const update_persona_1 = __importDefault(require("../tools/definitions/update_persona"));
function getToolConfig(genAI, ttsClient) {
    const model = genAI.getGenerativeModel({ model: config_1.config.ai.modelName });
    const toolImplementations = [];
    const defineTool = (name, definition, implementation) => {
        toolImplementations.push({ name, definition, implementation });
    };
    defineTool("clipboard_add", { title: "Add to Clipboard", description: "Adds a new text entry to the clipboard history.", inputSchema: { text: zod_1.z.string() } }, async ({ text }) => ({ content: [{ type: "text", text: (0, index_1.addToClipboard)(text) }] }));
    defineTool("clipboard_read", { title: "Read Clipboard", description: "Reads the entire clipboard history.", inputSchema: {} }, async () => ({ content: [{ type: "text", text: (0, index_1.readClipboardHistory)() }] }));
    defineTool("clipboard_search", { title: "Search Clipboard", description: "Searches the clipboard history for a given query.", inputSchema: { query: zod_1.z.string() } }, async ({ query }) => ({ content: [{ type: "text", text: (0, index_1.searchClipboard)(query) }] }));
    defineTool("clipboard_clear", { title: "Clear Clipboard", description: "Clears the entire clipboard history.", inputSchema: {} }, async () => ({ content: [{ type: "text", text: (0, index_1.clearClipboardHistory)() }] }));
    defineTool("fs_list", { description: "Lists files and directories.", inputSchema: { path: zod_1.z.string() } }, async ({ path }) => ({ content: [{ type: "text", text: await (0, index_1.listFiles)(path) }] }));
    defineTool("fs_read", { description: "Reads the content of a file.", inputSchema: { path: zod_1.z.string() } }, async ({ path }) => ({ content: [{ type: "text", text: await (0, index_1.readFile)(path) }] }));
    defineTool("fs_create", { description: "Creates a new file with the specified content.", inputSchema: { path: zod_1.z.string(), content: zod_1.z.string() } }, async ({ path, content }) => ({ content: [{ type: "text", text: await (0, index_1.createFile)(path, content) }] }));
    defineTool("fs_search", { description: "Searches for a regular expression pattern within the content of files in a specified directory.", inputSchema: { pattern: zod_1.z.string(), path: zod_1.z.string().optional(), include: zod_1.z.string().optional() } }, async ({ pattern, path, include }) => ({ content: [{ type: "text", text: await (0, index_1.searchFileContent)(pattern, path, include) }] }));
    defineTool("fs_replace", { description: "Replaces occurrences of a specified old string with a new string within a file.", inputSchema: { filePath: zod_1.z.string(), oldString: zod_1.z.string(), newString: zod_1.z.string(), expectedReplacements: zod_1.z.number().optional() } }, async ({ filePath, oldString, newString, expectedReplacements }) => ({ content: [{ type: "text", text: await (0, index_1.replaceFileContent)(filePath, oldString, newString, expectedReplacements) }] }));
    defineTool("shell_execute", { description: "Executes a shell command.", inputSchema: { command: zod_1.z.string() } }, async ({ command }) => ({ content: [{ type: "text", text: await (0, index_1.executeShellCommand)(command) }] }));
    defineTool("read_uploaded_file", { title: "Read Uploaded File", description: "Reads the content of a file that has been uploaded by the user.", inputSchema: { filename: zod_1.z.string() } }, async ({ filename }) => ({ content: [{ type: "text", text: await (0, index_1.readUploadedFile)(filename) }] }));
    defineTool("web_search", { description: "Searches the web and returns a summary of the top results.", inputSchema: { query: zod_1.z.string() } }, async ({ query }) => ({ content: [{ type: "text", text: await (0, index_1.web_search)(query, model) }] }));
    defineTool("web_read", { description: "Reads a webpage.", inputSchema: { url: zod_1.z.string() } }, async ({ url }) => ({ content: [{ type: "text", text: await (0, index_1.view_text_website)(url) }] }));
    defineTool("save_note", { description: "Saves a note to the notepad. Optionally, a category and tags can be provided for organization.", inputSchema: { note_content: zod_1.z.string(), category: zod_1.z.string().optional(), tags: zod_1.z.array(zod_1.z.string()).optional() } }, async ({ note_content, category, tags }) => ({ content: [{ type: "text", text: await (0, index_1.save_note)(note_content, category, tags) }] }));
    defineTool("read_notes", { description: "Reads all notes from the notepad.", inputSchema: {} }, async () => ({ content: [{ type: "text", text: await (0, index_1.read_notes)() }] }));
    defineTool("semantic_search_notes", { description: "Performs a semantic search on the stored notes to find relevant information based on meaning and context.", inputSchema: { query: zod_1.z.string() } }, async ({ query }) => ({ content: [{ type: "text", text: await (0, index_1.semanticSearchNotes)(query, model) }] }));
    defineTool("search_notes_by_tag", { description: "Searches for notes that have a specific tag.", inputSchema: { tag: zod_1.z.string() } }, async ({ tag }) => ({ content: [{ type: "text", text: await (0, index_1.searchNotesByTag)(tag) }] }));
    defineTool("summarize_text", { description: "Summarizes a given text concisely.", inputSchema: { text: zod_1.z.string() } }, async ({ text }) => ({ content: [{ type: "text", text: await (0, index_1.summarizeText)(text, model) }] }));
    defineTool("read_chat_history", { description: "Reads the recent chat history.", inputSchema: { num_lines: zod_1.z.number().optional() } }, async ({ num_lines }) => ({ content: [{ type: "text", text: await (0, index_1.readChatHistory)(num_lines) }] }));
    defineTool("calculator", {
        description: "Evaluates a mathematical expression. Supports basic arithmetic.",
        inputSchema: {
            expression: zod_1.z.string().describe("The mathematical expression to solve.")
        }
    }, async ({ expression }) => ({ content: [{ type: "text", text: await (0, index_1.calculate)(expression) }] }));
    defineTool("get_current_datetime", {
        description: "Gets the current date, time, and day of the week.",
        inputSchema: {}
    }, async () => ({ content: [{ type: "text", text: await (0, index_1.getCurrentDateTime)() }] }));
    defineTool("paper_generator", { description: "Generates a research paper.", inputSchema: { topic: zod_1.z.string() } }, async ({ topic }) => {
        const paperGenerator = new paper_generator_1.default({ model, web_search: (q) => (0, index_1.web_search)(q, model), view_text_website: index_1.view_text_website });
        const paper = await paperGenerator.generate(topic);
        return { content: [{ type: "text", text: paper }] };
    });
    defineTool("save_speech_to_file", { description: "Synthesizes text and saves it as an MP3 file.", inputSchema: { text: zod_1.z.string(), filename: zod_1.z.string() } }, async ({ text, filename }) => ({ content: [{ type: "text", text: await (0, index_1.save_speech_to_file)(text, filename, ttsClient) }] }));
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
    }, async ({ query, options }) => ({ content: [{ type: "text", text: await (0, index_1.video_search)(query, options) }] }));
    defineTool("generate_image", {
        description: "Generates an image from a text prompt using Stable Diffusion (local) or DALL-E (OpenAI).",
        inputSchema: {
            prompt: zod_1.z.string().describe("A detailed description of the image to generate."),
            negative_prompt: zod_1.z.string().optional().describe("What to avoid in the image (Stable Diffusion only)."),
            width: zod_1.z.number().optional().describe("Image width in pixels (default: 512, max: 1024)."),
            height: zod_1.z.number().optional().describe("Image height in pixels (default: 512, max: 1024)."),
            steps: zod_1.z.number().optional().describe("Number of inference steps (default: 20, max: 50)."),
            guidance_scale: zod_1.z.number().optional().describe("How closely to follow the prompt (default: 7.5, range: 1-20)."),
            seed: zod_1.z.number().optional().describe("Random seed for reproducible results."),
            use_stable_diffusion: zod_1.z.boolean().optional().describe("Force use of Stable Diffusion (default: true if available).")
        }
    }, async ({ prompt, negative_prompt, width, height, steps, guidance_scale, seed, use_stable_diffusion = true }) => {
        try {
            const sdAvailable = await (0, image_generation_1.checkStableDiffusionHealth)();
            let imageResult;
            let serviceUsed;
            if (use_stable_diffusion && sdAvailable) {
                imageResult = await (0, image_generation_1.generateImageWithStableDiffusion)(prompt, {
                    negative_prompt,
                    width,
                    height,
                    num_inference_steps: steps,
                    guidance_scale,
                    seed
                });
                serviceUsed = 'Stable Diffusion (Local)';
            }
            else {
                imageResult = await (0, image_generation_1.generateImage)(prompt, {
                    preferStableDiffusion: use_stable_diffusion,
                    stableDiffusionOptions: {
                        negative_prompt,
                        width,
                        height,
                        num_inference_steps: steps,
                        guidance_scale,
                        seed
                    }
                });
                serviceUsed = sdAvailable ? 'Stable Diffusion (Local)' : 'DALL-E (OpenAI)';
            }
            const isDataUrl = imageResult.startsWith('data:image/');
            return {
                content: [
                    {
                        type: 'text',
                        text: `Image generated successfully using ${serviceUsed}!\n\nPrompt: "${prompt}"${negative_prompt ? `\nNegative prompt: "${negative_prompt}"` : ''}${seed ? `\nSeed: ${seed}` : ''}\n\n${isDataUrl ? 'Image data is embedded.' : `You can view it here: ${imageResult}`}`,
                    }
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}. Please check that either Stable Diffusion server is running or OpenAI API key is configured.`,
                    },
                ],
            };
        }
    });
    defineTool(update_persona_1.default.name, update_persona_1.default.definition, update_persona_1.default.implementation);
    return { toolImplementations };
}
