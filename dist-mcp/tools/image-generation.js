"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateImage = generateImage;
const openai_1 = __importDefault(require("openai"));
const config_js_1 = require("../config.js");
const openai = new openai_1.default({
    apiKey: config_js_1.config.ai.openaiApiKey,
});
async function generateImage(prompt) {
    if (!config_js_1.config.ai.openaiApiKey) {
        throw new Error('OpenAI API key not configured.');
    }
    const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
    });
    if (response.data && response.data.length > 0 && response.data[0].url) {
        return response.data[0].url;
    }
    else {
        throw new Error("Failed to generate image or image URL not found.");
    }
}
