
import * as postService from '@/lib/post-service';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import TagBadge from '@/components/TagBadge';
import { CalendarDays, Eye } from 'lucide-react'; // Added Eye icon
import PostCard from '@/components/PostCard'; 
import type { Post } from '@/types'; 

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

  // Increment view count and get the new count
  const newViewCount = await postService.incrementViewCount(post.id);

  // Update the post object for the current render if the increment was successful
  if (newViewCount !== null) {
    post = { ...post, viewCount: newViewCount };
  }
  // If newViewCount is null, an error occurred during increment,
  // so we'll display the viewCount fetched initially.

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Fetch all posts for related posts logic
  const allPosts = await postService.getAllPosts();
  let relatedPosts: Post[] = [];

  if (post.tags && post.tags.length > 0) {
    relatedPosts = allPosts.filter(otherPost => {
      if (otherPost.id === post.id) return false; // Exclude current post
      return otherPost.tags.some(tag => post.tags.includes(tag));
    }).slice(0, 3); // Get up to 3 related posts
  } else {
    // Fallback: if current post has no tags, show 3 latest posts (excluding current)
    relatedPosts = allPosts.filter(otherPost => otherPost.id !== post.id).slice(0, 3);
  }


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
              <Eye className="w-4 h-4 mr-1.5" />
              <span>{post.viewCount ?? 0} views</span>
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

        {post.tags && post.tags.length > 0 && (
          <footer className="mt-12 pt-8 border-t">
            <h3 className="text-lg font-semibold mb-3 font-headline">Tags:</h3>
            <div className="flex flex-wrap gap-3">
              {post.tags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          </footer>
        )}
      </article>

      {relatedPosts.length > 0 && (
        <section className="max-w-3xl mx-auto mt-12 py-8">
          <h2 className="text-3xl font-headline font-bold text-primary mb-6">You may also like</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {relatedPosts.map((relatedPost) => (
              <PostCard key={relatedPost.id} post={relatedPost} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

