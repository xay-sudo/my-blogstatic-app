
import * as postService from '@/lib/post-service';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import TagBadge from '@/components/TagBadge';
import { CalendarDays, BookOpen } from 'lucide-react'; // Changed Eye to BookOpen
import PostCard from '@/components/PostCard'; 
import type { Post } from '@/types'; 
import SocialShareButtons from '@/components/SocialShareButtons';
import { headers } from 'next/headers'; // For constructing URL
import CommentSection from '@/components/CommentSection';

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

  if (post.tags && post.tags.length > 0) {
    relatedPosts = allPosts.filter(otherPost => {
      if (otherPost.id === post.id) return false; 
      return otherPost.tags.some(tag => post.tags.includes(tag));
    }).slice(0, 8); // Changed from 4 to 8
  } else {
    relatedPosts = allPosts.filter(otherPost => otherPost.id !== post.id).slice(0, 8); // Changed from 4 to 8
  }

  // Construct the full post URL for sharing
  const FALLBACK_SITE_URL = 'http://localhost:3000'; // Update if deployed and env var not set
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
  const pageDescription = post.content.substring(0, 160).replace(/<[^>]*>?/gm, '').trim() + '...';


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
        <section className="max-w-4xl mx-auto mt-12 py-8"> {/* Changed max-w-3xl to max-w-4xl for better fit */}
          <h2 className="text-3xl font-headline font-bold text-primary mb-6 text-center">You may also like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"> {/* Adjusted grid for 4 items */}
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

