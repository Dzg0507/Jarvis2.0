"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'fs_read',
    definition: {
        title: 'Read File',
        description: 'Reads the content of a file.',
        inputSchema: {
            path: zod_1.z.string(),
        },
    },
    implementation: async ({ path }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.readFile)(path),
                },
            ],
        };
    },
};
