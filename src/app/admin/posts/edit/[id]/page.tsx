
import * as postService from '@/lib/post-service';
import { notFound } from 'next/navigation';
import ClientEditPage from './client-edit-page';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';


function EditPostLoadingSkeleton() {
    return (
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-8 w-24" />
          </div>
           <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-10 w-full" />
           <div className="flex justify-end space-x-3 pt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    );
}


export default async function EditPostPage({ params }: { params: { id: string } }) {
  if (!params.id) {
    notFound();
  }

  const post = await postService.getPostById(params.id);

  if (!post) {
    notFound();
  }

  // The actual form rendering will be done by a client component
  // to handle interactivity, state, and client-side libraries like TinyMCE.
  return <ClientEditPage initialPostData={post} />;
}

    