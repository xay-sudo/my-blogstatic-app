import Link from 'next/link';
import SearchBar from './SearchBar'; // SearchBar will be created later, state managed by page

export default function Header() {
  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="text-3xl font-headline text-primary hover:opacity-80 transition-opacity">
          Blogstatic
        </Link>
        {/* Search bar might be moved to page level for state management */}
      </div>
    </header>
  );
}
