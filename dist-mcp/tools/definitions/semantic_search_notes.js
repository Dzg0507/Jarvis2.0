"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'semantic_search_notes',
    definition: {
        title: 'Semantic Search Notes',
        description: 'Performs a semantic search on the stored notes to find relevant information based on meaning and context.',
        inputSchema: {
            query: zod_1.z.string().describe('The natural language query for the semantic search.'),
        },
    },
    implementation: async ({ query }, dependencies) => {
        const { model } = dependencies;
        if (!model) {
            throw new Error("Model not available for semantic search");
        }
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.semanticSearchNotes)(query, model),
                },
            ],
        };
    },
};
