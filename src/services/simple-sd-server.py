#!/usr/bin/env python3
"""
Simple, reliable Stable Diffusion server
No caching, no complex features - just working image generation
"""

import sys
import os
import logging
import base64
import io
from flask import Flask, request, jsonify
from flask_cors import CORS

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    import torch
    from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler, LMSDiscreteScheduler
    from PIL import Image
    import numpy as np
except ImportError as e:
    logger.error(f"Missing dependencies: {e}")
    sys.exit(1)

app = Flask(__name__)
CORS(app)

# Global pipeline - load once, use many times
pipe = None

# Smart device selection with VRAM check
def get_optimal_device():
    if not torch.cuda.is_available():
        return "cpu"

    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
    gpu_name = torch.cuda.get_device_name(0)

    logger.info(f"GPU: {gpu_name}")
    logger.info(f"VRAM: {vram_gb:.1f} GB")

    if vram_gb < 6.0:  # Less than 6GB VRAM
        logger.warning(f"⚠️ Low VRAM ({vram_gb:.1f}GB) detected. Using CPU fallback for stability.")
        return "cpu"

    return "cuda"

device = get_optimal_device()
logger.info(f"Selected device: {device}")

def load_pipeline():
    """Load the Stable Diffusion pipeline"""
    global pipe
    if pipe is not None:
        return
    
    logger.info(f"Loading Stable Diffusion on {device}...")
    
    # Use a known-good model with optimized configuration
    # CRITICAL FIX: Use float32 instead of float16 to avoid black images
    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float32,  # Always use float32 to avoid "invalid value encountered in cast"
        safety_checker=None,
        requires_safety_checker=False,
        use_safetensors=True,  # Faster loading
        variant="fp16" if device == "cuda" else None  # Use fp16 variant for faster loading, but convert to fp32
    )
    
    pipe = pipe.to(device)

    # Use FASTEST scheduler - LMS is much faster than DPM++ for fewer steps
    try:
        pipe.scheduler = LMSDiscreteScheduler.from_config(pipe.scheduler.config)
        logger.info("✅ LMS scheduler enabled for ultra-fast generation")
    except Exception as e:
        logger.info(f"⚠️ LMS scheduler not available, trying DPM++: {e}")
        try:
            pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
            logger.info("✅ DPM++ scheduler enabled for faster generation")
        except Exception as e2:
            logger.info(f"⚠️ DPM++ scheduler not available: {e2}")

    # Enable ALL memory and speed optimizations
    if hasattr(pipe, 'enable_attention_slicing'):
        pipe.enable_attention_slicing()
        logger.info("✅ Attention slicing enabled")

    if hasattr(pipe, 'enable_vae_slicing'):
        pipe.enable_vae_slicing()
        logger.info("✅ VAE slicing enabled")

    # Enable xformers if available for faster attention (HUGE speed boost)
    try:
        pipe.enable_xformers_memory_efficient_attention()
        logger.info("✅ XFormers enabled for faster generation")
    except Exception as e:
        logger.info(f"⚠️ XFormers not available: {e}")

    # Enable sequential CPU offload for memory efficiency (CRITICAL for 4GB GPU)
    try:
        pipe.enable_sequential_cpu_offload()
        logger.info("✅ Sequential CPU offload enabled")
    except Exception as e:
        logger.info(f"⚠️ Sequential CPU offload not available: {e}")

    # Additional memory optimizations for low VRAM
    try:
        pipe.enable_model_cpu_offload()
        logger.info("✅ Model CPU offload enabled")
    except Exception as e:
        logger.info(f"⚠️ Model CPU offload not available: {e}")

    # Clear CUDA cache
    if device == 'cuda':
        torch.cuda.empty_cache()
        logger.info("✅ CUDA cache cleared")

    logger.info("Pipeline loaded successfully")

    # Preload model by doing a quick test generation
    logger.info("Preloading model with minimal test generation...")
    try:
        with torch.no_grad():
            with torch.autocast(device_type='cuda' if device == 'cuda' else 'cpu', enabled=device == 'cuda'):
                # Minimal test to warm up the pipeline
                test_result = pipe(
                    prompt="test",
                    width=64,
                    height=64,
                    num_inference_steps=1,
                    guidance_scale=1.0,
                    output_type="latent"  # Skip VAE decoding for faster warmup
                )
        logger.info("✅ Model preloaded successfully - ready for fast requests!")
    except Exception as e:
        logger.warning(f"⚠️ Model preload failed: {e}, but continuing...")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'device': device,
        'model_loaded': pipe is not None
    })

