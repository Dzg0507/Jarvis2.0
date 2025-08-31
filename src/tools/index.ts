import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import * as textToSpeech from '@google-cloud/text-to-speech';
import { read_notes } from './notepad';

const fsPromises = fs.promises;

// Allow dependency injection for testing
type FsPromises = typeof fs.promises;

export const listFiles = async (
  dirPath: string,
  fsPromisesOverride: FsPromises | null = null
): Promise<string> => {
  console.log(`[Tool:listFiles] Called with path: "${dirPath}"`);
  const fsToUse = fsPromisesOverride || fs.promises;
  try {
    const resolvedPath = path.resolve(dirPath);
    if (!resolvedPath.startsWith(process.cwd())) {
      return "Error: Access denied. You can only access files within the project directory.";
    }
    const files = await fsToUse.readdir(resolvedPath, { withFileTypes: true });
    return files.map(file => file.isDirectory() ? `${file.name}/` : file.name).join('\n');
  } catch (error: any) {
    return `Error listing files: ${error.message}`;
  }
}

export const readFile = async (filePath: string): Promise<string> => {
  console.log(`[Tool:readFile] Called with path: "${filePath}"`);
  try {
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(process.cwd())) {
      return "Error: Access denied. You can only access files within the project directory.";
    }
    return await fsPromises.readFile(resolvedPath, 'utf-8');
  } catch (error: any) {
    return `Error reading file: ${error.message}`;
  }
}

export const createFile = async (filePath: string, content: string): Promise<string> => {
    console.log(`[Tool:createFile] Called with path: "${filePath}"`);
    try {
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(process.cwd())) {
            return "Error: Access denied. You can only create files within the project directory.";
        }
        await fsPromises.writeFile(resolvedPath, content, 'utf-8');
        return `File created successfully at ${filePath}`;
    } catch (error: any) {
        return `Error creating file: ${error.message}`;
    }
}

export const executeShellCommand = async (command: string): Promise<string> => {
    console.log(`[Tool:executeShellCommand] Called with command: "${command}"`);
    return `EXECUTE_SHELL_COMMAND_PERMISSION_REQUEST:::${command}`;
}

export const searchFileContent = async (pattern: string, searchPath?: string, include?: string): Promise<string> => {
  console.log(`[Tool:searchFileContent] Called with pattern: "${pattern}", path: "${searchPath}", include: "${include}"`);
  // This is a placeholder. In a real implementation, you would use a library
  // like `glob` and `fs` to search file content.
  return `Searching for pattern "${pattern}" in ${searchPath || 'current directory'} (include: ${include || 'all files'})... (Not yet implemented)`;
}

export const replaceFileContent = async (filePath: string, oldString: string, newString: string, expectedReplacements?: number): Promise<string> => {
  console.log(`[Tool:replaceFileContent] Called with filePath: "${filePath}", oldString: "${oldString}", newString: "${newString}", expectedReplacements: ${expectedReplacements}`);
  try {
    const resolvedPath = path.resolve(filePath);
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
    } else {
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
  } catch (error: any) {
    return `Error replacing content in file: ${error.message}`;
  }
}

export const semanticSearchNotes = async (query: string, model: any): Promise<string> => {
  console.log(`[Tool:semanticSearchNotes] Called with query: "${query}"`);
  try {
    const allNotesContent = await read_notes();
    if (allNotesContent === 'The notepad is currently empty.') {
      return 'No notes found to search.';
    }

    const notesArray = allNotesContent.split('\n\n').filter(note => note.trim() !== '');

    // Simple keyword filtering to reduce the number of notes sent to the model
    const keywordFilteredNotes = notesArray.filter(note =>
      note.toLowerCase().includes(query.toLowerCase())
    );

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

  } catch (error: any) {
    return `Error performing semantic search on notes: ${error.message}`;
  }
}

export const searchNotesByTag = async (tag: string): Promise<string> => {
  console.log(`[Tool:searchNotesByTag] Called with tag: "${tag}"`);
  try {
    const allNotesContent = await read_notes();
    if (allNotesContent === 'The notepad is currently empty.') {
      return 'No notes found to search by tag.';
    }

    const notesArray = allNotesContent.split('\n\n').filter(note => note.trim() !== '');
    const matchingNotes = notesArray.filter(note =>
      note.toLowerCase().includes(`[tags: ${tag.toLowerCase()}]`) ||
      note.toLowerCase().includes(`[tags: ${tag.toLowerCase()},`) ||
      note.toLowerCase().includes(`, ${tag.toLowerCase()}]`) ||
      note.toLowerCase().includes(`, ${tag.toLowerCase()},`)
    );

    if (matchingNotes.length === 0) {
      return `No notes found with tag: "${tag}".`;
    }

    return matchingNotes.join('\n\n');

  } catch (error: any) {
    return `Error searching notes by tag: ${error.message}`;
  }
}

export const summarizeText = async (text: string, model: any): Promise<string> => {
  console.log(`[Tool:summarizeText] Called with text length: ${text.length}`);
  try {
    const prompt = `Summarize the following text concisely:\n\n${text}\n\nSummary:`
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    return `Error summarizing text: ${error.message}`;
  }
}

const chatHistoryFile = path.join(process.cwd(), 'chat_history.txt');

export const readChatHistory = async (num_lines: number = 20): Promise<string> => {
  console.log(`[Tool:readChatHistory] Called to read last ${num_lines} lines.`);
  try {
    await fsPromises.access(chatHistoryFile); // Check if file exists
    const content = await fsPromises.readFile(chatHistoryFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const recentLines = lines.slice(-num_lines); // Get last N lines
    return recentLines.join('\n');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return 'Chat history is empty.';
    }
    return `Error reading chat history: ${error.message}`;
  }
}

// Re-exporting tools from other files
// Placeholder for readUploadedFile
export const readUploadedFile = async (filename: string): Promise<string> => {
  console.log(`[Tool:readUploadedFile] Called with filename: "${filename}"`);
  try {
    const filePath = path.join(process.cwd(), 'uploads', filename);
    const content = await fsPromises.readFile(filePath, 'utf-8');
    return content;
  } catch (error: any) {
    return `Error reading uploaded file: ${error.message}`;
  }
};

// Placeholder for save_speech_to_file
export const save_speech_to_file = async (text: string, filename: string, ttsClient: any): Promise<string> => {
  console.log(`[Tool:save_speech_to_file] Called with text length: ${text.length}, filename: "${filename}"`);
  try {
    // This is a placeholder. In a real implementation, you would use the ttsClient
    // to synthesize speech and save it to a file.
    return `Speech synthesized and saved to ${filename} (placeholder).`;
  } catch (error: any) {
    return `Error saving speech to file: ${error.message}`;
  }
};

export * from './web-search';
export * from './video-search';
export * from './notepad';
export * from './calculator';
export * from './system';
export * from './image-generation';
export * from './clipboard';
export * from '../tools';
