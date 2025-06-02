
'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react'; 
import { useAuth } from '@/contexts/AuthContext'; 

export default function Header() {
  const { isAdminLoggedIn, isLoadingAuth } = useAuth(); 

  return (
    <>
      {/* Main Header with Logo and Ad space */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-4xl font-sans font-bold text-accent hover:opacity-80 transition-opacity">
            News Today
          </Link>

          {/* Ad Container */}
          <div className="mt-4 sm:mt-0 sm:ml-auto flex items-center space-x-4" aria-label="Advertisement Area and Admin Link">
            <div style={{ width: '728px', height: '90px' }} className="flex items-center justify-center bg-muted/10 text-xs text-muted-foreground">
              {/* Ad content will be injected here by external script */}
            </div>
            
            {/* Admin Link - Conditionally Rendered */}
            {!isLoadingAuth && isAdminLoggedIn && (
              <Link href="/admin" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                <ShieldCheck className="w-5 h-5 mr-1" />
                Admin
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
