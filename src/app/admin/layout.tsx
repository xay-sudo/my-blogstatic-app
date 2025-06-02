
'use client';

import Link from 'next/link';
import { Home, FileText, LayoutDashboard, Settings, LogOut, MessagesSquare } from 'lucide-react'; // Added MessagesSquare
import { logoutAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; // For redirect after logout

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    startTransition(async () => {
      try {
        await logoutAction();
        toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
        // router.push('/login') will be handled by middleware or redirect in action
      } catch (error) {
        toast({ variant: 'destructive', title: 'Logout Failed', description: 'Could not log out.' });
      }
    });
  };

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
            href="/admin/comments" 
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
          >
            <MessagesSquare className="w-5 h-5" />
            <span>Manage Comments</span>
          </Link>
          <Link 
            href="/admin/settings" 
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
          >
            <Settings className="w-5 h-5" />
            <span>Site Settings</span>
          </Link>
        </nav>
        <form action={handleLogout}>
          <Button variant="outline" className="w-full" type="submit" disabled={isPending}>
            <LogOut className="w-5 h-5 mr-2" />
            {isPending ? 'Logging out...' : 'Logout'}
          </Button>
        </form>
      </aside>
      <div className="flex flex-col flex-grow">
        <main className="flex-grow p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
