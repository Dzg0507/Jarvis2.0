// Create this new file at: src/tools/definitions/calculator.ts

import { z } from 'zod';
import { calculate } from '../calculator.js';

export default {
  name: 'calculator',
  definition: {
    description: 'Evaluates a mathematical expression and returns the result. Supports basic arithmetic operations (+, -, *, /).',
    inputSchema: {
        expression: z.string().describe("The mathematical expression to be solved. Example: '5 * (10 + 2)'")
    }
  },
  implementation: async ({ expression }: { expression: string }) => {
    return {
      content: [
        {
          type: 'text',
          text: await calculate(expression),
        },
      ],
    };
  },
};