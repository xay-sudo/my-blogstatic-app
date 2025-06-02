
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Search as SearchIcon, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
// import { getSettings } from '@/lib/settings-service'; // Removed
import type { SiteSettings } from '@/types';
import RenderHtmlContent from '@/components/RenderHtmlContent';
import { Skeleton } from '@/components/ui/skeleton';

interface HeaderProps {
  siteSettings: SiteSettings | null;
}

export default function Header({ siteSettings }: HeaderProps) {
  const { isAdminLoggedIn, isLoadingAuth } = useAuth();
  const [currentDate, setCurrentDate] = useState('');
  // const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null); // Removed
  // const [isLoadingSettings, setIsLoadingSettings] = useState(true); // Removed

  useEffect(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(today.toLocaleDateString('en-US', options));

    // Fetching logic moved to RootLayout
    // const fetchSiteSettings = async () => {
    //   try {
    //     const settings = await getSettings();
    //     setSiteSettings(settings);
    //   } catch (error) {
    //     console.error("Failed to fetch site settings for header:", error);
    //   } finally {
    //     setIsLoadingSettings(false);
    //   }
    // };
    // fetchSiteSettings();
  }, []);

  const renderHeaderAdSlot = () => {
    // Use passed siteSettings directly
    if (!siteSettings) { // Handles both null and initial loading if settings weren't passed yet (though they should be)
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
          priority // Consider if this is always LCP
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
      {/* Top Bar with Date */}
      <div className="bg-muted/50 border-b border-border">
        <div className="container mx-auto px-4 py-2 text-sm text-muted-foreground flex items-center">
          <CalendarDays className="w-4 h-4 mr-2" />
          {currentDate ? currentDate : <Skeleton className="h-4 w-24 bg-muted-foreground/20" />}
        </div>
      </div>

      {/* Main Header with Logo and Ad space */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          <Link href="/" className="text-5xl font-headline font-bold text-primary hover:text-primary/90 transition-colors">
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
            {!isLoadingAuth && isAdminLoggedIn && (
              <Link href="/admin" className="flex items-center text-sm hover:text-primary transition-colors">
                <ShieldCheck className="w-5 h-5 mr-1" />
                Admin
              </Link>
            )}
             {isLoadingAuth && (
              <Skeleton className="h-5 w-20 bg-background/20" />
            )}
          </div>
          <button aria-label="Search" className="p-2 rounded-md hover:bg-background/10 transition-colors">
            <SearchIcon className="w-5 h-5" />
          </button>
        </div>
      </nav>
    </>
  );
}
