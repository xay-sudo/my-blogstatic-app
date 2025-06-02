export interface Post {
  id: string;
  slug: string;
  title: string;
  date: string; // ISO string format
  content: string;
  tags: string[];
  thumbnailUrl?: string;
}
