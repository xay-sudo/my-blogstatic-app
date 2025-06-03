
'use client';

import Link from 'next/link';
import type { SiteSettings } from '@/types';
import SearchBarClient from '@/components/SearchBarClient';
import React, { useState, useEffect, useRef } from 'react'; 
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, X } from 'lucide-react';
import BannerAd from '@/components/BannerAd';
import Image from 'next/image'; // Import next/image

interface HeaderProps {
  siteSettings: SiteSettings | null;
  isAdminLoggedIn?: boolean;
}

export default function Header({ siteSettings, isAdminLoggedIn }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        const targetIsSearchOpenIcon = (event.target as HTMLElement).closest('button[aria-label="Open search"]');
        if (!targetIsSearchOpenIcon) {
          setIsSearchOpen(false);
        }
      }
    }

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen]);

  return (
    <>
      {/* Main Header with Logo */}
      <header className="bg-card border-b border-border">
        <BannerAd settings={siteSettings} />
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          <Link href="/" className="flex items-center gap-3 text-3xl font-headline font-bold text-primary hover:text-primary/90 transition-colors">
            {siteSettings?.siteLogoUrl ? (
              <Image
                src={siteSettings.siteLogoUrl}
                alt={siteSettings.siteTitle || 'Site Logo'}
                width={40} // Adjust as needed, or make responsive
                height={40} // Adjust as needed
                className="h-10 w-auto object-contain" // Example: max height of 40px, width auto
                priority // If logo is critical for LCP
                data-ai-hint="company logo"
              />
            ) : null}
            <span>{siteSettings?.siteTitle || 'News Today'}</span>
          </Link>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-foreground text-background shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center">
          {/* Left side (future nav links can go here) */}
          <div className="flex items-center space-x-6">
            {/* Future nav links can go here */}
          </div>

          {/* Spacer to push subsequent items to the right */}
          <div className="flex-grow" />

          {/* Group for all right-aligned items */}
          <div className="flex items-center space-x-3"> {/* Handles spacing between search and theme toggle */}
            {/* Search Elements */}
            {isSearchOpen ? (
              <div ref={searchWrapperRef} className="flex items-center space-x-2"> {/* Handles inner spacing for open search */}
                <SearchBarClient />
                <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(false)} aria-label="Close search" className="text-background hover:bg-accent/20 hover:text-accent-foreground">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} aria-label="Open search" className="text-background hover:bg-accent/20 hover:text-accent-foreground">
                <SearchIcon className="w-5 h-5" />
              </Button>
            )}
            
            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </>
  );
}
