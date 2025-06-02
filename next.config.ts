
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
        hostname: '*.*', // Allow any hostname with at least one dot (e.g., example.com, cdn.example.com)
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '*.*', // Allow any hostname with at least one dot for HTTP
        port: '',
        pathname: '/**',
      },
      { // Fallback for single-word hostnames (less common for image hosting, but for completeness)
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
