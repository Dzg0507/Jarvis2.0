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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const tool_utils_js_1 = require("./tool-utils.js");
const fs = __importStar(require("fs"));
const index = __importStar(require("./index.js"));
// Mock the fs module
vitest_1.vi.mock('fs', () => ({
    promises: {
        readFile: vitest_1.vi.fn(),
        writeFile: vitest_1.vi.fn(),
        readdir: vitest_1.vi.fn(),
    },
}));
// Mock the index module, so we can mock the functions inside it
vitest_1.vi.mock('./index.js', () => ({
    listFiles: vitest_1.vi.fn(),
    readFile: vitest_1.vi.fn(),
    view_text_website: vitest_1.vi.fn(),
    save_speech_to_file: vitest_1.vi.fn(),
    video_search: vitest_1.vi.fn(),
    web_search: vitest_1.vi.fn(),
    save_note: vitest_1.vi.fn(),
    read_notes: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('Tool Overhaul', () => {
    (0, vitest_1.describe)('fs_read tool', () => {
        let fsReadTool;
        (0, vitest_1.beforeEach)(async () => {
            const { default: toolDefinition } = await import('./definitions/fs_read.js');
            fsReadTool = (0, tool_utils_js_1.createTool)(toolDefinition);
            vitest_1.vi.mocked(fs.promises.readFile).mockReset();
        });
        (0, vitest_1.it)('should read a file successfully', async () => {
            const filePath = 'test.txt';
            const fileContent = 'hello world';
            vitest_1.vi.mocked(index.readFile).mockResolvedValue(fileContent);
            const result = await fsReadTool.implementation({ path: filePath });
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.data.content[0].text).toBe(fileContent);
        });
        (0, vitest_1.it)('should handle file not found errors', async () => {
            const filePath = 'not-found.txt';
            const errorMessage = 'ENOENT: no such file or directory';
            vitest_1.vi.mocked(index.readFile).mockRejectedValue(new Error(errorMessage));
            const result = await fsReadTool.implementation({ path: filePath });
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toContain(errorMessage);
        });
        (0, vitest_1.it)('should return an error for invalid input', async () => {
            const result = await fsReadTool.implementation({ pth: 'test.txt' }); // intentional typo
            (0, vitest_1.expect)(result.success).toBe(false);
            (0, vitest_1.expect)(result.error).toContain('Invalid input');
        });
    });
    (0, vitest_1.describe)('web_search tool', () => {
        let webSearchTool;
        (0, vitest_1.beforeEach)(async () => {
            vitest_1.vi.stubEnv('API_KEY', 'test-api-key');
            const { default: toolDefinition } = await import('./definitions/web_search.js');
            webSearchTool = (0, tool_utils_js_1.createTool)(toolDefinition);
            vitest_1.vi.mocked(index.web_search).mockReset();
        });
        (0, vitest_1.it)('should perform a web search successfully', async () => {
            const query = 'test query';
            const searchResult = 'Search results for "test query"';
            vitest_1.vi.mocked(index.web_search).mockResolvedValue(searchResult);
            const result = await webSearchTool.implementation({ query });
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.data.content[0].text).toBe(searchResult);
        });
    });
});
