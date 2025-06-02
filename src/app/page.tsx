
import type { Post } from '@/types';
import * as postService from '@/lib/post-service'; 
import { getSettings } from '@/lib/settings-service';
import PostCard from '@/components/PostCard';
import PaginationControlsClient from '@/components/PaginationControlsClient'; 
import SearchBarClient from '@/components/SearchBarClient'; 
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

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

  const renderBanner = () => {
    if (!settings.bannerEnabled) {
      return null;
    }

    if (settings.bannerType === 'image' && settings.bannerImageUrl) {
      const bannerContent = (
        <Image
          src={settings.bannerImageUrl}
          alt={settings.bannerImageAltText || 'Homepage Banner'}
          width={728}
          height={90}
          className="mx-auto"
          style={{ objectFit: 'contain' }}
          data-ai-hint="advertisement banner"
        />
      );
      if (settings.bannerImageLink) {
        return (
          <a href={settings.bannerImageLink} target="_blank" rel="noopener noreferrer">
            {bannerContent}
          </a>
        );
      }
      return bannerContent;
    }

    if (settings.bannerType === 'customHtml' && settings.bannerCustomHtml) {
      return (
        <div
          className="w-full max-w-[728px] h-[90px] mx-auto flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: settings.bannerCustomHtml }}
        />
      );
    }
    
    // Fallback for enabled but misconfigured banner
    return (
      <div 
        style={{ width: '728px', height: '90px' }} 
        className="bg-muted/20 border border-dashed border-muted-foreground/50 flex items-center justify-center text-sm text-muted-foreground mx-auto"
        aria-label="Homepage Banner Area"
      >
        Banner Misconfigured (728x90)
      </div>
    );
  };

  if (allPosts.length === 0 && !searchTerm) { 
     return (
        <div className="space-y-12">
          <div className="flex justify-center">
            {renderBanner()}
          </div>
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
        {renderBanner()}
      </div>

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
