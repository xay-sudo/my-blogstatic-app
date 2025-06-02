'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon } from 'lucide-react'; // Renamed to avoid conflict
import type React from 'react';

interface SearchBarProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSearchSubmit: () => void;
}

export default function SearchBar({ searchTerm, onSearchTermChange, onSearchSubmit }: SearchBarProps) {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchTermChange(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearchSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center space-x-2">
      <Input
        type="text"
        placeholder="Search posts..."
        value={searchTerm}
        onChange={handleInputChange}
        className="flex-grow"
        aria-label="Search blog posts"
      />
      <Button type="submit" variant="primary" aria-label="Submit search">
        <SearchIcon className="w-5 h-5" />
      </Button>
    </form>
  );
}
