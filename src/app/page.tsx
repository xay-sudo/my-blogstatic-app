
import type { Post } from '@/types';
import * as postService from '@/lib/post-service'; 
import { getSettings } from '@/lib/settings-service';
import PostCard from '@/components/PostCard';
import PaginationControlsClient from '@/components/PaginationControlsClient'; 
// SearchBarClient is no longer needed here as it's only in the Header now

interface HomePageProps {
  searchParams?: {
    page?: string;
    search?: string;
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const allPosts = await postService.getAllPosts();
  const settings = await getSettings();
  const postsPerPage = settings.postsPerPage > 0 ? settings.postsPerPage : 6;

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
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  if (allPosts.length === 0 && !searchTerm) { 
     return (
        <div className="space-y-12">
          {/* SearchBarClient removed from here */}
          <p className="text-center text-muted-foreground text-xl py-10">
            No posts have been created yet.
          </p>
        </div>
     )
  }

  return (
    <div className="space-y-12">
      {/* SearchBarClient and its wrapper div removed from here */}

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
