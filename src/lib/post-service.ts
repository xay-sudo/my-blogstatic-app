
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

  if (!supabaseUrl || supabaseUrl.trim() === '' || supabaseUrl === 'your_supabase_project_url_here' || !isValidHttpUrl(supabaseUrl)) {
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
    const adminSupabaseForSeedCheck = getSupabaseAdminClient(); // Use admin for initial check/seed
    const { count, error: countError } = await adminSupabaseForSeedCheck.from('posts').select('*', { count: 'exact', head: true });
    
    if (countError && countError.code !== '42P01') { // 42P01: undefined_table. If table doesn't exist, we'll try to create it.
      console.warn('Could not check post count in DB for seeding (may indicate RLS or other issue if table exists):', JSON.stringify(countError, null, 2));
      // Proceed cautiously, hoping table creation might be pending or an RLS issue for count.
    }


    if (count === 0 || (countError && countError.code === '42P01')) {
      if (countError && countError.code === '42P01') {
        console.log("Posts table does not exist. Will attempt to seed which implies table creation if DDL is correct.");
      } else {
        console.log('Posts table is empty. Attempting to seed from posts.json...');
      }
      
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
    } else if (count !== null && count > 0) {
      console.log('Posts table is not empty. Skipping seeding from JSON.');
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') { // ENOENT: posts.json not found, which is fine.
        console.warn('Could not read or parse posts.json for initial seeding (or other error during seed check):', error.message);
    } else {
        console.log('posts.json not found, skipping initial seeding from file.');
    }
  } finally {
    initialPostsDataLoaded = true;
  }
}


export const getAllPosts = async (): Promise<Post[]> => {
  await seedInitialPostsFromJson();

  const { data, error } = await supabase // public client for reads
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
    if (error.code === 'PGRST116') return undefined; // Row not found, not an "error" for this function's purpose
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
    if (error.code === 'PGRST116') return undefined; // Row not found
    console.error('Error fetching post by ID:', JSON.stringify(error, null, 2));
    return undefined;
  }
  return data ? { ...data, thumbnailUrl: data.thumbnail_url, viewCount: data.view_count } as Post : undefined;
};

function formatSupabaseError(supabaseError: any): string {
  if (!supabaseError) return "An unknown error occurred with the database operation.";

  if (supabaseError.details && typeof supabaseError.details === 'string' && supabaseError.details.trim() !== "") {
    return supabaseError.details;
  }
  if (supabaseError.message && typeof supabaseError.message === 'string' && supabaseError.message.trim() !== "" && supabaseError.message !== "An error occurred" && supabaseError.message !== "{}") {
    // Try to make common PG errors more readable
    if (supabaseError.message.includes("violates unique constraint")) {
        const constraintName = supabaseError.message.match(/"(.*?)"/)?.[1];
        return `Data conflict: A record with this value already exists (violates ${constraintName || 'unique constraint'}). Please ensure fields like 'slug' are unique.`;
    }
    if (supabaseError.message.includes("violates not-null constraint")) {
        const columnName = supabaseError.message.match(/null value in column "(.*?)"/)?.[1];
        return `Missing data: The field '${columnName || 'a required field'}' cannot be empty.`;
    }
    return supabaseError.message;
  }
  if (supabaseError.hint && typeof supabaseError.hint === 'string' && supabaseError.hint.trim() !== "") {
    return supabaseError.hint;
  }

  const stringifiedError = JSON.stringify(supabaseError);
  if (stringifiedError !== "{}") {
    return `Database error: ${stringifiedError}. CRITICAL: Inspect server logs for the full raw error.`;
  }

  return "Supabase database operation failed. The Supabase client returned minimal error details. CRITICAL: Inspect server logs for the raw Supabase error. This often indicates: 1. An incorrect or missing SUPABASE_SERVICE_ROLE_KEY. 2. A database constraint violation (e.g., duplicate slug, missing required field). 3. The 'posts' table or required SQL functions are not correctly set up in your Supabase project.";
}

