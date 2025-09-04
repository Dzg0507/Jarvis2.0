#!/bin/bash

# Jarvis 2.0 - Unix Startup Script
# This script starts all Jarvis 2.0 services on Linux/Mac

set -e  # Exit on any error

echo ""
echo "========================================"
echo "  Jarvis 2.0 - Starting All Services"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install Node.js 18 or later."
    echo "Download from: https://nodejs.org"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js version $NODE_VERSION is too old. Please install Node.js 18 or later."
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install Node.js dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found"
    if [ -f ".env.example" ]; then
        echo "📝 Creating .env from .env.example..."
        cp ".env.example" ".env"
        echo ""
        echo "IMPORTANT: Please edit .env file and add your API keys"
        echo "Press Enter to continue or Ctrl+C to exit and configure first"
        read -r
    else
        echo "ERROR: No .env.example file found"
        exit 1
    fi
fi

# Check Python installation (optional)
if command -v python3 &> /dev/null; then
    echo "✅ Python3 found: $(python3 --version)"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version 2>&1)
    if [[ $PYTHON_VERSION == *"Python 3"* ]]; then
        echo "✅ Python found: $PYTHON_VERSION"
    else
        echo "⚠️  Python 2 found, but Python 3 is recommended for Stable Diffusion"
    fi
else
    echo "⚠️  Python not found. Stable Diffusion features will not be available."
    echo "💡 Install Python 3.8+ to enable image generation"
fi

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    # Kill all child processes
    jobs -p | xargs -r kill
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo ""
echo "🚀 Starting Jarvis 2.0 with all services..."
echo ""
echo "Services starting:"
echo "- Next.js Application (http://localhost:3000)"
echo "- MCP Server (http://localhost:8080)"
echo "- Stable Diffusion Server (http://localhost:5001)"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start all services
npm run dev:full

# This line should not be reached due to the trap, but just in case
cleanup
