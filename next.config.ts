
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // Added for Firebase Storage
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co', // For placeholder images
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.*', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '*.*', 
        port: '',
        pathname: '/**',
      },
      { 
        protocol: 'https',
        hostname: '*', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '*',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
