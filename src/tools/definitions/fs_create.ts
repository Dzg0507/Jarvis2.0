import { z } from 'zod';
import { createFile } from '../index.js';

export default {
  name: 'fs_create',
  definition: {
    title: 'Create File',
    description: 'Creates a new file with the specified content.',
    inputSchema: {
      path: z.string().describe('The path where the file should be created.'),
      content: z.string().describe('The content to write to the file.'),
    },
  },
  implementation: async ({ path, content }: { path: string; content: string }) => {
    return {
      content: [
        {
          type: 'text',
          text: await createFile(path, content),
        },
      ],
    };
  },
};
