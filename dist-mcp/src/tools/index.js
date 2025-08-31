"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.save_speech_to_file = exports.readUploadedFile = exports.readChatHistory = exports.summarizeText = exports.searchNotesByTag = exports.semanticSearchNotes = exports.replaceFileContent = exports.searchFileContent = exports.executeShellCommand = exports.createFile = exports.readFile = exports.listFiles = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const notepad_1 = require("./notepad");
const fsPromises = fs_1.default.promises;
const listFiles = async (dirPath, fsPromisesOverride = null) => {
    console.log(`[Tool:listFiles] Called with path: "${dirPath}"`);
    const fsToUse = fsPromisesOverride || fs_1.default.promises;
    try {
        const resolvedPath = path_1.default.resolve(dirPath);
        if (!resolvedPath.startsWith(process.cwd())) {
            return "Error: Access denied. You can only access files within the project directory.";
        }
        const files = await fsToUse.readdir(resolvedPath, { withFileTypes: true });
        return files.map(file => file.isDirectory() ? `${file.name}/` : file.name).join('\n');
    }
    catch (error) {
        return `Error listing files: ${error.message}`;
    }
};
exports.listFiles = listFiles;
const readFile = async (filePath) => {
    console.log(`[Tool:readFile] Called with path: "${filePath}"`);
    try {
        const resolvedPath = path_1.default.resolve(filePath);
        if (!resolvedPath.startsWith(process.cwd())) {
            return "Error: Access denied. You can only access files within the project directory.";
        }
        return await fsPromises.readFile(resolvedPath, 'utf-8');
    }
    catch (error) {
        return `Error reading file: ${error.message}`;
    }
};
exports.readFile = readFile;
const createFile = async (filePath, content) => {
    console.log(`[Tool:createFile] Called with path: "${filePath}"`);
    try {
        const resolvedPath = path_1.default.resolve(filePath);
        if (!resolvedPath.startsWith(process.cwd())) {
            return "Error: Access denied. You can only create files within the project directory.";
        }
        await fsPromises.writeFile(resolvedPath, content, 'utf-8');
        return `File created successfully at ${filePath}`;
    }
    catch (error) {
        return `Error creating file: ${error.message}`;
    }
};
exports.createFile = createFile;
const executeShellCommand = async (command) => {
    console.log(`[Tool:executeShellCommand] Called with command: "${command}"`);
    return `EXECUTE_SHELL_COMMAND_PERMISSION_REQUEST:::${command}`;
};
exports.executeShellCommand = executeShellCommand;
const searchFileContent = async (pattern, searchPath, include) => {
    console.log(`[Tool:searchFileContent] Called with pattern: "${pattern}", path: "${searchPath}", include: "${include}"`);
    // This is a placeholder. In a real implementation, you would use a library
    // like `glob` and `fs` to search file content.
    return `Searching for pattern "${pattern}" in ${searchPath || 'current directory'} (include: ${include || 'all files'})... (Not yet implemented)`;
};
exports.searchFileContent = searchFileContent;
const replaceFileContent = async (filePath, oldString, newString, expectedReplacements) => {
    console.log(`[Tool:replaceFileContent] Called with filePath: "${filePath}", oldString: "${oldString}", newString: "${newString}", expectedReplacements: ${expectedReplacements}`);
    try {
        const resolvedPath = path_1.default.resolve(filePath);
        if (!resolvedPath.startsWith(process.cwd())) {
            return "Error: Access denied. You can only modify files within the project directory.";
        }
        let content = await fsPromises.readFile(resolvedPath, 'utf-8');
        let replacedContent = content;
        let replacementsMade = 0;
        if (expectedReplacements === undefined || expectedReplacements === 1) {
            // Replace only the first occurrence if expectedReplacements is 1 or undefined
            const index = replacedContent.indexOf(oldString);
            if (index !== -1) {
                replacedContent = replacedContent.substring(0, index) + newString + replacedContent.substring(index + oldString.length);
                replacementsMade = 1;
            }
        }
        else {
            // Replace all occurrences if expectedReplacements is specified and > 1
            let tempContent = '';
            let lastIndex = 0;
            let matchCount = 0;
            while ((lastIndex = content.indexOf(oldString, lastIndex)) !== -1) {
                tempContent += content.substring(matchCount === 0 ? 0 : lastIndex - oldString.length, lastIndex) + newString;
                lastIndex += oldString.length;
                matchCount++;
            }
            tempContent += content.substring(lastIndex);
            replacedContent = tempContent;
            replacementsMade = matchCount;
        }
        if (expectedReplacements !== undefined && replacementsMade !== expectedReplacements) {
            return `Error: Expected ${expectedReplacements} replacements but made ${replacementsMade}. No changes were saved.`;
        }
        await fsPromises.writeFile(resolvedPath, replacedContent, 'utf-8');
        return `Successfully replaced content in ${filePath}. Replacements made: ${replacementsMade}.`;
    }
    catch (error) {
        return `Error replacing content in file: ${error.message}`;
    }
};
exports.replaceFileContent = replaceFileContent;
const semanticSearchNotes = async (query, model) => {
    console.log(`[Tool:semanticSearchNotes] Called with query: "${query}"`);
    try {
        const allNotesContent = await (0, notepad_1.read_notes)();
        if (allNotesContent === 'The notepad is currently empty.') {
            return 'No notes found to search.';
        }
        const notesArray = allNotesContent.split('\n\n').filter(note => note.trim() !== '');
        // Simple keyword filtering to reduce the number of notes sent to the model
        const keywordFilteredNotes = notesArray.filter(note => note.toLowerCase().includes(query.toLowerCase()));
        let notesToRank = keywordFilteredNotes.length > 0 ? keywordFilteredNotes : notesArray;
        // To avoid sending too much data to the model, we might limit the number of notes.
        const prompt = `Given the following notes, rank them by their semantic relevance to the query: "${query}".
    Return only the notes, ordered from most to least relevant. If a note is not relevant, do not include it.

    Notes:
    ${notesToRank.join('\n\n')}

    Ranked Relevant Notes:`;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        if (responseText.trim() === '') {
            return 'No semantically relevant notes found.';
        }
        return responseText;
    }
    catch (error) {
        return `Error performing semantic search on notes: ${error.message}`;
    }
};
exports.semanticSearchNotes = semanticSearchNotes;
const searchNotesByTag = async (tag) => {
    console.log(`[Tool:searchNotesByTag] Called with tag: "${tag}"`);
    try {
        const allNotesContent = await (0, notepad_1.read_notes)();
        if (allNotesContent === 'The notepad is currently empty.') {
            return 'No notes found to search by tag.';
        }
        const notesArray = allNotesContent.split('\n\n').filter(note => note.trim() !== '');
        const matchingNotes = notesArray.filter(note => note.toLowerCase().includes(`[tags: ${tag.toLowerCase()}]`) ||
            note.toLowerCase().includes(`[tags: ${tag.toLowerCase()},`) ||
            note.toLowerCase().includes(`, ${tag.toLowerCase()}]`) ||
            note.toLowerCase().includes(`, ${tag.toLowerCase()},`));
        if (matchingNotes.length === 0) {
            return `No notes found with tag: "${tag}".`;
        }
        return matchingNotes.join('\n\n');
    }
    catch (error) {
        return `Error searching notes by tag: ${error.message}`;
    }
};
exports.searchNotesByTag = searchNotesByTag;
const summarizeText = async (text, model) => {
    console.log(`[Tool:summarizeText] Called with text length: ${text.length}`);
    try {
        const prompt = `Summarize the following text concisely:\n\n${text}\n\nSummary:`;
        const result = await model.generateContent(prompt);
        return result.response.text();
    }
    catch (error) {
        return `Error summarizing text: ${error.message}`;
    }
};
exports.summarizeText = summarizeText;
const chatHistoryFile = path_1.default.join(process.cwd(), 'chat_history.txt');
const readChatHistory = async (num_lines = 20) => {
    console.log(`[Tool:readChatHistory] Called to read last ${num_lines} lines.`);
    try {
        await fsPromises.access(chatHistoryFile); // Check if file exists
        const content = await fsPromises.readFile(chatHistoryFile, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const recentLines = lines.slice(-num_lines); // Get last N lines
        return recentLines.join('\n');
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return 'Chat history is empty.';
        }
        return `Error reading chat history: ${error.message}`;
    }
};
exports.readChatHistory = readChatHistory;
// Re-exporting tools from other files
// Placeholder for readUploadedFile
const readUploadedFile = async (filename) => {
    console.log(`[Tool:readUploadedFile] Called with filename: "${filename}"`);
    try {
        const filePath = path_1.default.join(process.cwd(), 'uploads', filename);
        const content = await fsPromises.readFile(filePath, 'utf-8');
        return content;
    }
    catch (error) {
        return `Error reading uploaded file: ${error.message}`;
    }
};
exports.readUploadedFile = readUploadedFile;
// Placeholder for save_speech_to_file
const save_speech_to_file = async (text, filename, ttsClient) => {
    console.log(`[Tool:save_speech_to_file] Called with text length: ${text.length}, filename: "${filename}"`);
    try {
        // This is a placeholder. In a real implementation, you would use the ttsClient
        // to synthesize speech and save it to a file.
        return `Speech synthesized and saved to ${filename} (placeholder).`;
    }
    catch (error) {
        return `Error saving speech to file: ${error.message}`;
    }
};
exports.save_speech_to_file = save_speech_to_file;
__exportStar(require("./web-search"), exports);
__exportStar(require("./video-search"), exports);
__exportStar(require("./notepad"), exports);
__exportStar(require("./calculator"), exports);
__exportStar(require("./system"), exports);
__exportStar(require("./image-generation"), exports);
__exportStar(require("./clipboard"), exports);
__exportStar(require("../tools"), exports);
