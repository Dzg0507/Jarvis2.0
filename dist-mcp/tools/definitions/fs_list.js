"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'fs_list',
    definition: {
        title: 'List Files',
        description: 'Lists files and directories.',
        inputSchema: {
            path: zod_1.z.string(),
        },
    },
    implementation: async ({ path }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.listFiles)(path),
                },
            ],
        };
    },
};
