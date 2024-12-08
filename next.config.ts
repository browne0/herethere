import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: [
      'd357mr26thcwbl.cloudfront.net', // Your CloudFront domain
    ],
  },
};

export default nextConfig;
