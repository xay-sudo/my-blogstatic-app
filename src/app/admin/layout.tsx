
'use client';

import Link from 'next/link';
import { Home, FileText, LayoutDashboard, LogOut, Settings } from 'lucide-react'; // Added Settings
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdminLoggedIn, logoutAdmin, isLoadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if auth state is determined and user is not admin
    if (!isLoadingAuth && isAdminLoggedIn === false) {
      router.push('/login');
    }
  }, [isLoadingAuth, isAdminLoggedIn, router]);

  if (isLoadingAuth || isAdminLoggedIn === null) { // Show loading if auth is loading or not yet determined
    return (
      <div className="flex min-h-screen bg-muted/40">
        <aside className="w-60 bg-background border-r p-4 space-y-4 hidden md:flex md:flex-col shadow-sm">
          <div className="flex items-center justify-between p-2 mb-4">
            <div className="flex items-center space-x-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <nav className="space-y-1 flex-grow">
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full" />
          </nav>
          <Skeleton className="h-10 w-full" />
        </aside>
        <div className="flex flex-col flex-grow">
          <main className="flex-grow p-6 lg:p-8">
            <div className="flex justify-center items-center h-full">
               <p className="text-muted-foreground">Loading authentication...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (isAdminLoggedIn === false) { // If definitely not logged in, don't render children (redirect will handle it)
    return null;
  }

  // If isAdminLoggedIn is true, render the admin layout
  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="w-60 bg-background border-r p-4 space-y-4 hidden md:flex md:flex-col shadow-sm">
        <div className="flex items-center justify-between p-2 mb-4">
          <Link href="/admin" className="flex items-center space-x-2">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-headline text-primary">Admin</h2>
          </Link>
        </div>
        <nav className="space-y-1 flex-grow">
          <Link 
            href="/admin" 
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
          >
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link 
            href="/admin/posts" 
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
          >
            <FileText className="w-5 h-5" />
            <span>Manage Posts</span>
          </Link>
          <Link 
            href="/admin/settings" 
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
          >
            <Settings className="w-5 h-5" />
            <span>Site Settings</span>
          </Link>
        </nav>
        <Button variant="outline" onClick={logoutAdmin} className="w-full">
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </aside>
      <div className="flex flex-col flex-grow">
        <main className="flex-grow p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