@app.route('/warmup', methods=['POST'])
def warmup():
    """Warmup endpoint to preload model and test generation"""
    try:
        logger.info("Warming up model...")
        with torch.no_grad():
            with torch.autocast(device_type='cuda' if device == 'cuda' else 'cpu', enabled=device == 'cuda'):
                test_result = pipe(
                    prompt="warmup test",
                    width=128,
                    height=128,
                    num_inference_steps=2,
                    guidance_scale=1.0
                )
        logger.info("✅ Model warmup completed successfully")
        return jsonify({"status": "warmed_up", "device": device})
    except Exception as e:
        logger.error(f"❌ Model warmup failed: {e}")
        return jsonify({"status": "warmup_failed", "error": str(e)}), 500

@app.route('/generate', methods=['POST'])
def generate():
    """Generate image endpoint"""
    try:
        # Load pipeline if not loaded
        if pipe is None:
            load_pipeline()
        
        data = request.get_json()
        prompt = data.get('prompt', 'a beautiful landscape')
        negative_prompt = data.get('negative_prompt', 'ugly, deformed, disfigured, poor details, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, mutated hands and fingers, disconnected limbs, mutation, mutated, ugly, disgusting, blurry, amputation')
        width = data.get('width', 512)
        height = data.get('height', 512)
        steps = data.get('num_inference_steps', 12)  # Balanced speed/quality with LMS scheduler
        guidance = data.get('guidance_scale', 7.5)
        seed = data.get('seed')
        
        logger.info(f"Generating: '{prompt[:50]}...' ({width}x{height}, {steps} steps)")
        
        # Set seed if provided
        generator = None
        if seed is not None:
            generator = torch.Generator(device=device).manual_seed(seed)
        
        # Generate image with optimizations
        with torch.no_grad():
            # Enable autocast for mixed precision (faster on modern GPUs)
            with torch.autocast(device_type='cuda' if device == 'cuda' else 'cpu', enabled=device == 'cuda'):
                result = pipe(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    width=width,
                    height=height,
                    num_inference_steps=steps,
                    guidance_scale=guidance,
                    generator=generator
                )
        
        image = result.images[0]
        
        # Validate image
        img_array = np.array(image)
        if img_array.size == 0:
            raise ValueError("Generated image is empty")
        
        # Check for completely black image
        if np.all(img_array == 0):
            logger.warning("Generated image is completely black - regenerating with different seed")
            # Try again with random seed
            generator = torch.Generator(device=device).manual_seed(torch.randint(0, 1000000, (1,)).item())
            result = pipe(
                prompt=prompt,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=guidance,
                generator=generator
            )
            image = result.images[0]
            img_array = np.array(image)
        
        # Convert to base64
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        # Clear memory after generation (critical for 4GB GPU)
        if device == 'cuda':
            torch.cuda.empty_cache()

        logger.info(f"Generated successfully! Image size: {len(img_str)} chars")

        return jsonify({
            'success': True,
            'image': f"data:image/png;base64,{img_str}",
            'prompt': prompt,
            'seed': seed,
            'device': device
        })
        
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    logger.info("Starting Simple Stable Diffusion Server...")
    logger.info(f"Device: {device}")
    logger.info(f"CUDA available: {torch.cuda.is_available()}")
    
    # Load pipeline on startup
    load_pipeline()
    
    app.run(host='127.0.0.1', port=5002, debug=False)
