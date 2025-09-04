import OpenAI from 'openai';
import { config } from '../config';
import { longFetch } from '../utils/long-fetch';

const openai = new OpenAI({
  apiKey: config.ai.openaiApiKey,
});

// Service priority validation and status
export interface ServiceStatus {
  stableDiffusion: {
    available: boolean;
    enabled: boolean;
    priority: number;
    url: string;
  };
  openai: {
    available: boolean;
    enabled: boolean;
    priority: number;
  };
  recommendedService: 'stable_diffusion' | 'openai' | 'none';
  priorityOrder: string[];
}

interface StableDiffusionRequest {
  prompt: string;
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  width?: number;
  height?: number;
  seed?: number;
}

interface StableDiffusionResponse {
  success: boolean;
  image?: string; // base64 data URL
  error?: string;
  prompt?: string;
  seed?: number;
  device?: string;
}

export async function generateImageWithStableDiffusion(
  prompt: string,
  options: Partial<StableDiffusionRequest> = {}
): Promise<string> {
  if (!config.stableDiffusion.enabled) {
    throw new Error('Stable Diffusion is disabled. Enable it in configuration.');
  }

  const requestData: StableDiffusionRequest = {
    prompt,
    negative_prompt: options.negative_prompt || '',
    num_inference_steps: options.num_inference_steps || 20,
    guidance_scale: options.guidance_scale || 7.5,
    width: options.width || 512,
    height: options.height || 512,
    seed: options.seed,
  };

  try {
    console.log(`[SD Generation] Starting Stable Diffusion generation with 20-minute timeout...`);
    const response = await longFetch(`${config.stableDiffusion.serverUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
      timeoutMs: 20 * 60 * 1000, // 20 minutes
    });

    if (!response.ok) {
      throw new Error(`Stable Diffusion server error: ${response.status}`);
    }

    const result: StableDiffusionResponse = await response.json();

    if (result.success && result.image) {
      return result.image; // Returns base64 data URL
    } else {
      throw new Error(result.error || 'Failed to generate image with Stable Diffusion');
    }
  } catch (error) {
    console.error('Stable Diffusion generation failed:', error);

    // Don't fallback here - let the calling function handle fallback logic
    // This ensures we respect the user's preference for Stable Diffusion
    throw error;
  }
}

export async function generateImageWithOpenAI(prompt: string): Promise<string> {
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

// Main function that chooses the best available service with enhanced priority logic
export async function generateImage(
  prompt: string,
  options: {
    preferStableDiffusion?: boolean;
    stableDiffusionOptions?: Partial<StableDiffusionRequest>;
  } = {}
): Promise<string> {
  const { preferStableDiffusion = true, stableDiffusionOptions = {} } = options;

  console.log(`[Image Generation] Starting image generation with prompt: "${prompt.substring(0, 50)}..."`);
  console.log(`[Image Generation] Stable Diffusion preference: ${preferStableDiffusion}, enabled: ${config.stableDiffusion.enabled}`);

  // Force Stable Diffusion only mode - never fallback
  if (config.stableDiffusion.forceStableDiffusion) {
    console.log('[Image Generation] Force Stable Diffusion mode enabled - no fallback allowed');
    if (!config.stableDiffusion.enabled) {
      throw new Error('Stable Diffusion is forced but not enabled in configuration');
    }
    return await generateImageWithStableDiffusion(prompt, stableDiffusionOptions);
  }

  // Try Stable Diffusion first if preferred and enabled (with retry logic)
  if (preferStableDiffusion && config.stableDiffusion.enabled) {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.stableDiffusion.maxRetries; attempt++) {
      try {
        console.log(`[Image Generation] Attempting Stable Diffusion generation (attempt ${attempt}/${config.stableDiffusion.maxRetries})`);
        const result = await generateImageWithStableDiffusion(prompt, stableDiffusionOptions);
        console.log('[Image Generation] Stable Diffusion generation successful');
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`[Image Generation] Stable Diffusion attempt ${attempt} failed:`, error);

        if (attempt < config.stableDiffusion.maxRetries) {
          console.log(`[Image Generation] Retrying Stable Diffusion in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.error(`[Image Generation] All ${config.stableDiffusion.maxRetries} Stable Diffusion attempts failed`);

    // Fallback to OpenAI if available and fallback is enabled
    if (config.stableDiffusion.fallbackToOpenAI && config.ai.openaiApiKey) {
      console.log('[Image Generation] Falling back to OpenAI DALL-E...');
      return await generateImageWithOpenAI(prompt);
    }

    throw lastError || new Error('Stable Diffusion generation failed after all retries');
  }

  // Use OpenAI if Stable Diffusion not preferred or not available
  if (config.ai.openaiApiKey) {
    console.log('[Image Generation] Using OpenAI DALL-E as primary service');
    return await generateImageWithOpenAI(prompt);
  }

  throw new Error('No image generation service available. Configure either Stable Diffusion or OpenAI.');
}

// Validate and get service priority status
export async function getServiceStatus(): Promise<ServiceStatus> {
  const sdAvailable = await checkStableDiffusionHealth();
  const openaiAvailable = !!config.ai.openaiApiKey;

  const status: ServiceStatus = {
    stableDiffusion: {
      available: sdAvailable,
      enabled: config.stableDiffusion.enabled,
      priority: config.stableDiffusion.priority,
      url: config.stableDiffusion.serverUrl
    },
    openai: {
      available: openaiAvailable,
      enabled: !!config.ai.openaiApiKey,
      priority: 2 // Always lower priority than Stable Diffusion
    },
    recommendedService: 'none',
    priorityOrder: []
  };

  // Determine recommended service based on availability and priority
  if (status.stableDiffusion.available && status.stableDiffusion.enabled) {
    status.recommendedService = 'stable_diffusion';
    status.priorityOrder.push('Stable Diffusion (Local)');
  }

  if (status.openai.available && status.openai.enabled) {
    if (status.recommendedService === 'none') {
      status.recommendedService = 'openai';
    }
    status.priorityOrder.push('DALL-E (OpenAI)');
  }

  console.log('[Service Status] Current service priority:', status.priorityOrder);
  console.log('[Service Status] Recommended service:', status.recommendedService);

  return status;
}

// Health check for Stable Diffusion server
export async function checkStableDiffusionHealth(): Promise<boolean> {
  if (!config.stableDiffusion.enabled) {
    console.log('[SD Health] Stable Diffusion is disabled in configuration');
    return false;
  }

  try {
    console.log(`[SD Health] Checking Stable Diffusion health at ${config.stableDiffusion.serverUrl}/health`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.stableDiffusion.healthCheckTimeout);

    const response = await fetch(`${config.stableDiffusion.serverUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const isHealthy = response.ok;
    console.log(`[SD Health] Stable Diffusion health check result: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    return isHealthy;
  } catch (error) {
    console.error('[SD Health] Stable Diffusion health check failed:', error);
    return false;
  }
}
