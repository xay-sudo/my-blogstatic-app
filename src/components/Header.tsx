import Link from 'next/link';
import { ShieldCheck } from 'lucide-react'; 

export default function Header() {
  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="text-3xl font-headline text-primary hover:opacity-80 transition-opacity">
          Blogstatic
        </Link>
        <nav>
          <Link href="/admin" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center">
            <ShieldCheck className="w-4 h-4 mr-1" />
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
