"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../index.js");
exports.default = {
    name: 'read_notes',
    definition: {
        title: 'Read Notes',
        description: 'Reads all notes from the notepad.',
        inputSchema: {},
    },
    implementation: async () => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.read_notes)(),
                },
            ],
        };
    },
};
