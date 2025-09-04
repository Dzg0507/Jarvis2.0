@echo off
REM Jarvis 2.0 - Windows Startup Script
REM This script starts all Jarvis 2.0 services on Windows

echo.
echo ========================================
echo   Jarvis 2.0 - Starting All Services
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 18 or later.
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)

REM Check if npm dependencies are installed
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install Node.js dependencies
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found
    if exist ".env.example" (
        echo Creating .env from .env.example...
        copy ".env.example" ".env"
        echo.
        echo IMPORTANT: Please edit .env file and add your API keys
        echo Press any key to continue or Ctrl+C to exit and configure first
        pause
    ) else (
        echo ERROR: No .env.example file found
        pause
        exit /b 1
    )
)

REM Start all services
echo Starting Jarvis 2.0 with all services...
echo.
echo Services starting:
echo - Next.js Application (http://localhost:3000)
echo - MCP Server (http://localhost:8080)
echo - Stable Diffusion Server (http://localhost:5001)
echo.
echo Press Ctrl+C to stop all services
echo.

npm run dev:full

echo.
echo All services stopped.
pause
