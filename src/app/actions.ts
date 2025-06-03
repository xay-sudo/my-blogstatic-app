
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as postService from '@/lib/post-service';
import * as settingsService from '@/lib/settings-service';
import type { Post, SiteSettings } from '@/types';
import * as z from 'zod';
import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const MAX_THUMBNAIL_OR_LOGO_SIZE = 5 * 1024 * 1024; // 5MB for thumbnails and logos
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const POST_THUMBNAIL_BUCKET_NAME = 'post-thumbnails';
const SITE_ASSETS_BUCKET_NAME = 'site-assets'; // For site logo, etc.

// Helper function to validate HTTP/HTTPS URL format
function isValidHttpUrl(string: string | undefined): boolean {
  if (!string) return false;
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

// Helper function to create a Supabase admin client (uses service_role key)
function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !isValidHttpUrl(supabaseUrl)) {
    throw new Error(`Invalid Supabase URL format: "${supabaseUrl}". Please check NEXT_PUBLIC_SUPABASE_URL.`);
  }
  if (!supabaseServiceRoleKey || supabaseServiceRoleKey.length < 50) { // Basic length check
    throw new Error(`Invalid or missing Supabase Service Role Key (SUPABASE_SERVICE_ROLE_KEY). Please check environment variables.`);
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

// Helper function to get the public Supabase client (uses anon key)
function getSupabasePublicClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !isValidHttpUrl(supabaseUrl)) {
     throw new Error(`Invalid Supabase URL format: "${supabaseUrl}". Please check NEXT_PUBLIC_SUPABASE_URL.`);
  }
  if (!supabaseAnonKey || supabaseAnonKey.length < 50) { // Basic length check
    throw new Error(`Invalid or missing Supabase Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY). Please check environment variables.`);
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}


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

async function handleSupabaseFileUpload(file: File | undefined, bucketName: string): Promise<string | undefined> {
  if (!file) return undefined;

  if (file.size > MAX_THUMBNAIL_OR_LOGO_SIZE) {
    throw new Error(`File size exceeds ${MAX_THUMBNAIL_OR_LOGO_SIZE / (1024 * 1024)}MB limit.`);
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }

  const supabaseAdmin = getSupabaseAdminClient();

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
  const extension = file.name.includes('.') ? `.${file.name.split('.').pop()}` : (file.type.split('/')[1] || 'png');
  const sanitizedBaseName = (file.name.replace(/\.[^/.]+$/, "") || 'untitled').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const filename = `${sanitizedBaseName}-${uniqueSuffix}${extension}`;

  const filePathInBucket = `public/${filename}`; // Always store in 'public' for easier URL generation

  const { data, error } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(filePathInBucket, file, {
      cacheControl: '3600', // Cache for 1 hour
      upsert: false, // Don't upsert, always create new unique filename
    });

  if (error) {
    console.error(`Supabase Storage Error (uploading to bucket: ${bucketName}):`, JSON.stringify(error, null, 2));
    let detailedErrorMessage = (error as any).message || 'An unknown error occurred during file upload.';

    if (
        (typeof (error as any).status === 'number' && ((error as any).status === 400 || (error as any).status === 404)) ||
        (detailedErrorMessage.toLowerCase().includes('bucket not found')) ||
        (detailedErrorMessage.toLowerCase().includes('the resource was not found'))
    ) {
        detailedErrorMessage = `The storage bucket named "${bucketName}" was not found in your Supabase project, or it's not accessible. Please ensure this bucket exists and check its policies. You can create buckets in your Supabase Dashboard (Storage > Buckets). For public access to images, ensure the bucket has appropriate RLS and access policies.`;
    } else {
        detailedErrorMessage = `Could not upload file to cloud storage. Bucket: "${bucketName}". Details: ${detailedErrorMessage}`;
    }
    throw new Error(detailedErrorMessage);
  }


  const supabasePublic = getSupabasePublicClient(); // Use public client for public URL
  const { data: publicUrlData } = supabasePublic.storage.from(bucketName).getPublicUrl(data.path);

  if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error(`Could not get public URL for Supabase file in bucket ${bucketName}:`, data.path);
      // Attempt to clean up the orphaned file
      await supabaseAdmin.storage.from(bucketName).remove([data.path]);
      throw new Error("File uploaded, but could not retrieve its public URL.");
  }

  return publicUrlData.publicUrl;
}

