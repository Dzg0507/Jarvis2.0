"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const image_generation_js_1 = require("../image-generation.js");
exports.default = {
    name: 'generate_image',
    definition: {
        description: 'Generates an image from a text prompt.',
        inputSchema: {
            prompt: zod_1.z.string().describe("A detailed description of the image to generate.")
        }
    },
    implementation: async ({ prompt }) => {
        const imageUrl = await (0, image_generation_js_1.generateImage)(prompt);
        return {
            content: [
                {
                    type: 'text',
                    text: `Image generated successfully. You can view it here: ${imageUrl}`,
                },
            ],
        };
    },
};
