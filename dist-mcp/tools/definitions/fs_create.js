"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'fs_create',
    definition: {
        title: 'Create File',
        description: 'Creates a new file with the specified content.',
        inputSchema: {
            path: zod_1.z.string().describe('The path where the file should be created.'),
            content: zod_1.z.string().describe('The content to write to the file.'),
        },
    },
    implementation: async ({ path, content }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.createFile)(path, content),
                },
            ],
        };
    },
};
