
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as postService from '@/lib/post-service';
import * as settingsService from '@/lib/settings-service';
import type { Post, SiteSettings } from '@/types';
import * as z from 'zod';
import { storage } from '@/lib/firebase-config'; // Import Firebase storage instance
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import path from 'path'; // Still used for file extension


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


async function handleFileUploadToFirebase(file: File | undefined): Promise<string | undefined> {
  if (!file || !storage) return undefined;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`);
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`);
  }

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
  const extension = path.extname(file.name) || '.png';
  const filename = `${file.name.replace(/\.[^/.]+$/, "")}-${uniqueSuffix}${extension}`;
  
  const storagePath = `posts_thumbnails/${filename}`;
  const fileRef = ref(storage, storagePath);

  try {
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    return downloadURL;
  } catch (error: any) {
    console.error("Firebase Storage Upload Error details:", error);
    if (error.code) {
      console.error("Firebase Storage Error Code:", error.code);
    }
    if (error.message) {
      console.error("Firebase Storage Error Message:", error.message);
    }
    if (error.serverResponse) {
      console.error("Firebase Storage Server Response:", error.serverResponse);
    }

    const baseMessage = error.message || 'An unknown error occurred during upload.';
    // Prevent "Firebase Storage: Firebase Storage:" duplication
    const prefix = baseMessage.startsWith('Firebase Storage:') ? '' : 'Firebase Storage: ';
    
    const errorMessage = `${prefix}${baseMessage} (Code: ${error.code || 'unknown'}). Please check server logs and Firebase Storage rules.`;
    throw new Error(errorMessage);
  }
}

async function deleteFileFromFirebaseStorage(downloadUrl: string | undefined) {
  if (!downloadUrl || !downloadUrl.startsWith('https://firebasestorage.googleapis.com/') || !storage) {
    console.log('Not a Firebase Storage URL or storage not initialized, skipping delete:', downloadUrl);
    return;
  }
  try {
    const imageRef = ref(storage, downloadUrl); // ref can take full HTTPS URL
    await deleteObject(imageRef);
    console.log('Successfully deleted from Firebase Storage:', downloadUrl);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn('File not found in Firebase Storage, skipping delete:', downloadUrl);
    } else {
      console.error('Failed to delete file from Firebase Storage:', downloadUrl, error);
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
      thumbnailUrl = await handleFileUploadToFirebase(thumbnailFile);
    }

    const postData: PostServiceValues = {
      ...validation.data,
      tags: validation.data.tags || [],
      thumbnailUrl,
    };
    await postService.addPost(postData);

  } catch (error: any) {
    console.error('Failed to create post:', error);
    if (thumbnailUrl) await deleteFileFromFirebaseStorage(thumbnailUrl); // Clean up if upload succeeded but db op failed
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
      // New file uploaded, replace old one if it exists in Firebase Storage
      await deleteFileFromFirebaseStorage(currentThumbnailUrl);
      newUrlUploaded = await handleFileUploadToFirebase(newThumbnailFile);
      finalThumbnailUrl = newUrlUploaded;
    } else {
      // No new file, keep existing path
      finalThumbnailUrl = currentThumbnailUrl;
    }

    const postData: PostServiceValues = {
      ...validation.data,
      tags: validation.data.tags || [],
      thumbnailUrl: finalThumbnailUrl,
    };

    const updatedPost = await postService.updatePost(postId, postData);
    if (!updatedPost) {
      // This case should ideally be caught by existingPost check, but as a fallback:
      if (newUrlUploaded) await deleteFileFromFirebaseStorage(newUrlUploaded); // Clean up newly uploaded file if update fails
      return {
        success: false,
        message: 'Post not found or could not be updated.',
        errors: null,
      };
    }
  } catch (error: any) {
    console.error('Failed to update post:', error);
    // If a new URL was uploaded but the DB update failed, delete the newly uploaded file.
    // Don't delete finalThumbnailUrl directly as it might be the old one.
    if (newUrlUploaded) await deleteFileFromFirebaseStorage(newUrlUploaded);
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
      await deleteFileFromFirebaseStorage(postToDelete.thumbnailUrl);
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

