import { z } from 'zod';
import { summarizeText } from '../index.js';

export default {
  name: 'summarize_text',
  definition: {
    title: 'Summarize Text',
    description: 'Summarizes a given text concisely.',
    inputSchema: {
      text: z.string().describe('The text to summarize.'),
    },
  },
  implementation: async ({ text }: { text: string }, dependencies: any) => {
    const { model } = dependencies;
    if (!model) {
        throw new Error("Model not available for text summarization");
    }
    return {
      content: [
        {
          type: 'text',
          text: await summarizeText(text, model),
        },
      ],
    };
  },
};