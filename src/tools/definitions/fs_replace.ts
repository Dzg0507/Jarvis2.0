import { z } from 'zod';
import { replaceFileContent } from '../index.js';

export default {
  name: 'fs_replace',
  definition: {
    title: 'Replace File Content',
    description: 'Replaces occurrences of a specified old string with a new string within a file.',
    inputSchema: {
      filePath: z.string().describe('The absolute path to the file to modify.'),
      oldString: z.string().describe('The exact literal text to replace.'),
      newString: z.string().describe('The exact literal text to replace oldString with.'),
      expectedReplacements: z.number().optional().describe('The number of replacements expected. Defaults to 1 if not specified. Use when you want to replace multiple occurrences.'),
    },
  },
  implementation: async ({ filePath, oldString, newString, expectedReplacements }: { filePath: string; oldString: string; newString: string; expectedReplacements?: number }) => {
    return {
      content: [
        {
          type: 'text',
          text: await replaceFileContent(filePath, oldString, newString, expectedReplacements),
        },
      ],
    };
  },
};