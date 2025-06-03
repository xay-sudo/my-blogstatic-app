
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
  siteLogoUrl?: string; // Added for site logo
  // Local Admin Auth
  adminUsername?: string;
  adminPassword?: string; // WARNING: Stored in plaintext for local demo only. NOT SECURE.
  // Global Header Scripts
  globalHeaderScriptsEnabled?: boolean;
  globalHeaderScriptsCustomHtml?: string;
  // Global Footer Scripts
  globalFooterScriptsEnabled?: boolean;
  globalFooterScriptsCustomHtml?: string;
  // Banner Ad Settings
  bannerEnabled?: boolean;
  bannerType?: 'image' | 'customHtml';
  bannerImageUrl?: string;
  bannerImageLink?: string;
  bannerImageAltText?: string;
  bannerCustomHtml?: string;
}

export interface Comment {
  id: string;
  postId: string; // To link to the post
  postSlug?: string; // For linking from admin
  postTitle?: string; // For display in admin
  authorName: string;
  authorEmail?: string; // Optional
  content: string;
  date: string; // ISO string
  status: 'pending' | 'approved' | 'rejected';
}
