
import type { Post } from '@/types';
import fs from 'fs/promises';
import path from 'path';
import { ensureDir } from 'fs-extra'; // Using fs-extra for ensureDir

const dataDir = path.join(process.cwd(), 'data');
const postsFilePath = path.join(dataDir, 'posts.json');

// Helper function to ensure the data directory and posts.json file exist
async function ensurePostsFileExists(initialData: Post[] = []): Promise<void> {
  try {
    await ensureDir(dataDir); // Ensure the 'data' directory exists
    await fs.access(postsFilePath); // Check if the file exists
  } catch (error) {
    // If the file doesn't exist, create it with initial data (e.g., empty array or mocks)
    await fs.writeFile(postsFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
    console.log(`Created ${postsFilePath} with initial data.`);
  }
}


async function readPostsFromFile(): Promise<Post[]> {
  await ensurePostsFileExists(); // Ensure file exists before trying to read
  try {
    const jsonData = await fs.readFile(postsFilePath, 'utf-8');
    return JSON.parse(jsonData) as Post[];
  } catch (error) {
    console.error('Error reading posts file:', error);
    // If there's an error reading (e.g., file is corrupted or truly missing despite ensurePostsFileExists), return empty array
    // This could happen if ensurePostsFileExists fails silently or if there's a race condition (less likely with await)
    return [];
  }
}

async function writePostsToFile(posts: Post[]): Promise<void> {
  await ensurePostsFileExists(); // Ensure directory exists before writing
  try {
    const jsonData = JSON.stringify(posts, null, 2);
    await fs.writeFile(postsFilePath, jsonData, 'utf-8');
  } catch (error) {
    console.error('Error writing posts file:', error);
    throw new Error('Could not save posts.'); // Propagate error for server actions to handle
  }
}

export const getAllPosts = async (): Promise<Post[]> => {
  const posts = await readPostsFromFile();
  // Sort posts by date in descending order (newest first)
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getPostBySlug = async (slug: string): Promise<Post | undefined> => {
  const posts = await readPostsFromFile();
  return posts.find(post => post.slug === slug);
};

export const addPost = async (newPostData: Omit<Post, 'id' | 'date'>): Promise<Post> => {
  const posts = await readPostsFromFile();
  const postWithMetadata: Post = {
    ...newPostData,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  };
  posts.unshift(postWithMetadata); // Add to the beginning for newest first
  await writePostsToFile(posts);
  return postWithMetadata;
};

export const deletePostById = async (postId: string): Promise<void> => {
  let posts = await readPostsFromFile();
  posts = posts.filter(post => post.id !== postId);
  await writePostsToFile(posts);
};

// Call ensurePostsFileExists once when the module loads to initialize if needed
// This is more of a dev-time convenience.
// In a serverless environment, this might run on every cold start.
ensurePostsFileExists([
  {
    id: '1',
    slug: 'getting-started-with-nextjs',
    title: 'Getting Started with Next.js 14',
    date: '2024-05-01T10:00:00Z',
    content: "\n      <p class=\"mb-4\">Next.js is a popular React framework for building server-rendered applications, static websites, and more. Version 14 introduces several exciting features and improvements, particularly around the App Router.</p>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">Installation</h2>\n      <p class=\"mb-4\">To create a new Next.js app, you can use the following command:</p>\n      <pre class=\"bg-muted p-4 rounded-md overflow-x-auto mb-4\"><code class=\"font-code\">npx create-next-app@latest</code></pre>\n      <p class=\"mb-4\">Follow the prompts to configure your project. We recommend choosing TypeScript and Tailwind CSS for a modern development experience.</p>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">App Router</h2>\n      <p class=\"mb-4\">The App Router, introduced in Next.js 13 and refined in 14, provides a new way to structure your application using file-system routing within the <code class=\"font-code bg-muted px-1 rounded\">app</code> directory. It supports layouts, nested routes, loading UI, error handling, and more, out of the box.</p>\n      <p class=\"mb-4\">Key concepts include Server Components, Client Components, and Route Handlers for API endpoints.</p>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">Conclusion</h2>\n      <p>Next.js 14 continues to push the boundaries of web development, offering powerful tools and a great developer experience. Dive in and start building!</p>\n    ",
    tags: ['Next.js', 'JavaScript', 'Web Development', 'React'],
    imageUrl: 'https://placehold.co/800x600.png',
    thumbnailUrl: 'https://placehold.co/400x300.png'
  }
]).catch(console.error);
