"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
exports.default = {
    name: 'update_persona',
    definition: {
        title: 'Update Persona',
        description: 'Updates the AI\'s persona for the current session. This is useful for adapting to the user\'s needs or the context of the conversation.',
        inputSchema: {
            new_prompt: zod_1.z.string().describe('The new system prompt for the AI.'),
        },
    },
    implementation: async ({ new_prompt }) => {
        // This tool is handled by the client, so the implementation is just a placeholder.
        return {
            content: [
                {
                    type: 'text',
                    text: `Persona updated to: ${new_prompt}`,
                },
            ],
        };
    },
};
