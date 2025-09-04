#!/usr/bin/env python3
"""
Jarvis 2.0 - Stable Diffusion Microservice
Provides local image generation capabilities for the Jarvis 2.0 Electron application
"""

import os
import sys
import json
import base64
import io
import logging
import threading
import queue
import time
from typing import Optional, Dict, Any
from dataclasses import dataclass

try:
    import torch
    from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
    from PIL import Image
    import flask
    from flask import Flask, request, jsonify
    from flask_cors import CORS
except ImportError as e:
    print(f"Error: Missing required dependencies. Please install: {e}")
    print("Run: pip install torch torchvision diffusers transformers flask flask-cors pillow accelerate")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO, format='[SD-Server] %(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class GenerationRequest:
    """Data class for image generation requests"""
    prompt: str
    negative_prompt: str = ""
    num_inference_steps: int = 20
    guidance_scale: float = 7.5
    width: int = 512
    height: int = 512
    seed: Optional[int] = None

class StableDiffusionService:
    """Stable Diffusion service with request queuing and model management"""
    
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_id = "stabilityai/stable-diffusion-2-1"  # More stable model with better image quality
        self.pipe = None
        self.is_loading = False
        self.is_loaded = False
        self.generation_queue = queue.Queue()
        self.current_request = None
        
        logger.info(f"Initializing Stable Diffusion service on device: {self.device}")
        
    def load_model(self):
        """Load the Stable Diffusion model"""
        if self.is_loaded or self.is_loading:
            return

        self.is_loading = True
        try:
            logger.info(f"Loading Stable Diffusion model: {self.model_id}")

            # Load with optimizations and proper error handling
            self.pipe = StableDiffusionPipeline.from_pretrained(
                self.model_id,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                safety_checker=None,  # Disable for faster loading
                requires_safety_checker=False,
                use_safetensors=True,  # Use safetensors format
                variant="fp16" if self.device == "cuda" else None
            )

            # Don't change the scheduler - use the default one to avoid index errors
            # self.pipe.scheduler = DPMSolverMultistepScheduler.from_config(self.pipe.scheduler.config)

            # Move to device
            self.pipe = self.pipe.to(self.device)

            # Enable memory efficient attention if available
            if hasattr(self.pipe, 'enable_attention_slicing'):
                self.pipe.enable_attention_slicing()

            # Enable CPU offload for CUDA to save VRAM
            if self.device == "cuda" and hasattr(self.pipe, 'enable_sequential_cpu_offload'):
                self.pipe.enable_sequential_cpu_offload()

            # Test generation to ensure everything works
            logger.info("Testing model with simple generation...")
            test_result = self.pipe(
                "test",
                num_inference_steps=1,
                guidance_scale=1.0,
                width=64,
                height=64
            )
            logger.info("Model test successful")

            self.is_loaded = True
            logger.info("Model loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            self.pipe = None
        finally:
            self.is_loading = False
    
    def unload_model(self):
        """Unload the model to free memory"""
        if self.pipe is not None:
            del self.pipe
            self.pipe = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            self.is_loaded = False
            logger.info("Model unloaded")

    def reload_model(self):
        """Force reload the model to clear any cached state"""
        logger.info("Force reloading model to clear cache...")
        self.unload_model()
        # Wait a moment for cleanup
        import time
        time.sleep(2)
        self.load_model()
    
    def generate_image(self, req: GenerationRequest) -> Dict[str, Any]:
        """Generate an image from the request"""
        if not self.is_loaded:
            self.load_model()
            
        if not self.is_loaded:
            raise Exception("Model failed to load")
        
        try:
            logger.info(f"Generating image: '{req.prompt[:50]}...'")
            
            # Set seed for reproducibility if provided
            generator = None
            if req.seed is not None:
                generator = torch.Generator(device=self.device).manual_seed(req.seed)
            
            # Generate image
            with torch.no_grad():
                result = self.pipe(
                    prompt=req.prompt,
                    negative_prompt=req.negative_prompt,
                    num_inference_steps=req.num_inference_steps,
                    guidance_scale=req.guidance_scale,
                    width=req.width,
                    height=req.height,
                    generator=generator
                )
                
                image = result.images[0]

                # Verify image is not blank
                if image.size == (0, 0):
                    raise ValueError("Generated image has zero size")

                # Check for invalid pixel values and fix them
                import numpy as np
                img_array = np.array(image)

                # Check for NaN or infinite values
                if np.any(np.isnan(img_array)) or np.any(np.isinf(img_array)):
                    logger.warning("Image contains invalid values (NaN/inf), fixing...")
                    # Replace invalid values with 0
                    img_array = np.nan_to_num(img_array, nan=0.0, posinf=255.0, neginf=0.0)
                    # Ensure values are in valid range [0, 255]
                    img_array = np.clip(img_array, 0, 255).astype(np.uint8)
                    # Convert back to PIL Image
                    from PIL import Image as PILImage
                    image = PILImage.fromarray(img_array)
                    logger.info("Fixed invalid image values")

                # Verify image has valid content
                img_array = np.array(image)
                if np.all(img_array == 0):
                    logger.warning("Generated image is completely black")
                elif np.std(img_array) < 1.0:
                    logger.warning("Generated image has very low variance (might be blank)")
                else:
                    logger.info(f"Generated image looks valid (std: {np.std(img_array):.2f})")

            # Convert to base64
            buffer = io.BytesIO()
            image.save(buffer, format='PNG', optimize=True)
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            logger.info("Image generated successfully")
            
            return {
                'success': True,
                'image': f"data:image/png;base64,{img_str}",
                'prompt': req.prompt,
                'seed': req.seed,
                'device': self.device
            }
            
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }

