"use strict";
// Create this new file at: src/tools/definitions/calculator.ts
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const calculator_js_1 = require("../calculator.js");
exports.default = {
    name: 'calculator',
    definition: {
        description: 'Evaluates a mathematical expression and returns the result. Supports basic arithmetic operations (+, -, *, /).',
        inputSchema: {
            expression: zod_1.z.string().describe("The mathematical expression to be solved. Example: '5 * (10 + 2)'")
        }
    },
    implementation: async ({ expression }) => {
        return {
            content: [
                {
                    type: 'text',
                    text: await (0, calculator_js_1.calculate)(expression),
                },
            ],
        };
    },
};
