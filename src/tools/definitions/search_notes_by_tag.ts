import { z } from 'zod';
import { searchNotesByTag } from '../index.js';

export default {
  name: 'search_notes_by_tag',
  definition: {
    title: 'Search Notes by Tag',
    description: 'Searches for notes that have a specific tag.',
    inputSchema: {
      tag: z.string().describe('The tag to search for.'),
    },
  },
  implementation: async ({ tag }: { tag: string }) => {
    return {
      content: [
        {
          type: 'text',
          text: await searchNotesByTag(tag),
        },
      ],
    };
  },
};