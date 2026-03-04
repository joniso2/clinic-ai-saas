import type { NextConfig } from "next";

// Railway 1GB: standalone = smaller runtime footprint, less memory
const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: false,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    staticGenerationMaxConcurrency: 1,
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
