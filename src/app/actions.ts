
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as postService from '@/lib/post-service';
import * as settingsService from '@/lib/settings-service';
import type { Post, SiteSettings } from '@/types';
import * as z from 'zod';
import fs from 'fs/promises';
import pathNode from 'path'; // Renamed to avoid conflict if 'path' is used elsewhere
import { ensureDir } from 'fs-extra';


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const UPLOADS_DIR_PUBLIC_PATH = '/uploads/thumbnails';
const UPLOADS_DIR_SERVER_PATH = pathNode.join(process.cwd(), 'public', UPLOADS_DIR_PUBLIC_PATH);


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


async function handleLocalFileUpload(file: File | undefined): Promise<string | undefined> {
  if (!file) return undefined;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`);
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`);
  }

  try {
    await ensureDir(UPLOADS_DIR_SERVER_PATH);
  } catch (error: any) {
    console.error('Failed to create uploads directory:', error);
    throw new Error('Server error: Could not prepare uploads directory.');
  }
  
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
  const extension = pathNode.extname(file.name) || '.png'; // Use pathNode
  const filename = `${file.name.replace(/\.[^/.]+$/, "")}-${uniqueSuffix}${extension}`;
  
  const serverFilePath = pathNode.join(UPLOADS_DIR_SERVER_PATH, filename); // Use pathNode
  const publicFilePath = pathNode.join(UPLOADS_DIR_PUBLIC_PATH, filename).replace(/\\/g, '/'); // Use pathNode and ensure forward slashes

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(serverFilePath, buffer);
    return publicFilePath;
  } catch (error: any) {
    console.error("Local File Upload Error:", error);
    throw new Error('Could not save uploaded file.');
  }
}

async function deleteLocalFile(publicFilePath: string | undefined) {
  if (!publicFilePath) return;

  // Prevent attempts to delete files outside the intended uploads directory
  if (!publicFilePath.startsWith(UPLOADS_DIR_PUBLIC_PATH)) {
    console.warn('Attempted to delete file outside uploads directory, skipping:', publicFilePath);
    return;
  }

  const serverFilePath = pathNode.join(process.cwd(), 'public', publicFilePath); // Use pathNode
  try {
    await fs.unlink(serverFilePath);
    console.log('Successfully deleted local file:', serverFilePath);
  } catch (error: any) {
    if (error.code === 'ENOENT') { // File not found
      console.warn('Local file not found, skipping delete:', serverFilePath);
    } else {
      console.error('Failed to delete local file:', serverFilePath, error);
    }
  }
}

export async function createPostAction(formData: FormData) {
  const rawData = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    content: formData.get('content'),
    tags: formData.get('tags'),
  };

  const validation = postTextFormSchema.safeParse(rawData);

  if (!validation.success) {
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
      thumbnailUrl = await handleLocalFileUpload(thumbnailFile);
    }

    const postData: PostServiceValues = {
      ...validation.data,
      tags: validation.data.tags || [],
      thumbnailUrl,
    };
    await postService.addPost(postData);

  } catch (error: any) {
    console.error('Failed to create post:', error);
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
    tags: formData.get('tags'),
  };

  const validation = postTextFormSchema.safeParse(rawData);

  if (!validation.success) {
    return {
      success: false,
      message: "Validation failed. Check server logs for details.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  let finalThumbnailUrl: string | undefined;
  const newThumbnailFile = formData.get('thumbnailFile') as File | undefined;
  let newUrlUploaded: string | undefined = undefined;

  try {
    const existingPost = await postService.getPostById(postId);
    if (!existingPost) {
      return { success: false, message: 'Post not found.', errors: null };
    }
    
    let currentThumbnailUrl = existingPost.thumbnailUrl;

    if (newThumbnailFile && newThumbnailFile.size > 0) {
      await deleteLocalFile(currentThumbnailUrl);
      newUrlUploaded = await handleLocalFileUpload(newThumbnailFile);
      finalThumbnailUrl = newUrlUploaded;
    } else {
      finalThumbnailUrl = currentThumbnailUrl;
    }

    const postData: PostServiceValues = {
      ...validation.data,
      tags: validation.data.tags || [],
      thumbnailUrl: finalThumbnailUrl,
    };

    const updatedPost = await postService.updatePost(postId, postData);
    if (!updatedPost) {
      if (newUrlUploaded) await deleteLocalFile(newUrlUploaded); 
      return {
        success: false,
        message: 'Post not found or could not be updated.',
        errors: null,
      };
    }
  } catch (error: any) {
    console.error('Failed to update post:', error);
    if (newUrlUploaded) await deleteLocalFile(newUrlUploaded);
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
  bannerEnabled: z.preprocess((val) => val === 'on' || val === true, z.boolean().default(false)),
  bannerType: z.enum(['image', 'customHtml']).optional().default('image'),
  bannerImageUrl: z.string().url({ message: 'Please enter a valid URL for the banner image.' }).optional().or(z.literal('')),
  bannerImageLink: z.string().url({ message: 'Please enter a valid URL for the banner link.' }).optional().or(z.literal('')),
  bannerImageAltText: z.string().max(120, {message: 'Alt text should be 120 characters or less.'}).optional(),
  bannerCustomHtml: z.string().optional(),
});

export async function updateSiteSettingsAction(formData: FormData) {
  const rawData = {
    siteTitle: formData.get('siteTitle'),
    siteDescription: formData.get('siteDescription'),
    postsPerPage: formData.get('postsPerPage'),
    bannerEnabled: formData.get('bannerEnabled'),
    bannerType: formData.get('bannerType'),
    bannerImageUrl: formData.get('bannerImageUrl'),
    bannerImageLink: formData.get('bannerImageLink'),
    bannerImageAltText: formData.get('bannerImageAltText'),
    bannerCustomHtml: formData.get('bannerCustomHtml'),
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
    const settingsToUpdate: Partial<SiteSettings> = {
      siteTitle: validation.data.siteTitle,
      siteDescription: validation.data.siteDescription,
      postsPerPage: validation.data.postsPerPage,
      bannerEnabled: validation.data.bannerEnabled,
      bannerType: validation.data.bannerType,
      bannerImageUrl: validation.data.bannerImageUrl,
      bannerImageLink: validation.data.bannerImageLink,
      bannerImageAltText: validation.data.bannerImageAltText,
      bannerCustomHtml: validation.data.bannerCustomHtml,
    };

    await settingsService.updateSettings(settingsToUpdate);
    revalidatePath('/'); 
    revalidatePath('/admin/settings'); 
    
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
