
'use client';

import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SearchBarClientProps {
  initialSearchTerm?: string;
}

export default function SearchBarClient({ initialSearchTerm = '' }: SearchBarClientProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const router = useRouter();
  const searchParams = useSearchParams(); // To get other existing params

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

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center space-x-2">
      <Input
        type="text"
        placeholder="Search posts..."
        value={searchTerm}
        onChange={handleInputChange}
        className="flex-grow text-black dark:text-white placeholder:text-muted-foreground"
        aria-label="Search blog posts"
      />
      <Button type="submit" variant="primary" aria-label="Submit search">
        <SearchIcon className="w-5 h-5" />
      </Button>
    </form>
  );
}

    