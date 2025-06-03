
'use client';

import type { SiteSettings } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

interface BannerAdProps {
  settings: SiteSettings | null;
}

const BannerAd: React.FC<BannerAdProps> = ({ settings }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!settings || !settings.bannerEnabled) {
    return null;
  }

  // Determine the height for the placeholder based on banner type and content
  let placeholderHeight = '90px'; // Default for typical image banners
  if (settings.bannerType === 'customHtml' && settings.bannerCustomHtml) {
    // Basic check for height in the custom HTML, assuming it's for a 90x720 (W x H) or 720x90 (W x H) scenario
    // This is a heuristic and might need adjustment if HTML is complex.
    if (settings.bannerCustomHtml.includes("'height' : 720") || settings.bannerCustomHtml.includes("height: 720") || settings.bannerCustomHtml.includes("height=\"720\"")) {
      placeholderHeight = '720px';
    } else if (settings.bannerCustomHtml.includes("'height' : 90") || settings.bannerCustomHtml.includes("height: 90") || settings.bannerCustomHtml.includes("height=\"90\"")) {
      placeholderHeight = '90px';
    }
    // Add more conditions if other heights are common in your custom HTML
  }


  return (
    <div className="container mx-auto my-4 flex justify-center items-center" aria-label="Advertisement Area">
      {settings.bannerType === 'image' && settings.bannerImageUrl && (
        <Link href={settings.bannerImageLink || '#'} target="_blank" rel="noopener noreferrer sponsored">
          <Image
            src={settings.bannerImageUrl}
            alt={settings.bannerImageAltText || 'Advertisement'}
            width={728} // Default banner width, consider making this configurable
            height={90}  // Default banner height
            className="rounded shadow-md object-contain"
            data-ai-hint="advertisement banner"
            priority // If this is above the fold, consider priority
          />
        </Link>
      )}
      {settings.bannerType === 'customHtml' && settings.bannerCustomHtml && mounted && (
        <div
          dangerouslySetInnerHTML={{ __html: settings.bannerCustomHtml }}
          className="w-full flex justify-center" // Ensure the div takes space and centers content
        />
      )}
      {/* Render a placeholder or nothing if customHTML and not yet mounted to avoid hydration mismatch */}
      {settings.bannerType === 'customHtml' && settings.bannerCustomHtml && !mounted && (
        <div className="w-full flex justify-center" style={{ minHeight: placeholderHeight }}> {/* Placeholder to maintain layout space */}
            {/* Intentionally empty or a subtle loader if preferred, to be replaced by client-side render */}
        </div>
      )}
    </div>
  );
};

export default BannerAd;
