/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove static export - we'll run Next.js server in Electron
  experimental: {
    serverComponentsExternalPackages: ['@google/generative-ai']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  env: {
    API_KEY: process.env.API_KEY,
    MCP_SERVER_URL: process.env.MCP_SERVER_URL,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig;