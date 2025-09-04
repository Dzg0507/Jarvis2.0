# Jarvis - A Local AI Assistant with Tools

## 1. Description

This project is a boilerplate for creating a local AI assistant named "Jarvis" that can interact with users through a web interface. Jarvis is powered by Google's Gemini model and is equipped with a set of tools through the Model-Context-Protocol (MCP). This allows the AI to perform actions like searching the web, reading files, and generating content.

The project includes a unified Node.js server built with Express and TypeScript, a simple vanilla TypeScript frontend, and a testing suite using Vitest.

## 2. Features

*   **Conversational AI:** Chat with the Gemini-powered AI assistant.
*   **Tool Use:** The AI can use tools to perform actions.
    *   List and read files from the project directory.
    *   Perform a web search (provides a link to the results).
    *   Generate a research paper on a given topic.
    *   Save a synthesized speech (Text-to-Speech) of a given text to an audio file.
*   **Web Interface:** A clean, simple chat interface for interacting with Jarvis.
*   **Text-to-Speech:** AI responses are automatically spoken aloud in the web interface.
*   **Local Code Execution:** A sandboxed endpoint (`/execute`) can run Python code locally (requires a local Python installation). **NOTE: This is a security risk and should not be exposed to the internet.**
*   **Modern Tech Stack:** Built with TypeScript, ES Modules, and Vitest for testing.

## 3. Architecture Overview

The project runs as a **single, unified Node.js server** (`src/server.ts`). This server is responsible for:
1.  Serving the static frontend assets located in the `public` directory.
2.  Providing an `/api/chat` endpoint which the frontend calls to interact with the AI.
3.  Providing an MCP endpoint (`/mcp`) that the AI's chat handler connects to in order to discover and execute tools.
4.  Providing helper endpoints for Text-to-Speech (`/tts`) and local code execution (`/execute`).

The code is organized into the following main directories:
*   `src/`: Contains all the TypeScript source code.
    *   `chat/`: Handles the chat logic, including the chat handler, MCP client connection, and system prompt generation.
    *   `mcp/`: Manages the MCP server setup and tool registration.
    *   `tools/`: Contains the implementations for all the tools the AI can use.
    *   `server.ts`: The main server entry point.
    *   `config.ts`: Centralized configuration for the application.
    *   `index.ts`: The main TypeScript file for the frontend interface.

## 4. Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create an environment file:**
    Create a file named `.env` in the root of the project directory. This file is used to store your Google AI API key.
    ```
    API_KEY=your_google_ai_api_key_here
    ```
    Replace `your_google_ai_api_key_here` with your actual API key from Google AI Studio.

## 5. Quick Start

### One-Command Startup (Recommended)

**Windows:**
```cmd
start-jarvis.bat
```

**Linux/Mac:**
```bash
./start-jarvis.sh
```

**Cross-Platform:**
```bash
npm run dev:full
```

This starts all services automatically:
- Next.js Application (http://localhost:3000)
- MCP Server (http://localhost:8080)
- Stable Diffusion Server (http://localhost:5001)

### First Time Setup

1. **Run the setup wizard:**
   ```bash
   npm run setup
   ```

2. **Configure API keys in `.env`:**
   ```bash
   API_KEY=your_google_ai_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here  # Optional
   ```

3. **Start all services:**
   ```bash
   npm run dev:full
   ```

### Manual Setup (Alternative)

*   **Install dependencies:**
    ```bash
    npm install
    npm run setup:python  # For Stable Diffusion
    ```

*   **Configure environment:**
    ```bash
    cp .env.example .env
    # Edit .env file with your API keys
    ```

*   **Start services individually:**
    ```bash
    npm run dev:next    # Next.js only
    npm run dev:mcp     # MCP server only
    npm run dev:sd      # Stable Diffusion only
    ```

## 6. Available Commands

### Development
- `npm run dev:full` - **Recommended** - Start all services with auto-startup
- `npm run dev` - Start Next.js and MCP (manual Stable Diffusion startup)
- `npm run health` - Check all service health status

### Setup & Configuration
- `npm run setup` - Interactive setup wizard
- `npm run setup:python` - Install Python dependencies
- `npm run setup:cuda` - Install Python dependencies with CUDA support

### Testing & Diagnostics
- `npm run health` - Check all services
- `npm run health:sd` - Check Stable Diffusion specifically
- `npm run test:image-priority` - Test image generation priority system

### Production
- `npm run build` - Build for production
- `npm run start:all` - Start all production services

*   **To run the tests:**
    This command runs the test suite using Vitest.
    ```bash
    npm test
    ```
