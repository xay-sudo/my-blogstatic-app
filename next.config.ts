
import type { NextConfig } from 'next';
import type { ImageConfigComplete } from 'next/dist/shared/lib/image-config';

const remotePatternsConfig: ImageConfigComplete['remotePatterns'] = [
  {
    protocol: 'https',
    hostname: 'placehold.co', // For placeholder images
    port: '',
    pathname: '/**',
  },
  // Other static patterns can go here if needed
];

const supabaseEnvUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHostname: string | undefined;

if (supabaseEnvUrl && (supabaseEnvUrl.startsWith('https://') || supabaseEnvUrl.startsWith('http://'))) {
  try {
    supabaseHostname = new URL(supabaseEnvUrl).hostname;
    remotePatternsConfig.push({
      protocol: 'https',
      hostname: supabaseHostname,
      port: '',
      pathname: '/storage/v1/object/public/**', // Allow images from Supabase storage
    });
  } catch (e) {
    console.warn(
      `[next.config.js] Invalid NEXT_PUBLIC_SUPABASE_URL ("${supabaseEnvUrl}"). Supabase images may not work correctly. Error: ${(e as Error).message}`
    );
  }
} else if (supabaseEnvUrl) { // Defined but not a valid HTTP/HTTPS URL (e.g., placeholder)
    console.warn(
      `[next.config.js] NEXT_PUBLIC_SUPABASE_URL ("${supabaseEnvUrl}") is not a valid http(s) URL. Supabase image remote pattern not added. Supabase images may not work correctly.`
    );
} else { // Not defined at all
    console.warn(
      `[next.config.js] NEXT_PUBLIC_SUPABASE_URL is not defined. Remote pattern for Supabase images will not be added. Supabase images will not load.`
    );
}

// Add the general wildcard patterns
remotePatternsConfig.push(
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
);

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: remotePatternsConfig,
  },
};

export default nextConfig;
