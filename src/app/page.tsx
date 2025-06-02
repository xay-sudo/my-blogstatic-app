
import type { Post } from '@/types';
import * as postService from '@/lib/post-service'; 
import PostCard from '@/components/PostCard';
import PaginationControlsClient from '@/components/PaginationControlsClient'; 
import SearchBarClient from '@/components/SearchBarClient'; 
import { Skeleton } from '@/components/ui/skeleton';

const POSTS_PER_PAGE = 6;

interface HomePageProps {
  searchParams?: {
    page?: string;
    search?: string;
  };
}

// Loading skeleton for the home page post cards
function HomePageLoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-center mb-12">
        <Skeleton className="h-10 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(POSTS_PER_PAGE)].map((_, index) => (
          <div key={index} className="flex flex-col space-y-3 p-4 border rounded-lg bg-card shadow">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <div className="space-y-2 pt-2">
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


export default async function HomePage({ searchParams }: HomePageProps) {
  const allPosts = await postService.getAllPosts();

  const currentPage = Number(searchParams?.page) || 1;
  const searchTerm = searchParams?.search || '';

  const filteredPosts = searchTerm
    ? allPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : allPosts;

  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

  if (allPosts.length === 0 && !searchTerm) { 
     return (
        <div className="space-y-12">
          <div className="flex justify-center">
             <SearchBarClient initialSearchTerm={searchTerm} />
          </div>
          <p className="text-center text-muted-foreground text-xl py-10">
            No posts have been created yet.
          </p>
        </div>
     )
  }


  return (
    <div className="space-y-12">
      <div className="flex justify-center">
        <SearchBarClient initialSearchTerm={searchTerm} />
      </div>

      {paginatedPosts.length === 0 && searchTerm && (
        <p className="text-center text-muted-foreground text-xl py-10">
          No posts found for &quot;{searchTerm}&quot;. Try a different search term.
        </p>
      )}

      {paginatedPosts.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {paginatedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
      
      <PaginationControlsClient
        currentPage={currentPage}
        totalPages={totalPages}
        currentSearchTerm={searchTerm}
      />
    </div>
  );
}
