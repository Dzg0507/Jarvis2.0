import { z } from 'zod';
import { searchFileContent } from '../index.js';

export default {
  name: 'fs_search',
  definition: {
    title: 'Search File Content',
    description: 'Searches for a regular expression pattern within the content of files in a specified directory.',
    inputSchema: {
      pattern: z.string().describe('The regular expression (regex) pattern to search for.'),
      path: z.string().optional().describe('The directory to search within. If omitted, searches the current working directory.'),
      include: z.string().optional().describe('A glob pattern to filter which files are searched (e.g., "*.js", "*.{ts,tsx}").'),
    },
  },
  implementation: async ({ pattern, path, include }: { pattern: string; path?: string; include?: string }) => {
    return {
      content: [
        {
          type: 'text',
          text: await searchFileContent(pattern, path, include),
        },
      ],
    };
  },
};