
'use client';

import type { SiteSettings } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

interface BannerAdProps {
  settings: SiteSettings | null;
}

const BannerAd: React.FC<BannerAdProps> = ({ settings }) => {
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
      {settings.bannerType === 'customHtml' && settings.bannerCustomHtml && (
        <div
          dangerouslySetInnerHTML={{ __html: settings.bannerCustomHtml }}
          className="w-full flex justify-center" // Ensure the div takes space and centers content
        />
      )}
    </div>
  );
};

export default BannerAd;
