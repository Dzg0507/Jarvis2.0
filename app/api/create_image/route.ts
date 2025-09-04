import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 1200;
export const revalidate = 0;

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();
        
        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        // Generate random seed to force different images every time
        const randomSeed = Math.floor(Math.random() * 1000000);

        // Enhance the prompt for better quality (optimized for adult content)
        const enhancedPrompt = `${query}, high quality, detailed, masterpiece, best quality, sharp focus, professional photography, 8k uhd, realistic, photorealistic, highly detailed, beautiful face, perfect anatomy, smooth skin, detailed eyes, detailed hair, perfect proportions, studio lighting`;

        console.log(`[Direct Image] Generating image for: "${query}"`);
        console.log(`[Direct Image] Enhanced prompt: "${enhancedPrompt}"`);
        console.log(`[Direct Image] Using random seed: ${randomSeed}`);

        // Try Colab server first (much faster), fallback to local
        const colabUrl = 'https://e7774c08b4f2.ngrok-free.app/generate';
        const localUrl = 'http://localhost:5002/generate';

        let response;
        let serverUsed = 'unknown';

        // Try Colab first
        try {
            console.log('[Direct Image] Trying Colab server (16GB GPU)...');
            response = await fetch(colabUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
            },
                body: JSON.stringify({
                    prompt: enhancedPrompt,
                    negative_prompt: "ugly, deformed, disfigured, poor details, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, mutated hands and fingers, disconnected limbs, mutation, mutated, disgusting, blurry, amputation, extra fingers, fewer fingers, extra hands, bad hands, sketches, lowres, normal quality, worstquality, signature, watermark, username, blurry, bad feet, cropped, poorly drawn hands, poorly drawn face, mutation, deformed, worst quality, low quality, jpeg artifacts, extra fingers, fewer digits, extra limbs, extra arms, extra legs, malformed limbs, fused fingers, too many fingers, long neck, mutated hands, bad body, bad proportions, gross proportions, text, error, missing fingers, missing arms, missing legs, extra digit, extra arms, extra leg, extra foot, bad face, asymmetric eyes, cross-eyed, uneven eyes, bad teeth, bad lips, bad nose, bad ears, bad hair, bad skin, scars, moles, wrinkles, old, elderly",
                    width: 768,  // Higher resolution on powerful Colab GPU
                    height: 768, // Higher resolution on powerful Colab GPU
                    num_inference_steps: 30, // Much higher quality - still fast on T4
                    guidance_scale: 8.0, // Slightly higher for better prompt adherence
                    seed: randomSeed
                }),
                // Shorter timeout for Colab (should be much faster)
                signal: AbortSignal.timeout(180000) // 3 minutes
            });
            serverUsed = 'colab';
            console.log('[Direct Image] Colab server responded successfully');

        } catch (colabError) {
            console.log('[Direct Image] Colab server failed (likely offline/disconnected), trying local server...', colabError.message);

            // Fallback to local server
            response = await fetch(localUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                },
                body: JSON.stringify({
                    prompt: enhancedPrompt,
                    negative_prompt: "ugly, deformed, disfigured, poor details, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, mutated hands and fingers, disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation, extra fingers, fewer fingers, extra hands, bad hands, sketches, lowres, normal quality, monochrome, grayscale, worstquality, signature, watermark, username, blurry, bad feet, cropped, poorly drawn hands, poorly drawn face, mutation, deformed, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, extra fingers, fewer digits, extra limbs, extra arms, extra legs, malformed limbs, fused fingers, too many fingers, long neck, mutated hands, polar lowres, bad body, bad proportions, gross proportions, text, error, missing fingers, missing arms, missing legs, extra digit, extra arms, extra leg, extra foot",
                    width: 384,  // Moderate resolution for local 4GB GPU
                    height: 384, // Moderate resolution for local 4GB GPU
                    num_inference_steps: 15, // Better quality for local GPU
                    guidance_scale: 7.5,
                    seed: randomSeed
                }),
                // Longer timeout for local server
                signal: AbortSignal.timeout(600000) // 10 minutes
            });
            serverUsed = 'local';
            console.log('[Direct Image] Using local server as fallback');
        }

        if (!response.ok) {
            throw new Error(`Stable Diffusion server error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Generation failed');
        }

        console.log(`[Direct Image] Success! Image length: ${result.image?.length || 0}`);
        console.log(`[Direct Image] Server used: ${serverUsed}`);
        console.log(`[Direct Image] Image preview: ${result.image?.substring(0, 100)}...`);

        // Return the image directly with cache-busting headers
        const timestamp = Date.now();
        const apiResponse = NextResponse.json({
            success: true,
            image: result.image,
            prompt: query,
            timestamp: timestamp,
            server_used: serverUsed,
            cache_buster: Math.random().toString(36)
        });

        // Aggressive cache-busting
        apiResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        apiResponse.headers.set('Pragma', 'no-cache');
        apiResponse.headers.set('Expires', '0');
        apiResponse.headers.set('ETag', `"${Date.now()}"`);

        return apiResponse;

    } catch (error) {
        console.error('[Direct Image] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Direct image generation endpoint',
        usage: 'POST with { "query": "your prompt here" }'
    });
}
