
'use client';

import Link from 'next/link';
import type { SiteSettings } from '@/types';
import SearchBarClient from '@/components/SearchBarClient';
import React, { useState, useEffect, useRef } from 'react'; 
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, X } from 'lucide-react';

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
        setIsSearchOpen(false);
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
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          <Link href="/" className="text-3xl font-headline font-bold text-primary hover:text-primary/90 transition-colors">
            {siteSettings?.siteTitle || 'News Today'}
          </Link>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-foreground text-background shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            {/* Future nav links can go here */}
          </div>
          <div className="flex items-center space-x-2">
            {isSearchOpen ? (
              <div ref={searchWrapperRef} className="flex items-center space-x-2">
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
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </>
  );
}
