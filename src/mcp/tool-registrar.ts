import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as textToSpeech from '@google-cloud/text-to-speech';
import PaperGenerator from '../tools/paper-generator.js';
import { listFiles, readFile, readUploadedFile, view_text_website, save_speech_to_file, video_search, web_search, save_note, read_notes, addToClipboard, readClipboardHistory, searchClipboard, clearClipboardHistory, calculate, getCurrentDateTime } from '../tools/index.js';
import { config } from '../config.js';
import updatePersonaTool from '../tools/definitions/update_persona.js';

export function getToolConfig(genAI: GoogleGenerativeAI, ttsClient: textToSpeech.TextToSpeechClient) {
    const model = genAI.getGenerativeModel({ model: config.ai.modelName as string });

    const toolImplementations: { name: string, definition: any, implementation: (input: any) => Promise<any> }[] = [];

    const defineTool = (name: string, definition: any, implementation: (input: any) => Promise<any>) => {
        toolImplementations.push({ name, definition, implementation });
    };

    // --- All other tool definitions remain the same ---


      defineTool(
        "clipboard_add", { title: "Add to Clipboard", description: "Adds a new text entry to the clipboard history.", inputSchema: { text: z.string() } },
        async ({ text }: { text: string }) => ({ content: [{ type: "text", text: addToClipboard(text) }] })
    );

    defineTool(
        "clipboard_read", { title: "Read Clipboard", description: "Reads the entire clipboard history.", inputSchema: {} },
        async () => ({ content: [{ type: "text", text: readClipboardHistory() }] })
    );

    defineTool(
        "clipboard_search", { title: "Search Clipboard", description: "Searches the clipboard history for a given query.", inputSchema: { query: z.string() } },
        async ({ query }: { query: string }) => ({ content: [{ type: "text", text: searchClipboard(query) }] })
    );

     defineTool(
        "clipboard_clear", { title: "Clear Clipboard", description: "Clears the entire clipboard history.", inputSchema: {} },
        async () => ({ content: [{ type: "text", text: clearClipboardHistory() }] })
    );

    defineTool(
        "fs_list", { description: "Lists files and directories.", inputSchema: { path: z.string() } },
        async ({ path }: { path: string }) => ({ content: [{ type: "text", text: await listFiles(path) }] })
    );

    defineTool(
        "fs_read", { description: "Reads the content of a file.", inputSchema: { path: z.string() } },
        async ({ path }: { path: string }) => ({ content: [{ type: "text", text: await readFile(path) }] })
    );

    defineTool(
        "read_uploaded_file", { title: "Read Uploaded File", description: "Reads the content of a file that has been uploaded by the user.", inputSchema: { filename: z.string() } },
        async ({ filename }: { filename: string }) => ({ content: [{ type: "text", text: await readUploadedFile(filename) }] })
    );

    defineTool(
        "web_search", { description: "Searches the web and returns a summary of the top results.", inputSchema: { query: z.string() } },
        async ({ query }: { query: string }) => ({ content: [{ type: "text", text: await web_search(query, model) }] })
    );

    defineTool(
        "web_read", { description: "Reads a webpage.", inputSchema: { url: z.string() } },
        async ({ url }: { url: string }) => ({ content: [{ type: "text", text: await view_text_website(url) }] })
    );

    defineTool(
        "save_note", { description: "Saves a note to the notepad.", inputSchema: { note_content: z.string() } },
        async ({ note_content }: { note_content: string }) => ({ content: [{ type: "text", text: await save_note(note_content) }] })
    );

    defineTool(
        "read_notes", { description: "Reads all notes from the notepad.", inputSchema: {} },
        async () => ({ content: [{ type: "text", text: await read_notes() }] })
    );

defineTool(
        "calculator", {
            description: "Evaluates a mathematical expression. Supports basic arithmetic.",
            inputSchema: {
                expression: z.string().describe("The mathematical expression to solve.")
            }
        },
        async ({ expression }: { expression: string }) => ({ content: [{ type: "text", text: await calculate(expression) }] })
    );

    defineTool(
        "get_current_datetime", {
            description: "Gets the current date, time, and day of the week.",
            inputSchema: {}
        },
        async () => ({ content: [{ type: "text", text: await getCurrentDateTime() }] })
    );

    defineTool(
        "paper_generator", { description: "Generates a research paper.", inputSchema: { topic: z.string() } },
        async ({ topic }: { topic: string }) => {
            const paperGenerator = new PaperGenerator({ model, web_search: (q) => web_search(q, model), view_text_website });
            const paper = await paperGenerator.generate(topic);
            return { content: [{ type: "text", text: paper }] };
        }
    );

    defineTool(
        "save_speech_to_file", { description: "Synthesizes text and saves it as an MP3 file.", inputSchema: { text: z.string(), filename: z.string() } },
        async ({ text, filename }: { text: string, filename: string }) => ({ content: [{ type: "text", text: await save_speech_to_file(text, filename, ttsClient) }] })
    );

    // --- START OF MODIFICATION ---
    // This is the new, more detailed definition for the video_search tool.
    defineTool(
        "video_search", {
            description: "Searches for videos and returns a list of results with thumbnails.",
            inputSchema: {
                query: z.string().describe("The primary search term for the videos."),
                options: z.object({
                    maxResults: z.number().optional().describe("Maximum number of results to return. Defaults to 10."),
                    duration: z.enum(['short', 'medium', 'long']).optional().describe("Filter by video duration."),
                    sortBy: z.enum(['relevance', 'date']).optional().describe("Sort results by relevance or date (most recent). 'date' is best for recent uploads.")
                }).optional().describe("Optional parameters to refine the search.")
            }
        },
        async ({ query, options }: { query: string, options: any }) => ({ content: [{ type: "text", text: await video_search(query, options) }] })
    );
    // --- END OF MODIFICATION ---

    defineTool(updatePersonaTool.name, updatePersonaTool.definition, updatePersonaTool.implementation);

    return { toolImplementations };
}