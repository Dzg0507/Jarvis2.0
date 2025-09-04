#!/usr/bin/env node

/**
 * Cross-platform Stable Diffusion server startup script
 * Handles Python environment detection, dependency checking, and server startup
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PYTHON_COMMANDS = ['python3', 'python', 'py'];
const SD_SERVER_PATH = path.join(__dirname, '..', 'src', 'services', 'stable-diffusion-server.py');
const REQUIREMENTS_PATH = path.join(__dirname, '..', 'requirements.txt');

class StableDiffusionStarter {
  constructor() {
    this.pythonCmd = null;
    this.serverProcess = null;
    this.isWindows = os.platform() === 'win32';
  }

  async findPython() {
    console.log('🔍 Searching for Python installation...');
    
    for (const cmd of PYTHON_COMMANDS) {
      try {
        const result = await this.execPromise(`${cmd} --version`);
        if (result.includes('Python 3.')) {
          console.log(`✅ Found Python: ${cmd} (${result.trim()})`);
          this.pythonCmd = cmd;
          return true;
        }
      } catch (error) {
        // Command not found, try next
      }
    }
    
    console.error('❌ Python 3 not found. Please install Python 3.8+ from https://python.org');
    return false;
  }

  async checkDependencies() {
    console.log('📦 Checking Python dependencies...');
    
    try {
      // Check if key packages are installed
      const checkCmd = `${this.pythonCmd} -c "import torch, diffusers, flask, flask_cors, PIL; print('Dependencies OK')"`;
      await this.execPromise(checkCmd);
      console.log('✅ All Python dependencies are installed');
      return true;
    } catch (error) {
      console.log('⚠️  Some dependencies are missing');
      return await this.installDependencies();
    }
  }

  async installDependencies() {
    console.log('📥 Installing Python dependencies...');
    
    if (!fs.existsSync(REQUIREMENTS_PATH)) {
      console.error(`❌ Requirements file not found: ${REQUIREMENTS_PATH}`);
      return false;
    }

    try {
      // Check for CUDA support
      let installCmd;
      try {
        const cudaCheck = await this.execPromise(`${this.pythonCmd} -c "import torch; print(torch.cuda.is_available())"`);
        const hasCuda = cudaCheck.trim() === 'True';

        if (hasCuda) {
          console.log('🚀 CUDA detected - installing GPU-optimized version');
          installCmd = `${this.pythonCmd} -m pip install -r "${REQUIREMENTS_PATH}" --extra-index-url https://download.pytorch.org/whl/cu118`;
        } else {
          console.log('💻 Installing CPU version');
          installCmd = `${this.pythonCmd} -m pip install -r "${REQUIREMENTS_PATH}"`;
        }
      } catch (error) {
        // CUDA check failed, use CPU version
        console.log('💻 Installing CPU version (CUDA check failed)');
        installCmd = `${this.pythonCmd} -m pip install -r "${REQUIREMENTS_PATH}"`;
      }

      console.log(`Running: ${installCmd}`);
      await this.execPromise(installCmd, { timeout: 300000 }); // 5 minute timeout
      console.log('✅ Dependencies installed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to install dependencies:', error.message);
      console.log('💡 Try running manually:');
      console.log('   CPU:  python -m pip install -r requirements.txt');
      console.log('   CUDA: python -m pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu118');
      return false;
    }
  }

  async startServer() {
    console.log('🚀 Starting Stable Diffusion server...');
    
    if (!fs.existsSync(SD_SERVER_PATH)) {
      console.error(`❌ Server file not found: ${SD_SERVER_PATH}`);
      return false;
    }

    return new Promise((resolve, reject) => {
      const args = [SD_SERVER_PATH];
      const options = {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      };

      this.serverProcess = spawn(this.pythonCmd, args, options);

      let serverStarted = false;
      let startupTimeout = setTimeout(() => {
        if (!serverStarted) {
          console.error('❌ Server startup timeout (30 seconds)');
          this.serverProcess.kill();
          reject(new Error('Server startup timeout'));
        }
      }, 30000);

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[SD-Server] ${output.trim()}`);
        
        // Check for successful startup indicators
        if (output.includes('Running on') || output.includes('* Serving Flask app')) {
          if (!serverStarted) {
            serverStarted = true;
            clearTimeout(startupTimeout);
            console.log('✅ Stable Diffusion server started successfully');
            resolve(true);
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error(`[SD-Server Error] ${error.trim()}`);
        
        // Check for critical errors
        if (error.includes('ModuleNotFoundError') || error.includes('ImportError')) {
          console.error('❌ Missing Python dependencies detected');
          if (!serverStarted) {
            clearTimeout(startupTimeout);
            reject(new Error('Missing dependencies'));
          }
        }
      });

      this.serverProcess.on('close', (code) => {
        console.log(`[SD-Server] Process exited with code ${code}`);
        if (!serverStarted && code !== 0) {
          clearTimeout(startupTimeout);
          reject(new Error(`Server process exited with code ${code}`));
        }
      });

      this.serverProcess.on('error', (error) => {
        console.error('❌ Failed to start server process:', error.message);
        clearTimeout(startupTimeout);
        reject(error);
      });
    });
  }

  async healthCheck() {
    console.log('🏥 Performing health check...');
    
    const maxAttempts = 10;
    const delay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch('http://localhost:5001/health');
        if (response.ok) {
          console.log('✅ Health check passed - server is ready');
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      console.log(`⏳ Health check attempt ${attempt}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.warn('⚠️  Health check failed - server may not be fully ready');
    return false;
  }

  async execPromise(command, options = {}) {
    return new Promise((resolve, reject) => {
      exec(command, options, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout || stderr);
        }
      });
    });
  }

  setupGracefulShutdown() {
    const shutdown = () => {
      if (this.serverProcess) {
        console.log('🛑 Shutting down Stable Diffusion server...');
        this.serverProcess.kill('SIGTERM');
        setTimeout(() => {
          if (this.serverProcess && !this.serverProcess.killed) {
            this.serverProcess.kill('SIGKILL');
          }
        }, 5000);
      }
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('exit', shutdown);
  }

  async start() {
    console.log('🎯 Jarvis 2.0 - Stable Diffusion Server Startup');
    console.log('================================================');
    
    try {
      // Step 1: Find Python
      if (!(await this.findPython())) {
        process.exit(1);
      }

      // Step 2: Check/Install dependencies
      if (!(await this.checkDependencies())) {
        process.exit(1);
      }

      // Step 3: Start server
      this.setupGracefulShutdown();
      await this.startServer();

      // Step 4: Health check
      await this.healthCheck();

      console.log('🎉 Stable Diffusion server is running and ready!');
      console.log('📍 Server URL: http://localhost:5001');
      console.log('🔄 Server will continue running until stopped...');
      
      // Keep the process alive
      process.stdin.resume();
      
    } catch (error) {
      console.error('💥 Failed to start Stable Diffusion server:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const starter = new StableDiffusionStarter();
  starter.start().catch(console.error);
}

module.exports = { StableDiffusionStarter };
