
'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon } from 'lucide-react'; // Loader2 removed as it's not used here
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

interface SearchBarClientProps {
  initialSearchTerm?: string;
}

export default function SearchBarClient({ initialSearchTerm = '' }: SearchBarClientProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // When the component is mounted (meaning it's visible), focus the input.
      inputRef.current?.focus();
    }
  }, [mounted]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newParams = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      newParams.set('search', searchTerm.trim());
    } else {
      newParams.delete('search'); // Remove search param if empty
    }
    newParams.delete('page'); // Reset to page 1 on new search
    router.push(`/?${newParams.toString()}`);
  };

  if (!mounted) {
    // Render a placeholder or skeleton while not mounted
    return (
      <div className="flex w-full max-w-xs sm:max-w-sm md:max-w-md items-center space-x-2" aria-busy="true" aria-live="polite">
        <Skeleton className="h-10 flex-grow bg-muted/50" />
        <Skeleton className="h-10 w-10 bg-muted/50" />
        <span className="sr-only">Loading search bar...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xs sm:max-w-sm md:max-w-md items-center space-x-2">
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search posts..."
        value={searchTerm}
        onChange={handleInputChange}
        className="flex-grow 
                   text-foreground bg-background placeholder:text-muted-foreground
                   transition-all duration-300 ease-in-out 
                   focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
                   focus:border-primary focus:shadow-lg"
        aria-label="Search blog posts"
      />
      <Button type="submit" variant="primary" aria-label="Submit search">
        <SearchIcon className="w-5 h-5" />
      </Button>
    </form>
  );
}
