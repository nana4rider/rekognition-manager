import type { NextConfig } from 'next';

const bffOrigin = process.env.BFF_ORIGIN ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@rekognition-manager/contracts'],
  rewrites() {
    return Promise.resolve([
      { source: '/auth/:path*', destination: `${bffOrigin}/auth/:path*` },
      { source: '/health', destination: `${bffOrigin}/health` },
      { source: '/ready', destination: `${bffOrigin}/ready` },
    ]);
  },
};

export default nextConfig;
