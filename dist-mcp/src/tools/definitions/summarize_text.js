"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'summarize_text',
    definition: {
        title: 'Summarize Text',
        description: 'Summarizes a given text concisely.',
        inputSchema: {
            text: zod_1.z.string().describe('The text to summarize.'),
        },
    },
    implementation: async ({ text }, dependencies) => {
        const { model } = dependencies;
        if (!model) {
            throw new Error("Model not available for text summarization");
        }
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.summarizeText)(text, model),
                },
            ],
        };
    },
};
