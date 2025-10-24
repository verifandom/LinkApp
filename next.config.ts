import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Handle React Native dependencies in browser context
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'react-native': false,
        'koffi': false,
      };
    }

    // Handle native .node modules from Reclaim Protocol
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    // Mark native modules as external
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'koffi',
        /\.node$/,
      ];
    }

    return config;
  },
};

export default nextConfig;
