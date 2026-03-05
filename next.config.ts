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
    ],
    unoptimized: true,
  },
  async rewrites() {
    // 개발 환경: API 요청을 백엔드로 프록시 (CORS 우회)
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
