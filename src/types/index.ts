export interface Post {
  id: string;
  slug: string;
  title: string;
  date: string; // ISO string format
  excerpt: string;
  content: string;
  tags: string[];
  imageUrl?: string;
}
