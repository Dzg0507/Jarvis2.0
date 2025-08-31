"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'read_chat_history',
    definition: {
        title: 'Read Chat History',
        description: 'Reads the recent chat history.',
        inputSchema: {
            num_lines: zod_1.z.number().optional().describe('The number of recent lines to read from the chat history. Defaults to 20.'),
        },
    },
    implementation: async ({ num_lines }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.readChatHistory)(num_lines),
                },
            ],
        };
    },
};
