// Image Generation Configuration
// Switch between local GPU and free cloud GPU services

const IMAGE_GENERATION_CONFIG = {
  // Current active service
  activeService: 'local', // 'local' | 'colab' | 'replicate' - Colab offline, using local
  
  // Service configurations
  services: {
    local: {
      name: 'Local GPU',
      url: 'http://localhost:5002',
      description: 'Your local 4GB GPU with CPU fallback',
      pros: ['Private', 'No API costs', 'Always available'],
      cons: ['Limited VRAM', 'Slower generation', 'Memory issues'],
      settings: {
        width: 384,
        height: 384,
        num_inference_steps: 15,
        guidance_scale: 7.5
      }
    },
    
    colab: {
      name: 'Google Colab (Free)',
      url: 'https://7f5ef7a77e7d.ngrok-free.app', // Your active Colab server
      description: 'Free Tesla T4 GPU (16GB VRAM)',
      pros: ['16GB VRAM', 'Much faster', 'Free', 'No memory issues'],
      cons: ['Session resets', 'Setup required', 'Public URL'],
      settings: {
        width: 768,
        height: 768,
        num_inference_steps: 30,
        guidance_scale: 8.0
      }
    },
    
    replicate: {
      name: 'Replicate API',
      url: 'https://api.replicate.com/v1/predictions',
      description: 'Professional API service',
      pros: ['Very fast', 'Reliable', 'High quality', 'No setup'],
      cons: ['Costs money', 'API limits', 'Requires account'],
      apiKey: '', // Set your Replicate API key
      settings: {
        width: 512,
        height: 512,
        num_inference_steps: 25,
        guidance_scale: 7.5
      }
    }
  },
  
  // Fallback order if primary service fails
  fallbackOrder: ['local', 'colab', 'replicate'],
  
  // Auto-switch based on conditions
  autoSwitch: {
    enabled: true,
    conditions: {
      // Switch to CPU if CUDA out of memory
      onCudaOOM: 'cpu_fallback',
      // Switch to Colab if local is too slow
      onSlowGeneration: 'colab',
      // Timeout thresholds
      timeoutThresholds: {
        local: 300000, // 5 minutes
        colab: 180000, // 3 minutes
        replicate: 60000 // 1 minute
      }
    }
  }
};

// Helper functions
function getCurrentService() {
  return IMAGE_GENERATION_CONFIG.services[IMAGE_GENERATION_CONFIG.activeService];
}

function switchService(serviceName) {
  if (IMAGE_GENERATION_CONFIG.services[serviceName]) {
    IMAGE_GENERATION_CONFIG.activeService = serviceName;
    console.log(`🔄 Switched to ${serviceName} image generation service`);
    return true;
  }
  return false;
}

function getServiceStatus() {
  const current = getCurrentService();
  return {
    active: IMAGE_GENERATION_CONFIG.activeService,
    name: current.name,
    url: current.url,
    settings: current.settings,
    description: current.description
  };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IMAGE_GENERATION_CONFIG,
    getCurrentService,
    switchService,
    getServiceStatus
  };
}

// Instructions for setup:
console.log(`
🎯 IMAGE GENERATION SETUP INSTRUCTIONS:

1. LOCAL GPU (Current):
   - Already configured
   - CPU fallback enabled for 4GB GPU
   - Optimized settings: 256x256, 8 steps

2. GOOGLE COLAB (Free 16GB GPU):
   - Open: colab-stable-diffusion.ipynb
   - Run all cells in Google Colab
   - Copy the ngrok URL
   - Update: config.services.colab.url = "YOUR_NGROK_URL"
   - Switch: switchService('colab')

3. REPLICATE API (Paid):
   - Sign up at replicate.com
   - Get API key
   - Update: config.services.replicate.apiKey = "YOUR_API_KEY"
   - Switch: switchService('replicate')

🚀 RECOMMENDED SETUP:
1. Use local for testing
2. Setup Colab for production
3. Keep Replicate as premium backup
`);
