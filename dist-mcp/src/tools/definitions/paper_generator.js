"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const generative_ai_1 = require("@google/generative-ai");
const paper_generator_js_1 = __importDefault(require("../paper-generator.js"));
const index_js_1 = require("../index.js");
const config_js_1 = require("../../config.js");
const genAI = new generative_ai_1.GoogleGenerativeAI(config_js_1.config.ai.apiKey);
const model = genAI.getGenerativeModel({ model: config_js_1.config.ai.modelName });
exports.default = {
    name: 'paper_generator',
    definition: {
        title: 'Paper Generator',
        description: 'Generates a research paper.',
        inputSchema: {
            topic: zod_1.z.string(),
        },
    },
    implementation: async ({ topic }) => {
        const paperGenerator = new paper_generator_js_1.default({ model, web_search: (q) => (0, index_js_1.web_search)(q, model), view_text_website: index_js_1.view_text_website });
        const paper = await paperGenerator.generate(topic);
        return {
            content: [
                {
                    type: 'text',
                    text: paper,
                },
            ],
        };
    },
};
