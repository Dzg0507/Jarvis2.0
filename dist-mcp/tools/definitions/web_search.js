"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const generative_ai_1 = require("@google/generative-ai");
const index_js_1 = require("../index.js");
const config_js_1 = require("../../config.js");
const genAI = new generative_ai_1.GoogleGenerativeAI(config_js_1.config.ai.apiKey);
const model = genAI.getGenerativeModel({ model: config_js_1.config.ai.modelName });
exports.default = {
    name: 'web_search',
    definition: {
        title: 'Web Search',
        description: 'Searches the web and returns a summary of the top results.',
        inputSchema: {
            query: zod_1.z.string(),
        },
    },
    implementation: async ({ query }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.web_search)(query, model),
                },
            ],
        };
    },
};
