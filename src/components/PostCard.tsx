
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
    <Card className="overflow-hidden border bg-card hover:bg-card/95 dark:hover:bg-card/90 transition-colors duration-200 flex flex-col h-full group rounded-lg shadow-sm hover:shadow-md">
      {displayImageUrl && (
        <Link href={`/posts/${post.slug}`} className="block overflow-hidden aspect-[16/9] relative">
          <Image
            src={displayImageUrl}
            alt={post.title}
            fill
            style={{objectFit:"cover"}}
            className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            data-ai-hint="article thumbnail"
          />
        </Link>
      )}
      <CardHeader className="p-3 sm:p-4">
        <Link href={`/posts/${post.slug}`}>
          <CardTitle className="font-headline text-base sm:text-lg hover:text-primary transition-colors line-clamp-2 leading-tight">
            {post.title}
          </CardTitle>
        </Link>
        <div className="text-xs text-muted-foreground flex items-center mt-1.5 space-x-2.5">
          <div className="flex items-center">
            <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
            <time dateTime={post.date}>{formattedDate}</time>
          </div>
          <div className="flex items-center">
            <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" /> 
            <span>{post.viewCount ?? 0}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 flex-grow">
        {/* Minimal design, so no excerpt by default. */}
      </CardContent>
    </Card>
  );
}

