
import { Suspense } from 'react';
import * as postService from '@/lib/post-service';
import AdminPostsClientPage from './client-page';
import { Skeleton } from '@/components/ui/skeleton';

// Loading skeleton for the posts table
function PostsTableSkeleton() {
  return (
    <div className="space-y-2 mt-6">
      <div className="relative mb-4">
        <Skeleton className="h-10 w-full sm:w-[300px]" />
      </div>
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
  );
}


export default async function AdminPostsPage() {
  // This is a Server Component, so we can fetch data directly.
  const posts = await postService.getAllPosts();

  return (
    <div className="space-y-6">
      <Suspense fallback={<PostsTableSkeleton />}>
        <AdminPostsClientPage initialPosts={posts} />
      </Suspense>
    </div>
  );
}

    