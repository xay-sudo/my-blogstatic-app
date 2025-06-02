
import type { SiteSettings } from '@/types';
import { supabase } from './supabase-client'; // Public Supabase client
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// For initial data seeding from JSON if DB is empty
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

// Helper function to create a Supabase admin client (uses service_role key)
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

async function seedInitialSettingsFromJson() {
  if (initialSettingsDataLoaded) return;

  try {
    const { data: existingSettings, error: fetchError } = await supabase
      .from('site_settings')
      .select('settings')
      .eq('id', 1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.warn('Could not check site_settings in DB for seeding:', fetchError.message);
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
          console.log('settings.json not found, using default settings for initial seed. This is normal if starting fresh.');
        }
      }
      
      const adminSupabase = getSupabaseAdminClient();
      const { error: upsertError } = await adminSupabase
        .from('site_settings')
        .upsert({ id: 1, settings: settingsFromFile }, { onConflict: 'id' });

      if (upsertError) {
        console.error('Error seeding site settings to Supabase:', upsertError);
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

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error fetching settings from Supabase:', error);
    return { ...DEFAULT_SETTINGS_OBJ };
  }

  if (!data || !data.settings) {
    // No settings in DB, return defaults
    // This could happen if seeding failed and table is empty.
    return { ...DEFAULT_SETTINGS_OBJ };
  }

  return { ...DEFAULT_SETTINGS_OBJ, ...(data.settings as Partial<SiteSettings>) };
}

export async function updateSettings(newSettings: Partial<SiteSettings>): Promise<SiteSettings> {
  const adminSupabase = getSupabaseAdminClient();
  const currentSettings = await getSettings(); // Get current to merge
  
  const mergedSettings: Partial<SiteSettings> = { ...currentSettings, ...newSettings };

  // Ensure types are correct after merge, especially for form data
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
  // Only update password if a new one is explicitly provided.
  // If adminPassword is not in newSettings or is undefined, keep the existing one.
  // If it's an empty string in newSettings, it means clear the password.
  if (newSettings.hasOwnProperty('adminPassword')) {
      mergedSettings.adminPassword = String(newSettings.adminPassword ?? '');
  }


  const { data: updatedData, error } = await adminSupabase
    .from('site_settings')
    .upsert({ id: 1, settings: mergedSettings }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error updating settings in Supabase:', error);
    throw new Error('Could not save settings. ' + error.message);
  }

  if (!updatedData || !updatedData.settings) {
    throw new Error('Failed to retrieve updated settings from Supabase.');
  }
  
  return { ...DEFAULT_SETTINGS_OBJ, ...(updatedData.settings as Partial<SiteSettings>) };
}

// Initial seeding check
if (typeof window === 'undefined') {
 // Defer actual seeding to first function call.
}
