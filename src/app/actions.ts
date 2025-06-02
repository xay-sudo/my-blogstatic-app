
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as postService from '@/lib/post-service';
import type { Post } from '@/types';
import * as z from 'zod';

// Schema for creating a post (can be reused for update if fields are the same)
const postFormSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }).max(100),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  content: z.string().min(50),
  tags: z.array(z.string()).optional().default([]), 
  thumbnailUrl: z.string().url().optional().or(z.literal('')),
});

export type PostFormActionValues = Omit<Post, 'id' | 'date'>;


export async function createPostAction(data: PostFormActionValues) {
  const validation = postFormSchema.safeParse(data);

  if (!validation.success) {
    console.error('Server-side validation failed (create):', validation.error.flatten().fieldErrors);
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
  revalidatePath('/admin/posts/new'); // Also revalidate new page in case of sticky state
  redirect('/admin/posts'); 
}

export async function updatePostAction(postId: string, data: PostFormActionValues) {
  const validation = postFormSchema.safeParse(data); // Re-use schema for now

  if (!validation.success) {
    console.error('Server-side validation failed (update):', validation.error.flatten().fieldErrors);
    return {
      success: false,
      message: "Validation failed. Check server logs for details.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const updatedPost = await postService.updatePost(postId, validation.data);
    if (!updatedPost) {
      return {
        success: false,
        message: 'Post not found or could not be updated.',
        errors: null,
      };
    }
  } catch (error) {
    console.error('Failed to update post:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Could not update post.',
      errors: null,
    };
  }

  revalidatePath('/');
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/edit/${postId}`);
  revalidatePath(`/posts/${validation.data.slug}`); // Revalidate the public post page
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

    