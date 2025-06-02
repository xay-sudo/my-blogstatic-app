import Link from 'next/link';
import { Home, FileText, Settings, LayoutDashboard } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="w-60 bg-background border-r p-4 space-y-4 hidden md:flex md:flex-col shadow-sm">
        <Link href="/admin" className="flex items-center space-x-2 p-2 mb-4">
          <LayoutDashboard className="w-8 h-8 text-primary" />
          <h2 className="text-xl font-headline text-primary">Admin Panel</h2>
        </Link>
        <nav className="space-y-1">
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
          {/* Example for future links:
          <Link 
            href="/admin/settings" 
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link> 
          */}
        </nav>
      </aside>
      <div className="flex flex-col flex-grow">
        {/* Mobile Header Placeholder if needed - or integrate with a global mobile nav strategy */}
        <main className="flex-grow p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
