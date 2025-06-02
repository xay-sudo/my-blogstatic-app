
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

  if (!isValidHttpUrl(supabaseUrl)) {
    throw new Error(`CRITICAL: NEXT_PUBLIC_SUPABASE_URL is invalid for admin client. Value: "${supabaseUrl}". Please check environment variables.`);
  }
  if (!supabaseServiceRoleKey || supabaseServiceRoleKey.length < 50) { // Basic length check
    throw new Error(`CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not configured or invalid for admin actions. Please check environment variables.`);
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

    if (fetchError && fetchError.code !== 'PGRST116') { 
      console.warn('Could not check site_settings in DB for seeding:', JSON.stringify(fetchError, null, 2));
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

  if (error) { // Check if error object exists and is not null/undefined
    // Log detailed error information
    const errorDetails = {
      message: (error as any).message,
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint,
      fullErrorObject: JSON.stringify(error, null, 2)
    };
    console.error('Error fetching settings from Supabase:', errorDetails);

    // If it's specifically 'PGRST116' (row not found), it's not a "critical" error for this function's purpose,
    // as it means the settings row just doesn't exist yet, and we should return defaults.
    // For any other error code, OR if error.code is missing (like when error is {}),
    // it's a more problematic issue, so we log it and return defaults.
    if ((error as any).code !== 'PGRST116') {
        return { ...DEFAULT_SETTINGS_OBJ };
    }
    // If error.code IS 'PGRST116', it means no settings row. We'll proceed to the !data check below,
    // which will also lead to returning default settings.
  }

  if (!data || !data.settings) {
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
