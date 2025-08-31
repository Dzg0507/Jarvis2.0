"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'fs_search',
    definition: {
        title: 'Search File Content',
        description: 'Searches for a regular expression pattern within the content of files in a specified directory.',
        inputSchema: {
            pattern: zod_1.z.string().describe('The regular expression (regex) pattern to search for.'),
            path: zod_1.z.string().optional().describe('The directory to search within. If omitted, searches the current working directory.'),
            include: zod_1.z.string().optional().describe('A glob pattern to filter which files are searched (e.g., "*.js", "*.{ts,tsx}").'),
        },
    },
    implementation: async ({ pattern, path, include }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.searchFileContent)(pattern, path, include),
                },
            ],
        };
    },
};
