import { z } from 'zod';
import { generateImage, generateImageWithStableDiffusion, checkStableDiffusionHealth } from '../image-generation.js';

export default {
  name: 'generate_image',
  definition: {
    description: 'Generates an image from a text prompt. PRIORITIZES Stable Diffusion (local) over DALL-E (OpenAI). Stable Diffusion provides better control and runs locally for privacy.',
    inputSchema: {
      prompt: z.string().describe("A detailed description of the image to generate."),
      negative_prompt: z.string().optional().describe("What to avoid in the image (Stable Diffusion only)."),
      width: z.number().optional().describe("Image width in pixels (default: 512, max: 1024)."),
      height: z.number().optional().describe("Image height in pixels (default: 512, max: 1024)."),
      steps: z.number().optional().describe("Number of inference steps (default: 20, max: 50)."),
      guidance_scale: z.number().optional().describe("How closely to follow the prompt (default: 7.5, range: 1-20)."),
      seed: z.number().optional().describe("Random seed for reproducible results."),
      use_stable_diffusion: z.boolean().optional().describe("Prefer Stable Diffusion over other services (default: true - STRONGLY RECOMMENDED).")
    }
  },
  implementation: async ({
    prompt,
    negative_prompt,
    width,
    height,
    steps,
    guidance_scale,
    seed,
    use_stable_diffusion = true
  }: {
    prompt: string;
    negative_prompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    guidance_scale?: number;
    seed?: number;
    use_stable_diffusion?: boolean;
  }) => {
    try {
      console.log(`[Image Tool] Image generation requested with Stable Diffusion preference: ${use_stable_diffusion}`);

      // Check if Stable Diffusion is available and preferred
      const sdAvailable = await checkStableDiffusionHealth();
      console.log(`[Image Tool] Stable Diffusion availability: ${sdAvailable}`);

      let imageResult: string;
      let serviceUsed: string;

      if (use_stable_diffusion && sdAvailable) {
        console.log('[Image Tool] Using Stable Diffusion with advanced options');
        // Use Stable Diffusion with advanced options
        imageResult = await generateImageWithStableDiffusion(prompt, {
          negative_prompt,
          width,
          height,
          num_inference_steps: steps,
          guidance_scale,
          seed
        });
        serviceUsed = 'Stable Diffusion (Local)';
      } else {
        console.log('[Image Tool] Using fallback generation logic');
        // Fallback to general function (will try SD then OpenAI)
        imageResult = await generateImage(prompt, {
          preferStableDiffusion: use_stable_diffusion,
          stableDiffusionOptions: {
            negative_prompt,
            width,
            height,
            num_inference_steps: steps,
            guidance_scale,
            seed
          }
        });
        serviceUsed = sdAvailable ? 'Stable Diffusion (Local)' : 'DALL-E (OpenAI)';
      }

      // Check if result is a data URL (base64) or regular URL
      const isDataUrl = imageResult.startsWith('data:image/');

      return {
        content: [
          {
            type: 'text',
            text: `Image generated successfully using ${serviceUsed}!\n\nPrompt: "${prompt}"${negative_prompt ? `\nNegative prompt: "${negative_prompt}"` : ''}${seed ? `\nSeed: ${seed}` : ''}\n\n${isDataUrl ? 'Image data is embedded below.' : `You can view it here: ${imageResult}`}`,
          },
          ...(isDataUrl ? [{
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: imageResult.split(',')[1] // Remove data:image/png;base64, prefix
            }
          }] : [])
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}. Please check that either Stable Diffusion server is running or OpenAI API key is configured.`,
          },
        ],
      };
    }
  },
};