async function deleteSupabaseFile(fileUrl: string | undefined, bucketName?: string) {
  if (!fileUrl || !isValidHttpUrl(fileUrl)) {
    console.warn('Invalid or no file URL provided for deletion from Supabase:', fileUrl);
    return;
  }

  const supabaseAdmin = getSupabaseAdminClient();

  try {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    
    // Determine bucket name from URL structure if not provided
    // Typical Supabase storage URL: /storage/v1/object/public/BUCKET_NAME/public/filename.ext
    let determinedBucketName = bucketName;
    if (!determinedBucketName) {
      const objectPathIndex = pathParts.indexOf('object');
      if (objectPathIndex !== -1 && pathParts.length > objectPathIndex + 2) {
        determinedBucketName = pathParts[objectPathIndex + 2]; // BUCKET_NAME is after /object/public/
      }
    }
    
    if (!determinedBucketName) {
        console.error('Could not determine bucket name from Supabase URL for deletion:', fileUrl);
        return;
    }

    let filePathInBucket = '';
    const bucketNameIndexInPath = pathParts.indexOf(determinedBucketName);
    if (bucketNameIndexInPath !== -1 && bucketNameIndexInPath < pathParts.length -1) {
        // The path should be relative to the bucket, e.g., "public/filename.ext"
        filePathInBucket = pathParts.slice(bucketNameIndexInPath + 1).join('/');
    }

    if (!filePathInBucket) {
        console.error('Could not parse file path from Supabase URL for deletion:', fileUrl);
        return;
    }

    const { error } = await supabaseAdmin.storage
      .from(determinedBucketName)
      .remove([filePathInBucket]);

    if (error) {
      console.warn(`Failed to delete file from Supabase Storage (bucket: ${determinedBucketName}):`, filePathInBucket, error.message);
    } else {
      console.log(`Successfully deleted file from Supabase Storage (bucket: ${determinedBucketName}):`, filePathInBucket);
    }
  } catch (error: any) {
    console.error('Error processing Supabase file URL for deletion:', fileUrl, error.message);
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
      thumbnailUrl = await handleSupabaseFileUpload(thumbnailFile, POST_THUMBNAIL_BUCKET_NAME);
    }

    const postData: PostServiceValues = {
      ...validation.data,
      tags: validation.data.tags || [],
      thumbnailUrl,
    };
    await postService.addPost(postData);

  } catch (error: any) {
    console.error('Failed to create post (in action):', error); 
    let detailedErrorMessage = 'Could not create post.';

    if (error instanceof Error && error.message) {
        detailedErrorMessage = error.message; 
    } else if (typeof error === 'string') {
        detailedErrorMessage = error;
    } else {
        detailedErrorMessage = 'An unexpected error occurred. Check server logs for details.';
    }

    if (thumbnailUrl) {
        console.log('Attempting to delete uploaded thumbnail due to post creation error...');
        await deleteSupabaseFile(thumbnailUrl, POST_THUMBNAIL_BUCKET_NAME);
    }
    return {
      success: false,
      message: detailedErrorMessage,
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
        await deleteSupabaseFile(currentThumbnailUrl, POST_THUMBNAIL_BUCKET_NAME);
      }
      newUrlUploaded = await handleSupabaseFileUpload(newThumbnailFile, POST_THUMBNAIL_BUCKET_NAME);
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
      if (newUrlUploaded) await deleteSupabaseFile(newUrlUploaded, POST_THUMBNAIL_BUCKET_NAME);
      return {
        success: false,
        message: 'Post not found or could not be updated.',
        errors: null,
      };
    }
  } catch (error: any) {
    console.error('Failed to update post:', error); 
    let detailedErrorMessage = 'Could not update post.';
     if (error instanceof Error && error.message) {
        detailedErrorMessage = error.message; 
    } else if (typeof error === 'string') {
        detailedErrorMessage = error;
    } else {
        detailedErrorMessage = 'An unexpected error occurred. Check server logs for details.';
    }

    if (newUrlUploaded) await deleteSupabaseFile(newUrlUploaded, POST_THUMBNAIL_BUCKET_NAME);
    return {
      success: false,
      message: detailedErrorMessage,
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
      await deleteSupabaseFile(postToDelete.thumbnailUrl, POST_THUMBNAIL_BUCKET_NAME);
    }
    await postService.deletePostById(postId);
    revalidatePath('/');
    revalidatePath('/admin/posts');
    return { success: true, message: 'Post deleted successfully.' };
  } catch (error) {
    console.error('Failed to delete post:', error);
    return {
        success: false,
        message: error instanceof Error ? error.message : 'Could not delete post. Check server logs.'
    };
  }
}

