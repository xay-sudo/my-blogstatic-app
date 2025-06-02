
import type { Post } from '@/types';
import { supabase } from './supabase-client'; // Public Supabase client
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// For initial data seeding from JSON if DB is empty
const dataDir = path.join(process.cwd(), 'data');
const postsJsonFilePath = path.join(dataDir, 'posts.json');
let initialPostsDataLoaded = false;

// Helper function to create a Supabase admin client (uses service_role key)
// This is specifically for operations requiring elevated privileges like incrementViewCount
function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase URL or Service Role Key is not configured for admin actions.');
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
      console.warn('Could not check post count in DB for seeding:', countError.message);
      // Don't proceed if we can't verify DB state
      initialPostsDataLoaded = true; // Mark as attempted
      return;
    }

    if (count === 0) {
      console.log('Posts table is empty. Attempting to seed from posts.json...');
      const jsonData = await fs.readFile(postsJsonFilePath, 'utf-8');
      const postsFromFile = JSON.parse(jsonData) as Post[];

      const postsToInsert = postsFromFile.map(p => ({
        id: p.id, // Use existing ID from JSON
        slug: p.slug,
        title: p.title,
        date: p.date,
        content: p.content,
        tags: p.tags,
        thumbnail_url: p.thumbnailUrl,
        view_count: p.viewCount || 0,
      }));

      if (postsToInsert.length > 0) {
        const { error: insertError } = await supabase.from('posts').insert(postsToInsert);
        if (insertError) {
          console.error('Error seeding posts to Supabase:', insertError);
        } else {
          console.log(`Successfully seeded ${postsToInsert.length} posts from posts.json to Supabase.`);
        }
      }
    } else {
      console.log('Posts table is not empty. Skipping seeding from JSON.');
    }
  } catch (error: any) {
    // This handles fs.readFile error or JSON.parse error
    if (error.code !== 'ENOENT') { // ENOENT means posts.json doesn't exist, which is fine
        console.warn('Could not read or parse posts.json for initial seeding:', error.message);
    } else {
        console.log('posts.json not found, skipping initial seeding. This is normal if starting fresh.');
    }
  } finally {
    initialPostsDataLoaded = true; // Mark as attempted/done
  }
}


export const getAllPosts = async (): Promise<Post[]> => {
  await seedInitialPostsFromJson(); // Attempt to seed if this is the first call

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching posts:', error);
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
    if (error.code === 'PGRST116') return undefined; // Post not found
    console.error('Error fetching post by slug:', error);
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
    if (error.code === 'PGRST116') return undefined; // Post not found
    console.error('Error fetching post by ID:', error);
    return undefined;
  }
  return data ? { ...data, thumbnailUrl: data.thumbnail_url, viewCount: data.view_count } as Post : undefined;
};

export const addPost = async (newPostData: Omit<Post, 'id' | 'date' | 'viewCount'> & { viewCount?: number }): Promise<Post> => {
  const postToInsert = {
    slug: newPostData.slug,
    title: newPostData.title,
    content: newPostData.content,
    tags: newPostData.tags,
    thumbnail_url: newPostData.thumbnailUrl,
    date: new Date().toISOString(), // Set server-side
    view_count: newPostData.viewCount || 0,
  };

  const { data, error } = await supabase
    .from('posts')
    .insert(postToInsert)
    .select()
    .single();

  if (error) {
    console.error('Error adding post:', error);
    throw new Error('Could not add post. ' + error.message);
  }
  return { ...data, thumbnailUrl: data.thumbnail_url, viewCount: data.view_count } as Post;
};

export const updatePost = async (postId: string, updatedPostData: Partial<Omit<Post, 'id' | 'date'>>): Promise<Post | undefined> => {
  const postToUpdate: { [key: string]: any } = {};
  if (updatedPostData.slug) postToUpdate.slug = updatedPostData.slug;
  if (updatedPostData.title) postToUpdate.title = updatedPostData.title;
  if (updatedPostData.content) postToUpdate.content = updatedPostData.content;
  if (updatedPostData.tags) postToUpdate.tags = updatedPostData.tags;
  if (updatedPostData.hasOwnProperty('thumbnailUrl')) postToUpdate.thumbnail_url = updatedPostData.thumbnailUrl;
  if (updatedPostData.viewCount !== undefined) postToUpdate.view_count = updatedPostData.viewCount;
  // `date` is not typically updated, `updated_at` is handled by DB trigger

  if (Object.keys(postToUpdate).length === 0) {
    return getPostById(postId); // No actual changes
  }

  const { data, error } = await supabase
    .from('posts')
    .update(postToUpdate)
    .eq('id', postId)
    .select()
    .single();

  if (error) {
    console.error('Error updating post:', error);
    throw new Error('Could not update post. ' + error.message);
  }
  return data ? { ...data, thumbnailUrl: data.thumbnail_url, viewCount: data.view_count } as Post : undefined;
};

export const deletePostById = async (postId: string): Promise<void> => {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('Error deleting post:', error);
    throw new Error('Could not delete post. ' + error.message);
  }
};

export const incrementViewCount = async (postId: string): Promise<void> => {
  const adminSupabase = getSupabaseAdminClient(); // Use admin client for this operation
  const { error } = await adminSupabase.rpc('increment_post_view_count', { post_id_arg: postId });

  if (error) {
    console.error('Error incrementing view count:', error);
    // Don't throw, as this is a non-critical background operation
  }
};

// You need to create this RPC function in your Supabase SQL Editor:
// CREATE OR REPLACE FUNCTION increment_post_view_count(post_id_arg UUID)
// RETURNS VOID AS $$
// BEGIN
//   UPDATE public.posts
//   SET view_count = view_count + 1
//   WHERE id = post_id_arg;
// END;
// $$ LANGUAGE plpgsql;

// Call seedInitialPostsFromJson once when the module loads, but ensure it's non-blocking for server start
// The actual check and seed will happen on the first service call.
if (typeof window === 'undefined') { // Run only on server-side
  // seedInitialPostsFromJson().catch(console.error); // This might run too early or too often.
  // Defer actual seeding to first function call.
}
