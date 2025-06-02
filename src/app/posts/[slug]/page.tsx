
import * as postService from '@/lib/post-service'; 
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import TagBadge from '@/components/TagBadge';
import AISuggestTags from '@/components/AISuggestTags';
import { CalendarDays } from 'lucide-react';

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
    title: `${post.title} | Blogstatic`,
    description: post.content.substring(0, 150).replace(/<[^>]*>?/gm, ''), // Use start of content for description
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await postService.getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-card shadow-xl rounded-lg">
      <header className="mb-8">
        <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary mb-4 break-words">
          {post.title}
        </h1>
        <div className="text-muted-foreground flex items-center space-x-4">
          <div className="flex items-center">
            <CalendarDays className="w-5 h-5 mr-2" />
            <time dateTime={post.date}>{formattedDate}</time>
          </div>
        </div>
        {post.imageUrl && (
          <div className="mt-6 relative w-full h-72 md:h-96 rounded-lg overflow-hidden shadow-md">
            <Image
              src={post.imageUrl}
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

      <AISuggestTags postContent={post.content} currentTags={post.tags || []} />
    </article>
  );
}
