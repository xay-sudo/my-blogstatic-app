
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as postService from '@/lib/post-service';
import * as settingsService from '@/lib/settings-service';
import type { Post, SiteSettings } from '@/types';
import * as z from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { ensureDir } from 'fs-extra';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'thumbnails');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Schema for text fields from the form
const postTextFormSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }).max(255, { message: 'Title must be 255 characters or less.' }),
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters long.' }).max(150, { message: 'Slug must be 150 characters or less.' }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens.' }),
  content: z.string().min(50),
  tags: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return [];
    if (typeof val === 'string') return val.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    if (Array.isArray(val)) return val.map(tag => String(tag).trim().toLowerCase()).filter(tag => tag.length > 0);
    return [];
  }, z.array(z.string()).optional().default([])),
});

// Type for data passed to postService (which includes the thumbnailUrl path)
export type PostServiceValues = Omit<Post, 'id' | 'date'>;


async function handleFileUpload(file: File | undefined): Promise<string | undefined> {
  if (!file) return undefined;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024*1024)}MB limit.`);
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`);
  }

  await ensureDir(UPLOADS_DIR);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
  const extension = path.extname(file.name) || '.png'; // Default to .png if no extension
  const filename = `${file.name.replace(/\.[^/.]+$/, "")}-${uniqueSuffix}${extension}`;
  const filePath = path.join(UPLOADS_DIR, filename);
  
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  
  return `/uploads/thumbnails/${filename}`; // Public path
}

async function deleteLocalFile(filePath: string | undefined) {
  if (!filePath || !filePath.startsWith('/uploads/thumbnails/')) return; // Safety check
  try {
    const serverFilePath = path.join(process.cwd(), 'public', filePath);
    await fs.unlink(serverFilePath);
  } catch (error: any) {
    // If file doesn't exist, it's fine. Log other errors.
    if (error.code !== 'ENOENT') {
      console.error('Failed to delete local file:', filePath, error);
    }
  }
}

export async function createPostAction(formData: FormData) {
  const rawData = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    content: formData.get('content'),
    tags: formData.get('tags'), // This will be a string
  };

  const validation = postTextFormSchema.safeParse(rawData);

  if (!validation.success) {
    console.error('Server-side validation failed (create):', validation.error.flatten().fieldErrors);
    return {
      success: false,
      message: "Validation failed. Check server logs.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const thumbnailFile = formData.get('thumbnailFile') as File | undefined;
  let thumbnailUrl: string | undefined;

  try {
    if (thumbnailFile && thumbnailFile.size > 0) {
      thumbnailUrl = await handleFileUpload(thumbnailFile);
    }

    const postData: PostServiceValues = {
      ...validation.data,
      tags: validation.data.tags || [], // ensure tags is an array
      thumbnailUrl,
    };
    await postService.addPost(postData);

  } catch (error: any) {
    console.error('Failed to create post:', error);
    // If upload failed and created a file path, try to clean it up (though handleFileUpload throws before returning path on error)
    if (thumbnailUrl) await deleteLocalFile(thumbnailUrl);
    return {
      success: false,
      message: error.message || 'Could not create post.',
      errors: null,
    };
  }

  revalidatePath('/');
  revalidatePath('/admin/posts');
  revalidatePath('/admin/posts/new');
  redirect('/admin/posts');
}

export async function updatePostAction(postId: string, formData: FormData) {
  const rawData = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    content: formData.get('content'),
    tags: formData.get('tags'), // This will be a string
  };

  const validation = postTextFormSchema.safeParse(rawData);

  if (!validation.success) {
    console.error('Server-side validation failed (update):', validation.error.flatten().fieldErrors);
    return {
      success: false,
      message: "Validation failed. Check server logs for details.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  let finalThumbnailPath: string | undefined;
  const newThumbnailFile = formData.get('thumbnailFile') as File | undefined;

  try {
    const existingPost = await postService.getPostById(postId);
    if (!existingPost) {
      return { success: false, message: 'Post not found.', errors: null };
    }
    
    let currentThumbnailPath = existingPost.thumbnailUrl;

    if (newThumbnailFile && newThumbnailFile.size > 0) {
      // New file uploaded, replace old one if it exists
      await deleteLocalFile(currentThumbnailPath);
      finalThumbnailPath = await handleFileUpload(newThumbnailFile);
    } else {
      // No new file, keep existing path
      finalThumbnailPath = currentThumbnailPath;
    }

    const postData: PostServiceValues = {
      ...validation.data,
      tags: validation.data.tags || [],
      thumbnailUrl: finalThumbnailPath,
    };

    const updatedPost = await postService.updatePost(postId, postData);
    if (!updatedPost) {
      // This case should ideally be caught by existingPost check, but as a fallback:
      await deleteLocalFile(finalThumbnailPath); // Clean up newly uploaded file if update fails
      return {
        success: false,
        message: 'Post not found or could not be updated.',
        errors: null,
      };
    }
  } catch (error: any) {
    console.error('Failed to update post:', error);
    // Don't delete finalThumbnailPath here as it might be the existing one or new one if upload succeeded but db op failed
    return {
      success: false,
      message: error.message || 'Could not update post.',
      errors: null,
    };
  }

  revalidatePath('/');
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/edit/${postId}`);
  revalidatePath(`/posts/${validation.data.slug}`);
  redirect('/admin/posts');
}


export async function deletePostAction(postId: string) {
  try {
    const postToDelete = await postService.getPostById(postId);
    if (postToDelete?.thumbnailUrl) {
      await deleteLocalFile(postToDelete.thumbnailUrl);
    }
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

// Site Settings Action
const siteSettingsSchema = z.object({
  siteTitle: z.string().min(3, { message: 'Site title must be at least 3 characters long.' }).max(100),
  siteDescription: z.string().min(10, { message: 'Site description must be at least 10 characters long.' }).max(300),
  postsPerPage: z.coerce.number().int().min(1, { message: 'Must display at least 1 post per page.' }).max(50, { message: 'Cannot display more than 50 posts per page.' }),
});

export async function updateSiteSettingsAction(formData: FormData) {
  const rawData = {
    siteTitle: formData.get('siteTitle'),
    siteDescription: formData.get('siteDescription'),
    postsPerPage: formData.get('postsPerPage'),
  };

  const validation = siteSettingsSchema.safeParse(rawData);

  if (!validation.success) {
    console.error('Server-side validation failed (site settings):', validation.error.flatten().fieldErrors);
    return {
      success: false,
      message: "Validation failed. Check server logs for details.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  try {
    await settingsService.updateSettings(validation.data as SiteSettings);
    revalidatePath('/'); // Revalidate homepage (for postsPerPage and metadata)
    revalidatePath('/admin/settings'); // Revalidate the settings page itself
    // Potentially revalidate all post pages if metadata depends on site title/desc globally
    // For now, revalidatePath('/') should cover metadata in layout.

    return {
      success: true,
      message: 'Site settings updated successfully.',
      errors: null,
    };
  } catch (error: any) {
    console.error('Failed to update site settings:', error);
    return {
      success: false,
      message: error.message || 'Could not update site settings.',
      errors: null,
    };
  }
}
