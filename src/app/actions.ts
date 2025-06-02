
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
  content: z.string().min(50),
  tags: z.array(z.string()).optional().default([]), 
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
  redirect('/admin/posts'); 
}

export async function deletePostAction(postId: string) {
  try {
    await postService.deletePostById(postId);
    revalidatePath('/');
    revalidatePath('/admin/posts');
    return { success: true, message: 'Post deleted successfully.' };
  } catch (error) {
    console.error('Failed to delete post:', error);
    return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Could not delete post.' 
    };
  }
}
