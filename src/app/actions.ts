
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
    console.error("Firebase Storage is not initialized. Check firebase-config.ts and environment variables (especially NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).");
    throw new Error("File upload service is not available. Firebase Storage might be misconfigured in your project setup. Please contact support or check server logs.");
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
    console.error("Firebase Storage Server Response (if available):", error.serverResponse); // Log full server response
    
    let errorMessage = "Could not upload file to Firebase Storage.";
    if (error.code) {
      // Use the error message from Firebase if available, otherwise use a generic one for the code
      let baseMessage = error.message || `An unknown error occurred. Code: ${error.code}`;
      errorMessage = `Firebase Storage: ${baseMessage}`;
      
      if (error.code === 'storage/unknown') {
        errorMessage += " This often indicates a Firebase project configuration issue. Please check: 1. Storage Security Rules in Firebase Console (allow writes to the 'thumbnails/' path for authenticated users). 2. Cloud Storage API is enabled in Google Cloud Console for your project. 3. The 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET' environment variable is correct. 4. Your Firebase project's billing status and quotas. Detailed server logs (Vercel logs) for 'Firebase Storage Server Response' may provide more specific clues.";
      } else if (error.code === 'storage/unauthorized') {
        errorMessage += " Check your Firebase Storage security rules. You might not have permission to write to the specified location.";
      } else if (error.code === 'storage/object-not-found') {
        errorMessage += " The file path in Storage might be incorrect or the object doesn't exist (should not happen for uploads).";
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage += " You have exceeded your Firebase Storage quota. Please check your plan and usage.";
      }
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

  try {
    const url = new URL(fileUrl);
    const pathWithBucket = url.pathname.split('/o/')[1];
    if (!pathWithBucket) {
        console.warn('Could not extract file path from Firebase Storage URL (no /o/ segment):', fileUrl);
        return;
    }
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
      if (currentThumbnailUrl) {
        await deleteFileFromFirebaseStorage(currentThumbnailUrl);
      }
      newUrlUploaded = await handleFileUploadToFirebase(newThumbnailFile);
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
      if (newUrlUploaded) await deleteFileFromFirebaseStorage(newUrlUploaded);
      return {
        success: false,
        message: 'Post not found or could not be updated.',
        errors: null,
      };
    }
  } catch (error: any) {
    console.error('Failed to update post:', error);
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

    