import { z } from 'zod';
import { generateImage } from '../image-generation.js';

export default {
  name: 'generate_image',
  definition: {
    description: 'Generates an image from a text prompt.',
    inputSchema: {
        prompt: z.string().describe("A detailed description of the image to generate.")
    }
  },
  implementation: async ({ prompt }: { prompt: string }) => {
    const imageUrl = await generateImage(prompt);
    return {
      content: [
        {
          type: 'text',
          text: `Image generated successfully. You can view it here: ${imageUrl}`,
        },
      ],
    };
  },
};