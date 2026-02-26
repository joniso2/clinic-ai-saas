import type { NextConfig } from "next";

// Railway 1GB: limit concurrency, disable React Compiler & source maps to save memory
const nextConfig: NextConfig = {
  reactCompiler: false,
  productionBrowserSourceMaps: false,
  experimental: {
    staticGenerationMaxConcurrency: 1,
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
