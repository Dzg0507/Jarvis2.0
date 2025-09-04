import { NextRequest, NextResponse } from 'next/server';
import { generateImage, generateImageWithStableDiffusion, checkStableDiffusionHealth } from '@/src/tools/image-generation';
import { config } from '@/src/config';

export const dynamic = 'force-dynamic'; // Ensures this route is not statically optimized
export const maxDuration = 1200; // 20 minutes timeout for image generation
export const revalidate = 0; // Disable caching completely

interface ImageGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance_scale?: number;
  seed?: number;
  use_stable_diffusion?: boolean;
}

interface ImageGenerationResponse {
  success: boolean;
  image?: string;
  service_used?: string;
  prompt?: string;
  seed?: number;
  error?: string;
  available_services?: {
    stable_diffusion: boolean;
    openai: boolean;
  };
}

export async function POST(req: NextRequest): Promise<NextResponse<ImageGenerationResponse>> {
  try {
    const body: ImageGenerationRequest = await req.json();
    
    // Validate required fields
    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Prompt is required and must be a string'
      }, { status: 400 });
    }

    // Validate optional parameters
    const {
      prompt,
      negative_prompt = '',
      width = 512,
      height = 512,
      steps = 20,
      guidance_scale = 7.5,
      seed,
      use_stable_diffusion = true
    } = body;

    // Validate ranges
    if (width < 64 || width > 1024 || height < 64 || height > 1024) {
      return NextResponse.json({
        success: false,
        error: 'Width and height must be between 64 and 1024 pixels'
      }, { status: 400 });
    }

    if (steps < 1 || steps > 50) {
      return NextResponse.json({
        success: false,
        error: 'Steps must be between 1 and 50'
      }, { status: 400 });
    }

    if (guidance_scale < 1 || guidance_scale > 20) {
      return NextResponse.json({
        success: false,
        error: 'Guidance scale must be between 1 and 20'
      }, { status: 400 });
    }

    // Check service availability with detailed logging
    console.log('[API Image] Checking service availability...');
    const sdAvailable = await checkStableDiffusionHealth();
    const openaiAvailable = !!config.ai.openaiApiKey;

    console.log(`[API Image] Service status - Stable Diffusion: ${sdAvailable}, OpenAI: ${openaiAvailable}`);
    console.log(`[API Image] Configuration - SD Enabled: ${config.stableDiffusion.enabled}, Force SD: ${config.stableDiffusion.forceStableDiffusion}`);

    if (!sdAvailable && !openaiAvailable) {
      console.error('[API Image] No image generation services available');
      return NextResponse.json({
        success: false,
        error: 'No image generation service available. Please ensure Stable Diffusion server is running at ' + config.stableDiffusion.serverUrl + ' or configure OpenAI API key.',
        available_services: {
          stable_diffusion: false,
          openai: false
        },
        service_urls: {
          stable_diffusion: config.stableDiffusion.serverUrl
        }
      }, { status: 503 });
    }

    // Warn if Stable Diffusion is not available but preferred
    if (!sdAvailable && use_stable_diffusion) {
      console.warn('[API Image] Stable Diffusion requested but not available, will fallback to OpenAI');
    }

    let imageResult: string;
    let serviceUsed: string;

    try {
      console.log(`[API Image] Starting generation with service preference: ${use_stable_diffusion ? 'Stable Diffusion' : 'Any available'}`);

      if (use_stable_diffusion && sdAvailable) {
        console.log('[API Image] Using Stable Diffusion with advanced options');
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
        console.log('[API Image] Stable Diffusion generation completed successfully');
      } else {
        console.log('[API Image] Using fallback generation logic');
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
        console.log(`[API Image] Generation completed using: ${serviceUsed}`);
      }

      // Add cache-busting timestamp and debugging info
      const timestamp = Date.now();
      const imageLength = typeof imageResult === 'string' ? imageResult.length : 0;
      const imagePreview = typeof imageResult === 'string' ? imageResult.substring(0, 100) + '...' : 'No image data';

      console.log(`[API Image] Generated image at timestamp: ${timestamp}`);
      console.log(`[API Image] Image data length: ${imageLength} characters`);
      console.log(`[API Image] Image preview: ${imagePreview}`);

      const response = NextResponse.json({
        success: true,
        image: imageResult,
        service_used: serviceUsed,
        prompt,
        seed,
        timestamp,
        debug: {
          image_length: imageLength,
          generation_time: timestamp
        },
        available_services: {
          stable_diffusion: sdAvailable,
          openai: openaiAvailable
        }
      });

      // Add cache-busting headers
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');

      return response;

    } catch (generationError) {
      console.error('Image generation failed:', generationError);
      
      return NextResponse.json({
        success: false,
        error: generationError instanceof Error ? generationError.message : 'Image generation failed',
        available_services: {
          stable_diffusion: sdAvailable,
          openai: openaiAvailable
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Image generation API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    // Health check endpoint
    const sdAvailable = await checkStableDiffusionHealth();
    const openaiAvailable = !!config.ai.openaiApiKey;

    return NextResponse.json({
      status: 'healthy',
      services: {
        stable_diffusion: {
          enabled: config.stableDiffusion.enabled,
          available: sdAvailable,
          url: config.stableDiffusion.serverUrl
        },
        openai: {
          available: openaiAvailable,
          fallback_enabled: config.stableDiffusion.fallbackToOpenAI
        }
      },
      default_settings: {
        width: 512,
        height: 512,
        steps: 20,
        guidance_scale: 7.5
      }
    });

  } catch (error) {
    console.error('Image generation health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 500 });
  }
}
