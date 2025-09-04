# CUDA Setup for Stable Diffusion

## Quick CUDA Installation

### Automatic Detection & Installation
```bash
npm run setup:cuda
```

This runs:
```bash
python -m pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu118
```

### Manual Installation
```bash
# CUDA 11.8 (Recommended)
python -m pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu118

# CUDA 12.1 (Newer GPUs)
python -m pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu121
```

## CUDA Requirements

### Hardware Requirements
- **NVIDIA GPU** with CUDA Compute Capability 3.5+
- **VRAM**: 4GB minimum, 6GB+ recommended
- **System RAM**: 8GB minimum, 16GB+ recommended

### Software Requirements
- **NVIDIA Driver**: Latest recommended
- **CUDA Toolkit**: 11.8 or 12.1
- **Python**: 3.8-3.11 (3.12 not fully supported yet)

## Verification

### Check CUDA Installation
```bash
# Check if CUDA is available
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"

# Check CUDA version
python -c "import torch; print(f'CUDA version: {torch.version.cuda}')"

# Check GPU info
python -c "import torch; print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"
```

### Expected Output (with CUDA)
```
CUDA available: True
CUDA version: 11.8
GPU: NVIDIA GeForce RTX 3080
```

### Expected Output (CPU only)
```
CUDA available: False
CUDA version: None
GPU: None
```

## Troubleshooting

### "CUDA not available" after installation
1. **Check NVIDIA drivers**:
   ```bash
   nvidia-smi
   ```

2. **Reinstall PyTorch with CUDA**:
   ```bash
   pip uninstall torch torchvision torchaudio
   npm run setup:cuda
   ```

3. **Check CUDA toolkit version**:
   ```bash
   nvcc --version
   ```

### "Out of memory" errors
1. **Reduce image dimensions** in generation settings
2. **Close other GPU applications**
3. **Use CPU fallback** if needed:
   ```bash
   # In .env file
   SD_FORCE_ONLY=false
   SD_FALLBACK_OPENAI=true
   ```

### Performance optimization
```bash
# In .env file for better GPU performance
SD_PRELOAD=true          # Preload model to GPU
SD_MAX_RETRIES=1         # Reduce retries
```

## Automatic CUDA Detection

The system automatically detects CUDA availability:

### In `fix-build-issues.js`
- Checks `torch.cuda.is_available()`
- Recommends appropriate installation command
- Shows both CPU and CUDA options

### In `start-stable-diffusion.js`
- Auto-detects CUDA during dependency installation
- Uses GPU-optimized packages when available
- Falls back to CPU version if CUDA unavailable

### In `setup.js`
- Interactive CUDA setup during initial configuration
- Asks user about GPU availability
- Installs appropriate version automatically

## Performance Comparison

### CPU vs CUDA Generation Times (512x512, 20 steps)
- **CPU (Intel i7)**: ~60-120 seconds
- **CUDA (RTX 3060)**: ~5-10 seconds  
- **CUDA (RTX 3080)**: ~3-6 seconds
- **CUDA (RTX 4090)**: ~2-4 seconds

### Memory Usage
- **CPU**: Uses system RAM (4-8GB)
- **CUDA**: Uses GPU VRAM (2-4GB) + system RAM (2-4GB)

## Integration with Jarvis 2.0

### Startup Commands
```bash
# All these commands auto-detect and use CUDA if available
npm run dev:full         # Full startup with CUDA detection
npm run dev:sd           # Stable Diffusion only with CUDA
npm run start:sd         # Production SD server with CUDA
```

### Health Checks
```bash
npm run health           # Checks CUDA availability
npm run health:sd        # Specific SD/CUDA health check
```

### Build Diagnostics
```bash
npm run build:fix        # Includes CUDA detection and recommendations
```

## Best Practices

### For Development
- Use `SD_PRELOAD=false` for faster startup
- Enable debug logging: `LOG_LEVEL=debug`
- Use smaller image dimensions for testing

### For Production
- Use `SD_PRELOAD=true` for faster generation
- Optimize VRAM usage with appropriate batch sizes
- Monitor GPU temperature and usage

### For Mixed Environments
- Keep both CPU and CUDA packages available
- Use environment-specific .env files
- Test fallback scenarios regularly

## Support

### Getting Help
1. Run diagnostics: `npm run build:fix`
2. Check CUDA installation: `nvidia-smi`
3. Verify PyTorch CUDA: `python -c "import torch; print(torch.cuda.is_available())"`
4. Check system requirements above

### Common Issues
- **Driver mismatch**: Update NVIDIA drivers
- **CUDA version mismatch**: Use correct PyTorch version
- **Memory issues**: Reduce generation parameters
- **Installation failures**: Check Python version compatibility

---

**Note**: The `--extra-index-url` flag ensures you get CUDA-optimized packages while maintaining compatibility with other dependencies.
