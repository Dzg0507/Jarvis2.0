"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'web_read',
    definition: {
        title: 'Web Read',
        description: 'Reads a webpage.',
        inputSchema: {
            url: zod_1.z.string(),
        },
    },
    implementation: async ({ url }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.view_text_website)(url),
                },
            ],
        };
    },
};
