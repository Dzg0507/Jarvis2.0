import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({
  apiKey: config.ai.openaiApiKey,
});

export async function generateImage(prompt: string): Promise<string> {
  if (!config.ai.openaiApiKey) {
    throw new Error('OpenAI API key not configured.');
  }

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
  });

  if (response.data && response.data.length > 0 && response.data[0].url) {
    return response.data[0].url;
  } else {
    throw new Error("Failed to generate image or image URL not found.");
  }
}
