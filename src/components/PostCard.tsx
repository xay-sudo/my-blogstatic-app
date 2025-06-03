
import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// TagBadge is no longer used directly in the card for a minimal look
import { CalendarDays, BookOpen } from 'lucide-react'; // Changed Eye to BookOpen

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const displayImageUrl = post.thumbnailUrl;

  return (
    <Card className="overflow-hidden border bg-card hover:bg-card/95 dark:hover:bg-card/90 transition-colors duration-200 flex flex-col h-full group rounded-lg">
      {displayImageUrl && (
        <Link href={`/posts/${post.slug}`} className="block overflow-hidden aspect-[16/9] relative">
          <Image
            src={displayImageUrl}
            alt={post.title}
            fill
            style={{objectFit:"cover"}}
            className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            data-ai-hint="article thumbnail"
          />
        </Link>
      )}
      <CardHeader className="p-4">
        <Link href={`/posts/${post.slug}`}>
          <CardTitle className="font-headline text-lg hover:text-primary transition-colors line-clamp-2 leading-tight">
            {post.title}
          </CardTitle>
        </Link>
        <div className="text-xs text-muted-foreground flex items-center mt-2 space-x-3">
          <div className="flex items-center">
            <CalendarDays className="w-3.5 h-3.5 mr-1" />
            <time dateTime={post.date}>{formattedDate}</time>
          </div>
          <div className="flex items-center">
            <BookOpen className="w-3.5 h-3.5 mr-1" /> 
            <span>{post.viewCount ?? 0}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 flex-grow">
        {/* Minimal design, so no excerpt by default. Can be added if desired. */}
        {/* 
        <p className="text-sm text-muted-foreground line-clamp-3 mt-1">
          A short summary or excerpt of the post could go here.
        </p> 
        */}
      </CardContent>
      {/* Footer with tags and "Read More" link is removed for minimalism */}
    </Card>
  );
}