// Server-side Zod schema for Site Settings
const siteSettingsSchema = z.object({
  siteTitle: z.string().min(3, { message: 'Site title must be at least 3 characters long.' }).max(100),
  siteDescription: z.string().min(10, { message: 'Site description must be at least 10 characters long.' }).max(300),
  postsPerPage: z.coerce.number().int().min(1, { message: 'Must display at least 1 post per page.' }).max(50, { message: 'Cannot display more than 50 posts per page.' }),
  adminUsername: z.string().max(50, {message: "Admin username must be 50 characters or less."}).optional().or(z.literal('')),
  adminPassword: z.string().max(100, {message: "Admin password must be 100 characters or less."}).optional(),
  globalHeaderScriptsEnabled: z.preprocess((val) => val === 'on' || val === true, z.boolean().default(false)),
  globalHeaderScriptsCustomHtml: z.string().optional(),
  globalFooterScriptsEnabled: z.preprocess((val) => val === 'on' || val === true, z.boolean().default(false)),
  globalFooterScriptsCustomHtml: z.string().optional(),
  // siteLogoUrl is handled by file logic, not direct Zod validation of a URL field from form
}).superRefine((data, ctx) => {
  if (data.globalHeaderScriptsEnabled && (!data.globalHeaderScriptsCustomHtml || data.globalHeaderScriptsCustomHtml.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Custom HTML for header scripts is required when enabled.',
      path: ['globalHeaderScriptsCustomHtml'],
    });
  }
  if (data.globalFooterScriptsEnabled && (!data.globalFooterScriptsCustomHtml || data.globalFooterScriptsCustomHtml.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Custom HTML for footer scripts is required when enabled.',
      path: ['globalFooterScriptsCustomHtml'],
    });
  }
});


