import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds to successfully complete even if
    // your project has ESLint warnings
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Allow production builds to successfully complete even if
    // your project has TypeScript warnings
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
