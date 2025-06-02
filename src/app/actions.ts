
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as postService from '@/lib/post-service';
import * as settingsService from '@/lib/settings-service';
import type { Post, SiteSettings } from '@/types';
import * as z from 'zod';
import { storage } from '@/lib/firebase-config'; // Import Firebase Storage
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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

export type PostServiceValues = Omit<Post, 'id' | 'date'>;

async function handleFileUploadToFirebase(file: File | undefined): Promise<string | undefined> {
  if (!file) return undefined;

  if (!storage) {
    console.error("Firebase Storage is not initialized. Check firebase-config.ts and environment variables.");
    throw new Error("File upload service is not available. Please contact support.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`);
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`);
  }

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
  // Ensure extension is derived safely, default to .png if none
  const extension = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '.png';
  const filename = `${file.name.replace(/\.[^/.]+$/, "")}-${uniqueSuffix}${extension}`;
  const storageRef = ref(storage, `thumbnails/${filename}`);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error("Firebase Storage Upload Error:", error);
    // Log more details for server-side debugging
    console.error("Firebase Storage Server Response (if available):", error.serverResponse);
    let errorMessage = "Could not upload file to Firebase Storage.";
    if (error.code) {
        errorMessage = `Firebase Storage: ${error.message || `An unknown error occurred. Code: ${error.code}`}`;
    } else if (error.message) {
        errorMessage = `Firebase Storage: ${error.message}`;
    }
    // Avoid "Firebase Storage: Firebase Storage:"
    if (errorMessage.startsWith("Firebase Storage: Firebase Storage: ")) {
      errorMessage = errorMessage.substring("Firebase Storage: ".length);
    }
    throw new Error(errorMessage);
  }
}

async function deleteFileFromFirebaseStorage(fileUrl: string | undefined) {
  if (!fileUrl || !storage) return;

  // Extract path from URL
  // Firebase Storage URLs look like: https://firebasestorage.googleapis.com/v0/b/YOUR_BUCKET/o/thumbnails%2Fimage.png?alt=media&token=TOKEN
  try {
    const url = new URL(fileUrl);
    // The path starts after /o/ and ends before ?alt=media
    const pathWithBucket = url.pathname.split('/o/')[1];
    if (!pathWithBucket) {
        console.warn('Could not extract file path from Firebase Storage URL (no /o/ segment):', fileUrl);
        return;
    }
    // Remove query parameters like ?alt=media&token=... from the path
    const filePath = decodeURIComponent(pathWithBucket.split('?')[0]);

    if (!filePath.startsWith('thumbnails/')) {
        console.warn('Attempted to delete file outside thumbnails directory in Firebase Storage, skipping:', filePath);
        return;
    }
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    console.log('Successfully deleted file from Firebase Storage:', filePath);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn('File not found in Firebase Storage, skipping delete:', fileUrl);
    } else {
      console.error('Failed to delete file from Firebase Storage:', fileUrl, error);
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
    // If upload succeeded but DB failed, try to delete the uploaded file from Firebase
    if (thumbnailUrl) await deleteFileFromFirebaseStorage(thumbnailUrl);
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
      // If there's a current thumbnail, delete it from Firebase Storage
      if (currentThumbnailUrl) {
        await deleteFileFromFirebaseStorage(currentThumbnailUrl);
      }
      newUrlUploaded = await handleFileUploadToFirebase(newThumbnailFile);
      finalThumbnailUrl = newUrlUploaded;
    } else {
      finalThumbnailUrl = currentThumbnailUrl; // Keep existing if no new file
    }

    const postData: PostServiceValues = {
      ...validation.data,
      tags: validation.data.tags || [],
      thumbnailUrl: finalThumbnailUrl,
    };

    const updatedPost = await postService.updatePost(postId, postData);
    if (!updatedPost) {
      // If update failed but new image was uploaded, delete the new image
      if (newUrlUploaded) await deleteFileFromFirebaseStorage(newUrlUploaded);
      return {
        success: false,
        message: 'Post not found or could not be updated.',
        errors: null,
      };
    }
  } catch (error: any) {
    console.error('Failed to update post:', error);
    // If any error and a new image was uploaded, try to delete it
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
      // Delete thumbnail from Firebase Storage
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
