
'use client';

import Link from 'next/link';
// import { ShieldCheck } from 'lucide-react'; // Admin link removed for now
// import { useAuth } from '@/contexts/AuthContext'; // Admin link removed for now
// import { useEffect, useState } from 'react'; // No longer needed for date

export default function Header() {
  // const { isAdminLoggedIn, isLoadingAuth } = useAuth(); // Kept for potential future re-add of admin link
  // const [currentDate, setCurrentDate] = useState(''); // Date display removed

  // useEffect(() => { // Date display removed
  //   setCurrentDate(new Date().toLocaleDateString('en-US', {
  //     year: 'numeric',
  //     month: 'long',
  //     day: 'numeric',
  //   }));
  // }, []);

  return (
    <>
      {/* Top Date Bar - Removed */}
      {/* {currentDate && (
        <div className="bg-muted/40 py-1 border-b border-muted">
          <div className="container mx-auto px-4">
            <p className="text-xs text-muted-foreground">{currentDate}</p>
          </div>
        </div>
      )} */}

      {/* Main Header with Logo and Ad space */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-4xl font-sans font-bold text-accent hover:opacity-80 transition-opacity">
            newsfire
          </Link>

          {/* Ad Container - ad scripts from layout.tsx should target this or a similar area */}
          <div className="mt-4 sm:mt-0 sm:ml-auto" aria-label="Advertisement Area">
            {/* The ad script (invoke.js) will inject an iframe, often 728x90.
                This div helps in layout and can be styled if the ad doesn't load.
            */}
            <div style={{ width: '728px', height: '90px' }} className="flex items-center justify-center bg-muted/10 text-xs text-muted-foreground">
              {/* Ad content will be injected here by external script */}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

