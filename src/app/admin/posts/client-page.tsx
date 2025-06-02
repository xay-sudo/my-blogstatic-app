
'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Post } from '@/types';
import { PlusCircle, Edit2, Trash2, ExternalLink, Loader2, Eye, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deletePostAction } from '@/app/actions'; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminPostsClientPageProps {
  initialPosts: Post[];
}

export default function AdminPostsClientPage({ initialPosts }: AdminPostsClientPageProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(false); 
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition(); 

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const handleDeletePost = async (postId: string, postTitle: string) => {
    startTransition(async () => {
      setIsLoading(true); 
      const result = await deletePostAction(postId);
      if (result.success) {
        toast({
          title: 'Post Deleted',
          description: `"${postTitle}" has been successfully deleted.`,
        });
        setPosts(prev => prev.filter(post => post.id !== postId));
      } else {
        toast({
          variant: 'destructive',
          title: 'Error Deleting Post',
          description: result.message || 'Could not delete the post.',
        });
      }
      setIsLoading(false);
    });
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog Posts</h1>
          <p className="text-muted-foreground">
            Manage all your blog posts here.
          </p>
        </div>
        <Link href="/admin/posts/new">
          <Button variant="primary"> 
            <PlusCircle className="w-5 h-5 mr-2" />
            Create New Post
          </Button>
        </Link>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
        </CardHeader>
        <CardContent>
          {posts.length === 0 && !isLoading ? (
            <p className="text-muted-foreground text-center py-10">
              No posts yet. Create your first one!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] hidden sm:table-cell">Thumbnail</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Tags</TableHead>
                  <TableHead className="hidden lg:table-cell text-center">Views</TableHead> 
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="hidden sm:table-cell">
                      {post.thumbnailUrl ? (
                        <Image
                          src={post.thumbnailUrl}
                          alt={post.title || 'Post thumbnail'}
                          width={64}
                          height={64}
                          className="rounded object-cover aspect-square"
                          data-ai-hint="post thumbnail"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      <Link href={`/posts/${post.slug}`} className="hover:underline" target="_blank" title={post.title}>
                        {post.title}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(post.date)}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {post.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="mr-1 mb-1 inline-block px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 ? '...' : ''}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center">
                      <div className="flex items-center justify-center">
                        <Eye className="w-4 h-4 mr-1 text-muted-foreground" />
                        {post.viewCount ?? 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                       <Button variant="ghost" size="icon" asChild title="View Post">
                          <Link href={`/posts/${post.slug}`} target="_blank">
                             <ExternalLink className="w-4 h-4" />
                          </Link>
                       </Button>
                      <Button variant="ghost" size="icon" asChild title="Edit Post"> 
                          <Link href={`/admin/posts/edit/${post.id}`}>
                             <Edit2 className="w-4 h-4" />
                          </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete Post" disabled={isPending || isLoading}>
                            {(isPending || isLoading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the post titled &quot;{post.title}&quot;.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPending || isLoading}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePost(post.id, post.title)}
                              disabled={isPending || isLoading} 
                              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            >
                              {(isPending || isLoading) ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

