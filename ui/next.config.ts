import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  eslint: {
    // Allow build to succeed even with ESLint warnings
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Allow build to succeed even with TypeScript errors (for quick development)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
