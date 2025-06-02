
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
        hostname: 'placehold.co', // For placeholder images
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined,
        port: '',
        pathname: '/storage/v1/object/public/**', // Allow images from Supabase storage
      },
      {
        protocol: 'https',
        hostname: '*.*', // Allow all OTHER HTTPS image sources
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '*.*', // Allow all HTTP image sources (use with caution)
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