export async function updateSiteSettingsAction(formData: FormData) {
  const rawData = {
    siteTitle: formData.get('siteTitle'),
    siteDescription: formData.get('siteDescription'),
    postsPerPage: formData.get('postsPerPage'),
    adminUsername: formData.get('adminUsername'),
    adminPassword: formData.get('adminPassword'),
    globalHeaderScriptsEnabled: formData.get('globalHeaderScriptsEnabled'),
    globalHeaderScriptsCustomHtml: formData.get('globalHeaderScriptsCustomHtml'),
    globalFooterScriptsEnabled: formData.get('globalFooterScriptsEnabled'),
    globalFooterScriptsCustomHtml: formData.get('globalFooterScriptsCustomHtml'),
  };

  const validation = siteSettingsSchema.safeParse(rawData);

  if (!validation.success) {
    console.error('Server-side Zod validation failed (site settings):', validation.error.flatten().fieldErrors);
    return {
      success: false,
      message: "Validation failed. Check server logs for details.",
      errors: validation.error.flatten().fieldErrors,
      newSiteLogoUrl: undefined, // Ensure this is returned
    };
  }

  const currentSettings = await settingsService.getSettings();
  const formUsername = (validation.data.adminUsername || "").trim();
  const formPassword = validation.data.adminPassword || ""; 

  const credentialErrors: { adminUsername?: string[]; adminPassword?: string[] } = {};

  if (formUsername) {
    if (formUsername.length < 3) {
        credentialErrors.adminUsername = ["Admin username must be at least 3 characters."];
    }
    const isNewUsername = !currentSettings.adminUsername;
    const usernameChanged = formUsername !== currentSettings.adminUsername;

    if (isNewUsername || usernameChanged) {
      if (formPassword.length === 0) {
        credentialErrors.adminPassword = ["A new password is required when setting or changing the username."];
      } else if (formPassword.length < 6) {
        credentialErrors.adminPassword = ["Admin password must be at least 6 characters."];
      }
    } else {
      if (formPassword.length > 0 && formPassword.length < 6) {
        credentialErrors.adminPassword = ["Admin password must be at least 6 characters."];
      }
    }
  } else {
    if (formPassword.length > 0) {
      credentialErrors.adminUsername = ["Username cannot be empty if providing a password. To clear admin access, leave both username and password fields empty."];
    }
  }
  
  if (Object.keys(credentialErrors).length > 0) {
    return {
      success: false,
      message: "Admin credentials validation failed.",
      errors: credentialErrors,
      newSiteLogoUrl: undefined,
    };
  }

  let finalSiteLogoUrl = currentSettings.siteLogoUrl;
  const newLogoFile = formData.get('logoFile') as File | undefined;
  const removeLogo = formData.get('removeLogo') === 'true';
  let newUrlUploaded: string | undefined = undefined;


  try {
    if (removeLogo) {
      if (currentSettings.siteLogoUrl) {
        await deleteSupabaseFile(currentSettings.siteLogoUrl, SITE_ASSETS_BUCKET_NAME);
      }
      finalSiteLogoUrl = undefined;
    } else if (newLogoFile && newLogoFile.size > 0) {
      if (currentSettings.siteLogoUrl) {
        await deleteSupabaseFile(currentSettings.siteLogoUrl, SITE_ASSETS_BUCKET_NAME);
      }
      newUrlUploaded = await handleSupabaseFileUpload(newLogoFile, SITE_ASSETS_BUCKET_NAME);
      finalSiteLogoUrl = newUrlUploaded;
    }
    // If neither removeLogo nor newLogoFile, finalSiteLogoUrl remains currentSettings.siteLogoUrl


    const settingsToUpdate: Partial<SiteSettings> = {
      siteTitle: validation.data.siteTitle,
      siteDescription: validation.data.siteDescription,
      postsPerPage: validation.data.postsPerPage,
      siteLogoUrl: finalSiteLogoUrl, // Use the determined logo URL
      adminUsername: formUsername,
      globalHeaderScriptsEnabled: validation.data.globalHeaderScriptsEnabled,
      globalHeaderScriptsCustomHtml: validation.data.globalHeaderScriptsCustomHtml,
      globalFooterScriptsEnabled: validation.data.globalFooterScriptsEnabled,
      globalFooterScriptsCustomHtml: validation.data.globalFooterScriptsCustomHtml,
    };

    if (formPassword.length > 0) {
      settingsToUpdate.adminPassword = formPassword; 
    } else if (!formUsername) {
      settingsToUpdate.adminPassword = ""; 
    } else if (formUsername && formUsername === currentSettings.adminUsername && currentSettings.adminPassword) {
      // No password update, keep existing hashed if it was hashed
    } else if (formUsername && (!currentSettings.adminPassword || formUsername !== currentSettings.adminUsername) && formPassword.length === 0) {
       settingsToUpdate.adminPassword = ""; // Clearing password if username changed and no new pass
    }

    await settingsService.updateSettings(settingsToUpdate);
    revalidatePath('/'); // Revalidate homepage (for site title/logo)
    revalidatePath('/admin/settings');
    revalidatePath('/login'); // If admin creds changed

    return {
      success: true,
      message: 'Site settings updated successfully.',
      errors: null,
      newSiteLogoUrl: finalSiteLogoUrl, // Return the new logo URL
    };
  } catch (error: any) {
    console.error('Failed to update site settings:', error);
    // If a new logo was uploaded but then an error occurred, attempt to delete it
    if (newUrlUploaded) {
        console.log('Attempting to delete uploaded logo due to settings update error...');
        await deleteSupabaseFile(newUrlUploaded, SITE_ASSETS_BUCKET_NAME);
    }
    return {
      success: false,
      message: error.message || 'Could not update site settings. Check server logs.',
      errors: null,
      newSiteLogoUrl: currentSettings.siteLogoUrl, // Revert to original if error
    };
  }
}

const SESSION_COOKIE_NAME = 'newstoday-adminsession';

export async function loginAction(
  prevState: { message?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ message?: string; success?: boolean }> {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { message: 'Username and password are required.', success: false };
  }

  const settings = await settingsService.getSettings();

  if (!settings.adminUsername || !settings.adminPassword) {
    return { message: 'Admin account is not configured. Please set it up in Site Settings.', success: false };
  }

  const isValidUsername = username === settings.adminUsername;
  const isValidPassword = password === settings.adminPassword; // Plaintext comparison

  if (isValidUsername && isValidPassword) {
    cookies().set(SESSION_COOKIE_NAME, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
      sameSite: 'lax',
    });
    revalidatePath('/admin');
    revalidatePath('/login');
    redirect('/admin');

  } else {
    return { message: 'Invalid username or password.', success: false };
  }
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE_NAME);
  revalidatePath('/admin');
  revalidatePath('/login');
  redirect('/login');
}

