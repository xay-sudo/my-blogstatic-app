
'use client';

import Link from 'next/link';
import type { SiteSettings } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import SearchBarClient from '@/components/SearchBarClient';
import React, { Suspense, useCallback } from 'react'; 

interface HeaderProps {
  siteSettings: SiteSettings | null;
  isAdminLoggedIn?: boolean;
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
export default function Header({ siteSettings, isAdminLoggedIn }: HeaderProps) {

  return (
    <>
      {/* Main Header with Logo */}
      
      <header className="bg-card border-b border-border">
        
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          <Link href="/" className="text-3xl font-headline font-bold text-primary hover:text-primary/90 transition-colors">
            {siteSettings?.siteTitle || 'News Today'}
          </Link>


          {/* Ad slot removejjd */}
    

        </div>
       
      </header>

      {/* Navigation Bar */}
      
      <nav className="bg-foreground text-background shadow-md">
       
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            {/* Future nav links can go here */}
          
          </div>
          <div className="w-full max-w-xs sm:max-w-sm md:max-w-md ml-auto">
            <Suspense fallback={<SearchBarFallback />}>
              <SearchBarClient />
            </Suspense>
          </div>
        </div>
     
      </nav>
    </>
 
  );
}
