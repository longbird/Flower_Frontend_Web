import type { NextConfig } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '49.247.46.86',
        port: '8080',
      },
      {
        protocol: 'http',
        hostname: '49.247.206.190',
      },
      {
        protocol: 'https',
        hostname: 'seoulflower.co.kr',
      },
      {
        protocol: 'https',
        hostname: 'www.468.co.kr',
      },
      {
        protocol: 'http',
        hostname: 'ebestflower.co.kr',
      },
    ],
    unoptimized: true,
  },
  allowedDevOrigins: ['49.247.46.86', '49.247.206.190', '10.7.1.49', 'localhost'],
  async rewrites() {
    if (API_BASE_URL) {
      return [
        {
          source: '/api/proxy/:path*',
          destination: `${API_BASE_URL}/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
