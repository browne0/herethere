import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd357mr26thcwbl.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
