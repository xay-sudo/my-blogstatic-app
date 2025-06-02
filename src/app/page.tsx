'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Post } from '@/types';
import { getAllPosts } from '@/lib/mock-posts';
import PostCard from '@/components/PostCard';
import PaginationControls from '@/components/PaginationControls';
import SearchBar from '@/components/SearchBar';
import { Skeleton } from '@/components/ui/skeleton';

const POSTS_PER_PAGE = 6;

export default function HomePage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      const posts = await getAllPosts();
      setAllPosts(posts);
      setFilteredPosts(posts);
      setIsLoading(false);
    };
    fetchPosts();
  }, []);

  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const newFilteredPosts = allPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(lowercasedSearchTerm) ||
        post.excerpt.toLowerCase().includes(lowercasedSearchTerm) ||
        post.tags.some(tag => tag.toLowerCase().includes(lowercasedSearchTerm))
    );
    setFilteredPosts(newFilteredPosts);
    setCurrentPage(1); // Reset to first page on new search
  }, [searchTerm, allPosts]);

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    return filteredPosts.slice(startIndex, endIndex);
  }, [filteredPosts, currentPage]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

  const handleSearchSubmit = () => {
    // The useEffect for searchTerm already handles filtering,
    // this function is mainly to satisfy the SearchBar's onSearchSubmit prop
    // if specific on-submit logic was needed.
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center mb-12">
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(POSTS_PER_PAGE)].map((_, index) => (
            <div key={index} className="flex flex-col space-y-3">
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
               <div className="flex gap-2 mt-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-center">
        <SearchBar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onSearchSubmit={handleSearchSubmit}
        />
      </div>

      {filteredPosts.length === 0 && !isLoading && (
        <p className="text-center text-muted-foreground text-xl py-10">
          No posts found. Try a different search term.
        </p>
      )}

      {filteredPosts.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {paginatedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
