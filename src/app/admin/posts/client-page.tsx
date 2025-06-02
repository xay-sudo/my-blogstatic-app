
'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card'; // CardTitle, CardDescription removed as they are in parent
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Post } from '@/types';
import { PlusCircle, Edit2, Trash2, ExternalLink, Search, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { deletePostAction } from '@/app/actions'; // Import server action
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
  const [allPosts, setAllPosts] = useState<Post[]>(initialPosts);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(false); // For client-side operations like delete
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition(); // For delete operation

  useEffect(() => {
    setAllPosts(initialPosts);
    setFilteredPosts(initialPosts);
  }, [initialPosts]);

  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const newFilteredPosts = allPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(lowercasedSearchTerm) ||
        post.tags.some(tag => tag.toLowerCase().includes(lowercasedSearchTerm))
    );
    setFilteredPosts(newFilteredPosts);
  }, [searchTerm, allPosts]);

  const handleDeletePost = async (postId: string, postTitle: string) => {
    startTransition(async () => {
      setIsLoading(true); // General loading state for UI feedback
      const result = await deletePostAction(postId);
      if (result.success) {
        toast({
          title: 'Post Deleted',
          description: `"${postTitle}" has been successfully deleted.`,
        });
        // Refresh data by removing the post from the local state.
        // The revalidatePath in the server action should handle cache, 
        // but updating client state provides immediate feedback.
        setAllPosts(prev => prev.filter(post => post.id !== postId));
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
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search posts by title or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full sm:w-[300px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* isLoading prop on parent page handles initial load skeleton */}
          {filteredPosts.length === 0 && !isLoading ? (
            <p className="text-muted-foreground text-center py-10">
              {searchTerm ? `No posts found for "${searchTerm}".` : "No posts yet. Create your first one!"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      <Link href={`/posts/${post.slug}`} className="hover:underline" target="_blank" title={post.title}>
                        {post.title}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(post.date)}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {post.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="mr-1 mb-1 inline-block px-2 py-0.5 bg-accent/20 text-accent-foreground rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 ? '...' : ''}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                       <Button variant="ghost" size="icon" asChild title="View Post">
                          <Link href={`/posts/${post.slug}`} target="_blank">
                             <ExternalLink className="w-4 h-4" />
                          </Link>
                       </Button>
                      <Button variant="ghost" size="icon" title="Edit Post (disabled)" disabled> {/* Future: Link to /admin/posts/edit/[id] */}
                          <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete Post" disabled={isPending || isLoading}>
                            {isPending || isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
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
                              {isPending || isLoading ? 'Deleting...' : 'Delete'}
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


    