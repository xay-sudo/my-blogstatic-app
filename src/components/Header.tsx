
'use client';

import Link from 'next/link';
import { ShieldCheck, Search as SearchIcon, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function Header() {
  const { isAdminLoggedIn, isLoadingAuth } = useAuth();
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // Format date: Month Day, Year (e.g., June 2, 2025)
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(today.toLocaleDateString('en-US', options));
  }, []);

  const renderHeaderAdSlot = () => {
    // This is a visual placeholder for an ad slot within the header.
    // The dynamically configurable banner from Site Settings is rendered on the homepage (page.tsx).
    return (
      <div 
        style={{ width: '728px', height: '90px' }} 
        className="bg-muted/20 border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground"
        data-ai-hint="advertisement banner"
      >
        Header Ad Slot (728x90)
      </div>
    );
  };

  return (
    <>
      {/* Top Bar with Date */}
      <div className="bg-muted/50 border-b border-border">
        <div className="container mx-auto px-4 py-2 text-sm text-muted-foreground flex items-center">
          <CalendarDays className="w-4 h-4 mr-2" />
          {currentDate ? currentDate : <span className="animate-pulse bg-muted-foreground/20 h-4 w-24 rounded"></span>}
        </div>
      </div>

      {/* Main Header with Logo and Ad space */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-5xl font-headline font-bold text-red-600 hover:text-red-700 transition-colors">
            londonpost
          </Link>

          {/* Ad Container in Header */}
          <div className="mt-4 sm:mt-0 sm:ml-auto" aria-label="Advertisement Area">
            {renderHeaderAdSlot()}
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-foreground text-background shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
              SAMPLE PAGE
            </Link>
            {/* Admin Link - Conditionally Rendered */}
            {!isLoadingAuth && isAdminLoggedIn && (
              <Link href="/admin" className="flex items-center text-sm hover:text-primary transition-colors">
                <ShieldCheck className="w-5 h-5 mr-1" />
                Admin
              </Link>
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