export const addPost = async (newPostData: Omit<Post, 'id' | 'date' | 'viewCount'> & { viewCount?: number }): Promise<Post> => {
  let adminSupabase: SupabaseClient;
  try {
    adminSupabase = getSupabaseAdminClient();
  } catch (e: any) {
    console.error('Failed to initialize Supabase admin client in addPost:', e.message);
    throw new Error(`Configuration error preventing post creation: ${e.message || 'Failed to initialize Supabase admin client. Check environment variables and server logs.'}`);
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
  if (!data) {
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
    throw new Error(`Configuration error preventing post update: ${e.message || 'Failed to initialize Supabase admin client. Check environment variables and server logs.'}`);
  }

  const postToUpdate: { [key: string]: any } = {};
  if (updatedPostData.slug !== undefined) postToUpdate.slug = updatedPostData.slug;
  if (updatedPostData.title !== undefined) postToUpdate.title = updatedPostData.title;
  if (updatedPostData.content !== undefined) postToUpdate.content = updatedPostData.content;
  if (updatedPostData.tags !== undefined) postToUpdate.tags = updatedPostData.tags;
  if (updatedPostData.hasOwnProperty('thumbnailUrl')) postToUpdate.thumbnail_url = updatedPostData.thumbnailUrl; // Allow setting to null
  if (updatedPostData.viewCount !== undefined) postToUpdate.view_count = updatedPostData.viewCount;


  if (Object.keys(postToUpdate).length === 0) {
    console.warn('updatePost called with no fields to update for postId:', postId);
    return getPostById(postId);
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
  if (!data && !error) {
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
    throw new Error(`Configuration error preventing post deletion: ${e.message || 'Failed to initialize Supabase admin client. Check environment variables and server logs.'}`);
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

export const incrementViewCount = async (postId: string): Promise<number | null> => {
  if (!postId) {
    console.warn('[ViewCounter] Attempted to increment view count with no postId. This is a bug in the calling code.');
    return null;
  }

  let adminSupabase: SupabaseClient;
  try {
    adminSupabase = getSupabaseAdminClient();
  } catch (e: any) {
    console.error(
      `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n` +
      `[ViewCounter] CRITICAL ERROR: Failed to initialize Supabase admin client for incrementViewCount.\n` +
      `View count for postId '${postId}' WILL NOT be incremented.\n` +
      `This usually means NEXT_PUBLIC_SUPABASE_URL or (more likely) SUPABASE_SERVICE_ROLE_KEY environment variables are missing, incorrect, or the service key lacks permissions.\n` +
      `Please verify these in your project's environment settings.\n` +
      `DETAILS: ${e.message || 'Unknown error during admin client initialization.'}\n` +
      `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`
    );
    return null; 
  }

  // The RPC function is expected to return the new view_count
  const { data, error } = await adminSupabase.rpc('increment_post_view_count', { post_id_arg: postId });

  if (error) {
    console.warn(
        `[ViewCounter] Supabase RPC error while incrementing view count for postId '${postId}'.\n` +
        `This might be due to several reasons:\n` +
        `  1. The SQL function 'increment_post_view_count' might be missing, misconfigured, or not returning the new count.\n` +
        `     - Ensure it exists (check your Supabase SQL Editor > Functions).\n` +
        `     - Verify it correctly handles NULL initial values (e.g., using COALESCE(view_count, 0) + 1) and has 'RETURNS integer'.\n` +
        `     - Confirm it uses 'RETURNING view_count INTO new_view_count;' and 'RETURN new_view_count;'.\n` +
        `     - Confirm it's defined with 'SECURITY DEFINER' if RLS could be an issue.\n` +
        `  2. The 'posts' table might be missing the 'view_count' column, or it's not of a numeric type.\n`+
        `  3. There could be network issues or temporary Supabase service problems.\n` +
        `  4. Incorrect RLS policies if SECURITY DEFINER is not used on the SQL function, though service_role should bypass RLS.\n` +
        `To help debug, here's the raw Supabase error: ${JSON.stringify(error, null, 2)}`
    );
    return null;
  } else {
    // console.log(`[ViewCounter] Successfully called RPC. Returned data: ${JSON.stringify(data)} for postId: ${postId}`);
    // The data returned by the RPC function (if it returns a single value) is directly in `data`.
    if (typeof data === 'number') {
      return data;
    } else {
      console.warn(`[ViewCounter] RPC 'increment_post_view_count' for postId '${postId}' did not return a number as expected. Returned: ${JSON.stringify(data)}`);
      return null;
    }
  }
};


if (typeof window === 'undefined') {
  // Seeding is deferred to the first data access call
}

