
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("Supabase URL is not defined. Please check your .env file for NEXT_PUBLIC_SUPABASE_URL.");
}
if (!supabaseAnonKey) {
  console.error("Supabase Anon Key is not defined. Please check your .env file for NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

// Create a single Supabase client for interacting with your database
export const supabase: SupabaseClient = createClient(supabaseUrl!, supabaseAnonKey!);

// Example of how to get the public URL for an image in a bucket
export function getSupabasePublicUrl(bucketName: string, filePath: string): string | null {
  if (!supabaseUrl) return null;
  // Note: This constructs the URL manually. For more complex scenarios or RLS,
  // you might use supabase.storage.from(bucketName).getPublicUrl(filePath)
  // but that returns data and error, not just the URL string directly for simple public buckets.
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
}
