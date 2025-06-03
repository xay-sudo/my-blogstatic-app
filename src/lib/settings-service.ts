
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
  siteLogoUrl: "", // Added default for site logo
  adminUsername: '',
  adminPassword: '',
  globalHeaderScriptsEnabled: false,
  globalHeaderScriptsCustomHtml: '',
  globalFooterScriptsEnabled: false,
  globalFooterScriptsCustomHtml: '',
  bannerEnabled: false,
  bannerType: 'customHtml',
  bannerImageUrl: '',
  bannerImageLink: '',
  bannerImageAltText: '',
  bannerCustomHtml: '',
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
          "CRITICAL DATABASE SETUP ISSUE: The 'public.site_settings' table was not found.\n" +
          "The application cannot load your custom site settings from the database and will use defaults.\n\n" +
          "TO FIX THIS:\n" +
          "1. Go to your Supabase project's SQL Editor.\n" +
          "2. Run the SQL script (provided in the AI assistant's instructions or project README)\n" +
          "   to create the 'public.site_settings' table. The script starts with:\n" +
          "   CREATE TABLE IF NOT EXISTS public.site_settings (...)\n" +
          "After running the script, restart your application or redeploy.\n" +
          "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
        );
      } else {
        console.warn('Could not check site_settings in DB for seeding (other error):', JSON.stringify(fetchError, null, 2));
      }
      initialSettingsDataLoaded = true;
      return;
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
        "\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
        "CRITICAL SUPABASE CONNECTION ERROR: Error fetching settings from Supabase.\n" +
        "Supabase returned an empty error object, which usually means a fundamental connection or configuration issue.\n\n" +
        "MOST LIKELY CAUSES & ACTIONS TO TAKE:\n" +
        "1. MISSING/INCORRECT ENVIRONMENT VARIABLES (ESPECIALLY IN DEPLOYMENT):\n" +
        "   - Check `NEXT_PUBLIC_SUPABASE_URL`: Is it correct and publicly accessible (e.g., `https://your-project-ref.supabase.co`)?\n" +
        "   - Check `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Is it the correct public anonymous key for your project?\n" +
        "   - VERIFY: These variables MUST be set in your hosting environment (e.g., Vercel Project Settings -> Environment Variables).\n" +
        "     If testing locally, ensure they are correct in your `.env` file.\n" +
        "2. 'public.site_settings' TABLE ISSUES:\n" +
        "   - Does the table exist? If not, run the SQL script to create it.\n" +
        "   - RLS: If Row Level Security is enabled, ensure 'anon' role has SELECT permission.\n" +
        "     Policy example: `CREATE POLICY \"Allow public read\" ON public.site_settings FOR SELECT TO anon USING (true);`\n" +
        "3. NETWORK CONNECTIVITY: Ensure your application (especially in deployment) can reach the Supabase URL.\n\n" +
        "The application will use default settings for now. Raw error object received:", JSON.stringify(error, null, 2) +
        "\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
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

    if ((error as any).code === '42P01') { 
        console.error(
            "\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
            "CRITICAL DATABASE SETUP ISSUE: The 'public.site_settings' table does not exist.\n" +
            "The application cannot load your custom site settings from the database and will use defaults.\n\n" +
            "TO FIX THIS:\n" +
            "1. Go to your Supabase project's SQL Editor.\n" +
            "2. Run the SQL script (provided in the AI assistant's instructions or project README)\n" +
            "   to create the 'public.site_settings' table. The script starts with:\n" +
            "   CREATE TABLE IF NOT EXISTS public.site_settings (...)\n" +
            "After running the script, restart your application or redeploy.\n" +
            "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
        );
    }
    // Fallback to default settings if any error occurs (including PGRST116 - row not found)
    return { ...DEFAULT_SETTINGS_OBJ };
  }


  if (!data || !data.settings) {
    if (!error) { 
      console.warn("Site settings fetched successfully but 'settings' field is null or empty. Using default settings. This might occur if the row id=1 in 'site_settings' is missing or its 'settings' JSONB is null.");
    }
    return { ...DEFAULT_SETTINGS_OBJ };
  }

  return { ...DEFAULT_SETTINGS_OBJ, ...(data.settings as Partial<SiteSettings>) };
}

export async function updateSettings(newSettings: Partial<SiteSettings>): Promise<SiteSettings> {
  const adminSupabase = getSupabaseAdminClient();
  const currentSettings = await getSettings(); 
  
  const mergedSettings: SiteSettings = { ...DEFAULT_SETTINGS_OBJ, ...currentSettings, ...newSettings };


  if (typeof mergedSettings.postsPerPage === 'string') {
    mergedSettings.postsPerPage = parseInt(mergedSettings.postsPerPage, 10);
  }
  if (isNaN(mergedSettings.postsPerPage) || mergedSettings.postsPerPage <= 0) {
    mergedSettings.postsPerPage = DEFAULT_SETTINGS_OBJ.postsPerPage;
  }

  if (newSettings.hasOwnProperty('adminUsername')) {
    mergedSettings.adminUsername = String(newSettings.adminUsername ?? '').trim();
  }
  if (newSettings.hasOwnProperty('adminPassword')) {
      mergedSettings.adminPassword = String(newSettings.adminPassword ?? '');
  }
   if (newSettings.hasOwnProperty('siteLogoUrl')) {
    mergedSettings.siteLogoUrl = newSettings.siteLogoUrl; // Allow null or empty string
  }


  if (typeof mergedSettings.globalHeaderScriptsEnabled === 'string') {
    mergedSettings.globalHeaderScriptsEnabled = mergedSettings.globalHeaderScriptsEnabled === 'on' || mergedSettings.globalHeaderScriptsEnabled === 'true';
  } else if (typeof mergedSettings.globalHeaderScriptsEnabled === 'undefined') {
    mergedSettings.globalHeaderScriptsEnabled = false;
  }
  if (newSettings.hasOwnProperty('globalHeaderScriptsCustomHtml')) {
      mergedSettings.globalHeaderScriptsCustomHtml = String(newSettings.globalHeaderScriptsCustomHtml ?? '');
  }

  if (typeof mergedSettings.globalFooterScriptsEnabled === 'string') {
    mergedSettings.globalFooterScriptsEnabled = mergedSettings.globalFooterScriptsEnabled === 'on' || mergedSettings.globalFooterScriptsEnabled === 'true';
  } else if (typeof mergedSettings.globalFooterScriptsEnabled === 'undefined') {
    mergedSettings.globalFooterScriptsEnabled = false;
  }
  if (newSettings.hasOwnProperty('globalFooterScriptsCustomHtml')) {
      mergedSettings.globalFooterScriptsCustomHtml = String(newSettings.globalFooterScriptsCustomHtml ?? '');
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
