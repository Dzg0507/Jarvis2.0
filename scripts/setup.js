#!/usr/bin/env node

/**
 * Jarvis 2.0 Setup Script
 * Handles initial setup, dependency installation, and environment configuration
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

class JarvisSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  async execPromise(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  async checkNodeVersion() {
    console.log('🔍 Checking Node.js version...');
    try {
      const { stdout } = await this.execPromise('node --version');
      const version = stdout.trim();
      const majorVersion = parseInt(version.slice(1).split('.')[0]);
      
      if (majorVersion >= 18) {
        console.log(`✅ Node.js ${version} is compatible`);
        return true;
      } else {
        console.log(`❌ Node.js ${version} is too old. Please install Node.js 18 or later`);
        return false;
      }
    } catch (error) {
      console.log('❌ Node.js not found. Please install Node.js 18 or later');
      return false;
    }
  }

  async checkPython() {
    console.log('🔍 Checking Python installation...');
    const pythonCommands = ['python3', 'python', 'py'];
    
    for (const cmd of pythonCommands) {
      try {
        const { stdout } = await this.execPromise(`${cmd} --version`);
        if (stdout.includes('Python 3.')) {
          console.log(`✅ Found ${stdout.trim()}`);
          return cmd;
        }
      } catch (error) {
        // Command not found, try next
      }
    }
    
    console.log('❌ Python 3 not found. Please install Python 3.8 or later');
    return null;
  }

  async setupEnvironmentFiles() {
    console.log('📝 Setting up environment files...');
    
    // Check if .env exists
    if (!fs.existsSync('.env')) {
      if (fs.existsSync('.env.example')) {
        fs.copyFileSync('.env.example', '.env');
        console.log('✅ Created .env from .env.example');
      } else {
        console.log('⚠️  .env.example not found, creating basic .env');
        fs.writeFileSync('.env', '# Jarvis 2.0 Environment Configuration\nAPI_KEY=your_google_ai_api_key_here\n');
      }
    } else {
      console.log('ℹ️  .env already exists, skipping');
    }

    // Check if .env.local exists
    if (!fs.existsSync('.env.local')) {
      if (fs.existsSync('.env.local.example')) {
        const createLocal = await this.question('📝 Create .env.local for local development? (y/N): ');
        if (createLocal.toLowerCase() === 'y' || createLocal.toLowerCase() === 'yes') {
          fs.copyFileSync('.env.local.example', '.env.local');
          console.log('✅ Created .env.local from .env.local.example');
        }
      }
    }
  }

  async installNodeDependencies() {
    console.log('📦 Installing Node.js dependencies...');
    try {
      await this.execPromise('npm install');
      console.log('✅ Node.js dependencies installed');
      return true;
    } catch (error) {
      console.log('❌ Failed to install Node.js dependencies:', error.message);
      return false;
    }
  }

  async installPythonDependencies(pythonCmd) {
    console.log('🐍 Installing Python dependencies...');
    
    if (!fs.existsSync('requirements.txt')) {
      console.log('⚠️  requirements.txt not found, skipping Python dependencies');
      return true;
    }

    const installPython = await this.question('📦 Install Python dependencies for Stable Diffusion? (Y/n): ');
    if (installPython.toLowerCase() === 'n' || installPython.toLowerCase() === 'no') {
      console.log('⏭️  Skipping Python dependencies');
      return true;
    }

    // Ask about CUDA support
    const useCuda = await this.question('🚀 Do you have an NVIDIA GPU and want CUDA support? (y/N): ');
    
    try {
      let installCmd;
      if (useCuda.toLowerCase() === 'y' || useCuda.toLowerCase() === 'yes') {
        console.log('🚀 Installing with CUDA support...');
        installCmd = `${pythonCmd} -m pip install -r requirements.txt --index-url https://download.pytorch.org/whl/cu118`;
      } else {
        console.log('💻 Installing CPU-only version...');
        installCmd = `${pythonCmd} -m pip install -r requirements.txt`;
      }
      
      console.log('⏳ This may take several minutes...');
      await this.execPromise(installCmd);
      console.log('✅ Python dependencies installed');
      return true;
    } catch (error) {
      console.log('❌ Failed to install Python dependencies:', error.message);
      console.log('💡 You can install them manually later with: npm run setup:python');
      return false;
    }
  }

  async configureApiKeys() {
    console.log('🔑 API Key Configuration');
    console.log('========================');
    
    const configureKeys = await this.question('🔑 Would you like to configure API keys now? (Y/n): ');
    if (configureKeys.toLowerCase() === 'n' || configureKeys.toLowerCase() === 'no') {
      console.log('⏭️  Skipping API key configuration');
      console.log('💡 You can configure them later by editing the .env file');
      return;
    }

    // Read current .env
    let envContent = fs.readFileSync('.env', 'utf8');

    // Google AI API Key
    if (envContent.includes('API_KEY=your_google_ai_api_key_here')) {
      console.log('\n🤖 Google AI API Key (Required for chat functionality)');
      console.log('Get from: https://makersuite.google.com/app/apikey');
      const googleKey = await this.question('Enter your Google AI API key (or press Enter to skip): ');
      if (googleKey.trim()) {
        envContent = envContent.replace('API_KEY=your_google_ai_api_key_here', `API_KEY=${googleKey.trim()}`);
        console.log('✅ Google AI API key configured');
      }
    }

    // OpenAI API Key
    if (envContent.includes('OPENAI_API_KEY=your_openai_api_key_here')) {
      console.log('\n🎨 OpenAI API Key (Optional - for DALL-E fallback)');
      console.log('Get from: https://platform.openai.com/api-keys');
      const openaiKey = await this.question('Enter your OpenAI API key (or press Enter to skip): ');
      if (openaiKey.trim()) {
        envContent = envContent.replace('OPENAI_API_KEY=your_openai_api_key_here', `OPENAI_API_KEY=${openaiKey.trim()}`);
        console.log('✅ OpenAI API key configured');
      }
    }

    // Save updated .env
    fs.writeFileSync('.env', envContent);
  }

  async runSetup() {
    console.log('🎯 Jarvis 2.0 Setup');
    console.log('===================');
    console.log('This script will help you set up Jarvis 2.0 with all dependencies.\n');

    try {
      // Step 1: Check Node.js
      if (!(await this.checkNodeVersion())) {
        process.exit(1);
      }

      // Step 2: Check Python
      const pythonCmd = await this.checkPython();
      if (!pythonCmd) {
        console.log('⚠️  Python not found. Stable Diffusion features will not be available.');
        console.log('💡 Install Python 3.8+ from https://python.org to enable image generation');
      }

      console.log('');

      // Step 3: Setup environment files
      await this.setupEnvironmentFiles();
      console.log('');

      // Step 4: Install Node.js dependencies
      if (!(await this.installNodeDependencies())) {
        process.exit(1);
      }
      console.log('');

      // Step 5: Install Python dependencies (if Python is available)
      if (pythonCmd) {
        await this.installPythonDependencies(pythonCmd);
        console.log('');
      }

      // Step 6: Configure API keys
      await this.configureApiKeys();
      console.log('');

      // Setup complete
      console.log('🎉 Setup Complete!');
      console.log('==================');
      console.log('');
      console.log('Next steps:');
      console.log('1. 📝 Edit .env file to add any missing API keys');
      console.log('2. 🚀 Run "npm run dev:full" to start all services');
      console.log('3. 🏥 Run "npm run health" to check service status');
      console.log('');
      console.log('Available commands:');
      console.log('• npm run dev:full    - Start all services with auto-startup');
      console.log('• npm run dev         - Start Next.js and MCP (manual SD startup)');
      console.log('• npm run start:sd    - Start Stable Diffusion server only');
      console.log('• npm run health      - Check all service health');
      console.log('');
      console.log('For help: Check docs/IMAGE_GENERATION_PRIORITY.md');

    } catch (error) {
      console.error('💥 Setup failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new JarvisSetup();
  setup.runSetup().catch(console.error);
}

module.exports = { JarvisSetup };
