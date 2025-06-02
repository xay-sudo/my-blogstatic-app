
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
        <div className="w-full flex justify-center" style={{ minHeight: '90px' }}> {/* Placeholder to maintain layout space */}
            {/* Intentionally empty or a subtle loader if preferred, to be replaced by client-side render */}
        </div>
      )}
    </div>
  );
};

export default BannerAd;
