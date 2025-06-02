
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Perform stricter checks for Supabase URL
if (!supabaseUrl || supabaseUrl.trim() === '' || supabaseUrl === 'your_supabase_project_url_here' || !supabaseUrl.startsWith('http')) {
  throw new Error(
    `CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not defined, is a placeholder, or is invalid. Please check your environment variables. Current value: "${supabaseUrl}"`
  );
}

// Perform stricter checks for Supabase Anon Key
if (!supabaseAnonKey || supabaseAnonKey.trim() === '' || supabaseAnonKey === 'your_supabase_public_anon_key_here' || supabaseAnonKey.length < 50) { // Basic length check, anon keys are typically long
  throw new Error(
    `CRITICAL: NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined, is a placeholder, or is invalid. Please check your environment variables. Key starts with: "${supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + '...' : 'undefined'}"`
  );
}

// Create a single Supabase client for interacting with your database
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Example of how to get the public URL for an image in a bucket
export function getSupabasePublicUrl(bucketName: string, filePath: string): string | null {
  if (!supabaseUrl) return null; // Should not happen if checks above pass
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
}
