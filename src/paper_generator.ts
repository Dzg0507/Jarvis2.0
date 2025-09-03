import { z } from 'zod';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as textToSpeech from '@google-cloud/text-to-speech';
import PaperGenerator from './tools/paper-generator';
import { listFiles, readFile, createFile, searchFileContent, replaceFileContent, readUploadedFile, view_text_website, save_speech_to_file, video_search, web_search, save_note, read_notes, semanticSearchNotes, searchNotesByTag, summarizeText, readChatHistory, addToClipboard, readClipboardHistory, searchClipboard, clearClipboardHistory, calculate, getCurrentDateTime, executeShellCommand } from '@/src/tools/index';
import { config } from '@/src/config';
import updatePersonaTool from '@/src/tools/definitions/update_persona';

export function getToolConfig(genAI: GoogleGenerativeAI, ttsClient: textToSpeech.TextToSpeechClient) {
    const model = genAI.getGenerativeModel({ model: config.ai.modelName as string });

    const toolImplementations: { name: string, definition: any, implementation: (input: any) => Promise<any> }[] = [];

    const defineTool = (name: string, definition: any, implementation: (input: any) => Promise<any>) => {
        toolImplementations.push({ name, definition, implementation });
    };

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
        "fs_create", { description: "Creates a new file with the specified content.", inputSchema: { path: z.string(), content: z.string() } },
        async ({ path, content }: { path: string, content: string }) => ({ content: [{ type: "text", text: await createFile(path, content) }] })
    );

    defineTool(
        "fs_search", { description: "Searches for a regular expression pattern within the content of files in a specified directory.", inputSchema: { pattern: z.string(), path: z.string().optional(), include: z.string().optional() } },
        async ({ pattern, path, include }: { pattern: string, path?: string, include?: string }) => ({ content: [{ type: "text", text: await searchFileContent(pattern, path, include) }] })
    );

    defineTool(
        "fs_replace", { description: "Replaces occurrences of a specified old string with a new string within a file.", inputSchema: { filePath: z.string(), oldString: z.string(), newString: z.string(), expectedReplacements: z.number().optional() } },
        async ({ filePath, oldString, newString, expectedReplacements }: { filePath: string, oldString: string, newString: string, expectedReplacements?: number }) => ({ content: [{ type: "text", text: await replaceFileContent(filePath, oldString, newString, expectedReplacements) }] })
    );

    defineTool(
        "shell_execute", { description: "Executes a shell command.", inputSchema: { command: z.string() } },
        async ({ command }: { command: string }) => ({ content: [{ type: "text", text: await executeShellCommand(command) }] })
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
        "save_note", { description: "Saves a note to the notepad. Optionally, a category and tags can be provided for organization.", inputSchema: { note_content: z.string(), category: z.string().optional(), tags: z.array(z.string()).optional() } },
        async ({ note_content, category, tags }: { note_content: string, category?: string, tags?: string[] }) => ({ content: [{ type: "text", text: await save_note(note_content, category, tags) }] })
    );

    defineTool(
        "read_notes", { description: "Reads all notes from the notepad.", inputSchema: {} },
        async () => ({ content: [{ type: "text", text: await read_notes() }] })
    );

    defineTool(
        "semantic_search_notes", { description: "Performs a semantic search on the stored notes to find relevant information based on meaning and context.", inputSchema: { query: z.string() } },
        async ({ query }: { query: string }) => ({ content: [{ type: "text", text: await semanticSearchNotes(query, model) }] })
    );

    defineTool(
        "search_notes_by_tag", { description: "Searches for notes that have a specific tag.", inputSchema: { tag: z.string() } },
        async ({ tag }: { tag: string }) => ({ content: [{ type: "text", text: await searchNotesByTag(tag) }] })
    );

    defineTool(
        "summarize_text", { description: "Summarizes a given text concisely.", inputSchema: { text: z.string() } },
        async ({ text }: { text: string }) => ({ content: [{ type: "text", text: await summarizeText(text, model) }] })
    );

    defineTool(
        "read_chat_history", { description: "Reads the recent chat history.", inputSchema: { num_lines: z.number().optional() } },
        async ({ num_lines }: { num_lines?: number }) => ({ content: [{ type: "text", text: await readChatHistory(num_lines) }] })
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
            const paperGenerator = new PaperGenerator({ model, web_search: (q: string) => web_search(q, model), view_text_website });
            const paper = await paperGenerator.generate(topic);
            return { content: [{ type: "text", text: paper }] };
        }
    );

    defineTool(
        "save_speech_to_file", { description: "Synthesizes text and saves it as an MP3 file.", inputSchema: { text: z.string(), filename: z.string() } },
        async ({ text, filename }: { text: string, filename: string }) => ({ content: [{ type: "text", text: await save_speech_to_file(text, filename, ttsClient) }] })
    );

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

    defineTool(updatePersonaTool.name, updatePersonaTool.definition, updatePersonaTool.implementation);

    return { toolImplementations };
}
