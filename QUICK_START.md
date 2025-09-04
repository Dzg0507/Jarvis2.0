# 🚀 Jarvis 2.0 - Quick Start Guide

## One-Command Startup

### Windows
```cmd
start-jarvis.bat
```

### Linux/Mac  
```bash
./start-jarvis.sh
```

### Cross-Platform
```bash
npm run dev:full
```

## First Time Setup

### 1. Run Setup Wizard
```bash
npm run setup
```

### 2. Add Your API Keys
Edit `.env` file:
```bash
# Required - Get from: https://makersuite.google.com/app/apikey
API_KEY=your_google_ai_api_key_here

# Optional - Get from: https://platform.openai.com/api-keys  
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Start All Services
```bash
npm run dev:full
```

## What Gets Started

| Service | URL | Purpose |
|---------|-----|---------|
| **Next.js App** | http://localhost:3000 | Main chat interface |
| **MCP Server** | http://localhost:8080 | Tool coordination |
| **Stable Diffusion** | http://localhost:5001 | Local image generation |

## Health Check

```bash
npm run health
```

Expected output:
```
✅ Next.js Application: HEALTHY
✅ Stable Diffusion Server: HEALTHY  
✅ MCP Server: HEALTHY
🎉 All services are healthy and ready!
```

## Troubleshooting

### "Python not found"
```bash
# Install Python 3.8+ from python.org
# Then run:
npm run setup:python
```

### "API_KEY not set"
```bash
# Edit .env file and add your Google AI API key
API_KEY=your_actual_api_key_here
```

### "Port already in use"
```bash
# Check what's using the ports:
# Windows: netstat -ano | findstr :3000
# Linux/Mac: lsof -i :3000
```

### Services won't start
```bash
# Try individual startup:
npm run dev:next    # Start Next.js only
npm run dev:mcp     # Start MCP only
npm run dev:sd      # Start Stable Diffusion only
```

## Key Features

✅ **Auto-startup** - All services start with one command  
✅ **Health monitoring** - Automatic service health checks  
✅ **Cross-platform** - Works on Windows, Mac, and Linux  
✅ **Error handling** - Graceful fallbacks and error recovery  
✅ **Stable Diffusion priority** - Local image generation first  
✅ **Easy setup** - Interactive configuration wizard  

## Need Help?

- 📖 **Full Documentation**: `docs/STARTUP_GUIDE.md`
- 🎨 **Image Generation**: `docs/IMAGE_GENERATION_PRIORITY.md`  
- 🔧 **Configuration**: Check `.env.example` for all options
- 🏥 **Health Issues**: Run `npm run health` for diagnostics

## Quick Commands

```bash
# Setup and start
npm run setup           # Interactive setup
npm run dev:full        # Start everything

# Health and diagnostics  
npm run health          # Check all services
npm run health:sd       # Check Stable Diffusion only

# Individual services
npm run dev:next        # Next.js only
npm run dev:mcp         # MCP server only
npm run dev:sd          # Stable Diffusion only

# Python setup
npm run setup:python    # CPU version
npm run setup:cuda      # GPU version (NVIDIA)
```

---

**🎯 Goal Achieved**: One-command startup with automatic Stable Diffusion server launch, comprehensive health checking, and cross-platform compatibility!
