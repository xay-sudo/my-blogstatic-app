
import type { SiteSettings } from '@/types';
import fs from 'fs/promises';
import path from 'path';
import { ensureDir } from 'fs-extra';

const dataDir = path.join(process.cwd(), 'data');
const settingsFilePath = path.join(dataDir, 'settings.json');

const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "Newstoday",
  siteDescription: "A modern blog platform with AI-powered tagging.",
  postsPerPage: 6,
  bannerEnabled: false,
  bannerType: 'image',
  bannerImageUrl: '',
  bannerImageLink: '',
  bannerImageAltText: 'Banner',
  bannerCustomHtml: '',
  adminUsername: '', // Default empty, user should set this
  adminPassword: '', // Default empty, user should set this. WARNING: Plaintext.
};

async function ensureSettingsFileExists(): Promise<void> {
  try {
    await ensureDir(dataDir);
    await fs.access(settingsFilePath);
  } catch (error) {
    await fs.writeFile(settingsFilePath, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
    console.log(`Created ${settingsFilePath} with default settings.`);
  }
}

export async function getSettings(): Promise<SiteSettings> {
  await ensureSettingsFileExists();
  try {
    const jsonData = await fs.readFile(settingsFilePath, 'utf-8');
    const fileSettings = JSON.parse(jsonData) as Partial<SiteSettings>;
    // Merge with defaults to ensure all keys are present
    return { ...DEFAULT_SETTINGS, ...fileSettings };
  } catch (error) {
    console.error('Error reading settings file, returning default settings:', error);
    return { ...DEFAULT_SETTINGS }; // Return a copy of defaults
  }
}

export async function updateSettings(newSettings: Partial<SiteSettings>): Promise<SiteSettings> {
  await ensureSettingsFileExists();
  try {
    const currentSettings = await getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    if (typeof updatedSettings.postsPerPage === 'string') {
        updatedSettings.postsPerPage = parseInt(updatedSettings.postsPerPage, 10);
    }
    if (isNaN(updatedSettings.postsPerPage) || updatedSettings.postsPerPage <= 0) {
        updatedSettings.postsPerPage = DEFAULT_SETTINGS.postsPerPage; 
    }

    if (typeof updatedSettings.bannerEnabled === 'string') {
      updatedSettings.bannerEnabled = updatedSettings.bannerEnabled === 'true';
    }

    // Ensure adminUsername and adminPassword are treated as strings
    if (newSettings.hasOwnProperty('adminUsername')) {
        updatedSettings.adminUsername = String(newSettings.adminUsername ?? '').trim();
    }
    if (newSettings.hasOwnProperty('adminPassword')) {
        // Password is intentionally not trimmed to allow spaces if desired
        updatedSettings.adminPassword = String(newSettings.adminPassword ?? '');
    }


    const jsonData = JSON.stringify(updatedSettings, null, 2);
    await fs.writeFile(settingsFilePath, jsonData, 'utf-8');
    return updatedSettings;
  } catch (error) {
    console.error('Error writing settings file:', error);
    throw new Error('Could not save settings.');
  }
}

ensureSettingsFileExists().catch(console.error);

