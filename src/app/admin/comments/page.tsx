
import { Suspense } from 'react';
import AdminCommentsClientPage from './client-page';
import type { Comment } from '@/types';
import CommentsTableSkeleton from './loading'; // Import the specific skeleton

// Mock data for comments - in a real app, this would come from a database
const mockComments: Comment[] = [
  {
    id: 'comment-1',
    postId: 'post-id-1',
    postSlug: 'ageing-is-not-in-her-plans-demi-moore-made-public-outing-and-everyone-is-saying-the-same-thing',
    postTitle: '«Ageing is not in her plans!» Demi Moore made public outing and everyone is saying the same thing',
    authorName: 'John Doe',
    authorEmail: 'john.doe@example.com',
    content: 'Great article! I really enjoyed reading this. Very insightful and well-written.',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: 'pending',
  },
  {
    id: 'comment-2',
    postId: 'post-id-2',
    postSlug: 'and-he-replaced-jolie-with-her-this-is-what-is-going-on-in-the-relationship-between-brad-pitt-and-ines',
    postTitle: '«And he replaced Jolie with her?» This is what is going on in the relationship between Brad Pitt and Ines',
    authorName: 'Jane Smith',
    content: 'Interesting perspective. I have a slightly different view on this topic, but it\'s good to see varied opinions.',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    status: 'approved',
  },
  {
    id: 'comment-3',
    postId: 'post-id-1',
    postSlug: 'ageing-is-not-in-her-plans-demi-moore-made-public-outing-and-everyone-is-saying-the-same-thing',
    postTitle: '«Ageing is not in her plans!» Demi Moore made public outing and everyone is saying the same thing',
    authorName: 'Anonymous User',
    content: 'This is spam and should be removed.',
    date: new Date().toISOString(),
    status: 'rejected',
  },
   {
    id: 'comment-4',
    postId: 'post-id-3',
    postSlug: 'upscale-restaurant-fries-at-home-heres-how-to-make-french-fries-without-the-unhealthy-extra-fat',
    postTitle: '«Upscale restaurant fries at home» Here’s how to make French fries without the unhealthy extra fat',
    authorName: 'FoodieFan',
    authorEmail: 'foodie@example.com',
    content: 'Thanks for the recipe! Can\'t wait to try this at home. Do you think air fryer would work?',
    date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    status: 'pending',
  },
];

export default async function AdminCommentsPage() {
  // In a real app, you'd fetch comments from your database here.
  // For now, we use mock data.
  const comments = mockComments;

  return (
    <div className="space-y-6">
      <Suspense fallback={<CommentsTableSkeleton />}>
        <AdminCommentsClientPage initialComments={comments} />
      </Suspense>
    </div>
  );
}
