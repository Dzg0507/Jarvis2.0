"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.save_note = save_note;
exports.read_notes = read_notes;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const notepadFile = path_1.default.join(process.cwd(), 'notepad.txt');
async function save_note(note_content, category, tags) {
    try {
        let formattedContent = `${new Date().toISOString()}`;
        if (category) {
            formattedContent += ` [Category: ${category}]`;
        }
        if (tags && tags.length > 0) {
            formattedContent += ` [Tags: ${tags.join(', ')}]`;
        }
        formattedContent += `: ${note_content}\n\n`;
        await fs_1.promises.appendFile(notepadFile, formattedContent);
        return `Note saved successfully.`;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error saving note:', errorMessage);
        return `Error saving note: ${errorMessage}`;
    }
}
async function read_notes() {
    try {
        await fs_1.promises.access(notepadFile);
        const notes = await fs_1.promises.readFile(notepadFile, 'utf-8');
        return notes.trim().length > 0 ? notes : 'The notepad is currently empty.';
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return 'The notepad is currently empty.';
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error reading notes:', errorMessage);
        return `Error reading notes: ${errorMessage}`;
    }
}
