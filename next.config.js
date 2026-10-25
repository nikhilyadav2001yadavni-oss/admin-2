const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Proxy /api/v1/* to the Node backend so the admin app can run on a different port (e.g. 3002) while API stays on 3001.
  // Set BACKEND_API_ORIGIN if your API is not on http://127.0.0.1:3001
  async rewrites() {
    const backend =
      process.env.BACKEND_API_ORIGIN ||
      process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
      'http://127.0.0.1:3001'
    const origin = String(backend).replace(/\/+$/, '')
    return [
      {
        source: '/api/v1/:path*',
        destination: `${origin}/api/v1/:path*`,
      },
    ]
  },
  webpack: (config, { isServer }) => {
    // Wagmi / MetaMask SDK / WalletConnect optional deps (see terminal "Module not found")
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': path.join(__dirname, 'stubs/async-storage-stub.js'),
      'pino-pretty': path.join(__dirname, 'stubs/pino-pretty-stub.js'),
    }

    if (!isServer) {
      // xlsx tries to require 'fs' (Node-only). Tell webpack to ignore it on the client.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
