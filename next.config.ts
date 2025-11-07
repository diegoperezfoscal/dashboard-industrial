import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Configuración de Turbopack
  turbopack: {},

  // Configuración de Webpack para AWS IoT Device SDK v2
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        stream: false,
        util: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;