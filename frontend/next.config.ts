import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://horse-racing-api.onrender.com',
  },
  reactStrictMode: true,
  // API関連のリクエストをプロキシする設定
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://horse-racing-api.onrender.com'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
