"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'save_speech_to_file',
    definition: {
        title: 'Save Speech to File',
        description: 'Synthesizes text and saves it as an MP3 file.',
        inputSchema: {
            text: zod_1.z.string(),
            filename: zod_1.z.string(),
        },
    },
    implementation: async ({ text, filename }, dependencies) => {
        const { ttsClient } = dependencies;
        if (!ttsClient) {
            throw new Error("TTS client not available");
        }
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.save_speech_to_file)(text, filename, ttsClient),
                },
            ],
        };
    },
};
