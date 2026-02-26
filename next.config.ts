import type { NextConfig } from "next";

// Railway 1GB: limit concurrency & optimize memory so build doesn't get OOM killed
const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    staticGenerationMaxConcurrency: 1,
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
