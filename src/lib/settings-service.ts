
import type { SiteSettings } from '@/types';
import { supabase } from './supabase-client'; // Public Supabase client
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const settingsJsonFilePath = path.join(dataDir, 'settings.json');
let initialSettingsDataLoaded = false;

const DEFAULT_SETTINGS_OBJ: SiteSettings = {
  siteTitle: "Newstoday",
  siteDescription: "A modern blog platform with AI-powered tagging.",
  postsPerPage: 6,
  bannerEnabled: false,
  bannerType: 'image',
  bannerImageUrl: '',
  bannerImageLink: '',
  bannerImageAltText: 'Banner',
  bannerCustomHtml: '',
  adminUsername: '',
  adminPassword: '',
};

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
  if (!supabaseServiceRoleKey || supabaseServiceRoleKey.trim() === '' || supabaseServiceRoleKey === 'your_supabase_service_role_key_here' || supabaseServiceRoleKey.length < 50) {
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

async function seedInitialSettingsFromJson() {
  if (initialSettingsDataLoaded) return;

  try {
    const { data: existingSettings, error: fetchError } = await supabase
      .from('site_settings')
      .select('settings')
      .eq('id', 1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means "Not a single row was found"
      if ((fetchError as any).code === '42P01') { // 42P01 means "undefined_table"
        console.error(
          "\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
          "DATABASE SEEDING INFO: The 'public.site_settings' table was not found during the\n" +
          "initial settings check. This is expected if the table hasn't been created yet.\n\n" +
          "PLEASE RUN THE SQL SCRIPT provided by the AI assistant to create 'public.site_settings'.\n" +
          "Once created, settings from 'data/settings.json' (if available) or defaults will be\n" +
          "attempted to be seeded by the application automatically.\n" +
          "The application will use default settings until the table exists and is populated.\n" +
          "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
        );
      } else {
        console.warn('Could not check site_settings in DB for seeding (other error):', JSON.stringify(fetchError, null, 2));
      }
      initialSettingsDataLoaded = true; // Mark as loaded to prevent repeated attempts if DB is misconfigured
      return; // Prevent further seeding attempts if table check fails significantly
    }


    if (!existingSettings || !existingSettings.settings || Object.keys(existingSettings.settings).length === 0) {
      console.log('Site settings in DB are empty/non-existent. Attempting to seed from settings.json...');
      let settingsFromFile = { ...DEFAULT_SETTINGS_OBJ };
      try {
        const jsonData = await fs.readFile(settingsJsonFilePath, 'utf-8');
        settingsFromFile = { ...DEFAULT_SETTINGS_OBJ, ...JSON.parse(jsonData) };
      } catch (fileError: any) {
        if (fileError.code !== 'ENOENT') {
          console.warn('Could not read or parse settings.json for initial seeding, using defaults:', fileError.message);
        } else {
          console.log('settings.json not found, using default settings for initial seed.');
        }
      }
      
      const adminSupabase = getSupabaseAdminClient();
      const { error: upsertError } = await adminSupabase
        .from('site_settings')
        .upsert({ id: 1, settings: settingsFromFile }, { onConflict: 'id' });

      if (upsertError) {
        console.error('Error seeding site settings to Supabase:', JSON.stringify(upsertError, null, 2));
      } else {
        console.log('Successfully seeded site settings to Supabase from settings.json/defaults.');
      }
    } else {
      console.log('Site settings exist in DB. Skipping seeding from JSON.');
    }
  } catch (error: any) {
     console.warn('General error during initial settings seeding check:', error.message);
  } finally {
    initialSettingsDataLoaded = true;
  }
}

export async function getSettings(): Promise<SiteSettings> {
  await seedInitialSettingsFromJson();

  const { data, error } = await supabase
    .from('site_settings')
    .select('settings')
    .eq('id', 1)
    .single();

  if (error) {
    const errorIsLikelyEmpty = !(error as any).message && !(error as any).code && JSON.stringify(error) === '{}';

    if (errorIsLikelyEmpty) {
      console.error(
        'Error fetching settings from Supabase: Received an empty error object. ' +
        'This often indicates: ' +
        '1. A problem with Supabase client initialization (check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables, ensuring they are correctly set in BOTH local .env and Vercel/hosting). ' +
        '2. A network connectivity issue to Supabase. ' +
        '3. Incorrect Row Level Security (RLS) policies on the "site_settings" table (ensure "anon" role has SELECT permission, and that RLS is enabled for the table if policies are defined). ' +
        '4. The "site_settings" table might not exist or not have a row with id=1. ' +
        'Raw error object:', error
      );
    } else {
      const errorDetails = {
        message: (error as any).message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
        fullErrorObject: JSON.stringify(error, null, 2)
      };
      console.error('Error fetching settings from Supabase:', errorDetails);
    }

    if ((error as any).code === '42P01') { // 42P01: relation "public.site_settings" does not exist
        console.error(
            "\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
            "CRITICAL DATABASE SETUP ISSUE: The 'public.site_settings' table does not exist.\n" +
            "The application cannot load your custom site settings from the database.\n" +
            "It will use default settings for now.\n\n" +
            "TO FIX THIS: Please go to your Supabase project's SQL Editor and run the\n" +
            "SQL script (provided in the AI assistant's instructions) to create this table.\n" +
            "Look for the script that starts with: CREATE TABLE IF NOT EXISTS public.site_settings (...)\n" +
            "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
        );
    }

    if ((error as any).code !== 'PGRST116') { // PGRST116 means "Not a single row was found" - it's okay if table exists but is empty, defaults will be used. But 42P01 means table is GONE.
        return { ...DEFAULT_SETTINGS_OBJ };
    }
  }


  if (!data || !data.settings) {
    // This case can also happen if the table exists but the row with id=1 is missing
    // and RLS prevents seeing it, or it was somehow deleted.
    // The seedInitialSettingsFromJson should handle creating the row.
    // If we reach here and data.settings is null/undefined, it means we should use defaults.
    if (!error) { // If there was no error but data.settings is still null
      console.warn("Site settings fetched successfully but 'settings' field is null or empty. Using default settings. This might occur if the row id=1 in 'site_settings' is missing or its 'settings' JSONB is null.");
    }
    return { ...DEFAULT_SETTINGS_OBJ };
  }

  return { ...DEFAULT_SETTINGS_OBJ, ...(data.settings as Partial<SiteSettings>) };
}

export async function updateSettings(newSettings: Partial<SiteSettings>): Promise<SiteSettings> {
  const adminSupabase = getSupabaseAdminClient();
  const currentSettings = await getSettings(); 
  
  const mergedSettings: Partial<SiteSettings> = { ...currentSettings, ...newSettings };

  if (typeof mergedSettings.postsPerPage === 'string') {
    mergedSettings.postsPerPage = parseInt(mergedSettings.postsPerPage, 10);
  }
  if (isNaN(mergedSettings.postsPerPage) || mergedSettings.postsPerPage <= 0) {
    mergedSettings.postsPerPage = DEFAULT_SETTINGS_OBJ.postsPerPage;
  }
  if (typeof mergedSettings.bannerEnabled === 'string') {
    mergedSettings.bannerEnabled = mergedSettings.bannerEnabled === 'on' || mergedSettings.bannerEnabled === 'true';
  } else if (typeof mergedSettings.bannerEnabled === 'undefined') {
    mergedSettings.bannerEnabled = false;
  }

  if (newSettings.hasOwnProperty('adminUsername')) {
    mergedSettings.adminUsername = String(newSettings.adminUsername ?? '').trim();
  }
  if (newSettings.hasOwnProperty('adminPassword')) {
      mergedSettings.adminPassword = String(newSettings.adminPassword ?? '');
  }

  const { data: updatedData, error } = await adminSupabase
    .from('site_settings')
    .upsert({ id: 1, settings: mergedSettings }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error updating settings in Supabase:', JSON.stringify(error, null, 2));
    throw new Error('Could not save settings. ' + (error.message || JSON.stringify(error)));
  }

  if (!updatedData || !updatedData.settings) {
    throw new Error('Failed to retrieve updated settings from Supabase.');
  }
  
  return { ...DEFAULT_SETTINGS_OBJ, ...(updatedData.settings as Partial<SiteSettings>) };
}

if (typeof window === 'undefined') {
 // Defer actual seeding to first function call.
}
