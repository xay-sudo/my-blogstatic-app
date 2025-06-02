
import type { Post } from '@/types';
import { supabase } from './supabase-client'; // Public Supabase client
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// For initial data seeding from JSON if DB is empty
const dataDir = path.join(process.cwd(), 'data');
const postsJsonFilePath = path.join(dataDir, 'posts.json');
let initialPostsDataLoaded = false;

// Helper function to validate HTTP/HTTPS URL format for internal use
function isValidHttpUrl(string: string | undefined | null): boolean {
  if (!string) return false;
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

// Helper function to create a Supabase admin client (uses service_role key)
function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl.trim() === '' || supabaseUrl === 'your_supabase_project_url_here' || !supabaseUrl.startsWith('http')) {
    throw new Error(
      `CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not defined, is a placeholder, or is invalid for admin client. Please check environment variables. Current value: "${supabaseUrl}"`
    );
  }
  if (!supabaseServiceRoleKey || supabaseServiceRoleKey.trim() === '' || supabaseServiceRoleKey === 'your_supabase_service_role_key_here' || supabaseServiceRoleKey.length < 50) { // Basic length check
    throw new Error(
      `CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not defined, is a placeholder, or is invalid for admin actions. Please check environment variables.`
    );
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}


async function seedInitialPostsFromJson() {
  if (initialPostsDataLoaded) return;

  try {
    const { count, error: countError } = await supabase.from('posts').select('*', { count: 'exact', head: true });
    if (countError) {
      console.warn('Could not check post count in DB for seeding:', JSON.stringify(countError, null, 2));
      initialPostsDataLoaded = true;
      return;
    }

    if (count === 0) {
      console.log('Posts table is empty. Attempting to seed from posts.json...');
      const jsonData = await fs.readFile(postsJsonFilePath, 'utf-8');
      const postsFromFile = JSON.parse(jsonData) as Post[];

      const postsToInsert = postsFromFile.map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        date: p.date,
        content: p.content,
        tags: p.tags,
        thumbnail_url: p.thumbnailUrl,
        view_count: p.viewCount || 0,
      }));

      if (postsToInsert.length > 0) {
        const adminSupabase = getSupabaseAdminClient();
        const { error: insertError } = await adminSupabase.from('posts').insert(postsToInsert);
        if (insertError) {
          console.error('Error seeding posts to Supabase:', JSON.stringify(insertError, null, 2));
        } else {
          console.log(`Successfully seeded ${postsToInsert.length} posts from posts.json to Supabase.`);
        }
      }
    } else {
      console.log('Posts table is not empty. Skipping seeding from JSON.');
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
        console.warn('Could not read or parse posts.json for initial seeding:', error.message);
    } else {
        console.log('posts.json not found, skipping initial seeding.');
    }
  } finally {
    initialPostsDataLoaded = true;
  }
}


export const getAllPosts = async (): Promise<Post[]> => {
  await seedInitialPostsFromJson();

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', JSON.stringify(error, null, 2));
    return [];
  }
  return data.map(p => ({ ...p, thumbnailUrl: p.thumbnail_url, viewCount: p.view_count })) as Post[];
};

export const getPostBySlug = async (slug: string): Promise<Post | undefined> => {
  await seedInitialPostsFromJson();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return undefined;
    console.error('Error fetching post by slug:', JSON.stringify(error, null, 2));
    return undefined;
  }
  return data ? { ...data, thumbnailUrl: data.thumbnail_url, viewCount: data.view_count } as Post : undefined;
};

export const getPostById = async (id: string): Promise<Post | undefined> => {
  await seedInitialPostsFromJson();
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return undefined;
    console.error('Error fetching post by ID:', JSON.stringify(error, null, 2));
    return undefined;
  }
  return data ? { ...data, thumbnailUrl: data.thumbnail_url, viewCount: data.view_count } as Post : undefined;
};

function formatSupabaseError(supabaseError: any): string {
  if (!supabaseError) return "An unknown error occurred with the database operation.";

  // Prioritize more specific fields from Supabase error object
  if (supabaseError.details && typeof supabaseError.details === 'string') return supabaseError.details;
  if (supabaseError.message && typeof supabaseError.message === 'string' && supabaseError.message !== "An error occurred" && supabaseError.message.trim() !== "" && supabaseError.message.trim() !== "{}") return supabaseError.message;
  if (supabaseError.hint && typeof supabaseError.hint === 'string') return supabaseError.hint;

  // Fallback for less specific or empty errors
  const stringifiedError = JSON.stringify(supabaseError);
  if (stringifiedError !== "{}") { // If there's some content, even if not standard
    return `Database error: ${stringifiedError}. CRITICAL: Inspect server logs for the full raw error.`;
  }

  // This is the most generic case, meaning the error object was likely empty.
  return "Supabase database operation failed. The Supabase client returned minimal error details. CRITICAL: Inspect server logs for the raw Supabase error. This often indicates an issue with the SERVICE_ROLE_KEY or a database constraint violation.";
}

