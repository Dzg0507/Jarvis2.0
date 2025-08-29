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
exports.save_speech_to_file = exports.view_text_website = exports.readFile = exports.listFiles = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
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
__exportStar(require("./web-search.js"), exports);
const view_text_website = async (url) => {
    console.log(`[Tool:view_text_website] Called with URL: "${url}"`);
    try {
        const response = await (0, node_fetch_1.default)(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    }
    catch (error) {
        return `Error reading website: ${error.message}`;
    }
};
exports.view_text_website = view_text_website;
__exportStar(require("./video-search.js"), exports);
__exportStar(require("./notepad.js"), exports);
__exportStar(require("./calculator.js"), exports);
__exportStar(require("./system.js"), exports);
__exportStar(require("./clipboard.js"), exports);
const save_speech_to_file = async (text, filename, ttsClient) => {
    console.log(`[Tool:save_speech_to_file] Called with filename: "${filename}"`);
    try {
        const request = {
            input: { text },
            voice: { languageCode: 'en-US', name: 'en-US-Wavenet-D' },
            audioConfig: { audioEncoding: 'MP3' },
        };
        const [response] = await ttsClient.synthesizeSpeech(request);
        if (!response.audioContent) {
            return "Error: Failed to synthesize speech, no audio content received.";
        }
        const audioDir = path_1.default.join(process.cwd(), 'public', 'audio');
        if (!fs_1.default.existsSync(audioDir)) {
            fs_1.default.mkdirSync(audioDir, { recursive: true });
        }
        const filePath = path_1.default.join(audioDir, `${filename}.mp3`);
        await fsPromises.writeFile(filePath, response.audioContent, 'binary');
        return `Successfully saved speech to public/audio/${filename}.mp3`;
    }
    catch (error) {
        return `Error saving speech to file: ${error.message}`;
    }
};
exports.save_speech_to_file = save_speech_to_file;
