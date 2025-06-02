
export interface Post {
  id: string;
  slug: string;
  title: string;
  date: string; // ISO string format
  content: string;
  tags: string[];
  thumbnailUrl?: string;
  viewCount?: number; // Added view count
}

export interface SiteSettings {
  siteTitle: string;
  siteDescription: string;
  postsPerPage: number;
  // Banner settings
  bannerEnabled?: boolean;
  bannerType?: 'image' | 'customHtml';
  bannerImageUrl?: string;
  bannerImageLink?: string;
  bannerImageAltText?: string;
  bannerCustomHtml?: string;
  // Local Admin Auth
  adminUsername?: string;
  adminPassword?: string; // WARNING: Stored in plaintext for local demo only. NOT SECURE.
  // Global Footer Scripts
  globalFooterScriptsEnabled?: boolean;
  globalFooterScriptsCustomHtml?: string;
}

