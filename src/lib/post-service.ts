
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

export const getPostById = async (id: string): Promise<Post | undefined> => {
  const posts = await readPostsFromFile();
  return posts.find(post => post.id === id);
};

// Expects PostServiceValues which includes thumbnailUrl as a local path if provided
export const addPost = async (newPostData: Omit<Post, 'id' | 'date'>): Promise<Post> => {
  let posts = await readPostsFromFile();
  const postWithMetadata: Post = {
    ...newPostData,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    viewCount: 0, // Initialize view count
    // thumbnailUrl is already part of newPostData, will be local path or undefined
  };
  posts.unshift(postWithMetadata); 
  
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  await writePostsToFile(posts);
  return postWithMetadata;
};

// Expects PostServiceValues which includes thumbnailUrl as a local path if provided or existing
export const updatePost = async (postId: string, updatedPostData: Omit<Post, 'id' | 'date'>): Promise<Post | undefined> => {
  let posts = await readPostsFromFile();
  const postIndex = posts.findIndex(post => post.id === postId);

  if (postIndex === -1) {
    return undefined; // Post not found
  }

  const existingPost = posts[postIndex];
  const modifiedPost: Post = {
    ...existingPost, // Preserve original ID, date, and viewCount (unless viewCount is part of updatedPostData)
    ...updatedPostData, // Apply new title, slug, content, tags, and new/existing thumbnailUrl
  };

  // Ensure viewCount is preserved if not explicitly in updatedPostData
  if (updatedPostData.viewCount === undefined && existingPost.viewCount !== undefined) {
    modifiedPost.viewCount = existingPost.viewCount;
  }


  posts[postIndex] = modifiedPost;
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  await writePostsToFile(posts);
  return modifiedPost;
};


export const deletePostById = async (postId: string): Promise<void> => {
  let posts = await readPostsFromFile();
  // File deletion logic is now in the server action
  posts = posts.filter(post => post.id !== postId);
  await writePostsToFile(posts);
};

export const incrementViewCount = async (postId: string): Promise<void> => {
  let posts = await readPostsFromFile();
  const postIndex = posts.findIndex(post => post.id === postId);

  if (postIndex !== -1) {
    posts[postIndex].viewCount = (posts[postIndex].viewCount || 0) + 1;
    await writePostsToFile(posts);
  }
};

// Initialize posts.json with placeholder data if it doesn't exist
// Update placeholder thumbnailUrl to reflect local paths or remove them if not applicable for placeholders
const initialPostsData: Post[] = [
  {
    "id": "1",
    "slug": "getting-started-with-nextjs",
    "title": "Getting Started with Next.js 14",
    "date": "2024-05-01T10:00:00Z",
    "content": "\n      <p class=\"mb-4\">Next.js is a popular React framework for building server-rendered applications, static websites, and more. Version 14 introduces several exciting features and improvements, particularly around the App Router.</p>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">Installation</h2>\n      <p class=\"mb-4\">To create a new Next.js app, you can use the following command:</p>\n      <pre class=\"bg-muted p-4 rounded-md overflow-x-auto mb-4\"><code class=\"font-code\">npx create-next-app@latest</code></pre>\n      <p class=\"mb-4\">Follow the prompts to configure your project. We recommend choosing TypeScript and Tailwind CSS for a modern development experience.</p>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">App Router</h2>\n      <p class=\"mb-4\">The App Router, introduced in Next.js 13 and refined in 14, provides a new way to structure your application using file-system routing within the <code class=\"font-code bg-muted px-1 rounded\">app</code> directory. It supports layouts, nested routes, loading UI, error handling, and more, out of the box.</p>\n      <p class=\"mb-4\">Key concepts include Server Components, Client Components, and Route Handlers for API endpoints.</p>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">Conclusion</h2>\n      <p>Next.js 14 continues to push the boundaries of web development, offering powerful tools and a great developer experience. Dive in and start building!</p>\n    ",
    "tags": ["Next.js", "JavaScript", "Web Development", "React"],
    "thumbnailUrl": "/uploads/thumbnails/placeholder-nextjs.png", // Example local path
    "viewCount": 150 // Added view count
  },
  {
    "id": "2",
    "slug": "mastering-tailwind-css",
    "title": "Mastering Tailwind CSS for Modern UIs",
    "date": "2024-04-22T14:30:00Z",
    "content": "\n      <p class=\"mb-4\">Tailwind CSS is a utility-first CSS framework that provides low-level utility classes to build custom designs without writing any custom CSS.</p>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">Core Concepts</h2>\n      <ul class=\"list-disc pl-5 mb-4 space-y-2\">\n        <li><strong>Utility-First:</strong> Style elements by applying pre-existing classes directly in your HTML.</li>\n        <li><strong>Responsive Design:</strong> Easily build responsive layouts using Tailwind’s screen variant prefixes (e.g., <code class=\"font-code bg-muted px-1 rounded\">md:text-lg</code>).</li>\n        <li><strong>Customization:</strong> Highly customizable via the <code class=\"font-code bg-muted px-1 rounded\">tailwind.config.js</code> file.</li>\n      </ul>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">Productivity Boost</h2>\n      <p class=\"mb-4\">Tailwind CSS significantly speeds up UI development by eliminating the need to switch between HTML and CSS files constantly. It also helps maintain consistency across your project.</p>\n      <p class=\"mb-4\">Embrace the utility-first workflow and see your productivity soar!</p>\n    ",
    "tags": ["Tailwind CSS", "CSS", "Frontend", "UI Design"],
    "thumbnailUrl": "/uploads/thumbnails/placeholder-tailwind.png", // Example local path
    "viewCount": 275 // Added view count
  }
  // Add more initial posts if desired, ensuring thumbnailUrl points to a local path if an image is intended
  // Or leave thumbnailUrl undefined/empty if no default image
];

// Create some dummy placeholder images in public/uploads/thumbnails for the initial data
async function createPlaceholderThumbnails() {
  await ensureDir(path.join(process.cwd(), 'public', 'uploads', 'thumbnails'));
  const placeholderContent = "placeholder"; // Minimal content for dummy files
  try {
    await fs.writeFile(path.join(process.cwd(), 'public', 'uploads', 'thumbnails', 'placeholder-nextjs.png'), placeholderContent);
    await fs.writeFile(path.join(process.cwd(), 'public', 'uploads', 'thumbnails', 'placeholder-tailwind.png'), placeholderContent);
  } catch (e) {
    // console.warn("Could not create placeholder thumbnail files, this is usually fine for init.", e);
  }
}


ensurePostsFileExists(initialPostsData)
  .then(createPlaceholderThumbnails) // Attempt to create placeholders after ensuring posts.json
  .catch(console.error);
    
