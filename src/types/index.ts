
export interface Post {
  id: string;
  slug: string;
  title: string;
  date: string; // ISO string format
  content: string;
  tags: string[];
  thumbnailUrl?: string;
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
}
