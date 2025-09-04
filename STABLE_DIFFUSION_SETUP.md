# Jarvis 2.0 - Stable Diffusion Integration Setup

## Overview

This guide explains how to set up and use the Stable Diffusion integration in Jarvis 2.0, which provides local image generation capabilities alongside the existing OpenAI DALL-E integration.

## Features

- **Local Image Generation**: Run Stable Diffusion locally without API costs
- **Advanced Controls**: Negative prompts, guidance scale, steps, seeds, custom dimensions
- **Automatic Fallback**: Falls back to OpenAI DALL-E if Stable Diffusion unavailable
- **Embedded Server**: Runs as part of the Electron app with automatic management
- **MCP Integration**: Available as a tool in the chat interface
- **Web Interface**: Dedicated image generation component with advanced controls

## Prerequisites

### System Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 5GB free space for models
- **GPU**: NVIDIA GPU with CUDA support (optional but recommended)
- **Python**: 3.8 or higher

### Python Dependencies
Install the required Python packages:

```bash
pip install torch torchvision diffusers transformers flask flask-cors pillow accelerate
```

For CUDA support (recommended for faster generation):
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### Node.js Dependencies
The following dependencies are automatically installed with `npm install`:
- `sharp` - Image processing
- `multer` - File upload handling
- `form-data` - Form data handling

## Installation Steps

### 1. Install Python Dependencies
```bash
# Basic installation
pip install torch torchvision diffusers transformers flask flask-cors pillow accelerate

# For CUDA support (if you have NVIDIA GPU)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### 2. Install Node.js Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Add to your `.env` file:

```env
# Stable Diffusion Configuration
SD_ENABLED=true                    # Enable/disable Stable Diffusion
SD_SERVER_URL=http://localhost:5001 # Stable Diffusion server URL
SD_PRELOAD=false                   # Preload model on startup (slower startup, faster first generation)
SD_FALLBACK_OPENAI=true           # Fallback to OpenAI if SD fails

# Existing OpenAI configuration (for fallback)
OPENAI_API_KEY=your_openai_key_here
```

### 4. Test the Installation
Run the diagnostic script:
```bash
npm run build:fix
```

This will check:
- Python availability
- Required Python packages
- Node.js dependencies
- Configuration validity

## Usage

### 1. Through Chat Interface (MCP Tool)
The image generation tool is automatically available in the chat interface:

```
Generate an image of a futuristic city at sunset
```

Advanced usage:
```
Generate an image with prompt "cyberpunk city" negative_prompt "blurry, low quality" width 768 height 512 steps 25
```

### 2. Through Web Interface
Access the dedicated image generator at `/image-generator` (you'll need to add this route to your app).

### 3. Through API
Direct API access:
```javascript
const response = await fetch('/api/image-generation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "A beautiful landscape",
    negative_prompt: "blurry, low quality",
    width: 512,
    height: 512,
    steps: 20,
    guidance_scale: 7.5,
    use_stable_diffusion: true
  })
});
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SD_ENABLED` | `true` | Enable/disable Stable Diffusion |
| `SD_SERVER_URL` | `http://localhost:5001` | Stable Diffusion server URL |
| `SD_PRELOAD` | `false` | Preload model on startup |
| `SD_FALLBACK_OPENAI` | `true` | Fallback to OpenAI if SD fails |

### Generation Parameters

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `prompt` | string | required | Description of image to generate |
| `negative_prompt` | string | "" | What to avoid in the image |
| `width` | 64-1024 | 512 | Image width in pixels |
| `height` | 64-1024 | 512 | Image height in pixels |
| `steps` | 1-50 | 20 | Number of inference steps |
| `guidance_scale` | 1-20 | 7.5 | How closely to follow prompt |
| `seed` | number | random | Seed for reproducible results |

## Troubleshooting

### Common Issues

#### 1. "Python not found"
**Solution**: Install Python 3.8+ and ensure it's in your PATH
```bash
python --version  # Should show Python 3.8+
```

#### 2. "torch not found" or CUDA errors
**Solution**: Install PyTorch with proper CUDA support
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

#### 3. "Out of memory" errors
**Solutions**:
- Reduce image dimensions (e.g., 512x512 instead of 1024x1024)
- Reduce inference steps (e.g., 15 instead of 50)
- Close other applications
- Use CPU mode (slower but uses less memory)

#### 4. "Model loading failed"
**Solutions**:
- Check internet connection (first run downloads ~4GB model)
- Ensure sufficient disk space (5GB+)
- Check Python package versions

#### 5. Slow generation times
**Solutions**:
- Use NVIDIA GPU with CUDA
- Reduce image dimensions
- Reduce inference steps
- Enable model preloading (`SD_PRELOAD=true`)

### Performance Optimization

#### For NVIDIA GPU Users:
```env
SD_PRELOAD=true  # Preload model for faster generation
```

#### For CPU-only Users:
- Use smaller dimensions (256x256 or 512x512)
- Use fewer steps (10-15)
- Consider using OpenAI DALL-E instead

### Diagnostic Commands

```bash
# Check Python and dependencies
npm run build:fix

# Test Stable Diffusion server manually
python src/services/stable-diffusion-server.py

# Check API health
curl http://localhost:5001/health
```

## Build Integration

The Stable Diffusion server is automatically managed by the Electron app:

1. **Development**: Server runs independently or is started manually
2. **Production**: Electron automatically starts the Python server
3. **Packaging**: Python server is included in the packaged app

### Build Commands
```bash
# Standard build (includes SD integration)
npm run dist

# Test build with diagnostics
npm run build:fix
```

## Security Considerations

- Stable Diffusion runs locally - no data sent to external servers
- Model files are cached locally (~4GB)
- Generated images are processed locally
- API endpoints are only accessible from localhost

## Model Information

**Default Model**: `runwayml/stable-diffusion-v1-5`
- Size: ~4GB download
- License: CreativeML Open RAIL-M
- Capabilities: General purpose image generation
- Performance: Good balance of quality and speed

## Support

If you encounter issues:

1. Run the diagnostic script: `npm run build:fix`
2. Check the console logs in the Electron app
3. Verify Python installation and dependencies
4. Check available system resources (RAM, disk space)
5. Consider using OpenAI fallback if local generation fails

## Advanced Configuration

### Custom Models
To use different Stable Diffusion models, modify `src/services/stable-diffusion-server.py`:

```python
model_id = "stabilityai/stable-diffusion-2-1"  # Change this line
```

### Performance Tuning
Adjust server settings in the Python file:
- Enable/disable attention slicing
- Configure CPU offloading
- Adjust memory optimization settings
