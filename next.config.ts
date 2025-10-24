import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Handle React Native dependencies in browser context
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'react-native': false,
      };
    }

    // Exclude native node modules from client-side bundle
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    });

    // Ignore koffi native binaries on client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'koffi': false,
      };
    }

    return config;
  },
};

export default nextConfig;
