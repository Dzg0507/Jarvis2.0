"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
exports.default = {
    name: 'video_search',
    definition: {
        title: 'Video Search',
        description: 'Searches for videos and returns a list of results with thumbnails.',
        inputSchema: {
            query: zod_1.z.string(),
            options: zod_1.z.object({
                maxResults: zod_1.z.number().optional(),
                sortBy: zod_1.z.string().optional(),
                uploadedAfter: zod_1.z.string().optional().nullable(),
                duration: zod_1.z.enum(['short', 'medium', 'long', 'any']).optional(),
                quality: zod_1.z.enum(['high', 'medium', 'low', 'any']).optional()
            }).optional()
        }
    },
    implementation: async ({ query, options }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, index_js_1.video_search)(query, options),
                },
            ],
        };
    },
};
