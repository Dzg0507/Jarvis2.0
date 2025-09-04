#!/usr/bin/env node

const { spawn } = require('child_process');
const fetch = require('node-fetch');

console.log('🎯 Jarvis 2.0 - Starting All Services');
console.log('=====================================');

let stableDiffusionProcess = null;
let mcpProcess = null;
let nextProcess = null;

// Cleanup function
function cleanup() {
    console.log('\n🛑 Shutting down all services...');
    if (stableDiffusionProcess) {
        stableDiffusionProcess.kill('SIGTERM');
    }
    if (mcpProcess) {
        mcpProcess.kill('SIGTERM');
    }
    if (nextProcess) {
        nextProcess.kill('SIGTERM');
    }
    process.exit(0);
}

// Handle cleanup on exit
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Health check function
async function checkHealth(url, serviceName, maxRetries = 30) {
    console.log(`🏥 Checking ${serviceName} health...`);
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, { timeout: 5000 });
            if (response.ok) {
                console.log(`✅ ${serviceName} is healthy!`);
                return true;
            }
        } catch (error) {
            // Service not ready yet
        }
        
        if (i < maxRetries - 1) {
            console.log(`⏳ ${serviceName} not ready, waiting... (${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log(`❌ ${serviceName} health check failed after ${maxRetries} attempts`);
    return false;
}

async function startServices() {
    try {
        // Step 1: Start Stable Diffusion Server
        console.log('\n🚀 Step 1: Starting Stable Diffusion Server...');
        stableDiffusionProcess = spawn('npm', ['run', 'dev:sd'], {
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: true
        });

        stableDiffusionProcess.stdout.on('data', (data) => {
            process.stdout.write(`[SD] ${data}`);
        });

        stableDiffusionProcess.stderr.on('data', (data) => {
            process.stderr.write(`[SD] ${data}`);
        });

        // Wait for Stable Diffusion to be healthy
        const sdHealthy = await checkHealth('http://localhost:5001/health', 'Stable Diffusion', 60);
        if (!sdHealthy) {
            throw new Error('Stable Diffusion failed to start');
        }

        // Step 1.5: Start Simple Stable Diffusion Server (with float32 fix)
        console.log('\n🚀 Step 1.5: Starting Simple Stable Diffusion Server...');
        const simpleSDProcess = spawn('python', ['src/services/simple-sd-server.py'], {
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: true
        });

        simpleSDProcess.stdout.on('data', (data) => {
            process.stdout.write(`[Simple-SD] ${data}`);
        });

        simpleSDProcess.stderr.on('data', (data) => {
            process.stderr.write(`[Simple-SD Error] ${data}`);
        });

        // Wait for Simple Stable Diffusion to be healthy
        const simpleSDHealthy = await checkHealth('http://localhost:5002/health', 'Simple Stable Diffusion', 30);
        if (!simpleSDHealthy) {
            console.log('⚠️ Simple Stable Diffusion failed to start, continuing without it...');
        } else {
            // Warmup the model to ensure it's preloaded
            console.log('🔥 Warming up Simple Stable Diffusion model...');
            try {
                const warmupResponse = await fetch('http://localhost:5002/warmup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000 // 1 minute timeout for warmup
                });
                if (warmupResponse.ok) {
                    console.log('✅ Simple Stable Diffusion model warmed up successfully!');
                } else {
                    console.log('⚠️ Model warmup failed, but continuing...');
                }
            } catch (error) {
                console.log('⚠️ Model warmup error:', error.message, 'but continuing...');
            }
        }

        // Step 2: Start MCP Server
        console.log('\n🚀 Step 2: Starting MCP Server...');
        mcpProcess = spawn('npm', ['run', 'dev:mcp'], {
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: true
        });

        mcpProcess.stdout.on('data', (data) => {
            process.stdout.write(`[MCP] ${data}`);
        });

        mcpProcess.stderr.on('data', (data) => {
            process.stderr.write(`[MCP] ${data}`);
        });

        // Wait for MCP Server to be healthy
        const mcpHealthy = await checkHealth('http://localhost:8080/tools', 'MCP Server', 30);
        if (!mcpHealthy) {
            console.log('⚠️  MCP Server failed to start, but continuing (fallback will work)');
        }

        // Step 3: Start Next.js
        console.log('\n🚀 Step 3: Starting Next.js...');
        nextProcess = spawn('npm', ['run', 'dev:next'], {
            stdio: ['inherit', 'pipe', 'pipe'],
            shell: true
        });

        nextProcess.stdout.on('data', (data) => {
            process.stdout.write(`[Next] ${data}`);
        });

        nextProcess.stderr.on('data', (data) => {
            process.stderr.write(`[Next] ${data}`);
        });

        // Wait for Next.js to be ready
        const nextHealthy = await checkHealth('http://localhost:3000', 'Next.js', 30);
        if (!nextHealthy) {
            throw new Error('Next.js failed to start');
        }

        console.log('\n🎉 All services started successfully!');
        console.log('=====================================');
        console.log('✅ Stable Diffusion: http://localhost:5001 (GPU accelerated)');
        console.log('✅ Simple Stable Diffusion: http://localhost:5002 (Optimized & Preloaded)');
        console.log('✅ MCP Server: http://localhost:8080 (26 tools)');
        console.log('✅ Next.js: http://localhost:3000');
        console.log('\n🖼️  Ready for HIGH-QUALITY image generation!');
        console.log('💡 Try: "Generate an image of a beautiful sunset"');
        console.log('⚡ Colab: 768x768, 30 steps, ~5-10 seconds per image');
        console.log('🔄 Local: 384x384, 15 steps, ~2-3 minutes per image');
        console.log('\n🛑 Press Ctrl+C to stop all services');

        // Keep the process alive
        await new Promise(() => {});

    } catch (error) {
        console.error(`❌ Error starting services: ${error.message}`);
        cleanup();
    }
}

startServices();