export const addPost = async (newPostData: Omit<Post, 'id' | 'date' | 'viewCount'> & { viewCount?: number }): Promise<Post> => {
  let adminSupabase: SupabaseClient;
  try {
    adminSupabase = getSupabaseAdminClient();
  } catch (e: any) {
    console.error('Failed to initialize Supabase admin client in addPost:', e.message);
    // This error should be specific from getSupabaseAdminClient (e.g., "CRITICAL: SUPABASE_SERVICE_ROLE_KEY...")
    throw new Error(`Configuration error: ${e.message || 'Failed to initialize Supabase admin client. Check environment variables and server logs.'}`);
  }

  const postToInsert = {
    slug: newPostData.slug,
    title: newPostData.title,
    content: newPostData.content,
    tags: newPostData.tags,
    thumbnail_url: newPostData.thumbnailUrl,
    date: new Date().toISOString(),
    view_count: newPostData.viewCount || 0,
  };

  const { data, error } = await adminSupabase
    .from('posts')
    .insert(postToInsert)
    .select()
    .single();

  if (error) {
    console.error('Error adding post (raw Supabase error):', JSON.stringify(error, null, 2));
    const friendlyErrorMessage = formatSupabaseError(error);
    throw new Error(`Could not add post. ${friendlyErrorMessage}`);
  }
  if (!data) { // Should not happen if error is null, but as a safeguard
    throw new Error('Could not add post. No data returned from Supabase after insert, despite no error.');
  }
  return { ...data, thumbnailUrl: data.thumbnail_url, viewCount: data.view_count } as Post;
};

export const updatePost = async (postId: string, updatedPostData: Partial<Omit<Post, 'id' | 'date'>>): Promise<Post | undefined> => {
  let adminSupabase: SupabaseClient;
   try {
    adminSupabase = getSupabaseAdminClient();
  } catch (e: any)    {
    console.error('Failed to initialize Supabase admin client in updatePost:', e.message);
    throw new Error(`Configuration error: ${e.message || 'Failed to initialize Supabase admin client. Check environment variables and server logs.'}`);
  }

  const postToUpdate: { [key: string]: any } = {};
  if (updatedPostData.slug) postToUpdate.slug = updatedPostData.slug;
  if (updatedPostData.title) postToUpdate.title = updatedPostData.title;
  if (updatedPostData.content) postToUpdate.content = updatedPostData.content;
  if (updatedPostData.tags) postToUpdate.tags = updatedPostData.tags;
  if (updatedPostData.hasOwnProperty('thumbnailUrl')) postToUpdate.thumbnail_url = updatedPostData.thumbnailUrl;
  if (updatedPostData.viewCount !== undefined) postToUpdate.view_count = updatedPostData.viewCount;

  if (Object.keys(postToUpdate).length === 0) {
    console.warn('updatePost called with no fields to update for postId:', postId);
    return getPostById(postId); // Return current post if nothing to update
  }

  const { data, error } = await adminSupabase
    .from('posts')
    .update(postToUpdate)
    .eq('id', postId)
    .select()
    .single();

  if (error) {
    console.error('Error updating post (raw Supabase error):', JSON.stringify(error, null, 2));
    const friendlyErrorMessage = formatSupabaseError(error);
    throw new Error(`Could not update post. ${friendlyErrorMessage}`);
  }
  if (!data && !error) { // No error but no data, means post with ID might not exist
     console.warn(`Post with ID ${postId} not found during update, or no changes made.`);
     return undefined;
  }
  return data ? { ...data, thumbnailUrl: data.thumbnail_url, viewCount: data.view_count } as Post : undefined;
};

export const deletePostById = async (postId: string): Promise<void> => {
  let adminSupabase: SupabaseClient;
  try {
    adminSupabase = getSupabaseAdminClient();
  } catch (e: any) {
    console.error('Failed to initialize Supabase admin client in deletePostById:', e.message);
    throw new Error(`Configuration error: ${e.message || 'Failed to initialize Supabase admin client. Check environment variables and server logs.'}`);
  }

  const { error } = await adminSupabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('Error deleting post (raw Supabase error):', JSON.stringify(error, null, 2));
    const friendlyErrorMessage = formatSupabaseError(error);
    throw new Error(`Could not delete post. ${friendlyErrorMessage}`);
  }
};

export const incrementViewCount = async (postId: string): Promise<void> => {
  let adminSupabase: SupabaseClient;
  try {
    adminSupabase = getSupabaseAdminClient();
  } catch (e: any) {
    // For view count, we might not want to throw a hard error that crashes a page view
    // if only the service key is misconfigured for this non-critical background op.
    console.error('Failed to initialize Supabase admin client for incrementViewCount (non-critical):', e.message);
    return; // Silently fail if admin client can't be initialized for this
  }

  const { error } = await adminSupabase.rpc('increment_post_view_count', { post_id_arg: postId });

  if (error) {
    // Not throwing an error here as it's a non-critical background operation for the user
    console.warn('Error incrementing view count (raw Supabase error):', JSON.stringify(error, null, 2));
  }
};

if (typeof window === 'undefined') {
  // Defer actual seeding to first function call.
}
