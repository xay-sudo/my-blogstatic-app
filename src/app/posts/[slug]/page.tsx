
import * as postService from '@/lib/post-service';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import TagBadge from '@/components/TagBadge';
import { CalendarDays, BookOpen } from 'lucide-react';
import PostCard from '@/components/PostCard';
import type { Post } from '@/types';
import SocialShareButtons from '@/components/SocialShareButtons';
import { headers } from 'next/headers';
import CommentSection from '@/components/CommentSection';
import { suggestRelatedArticles } from '@/ai/flows/suggest-related-articles';
import * as cheerio from 'cheerio';

interface PostPageProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  const posts = await postService.getAllPosts();
  return posts.map(post => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await postService.getPostBySlug(params.slug);
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }
  return {
    title: `${post.title} | Newstoday`,
    description: post.content.substring(0, 150).replace(/<[^>]*>?/gm, ''),
  };
}

// Helper to get text excerpt from HTML
function getExcerptFromHtml(htmlContent: string, maxLength: number = 300): string {
  if (!htmlContent) return '';
  try {
    const $ = cheerio.load(htmlContent); // Get text from the body, Cheerio wraps content in html/body
    let text = $('body').text();
    text = text.replace(/\s\s+/g, ' ').trim(); // Normalize whitespace
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  } catch (error) {
    console.warn("Cheerio couldn't parse HTML for excerpt, falling back to substring:", error);
    const plainText = htmlContent.replace(/<[^>]*>?/gm, '');
    return plainText.substring(0, maxLength) + (plainText.length > maxLength ? '...' : '');
  }
}


