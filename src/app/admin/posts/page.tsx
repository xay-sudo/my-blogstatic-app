'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAllPosts } from '@/lib/mock-posts';
import type { Post } from '@/types';
import { PlusCircle, Edit2, Trash2, ExternalLink, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

export default function AdminPostsPage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      const fetchedPosts = await getAllPosts();
      setAllPosts(fetchedPosts);
      setFilteredPosts(fetchedPosts);
      setIsLoading(false);
    };
    fetchPosts();
  }, []);

  useEffect(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const newFilteredPosts = allPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(lowercasedSearchTerm) ||
        post.tags.some(tag => tag.toLowerCase().includes(lowercasedSearchTerm))
    );
    setFilteredPosts(newFilteredPosts);
  }, [searchTerm, allPosts]);

  const handleDeletePost = (postId: string) => {
    // Placeholder for delete functionality
    alert(`Mock Delete: Post ${postId} would be deleted here. (Not implemented)`);
    // Example: setAllPosts(prev => prev.filter(post => post.id !== postId));
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                 <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] items-center gap-4 py-3 border-b last:border-b-0">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                    <div className="flex space-x-1">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
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
                        <span key={tag} className="mr-1 mb-1 inline-block px-2 py-0.5 bg-accent/50 text-accent-foreground rounded-full text-xs">
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
                      <Button variant="ghost" size="icon" title="Edit Post (disabled)" disabled>
                          <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePost(post.id)} title="Delete Post (disabled)" disabled>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
