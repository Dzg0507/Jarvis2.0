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
/**
 * Saves a note to the notepad.txt file.
 * @param note_content The content of the note to save.
 * @returns A confirmation message.
 */
async function save_note(note_content) {
    try {
        // Append the new note with a timestamp
        await fs_1.promises.appendFile(notepadFile, `${new Date().toISOString()}: ${note_content}\n\n`);
        return `Note saved successfully.`;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error saving note:', errorMessage);
        return `Error saving note: ${errorMessage}`;
    }
}
/**
 * Reads all notes from the notepad.txt file.
 * @returns The content of the notepad file, or a message if it's empty.
 */
async function read_notes() {
    try {
        // Check if the file exists before trying to read it
        await fs_1.promises.access(notepadFile);
        const notes = await fs_1.promises.readFile(notepadFile, 'utf-8');
        return notes.trim().length > 0 ? notes : 'The notepad is currently empty.';
    }
    catch (error) {
        // If the file doesn't exist, it's just an empty notepad.
        if (error.code === 'ENOENT') {
            return 'The notepad is currently empty.';
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error reading notes:', errorMessage);
        return `Error reading notes: ${errorMessage}`;
    }
}