export default async function PostPage({ params }: PostPageProps) {
  let post = await postService.getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const newViewCount = await postService.incrementViewCount(post.id);

  if (newViewCount !== null) {
    post = { ...post, viewCount: newViewCount };
  }

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const allPosts = await postService.getAllPosts();
  let relatedPosts: Post[] = [];
  const MAX_RELATED_POSTS = 8;

  try {
    const otherAvailablePosts = allPosts
      .filter(p => p.id !== post!.id)
      .map(p => ({ id: p.id, title: p.title }));

    if (otherAvailablePosts.length > 0) {
      const currentPostContentExcerpt = getExcerptFromHtml(post.content, 300);
      const aiSuggestions = await suggestRelatedArticles({
        currentPostId: post.id,
        currentPostTitle: post.title,
        currentPostContentExcerpt: currentPostContentExcerpt,
        availablePosts: otherAvailablePosts,
        count: MAX_RELATED_POSTS,
      });

      if (aiSuggestions.relatedPostIds.length > 0) {
        const suggestedPostMap = new Map(allPosts.map(p => [p.id, p]));
        relatedPosts = aiSuggestions.relatedPostIds
          .map(id => suggestedPostMap.get(id))
          .filter(p => p !== undefined) as Post[];
      }
    }
    // If AI suggestions are fewer than max or AI didn't run, we might have less than MAX_RELATED_POSTS.
    // If relatedPosts is still empty after AI attempt (or if AI wasn't called), apply tag-based fallback.
    if (relatedPosts.length === 0 && post.tags && post.tags.length > 0) {
      console.log("AI provided no/few suggestions, trying tag-based related posts.");
      relatedPosts = allPosts.filter(otherPost => {
        if (otherPost.id === post!.id) return false;
        return otherPost.tags.some(tag => post!.tags.includes(tag));
      }).slice(0, MAX_RELATED_POSTS);
    }

    // If still no related posts, use a random selection as a final fallback
    if (relatedPosts.length === 0) {
        console.log("No AI or tag-based suggestions, falling back to random related posts.");
        relatedPosts = allPosts
            .filter(otherPost => otherPost.id !== post!.id)
            .sort(() => 0.5 - Math.random()) // Simple random shuffle
            .slice(0, MAX_RELATED_POSTS);
    }


  } catch (aiError: any) {
    let errorDisplay = "An unexpected error occurred with AI suggestions.";
    if (aiError && typeof aiError === 'object') {
      if (aiError.message) {
        errorDisplay = aiError.message;
      } else {
        const stringifiedError = JSON.stringify(aiError);
        errorDisplay = stringifiedError === '{}' ? "Received an empty object as error from AI flow, check Genkit logs and API key." : stringifiedError;
      }
    } else if (typeof aiError === 'string') {
      errorDisplay = aiError;
    }
    console.error(`AI suggestion for related posts failed. Details: ${errorDisplay}. Full error object seen in PostPage:`, aiError);

    // Fallback logic if AI suggestion promise rejects
    console.log("AI suggestion process failed, applying fallback for related posts.");
    if (post.tags && post.tags.length > 0) {
      console.log("Falling back to tag-based related posts due to AI error.");
      relatedPosts = allPosts.filter(otherPost => {
        if (otherPost.id === post!.id) return false;
        return otherPost.tags.some(tag => post!.tags.includes(tag));
      }).slice(0, MAX_RELATED_POSTS);
    }

    if (relatedPosts.length === 0) { // If tag-based didn't yield results or no tags
      console.log("Falling back to random related posts due to AI error and no tag matches.");
      relatedPosts = allPosts
        .filter(otherPost => otherPost.id !== post!.id)
        .sort(() => 0.5 - Math.random()) // Simple random shuffle
        .slice(0, MAX_RELATED_POSTS);
    }
  }

  const FALLBACK_SITE_URL = 'http://localhost:3000';
  let baseUrlToUse = process.env.NEXT_PUBLIC_SITE_URL;

  if (!baseUrlToUse) {
    const headersList = headers();
    const hostHeader = headersList.get('host');
    const protocolHeader = headersList.get('x-forwarded-proto') || (hostHeader?.includes('localhost') ? 'http' : 'https');
    if (hostHeader) {
      baseUrlToUse = `${protocolHeader}://${hostHeader}`;
    } else {
      baseUrlToUse = FALLBACK_SITE_URL;
    }
  }
  const postUrl = `${baseUrlToUse}/posts/${post.slug}`;
  const pageDescription = getExcerptFromHtml(post.content, 160);


  return (
    <>
      <article className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-card shadow-xl rounded-lg">
        <header className="mb-8">
          <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary mb-4 break-words">
            {post.title}
          </h1>
          <div className="text-muted-foreground flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <CalendarDays className="w-4 h-4 mr-1.5" />
              <time dateTime={post.date}>{formattedDate}</time>
            </div>
            <div className="flex items-center">
              <BookOpen className="w-4 h-4 mr-1.5" />
              <span>{post.viewCount ?? 0} Reads</span>
            </div>
          </div>
          {post.thumbnailUrl && (
            <div className="mt-6 relative w-full h-72 md:h-96 rounded-lg overflow-hidden shadow-md">
              <Image
                src={post.thumbnailUrl}
                alt={post.title}
                fill
                style={{objectFit:"cover"}}
                priority
                data-ai-hint="article banner"
              />
            </div>
          )}
        </header>

        <div
          className="prose prose-lg max-w-none text-foreground leading-relaxed selection:bg-primary/30"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {(post.tags && post.tags.length > 0) || postUrl ? (
          <footer className="mt-12 pt-8 border-t">
            {post.tags && post.tags.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 font-headline">Tags:</h3>
                <div className="flex flex-wrap gap-3">
                  {post.tags.map((tag) => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                </div>
              </div>
            )}
            <SocialShareButtons
              postUrl={postUrl}
              postTitle={post.title}
              postDescription={pageDescription}
            />
          </footer>
        ) : null}
      </article>

      {relatedPosts.length > 0 && (
        <section className="max-w-4xl mx-auto mt-12 py-8">
          <h2 className="text-3xl font-headline font-bold text-primary mb-6 text-center">You may also like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedPosts.map((relatedPost) => (
              <PostCard key={relatedPost.id} post={relatedPost} />
            ))}
          </div>
        </section>
      )}

      <CommentSection />
    </>
  );
}

