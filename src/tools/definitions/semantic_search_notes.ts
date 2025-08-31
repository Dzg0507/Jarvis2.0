import { z } from 'zod';
import { semanticSearchNotes } from '../index.js';

export default {
  name: 'semantic_search_notes',
  definition: {
    title: 'Semantic Search Notes',
    description: 'Performs a semantic search on the stored notes to find relevant information based on meaning and context.',
    inputSchema: {
      query: z.string().describe('The natural language query for the semantic search.'),
    },
  },
  implementation: async ({ query }: { query: string }, dependencies: any) => {
    const { model } = dependencies;
    if (!model) {
        throw new Error("Model not available for semantic search");
    }
    return {
      content: [
        {
          type: 'text',
          text: await semanticSearchNotes(query, model),
        },
      ],
    };
  },
};