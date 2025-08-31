"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'search_notes_by_tag',
    definition: {
        title: 'Search Notes by Tag',
        description: 'Searches for notes that have a specific tag.',
        inputSchema: {
            tag: zod_1.z.string().describe('The tag to search for.'),
        },
    },
    implementation: async ({ tag }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.searchNotesByTag)(tag),
                },
            ],
        };
    },
};
