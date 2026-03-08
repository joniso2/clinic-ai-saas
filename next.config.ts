import type { NextConfig } from "next";

// Railway 1GB: standalone = smaller runtime footprint, less memory
const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: false,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@react-pdf/font",
    "@react-pdf/layout",
    "@react-pdf/pdfkit",
    "@react-pdf/reconciler",
    "fontkit",
  ],
  experimental: {
    staticGenerationMaxConcurrency: 1,
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
