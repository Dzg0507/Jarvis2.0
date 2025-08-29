"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'save_note',
    definition: {
        title: 'Save Note',
        description: 'Saves a note to the notepad.',
        inputSchema: {
            note_content: zod_1.z.string(),
        },
    },
    implementation: async ({ note_content }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.save_note)(note_content),
                },
            ],
        };
    },
};
