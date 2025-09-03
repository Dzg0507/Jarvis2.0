import { z } from 'zod';
import { readUploadedFile } from '../index';

export default {
  name: 'read_uploaded_file',
  definition: {
    title: 'Read Uploaded File',
    description: 'Reads the content of a file that has been uploaded by the user.',
    inputSchema: {
      filename: z.string().describe('The name of the file to read.'),
    },
  },
  implementation: async ({ filename }: { filename: string }) => {
    return {
      content: [
        {
          type: 'text',
          text: await readUploadedFile(filename),
        },
      ],
    };
  },
};
