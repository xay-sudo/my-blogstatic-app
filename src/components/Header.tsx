
'use client';

import Link from 'next/link';
import type { SiteSettings } from '@/types';
import SearchBarClient from '@/components/SearchBarClient';
import React from 'react'; 
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  siteSettings: SiteSettings | null;
  isAdminLoggedIn?: boolean;
}

export default function Header({ siteSettings, isAdminLoggedIn }: HeaderProps) {

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
          <div className="flex items-center space-x-2"> {/* Container for search and toggle */}
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md">
              <SearchBarClient />
            </div>
            <ThemeToggle /> {/* Theme toggle button */}
          </div>
        </div>
     
      </nav>
    </>
 
  );
}
