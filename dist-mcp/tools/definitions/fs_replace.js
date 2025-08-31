"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'fs_replace',
    definition: {
        title: 'Replace File Content',
        description: 'Replaces occurrences of a specified old string with a new string within a file.',
        inputSchema: {
            filePath: zod_1.z.string().describe('The absolute path to the file to modify.'),
            oldString: zod_1.z.string().describe('The exact literal text to replace.'),
            newString: zod_1.z.string().describe('The exact literal text to replace oldString with.'),
            expectedReplacements: zod_1.z.number().optional().describe('The number of replacements expected. Defaults to 1 if not specified. Use when you want to replace multiple occurrences.'),
        },
    },
    implementation: async ({ filePath, oldString, newString, expectedReplacements }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.replaceFileContent)(filePath, oldString, newString, expectedReplacements),
                },
            ],
        };
    },
};
