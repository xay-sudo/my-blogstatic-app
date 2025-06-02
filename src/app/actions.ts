
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as postService from '@/lib/post-service';
import type { Post } from '@/types';
import * as z from 'zod';

// Re-define the schema here or import if it's shareable (ensure no client-side code in shared file)
const postFormSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }).max(100),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().min(10).max(300),
  content: z.string().min(50),
  tags: z.array(z.string()).optional().default([]), // Ensure tags is an array
  imageUrl: z.string().url().optional().or(z.literal('')),
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
});

export type PostFormActionValues = Omit<Post, 'id' | 'date'>;


export async function createPostAction(data: PostFormActionValues) {
  // Validate data using the schema
  const validation = postFormSchema.safeParse(data);

  if (!validation.success) {
    // Log detailed errors for server-side debugging
    console.error('Server-side validation failed:', validation.error.flatten().fieldErrors);
    return {
      success: false,
      message: "Validation failed. Check server logs.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    await postService.addPost(validation.data);
  } catch (error) {
    console.error('Failed to create post:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Could not create post.',
      errors: null,
    };
  }

  revalidatePath('/');
  revalidatePath('/admin/posts');
  // Optionally revalidate specific post paths if slugs are predictable or many posts change
  // revalidatePath(`/posts/${validation.data.slug}`); // This might be too broad or unnecessary for create

  redirect('/admin/posts'); // Redirect after successful creation
  // Note: redirect needs to be called outside try/catch or be the last thing if no return object is needed on success
  // Since redirect throws an error to stop execution and navigate, we don't explicitly return success:true here if redirecting.
}

export async function deletePostAction(postId: string) {
  try {
    await postService.deletePostById(postId);
    revalidatePath('/');
    revalidatePath('/admin/posts');
    // Consider revalidating relevant tag pages or category pages if they exist
    return { success: true, message: 'Post deleted successfully.' };
  } catch (error) {
    console.error('Failed to delete post:', error);
    return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Could not delete post.' 
    };
  }
}

    