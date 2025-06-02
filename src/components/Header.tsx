
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
// useAuth removed
import type { SiteSettings } from '@/types';
import RenderHtmlContent from '@/components/RenderHtmlContent';
import { Skeleton } from '@/components/ui/skeleton';
import SearchBarClient from '@/components/SearchBarClient';
import React, { Suspense } from 'react';

interface HeaderProps {
  siteSettings: SiteSettings | null;
}

function SearchBarFallback() {
  return (
    <div className="flex w-full max-w-xs sm:max-w-sm md:max-w-md items-center space-x-2" aria-busy="true" aria-live="polite">
      <Skeleton className="h-10 flex-grow" />
      <Skeleton className="h-10 w-10" />
      <span className="sr-only">Loading search bar...</span>
    </div>
  );
}

export default function Header({ siteSettings }: HeaderProps) {
  // isAdminLoggedIn, isLoadingAuth removed

  const renderHeaderAdSlot = () => {
    if (!siteSettings) {
      return (
        <Skeleton
          className="bg-muted/20 border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground"
          style={{ width: '728px', height: '90px' }}
          data-ai-hint="advertisement banner loading"
        >
          <span className="sr-only">Loading Ad...</span>
        </Skeleton>
      );
    }

    if (!siteSettings.bannerEnabled) {
      return (
        <div
          style={{ width: '728px', height: '90px' }}
          className="bg-muted/10 border border-dashed border-border/50 flex items-center justify-center text-xs text-muted-foreground/50"
          data-ai-hint="advertisement banner empty"
        >
          Header Ad Slot (728x90)
        </div>
      );
    }

    if (siteSettings.bannerType === 'image' && siteSettings.bannerImageUrl) {
      const bannerContent = (
        <Image
          src={siteSettings.bannerImageUrl}
          alt={siteSettings.bannerImageAltText || 'Header Ad Banner'}
          width={728}
          height={90}
          style={{ objectFit: 'contain' }}
          data-ai-hint="advertisement banner"
          priority
        />
      );
      if (siteSettings.bannerImageLink) {
        return (
          <a href={siteSettings.bannerImageLink} target="_blank" rel="noopener noreferrer" aria-label={siteSettings.bannerImageAltText || 'Advertisement'}>
            {bannerContent}
          </a>
        );
      }
      return bannerContent;
    }

    if (siteSettings.bannerType === 'customHtml' && siteSettings.bannerCustomHtml) {
      return (
        <RenderHtmlContent
          htmlString={siteSettings.bannerCustomHtml}
          className="w-full max-w-[728px] h-[90px] flex items-center justify-center"
          placeholderStyle={{ width: '728px', height: '90px', minHeight: '90px' }}
        />
      );
    }

    return (
      <div
        style={{ width: '728px', height: '90px', minHeight: '90px' }}
        className="bg-muted/20 border border-dashed border-muted-foreground/50 flex items-center justify-center text-sm text-muted-foreground"
        aria-label="Header Ad Slot Area - Misconfigured"
        data-ai-hint="advertisement banner misconfigured"
      >
        Header Ad (728x90) - Check Config
      </div>
    );
  };

  return (
    <>
      {/* Main Header with Logo and Ad space */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          <Link href="/" className="text-3xl font-headline font-bold text-primary hover:text-primary/90 transition-colors">
            News Today
          </Link>
          <div className="mt-4 sm:mt-0 sm:ml-auto" aria-label="Advertisement Area">
            {renderHeaderAdSlot()}
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-foreground text-background shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            {/* Admin link removed from here */}
          </div>
          <div className="w-full max-w-xs sm:max-w-sm md:max-w-md ml-auto"> {/* Added ml-auto to push search to the right if no links are present */}
            <Suspense fallback={<SearchBarFallback />}>
              <SearchBarClient />
            </Suspense>
          </div>
        </div>
      </nav>
    </>
  );
}
