import { z } from 'zod';
import { readChatHistory } from '../index.js';

export default {
  name: 'read_chat_history',
  definition: {
    title: 'Read Chat History',
    description: 'Reads the recent chat history.',
    inputSchema: {
      num_lines: z.number().optional().describe('The number of recent lines to read from the chat history. Defaults to 20.'),
    },
  },
  implementation: async ({ num_lines }: { num_lines?: number }) => {
    return {
      content: [
        {
          type: 'text',
          text: await readChatHistory(num_lines),
        },
      ],
    };
  },
};