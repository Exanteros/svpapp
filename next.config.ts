import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Memory optimization for low-resource servers
  experimental: {
    // Reduce memory usage during build
    workerThreads: false,
    cpus: 1,
  },
  
  // Compress responses
  compress: true,
  
  // Optimize images
  images: {
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    formats: ['image/webp', 'image/avif'],
  },
  
  // Static file optimization
  poweredByHeader: false,
  
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
  }),
};

export default nextConfig;