# Global service instance
sd_service = StableDiffusionService()

# Flask app setup
app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:3000'])

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'device': sd_service.device,
        'model_loaded': sd_service.is_loaded,
        'model_loading': sd_service.is_loading,
        'cuda_available': torch.cuda.is_available()
    })

@app.route('/generate', methods=['POST'])
def generate_image():
    """Generate image endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data provided'}), 400
        
        # Create generation request
        req = GenerationRequest(
            prompt=data.get('prompt', 'a beautiful landscape'),
            negative_prompt=data.get('negative_prompt', ''),
            num_inference_steps=min(data.get('num_inference_steps', 20), 50),  # Limit steps
            guidance_scale=max(1.0, min(data.get('guidance_scale', 7.5), 20.0)),  # Limit guidance
            width=min(data.get('width', 512), 1024),  # Limit resolution
            height=min(data.get('height', 512), 1024),
            seed=data.get('seed')
        )
        
        # Generate image
        result = sd_service.generate_image(req)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Request failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/models', methods=['GET'])
def list_models():
    """List available models"""
    return jsonify({
        'current_model': sd_service.model_id,
        'available_models': [
            'runwayml/stable-diffusion-v1-5',
            'stabilityai/stable-diffusion-2-1',
            'stabilityai/stable-diffusion-xl-base-1.0'
        ]
    })

@app.route('/unload', methods=['POST'])
def unload_model():
    """Unload model to free memory"""
    sd_service.unload_model()
    return jsonify({'success': True, 'message': 'Model unloaded'})

@app.route('/reload', methods=['POST'])
def reload_model():
    """Force reload model to clear cache"""
    try:
        sd_service.reload_model()
        return jsonify({'success': True, 'message': 'Model reloaded successfully'})
    except Exception as e:
        logger.error(f"Model reload failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('SD_PORT', 5001))
    host = '127.0.0.1'
    
    logger.info(f"Starting Stable Diffusion server on {host}:{port}")
    logger.info(f"Device: {sd_service.device}")
    logger.info(f"CUDA available: {torch.cuda.is_available()}")
    
    # Pre-load model in development
    if os.environ.get('SD_PRELOAD', '').lower() == 'true':
        logger.info("Pre-loading model...")
        sd_service.load_model()
    
    app.run(host=host, port=port, debug=False, threaded=True)
