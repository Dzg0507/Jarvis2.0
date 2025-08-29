import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import * as textToSpeech from '@google-cloud/text-to-speech';



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

export const readUploadedFile = async (filename: string): Promise<string> => {
    console.log(`[Tool:readUploadedFile] Called with filename: "${filename}"`);
    try {
        const uploadDir = path.join(process.cwd(), 'uploads');
        const resolvedPath = path.resolve(path.join(uploadDir, filename));

        // Security check: Ensure the file path is within the 'uploads' directory
        if (!resolvedPath.startsWith(uploadDir)) {
            return "Error: Access denied. You can only access files within the 'uploads' directory.";
        }

        return await fsPromises.readFile(resolvedPath, 'utf-8');
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return `Error: File not found: ${filename}`;
        }
        return `Error reading uploaded file: ${error.message}`;
    }
};

export * from './web-search.js';

export const view_text_website = async (url: string): Promise<string> => {
  console.log(`[Tool:view_text_website] Called with URL: "${url}"`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error: any) {
    return `Error reading website: ${error.message}`;
  }
}

export * from './video-search.js';
export * from './notepad.js';
export * from './calculator.js';
export * from './system.js';
export * from './clipboard.js';

export const save_speech_to_file = async (
    text: string,
    filename: string,
    ttsClient: textToSpeech.TextToSpeechClient
): Promise<string> => {
    console.log(`[Tool:save_speech_to_file] Called with filename: "${filename}"`);
    try {
        const request = {
            input: { text },
            voice: { languageCode: 'en-US', name: 'en-US-Wavenet-D' },
            audioConfig: { audioEncoding: 'MP3' as const },
        };
        const [response] = await ttsClient.synthesizeSpeech(request);
        if (!response.audioContent) {
            return "Error: Failed to synthesize speech, no audio content received.";
        }
        const audioDir = path.join(process.cwd(), 'public', 'audio');
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
        }
        const filePath = path.join(audioDir, `${filename}.mp3`);
        await fsPromises.writeFile(filePath, response.audioContent, 'binary');
        return `Successfully saved speech to public/audio/${filename}.mp3`;
    } catch (error: any) {
        return `Error saving speech to file: ${error.message}`;
    }
};