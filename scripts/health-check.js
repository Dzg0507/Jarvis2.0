#!/usr/bin/env node

/**
 * Health check script for all Jarvis 2.0 services
 * Verifies that all required services are running and accessible
 */

// Use built-in fetch in Node.js 18+ or fallback to node-fetch
const fetch = globalThis.fetch || require('node-fetch');

class HealthChecker {
  constructor() {
    this.services = {
      nextjs: {
        name: 'Next.js Application',
        url: 'http://localhost:3000/api/health',
        timeout: 5000
      },
      stableDiffusion: {
        name: 'Stable Diffusion Server',
        url: 'http://localhost:5001/health',
        timeout: 10000
      },
      mcp: {
        name: 'MCP Server',
        url: 'http://localhost:8080/health',
        timeout: 5000
      }
    };
  }

  async checkService(service) {
    try {
      console.log(`🔍 Checking ${service.name}...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), service.timeout);
      
      const response = await fetch(service.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Jarvis-Health-Check/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        console.log(`✅ ${service.name}: HEALTHY`);
        if (data.version) console.log(`   Version: ${data.version}`);
        if (data.status) console.log(`   Status: ${data.status}`);
        return { status: 'healthy', service: service.name, data };
      } else {
        console.log(`⚠️  ${service.name}: UNHEALTHY (HTTP ${response.status})`);
        return { status: 'unhealthy', service: service.name, error: `HTTP ${response.status}` };
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`⏰ ${service.name}: TIMEOUT (${service.timeout}ms)`);
        return { status: 'timeout', service: service.name, error: 'Request timeout' };
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ ${service.name}: NOT RUNNING (Connection refused)`);
        return { status: 'not_running', service: service.name, error: 'Connection refused' };
      } else {
        console.log(`❌ ${service.name}: ERROR (${error.message})`);
        return { status: 'error', service: service.name, error: error.message };
      }
    }
  }

  async checkAllServices() {
    console.log('🏥 Jarvis 2.0 - Health Check');
    console.log('============================');
    
    const results = {};
    let allHealthy = true;
    
    for (const [key, service] of Object.entries(this.services)) {
      const result = await this.checkService(service);
      results[key] = result;
      if (result.status !== 'healthy') {
        allHealthy = false;
      }
      console.log(''); // Add spacing between checks
    }
    
    // Summary
    console.log('📊 Health Check Summary:');
    console.log('========================');
    
    const healthyCount = Object.values(results).filter(r => r.status === 'healthy').length;
    const totalCount = Object.keys(results).length;
    
    console.log(`Services: ${healthyCount}/${totalCount} healthy`);
    
    if (allHealthy) {
      console.log('🎉 All services are healthy and ready!');
    } else {
      console.log('⚠️  Some services need attention:');
      
      Object.entries(results).forEach(([, result]) => {        
        if (result.status !== 'healthy') {
          console.log(`   • ${result.service}: ${result.status.toUpperCase()}`);
          if (result.error) console.log(`     Error: ${result.error}`);
        }
      });
      
      console.log('\n💡 Troubleshooting:');
      
      if (results.nextjs?.status !== 'healthy') {
        console.log('   • Next.js: Run "npm run dev" to start the application');
      }
      
      if (results.stableDiffusion?.status !== 'healthy') {
        console.log('   • Stable Diffusion: Run "npm run start:sd" to start the server');
        console.log('     Or manually: python src/services/stable-diffusion-server.py');
      }
      
      if (results.mcp?.status !== 'healthy') {
        console.log('   • MCP Server: Should start automatically with "npm run dev"');
        console.log('     Or manually: npm run dev:mcp');
      }
    }
    
    return { allHealthy, results };
  }

  async waitForService(serviceKey, maxWaitTime = 60000, checkInterval = 2000) {
    const service = this.services[serviceKey];
    if (!service) {
      throw new Error(`Unknown service: ${serviceKey}`);
    }
    
    console.log(`⏳ Waiting for ${service.name} to become healthy...`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const result = await this.checkService(service);
      
      if (result.status === 'healthy') {
        console.log(`✅ ${service.name} is now healthy!`);
        return true;
      }
      
      console.log(`   Still waiting... (${Math.round((Date.now() - startTime) / 1000)}s)`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    console.log(`⏰ Timeout waiting for ${service.name} (${maxWaitTime}ms)`);
    return false;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const checker = new HealthChecker();
  
  if (args.length === 0) {
    // Default: check all services
    const { allHealthy } = await checker.checkAllServices();
    process.exit(allHealthy ? 0 : 1);
    
  } else if (args[0] === 'wait') {
    // Wait for a specific service
    const serviceKey = args[1] || 'stableDiffusion';
    const maxWait = parseInt(args[2]) || 60000;
    
    const success = await checker.waitForService(serviceKey, maxWait);
    process.exit(success ? 0 : 1);
    
  } else if (args[0] === 'check') {
    // Check a specific service
    const serviceKey = args[1];
    if (!checker.services[serviceKey]) {
      console.error(`❌ Unknown service: ${serviceKey}`);
      console.log('Available services:', Object.keys(checker.services).join(', '));
      process.exit(1);
    }
    
    const result = await checker.checkService(checker.services[serviceKey]);
    process.exit(result.status === 'healthy' ? 0 : 1);
    
  } else {
    console.log('Usage:');
    console.log('  node health-check.js                    # Check all services');
    console.log('  node health-check.js wait [service]     # Wait for service to be healthy');
    console.log('  node health-check.js check [service]    # Check specific service');
    console.log('');
    console.log('Available services:', Object.keys(checker.services).join(', '));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Health check failed:', error.message);
    process.exit(1);
  });
}

module.exports = { HealthChecker };
