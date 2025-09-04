#!/usr/bin/env python3
"""
Simple test script to verify Stable Diffusion is working
"""

import torch
from diffusers import StableDiffusionPipeline
import base64
import io
from PIL import Image

def test_stable_diffusion():
    print("Testing Stable Diffusion...")
    
    # Check CUDA
    print(f"CUDA available: {torch.cuda.is_available()}")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")
    
    try:
        # Load model with minimal configuration
        print("Loading model...")
        pipe = StableDiffusionPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            safety_checker=None,
            requires_safety_checker=False
        )
        
        pipe = pipe.to(device)
        print("Model loaded successfully")
        
        # Test generation
        print("Generating test image...")
        with torch.no_grad():
            result = pipe(
                "a simple red circle on white background",
                num_inference_steps=10,  # Fewer steps for faster test
                guidance_scale=7.5,
                width=256,  # Smaller size for faster test
                height=256
            )
            
            image = result.images[0]
            print(f"Generated image size: {image.size}")
            
            # Save test image
            image.save("test_output.png")
            print("Test image saved as test_output.png")
            
            # Convert to base64 to check size
            buffer = io.BytesIO()
            image.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            print(f"Base64 length: {len(img_str)} characters")
            
            if len(img_str) < 100:
                print("WARNING: Image seems too small!")
            else:
                print("SUCCESS: Image generated properly")
                
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_stable_diffusion()
