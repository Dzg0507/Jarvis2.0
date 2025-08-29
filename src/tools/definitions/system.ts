// Create this new file at: src/tools/definitions/system.ts

import { z } from 'zod';
import { getCurrentDateTime } from '../system.js';

export default {
  name: 'get_current_datetime',
  definition: {
    description: 'Gets the current date, time, and day of the week from the system.',
    inputSchema: {} // This tool takes no input parameters
  },
  implementation: async () => {
    return {
      content: [
        {
          type: 'text',
          text: await getCurrentDateTime(),
        },
      ],
    };
  },
};