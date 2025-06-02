
import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import TagBadge from './TagBadge';
import { CalendarDays, ArrowRight } from 'lucide-react';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const displayImageUrl = post.thumbnailUrl || post.imageUrl;

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      {displayImageUrl && (
        <Link href={`/posts/${post.slug}`} className="block">
          <div className="relative w-full h-48">
            <Image
              src={displayImageUrl}
              alt={post.title}
              fill 
              style={{objectFit:"cover"}} 
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
              data-ai-hint="article content"
            />
          </div>
        </Link>
      )}
      <CardHeader>
        <Link href={`/posts/${post.slug}`}>
          <CardTitle className="font-headline text-2xl hover:text-primary transition-colors">
            {post.title}
          </CardTitle>
        </Link>
        <div className="text-sm text-muted-foreground flex items-center mt-2">
          <CalendarDays className="w-4 h-4 mr-2" />
          <time dateTime={post.date}>{formattedDate}</time>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {/* Excerpt removed */}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 pt-4"> {/* Added pt-4 for spacing */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
        <Link href={`/posts/${post.slug}`} className="text-primary hover:underline flex items-center self-end mt-auto pt-2">
          Read More <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </CardFooter>
    </Card>
  );
}
