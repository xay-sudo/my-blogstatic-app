
'use client';

import Link from 'next/link';
import type { SiteSettings } from '@/types';
import SearchBarClient from '@/components/SearchBarClient';
import React, { useState, useEffect, useRef } from 'react'; 
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, X } from 'lucide-react';
import BannerAd from '@/components/BannerAd';

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
        // If the click is outside the searchWrapper (search bar + close button)
        // AND it's not on the search open icon itself, then close.
        // This prevents immediate re-closing if the open icon is part of a larger clickable area issue.
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
        {/* Banner Ad placed inside the header, above the logo/nav section */}
        <BannerAd settings={siteSettings} />
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          <Link href="/" className="text-3xl font-headline font-bold text-primary hover:text-primary/90 transition-colors">
            {siteSettings?.siteTitle || 'News Today'}
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

          {/* Search Elements Group */}
          <div className="flex items-center">
            {isSearchOpen ? (
              <div ref={searchWrapperRef} className="flex items-center space-x-2 mr-2">
                <SearchBarClient />
                <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(false)} aria-label="Close search" className="text-background hover:bg-accent/20 hover:text-accent-foreground">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} aria-label="Open search" className="text-background hover:bg-accent/20 hover:text-accent-foreground mr-2">
                <SearchIcon className="w-5 h-5" />
              </Button>
            )}
          </div>
          
          {/* Theme Toggle - will be the rightmost element */}
          <ThemeToggle />
        </div>
      </nav>
    </>
  );
}
