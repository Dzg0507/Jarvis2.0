#!/usr/bin/env node

/**
 * Test script to validate image generation service priority
 * This script tests that Stable Diffusion is prioritized over other services
 */

const { config } = require('../src/config');
const { getServiceStatus, checkStableDiffusionHealth } = require('../src/tools/image-generation');

async function testImageGenerationPriority() {
  console.log('🧪 Testing Image Generation Service Priority\n');
  
  // Test 1: Configuration Check
  console.log('📋 Configuration Check:');
  console.log(`   Stable Diffusion Enabled: ${config.stableDiffusion.enabled}`);
  console.log(`   Stable Diffusion URL: ${config.stableDiffusion.serverUrl}`);
  console.log(`   Stable Diffusion Priority: ${config.stableDiffusion.priority}`);
  console.log(`   Force Stable Diffusion: ${config.stableDiffusion.forceStableDiffusion}`);
  console.log(`   Max Retries: ${config.stableDiffusion.maxRetries}`);
  console.log(`   Fallback to OpenAI: ${config.stableDiffusion.fallbackToOpenAI}`);
  console.log(`   OpenAI API Key Available: ${!!config.ai.openaiApiKey}\n`);

  // Test 2: Service Health Check
  console.log('🏥 Service Health Check:');
  try {
    const sdHealthy = await checkStableDiffusionHealth();
    console.log(`   Stable Diffusion Health: ${sdHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    
    if (!sdHealthy) {
      console.log(`   ⚠️  Stable Diffusion server not responding at ${config.stableDiffusion.serverUrl}`);
      console.log(`   💡 Make sure to start the Stable Diffusion server first:`);
      console.log(`      python src/services/stable-diffusion-server.py`);
    }
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}`);
  }
  console.log('');

  // Test 3: Service Priority Status
  console.log('🎯 Service Priority Status:');
  try {
    const serviceStatus = await getServiceStatus();
    console.log(`   Recommended Service: ${serviceStatus.recommendedService.toUpperCase()}`);
    console.log(`   Priority Order: ${serviceStatus.priorityOrder.join(' → ')}`);
    console.log(`   Stable Diffusion Available: ${serviceStatus.stableDiffusion.available ? '✅' : '❌'}`);
    console.log(`   OpenAI Available: ${serviceStatus.openai.available ? '✅' : '❌'}`);
    
    // Validate priority
    if (serviceStatus.stableDiffusion.available && serviceStatus.recommendedService !== 'stable_diffusion') {
      console.log('   ⚠️  WARNING: Stable Diffusion is available but not recommended!');
    } else if (serviceStatus.stableDiffusion.available) {
      console.log('   ✅ CORRECT: Stable Diffusion is prioritized');
    }
  } catch (error) {
    console.log(`   ❌ Service status check failed: ${error.message}`);
  }
  console.log('');

  // Test 4: API Endpoint Test
  console.log('🌐 API Endpoint Test:');
  try {
    const response = await fetch('http://localhost:3000/api/image-generation', {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Image generation API is accessible');
      console.log(`   Services Status:`);
      console.log(`     - Stable Diffusion: ${data.services?.stable_diffusion?.available ? '✅ Available' : '❌ Unavailable'}`);
      console.log(`     - OpenAI: ${data.services?.openai?.available ? '✅ Available' : '❌ Unavailable'}`);
    } else {
      console.log('   ❌ Image generation API not accessible');
      console.log('   💡 Make sure the Next.js server is running: npm run dev');
    }
  } catch (error) {
    console.log(`   ❌ API test failed: ${error.message}`);
    console.log('   💡 Make sure the Next.js server is running: npm run dev');
  }
  console.log('');

  // Test Results Summary
  console.log('📊 Test Results Summary:');
  console.log('   Expected Behavior:');
  console.log('   1. ✅ Stable Diffusion should be the primary service');
  console.log('   2. ✅ OpenAI DALL-E should only be used as fallback');
  console.log('   3. ✅ Gemini API should NOT be used for image generation');
  console.log('   4. ✅ Service priority should favor local Stable Diffusion');
  console.log('');
  console.log('   To ensure optimal performance:');
  console.log('   • Start Stable Diffusion server: python src/services/stable-diffusion-server.py');
  console.log('   • Keep SD_ENABLED=true in your .env file');
  console.log('   • Set SD_FORCE_ONLY=true to never use fallback services');
  console.log('');
}

// Run the test
if (require.main === module) {
  testImageGenerationPriority().catch(console.error);
}

module.exports = { testImageGenerationPriority };
