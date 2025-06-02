import type { Post } from '@/types';

export const mockPosts: Post[] = [
  {
    id: '1',
    slug: 'getting-started-with-nextjs',
    title: 'Getting Started with Next.js 14',
    date: '2024-05-01T10:00:00Z',
    excerpt: 'A beginner-friendly guide to setting up your first Next.js 14 application with App Router.',
    content: `
      <p class="mb-4">Next.js is a popular React framework for building server-rendered applications, static websites, and more. Version 14 introduces several exciting features and improvements, particularly around the App Router.</p>
      <h2 class="text-2xl font-headline mt-6 mb-3">Installation</h2>
      <p class="mb-4">To create a new Next.js app, you can use the following command:</p>
      <pre class="bg-muted p-4 rounded-md overflow-x-auto mb-4"><code class="font-code">npx create-next-app@latest</code></pre>
      <p class="mb-4">Follow the prompts to configure your project. We recommend choosing TypeScript and Tailwind CSS for a modern development experience.</p>
      <h2 class="text-2xl font-headline mt-6 mb-3">App Router</h2>
      <p class="mb-4">The App Router, introduced in Next.js 13 and refined in 14, provides a new way to structure your application using file-system routing within the <code class="font-code bg-muted px-1 rounded">app</code> directory. It supports layouts, nested routes, loading UI, error handling, and more, out of the box.</p>
      <p class="mb-4">Key concepts include Server Components, Client Components, and Route Handlers for API endpoints.</p>
      <h2 class="text-2xl font-headline mt-6 mb-3">Conclusion</h2>
      <p>Next.js 14 continues to push the boundaries of web development, offering powerful tools and a great developer experience. Dive in and start building!</p>
    `,
    tags: ['Next.js', 'JavaScript', 'Web Development', 'React'],
    imageUrl: 'https://placehold.co/600x400.png',
  },
  {
    id: '2',
    slug: 'mastering-tailwind-css',
    title: 'Mastering Tailwind CSS for Modern UIs',
    date: '2024-04-22T14:30:00Z',
    excerpt: 'Learn how to leverage Tailwind CSS to build beautiful, custom user interfaces rapidly.',
    content: `
      <p class="mb-4">Tailwind CSS is a utility-first CSS framework that provides low-level utility classes to build custom designs without writing any custom CSS.</p>
      <h2 class="text-2xl font-headline mt-6 mb-3">Core Concepts</h2>
      <ul class="list-disc pl-5 mb-4 space-y-2">
        <li><strong>Utility-First:</strong> Style elements by applying pre-existing classes directly in your HTML.</li>
        <li><strong>Responsive Design:</strong> Easily build responsive layouts using Tailwind’s screen variant prefixes (e.g., <code class="font-code bg-muted px-1 rounded">md:text-lg</code>).</li>
        <li><strong>Customization:</strong> Highly customizable via the <code class="font-code bg-muted px-1 rounded">tailwind.config.js</code> file.</li>
      </ul>
      <h2 class="text-2xl font-headline mt-6 mb-3">Productivity Boost</h2>
      <p class="mb-4">Tailwind CSS significantly speeds up UI development by eliminating the need to switch between HTML and CSS files constantly. It also helps maintain consistency across your project.</p>
      <p class="mb-4">Embrace the utility-first workflow and see your productivity soar!</p>
    `,
    tags: ['Tailwind CSS', 'CSS', 'Frontend', 'UI Design'],
    imageUrl: 'https://placehold.co/600x400.png',
  },
  {
    id: '3',
    slug: 'understanding-server-components',
    title: 'Understanding React Server Components',
    date: '2024-04-15T09:15:00Z',
    excerpt: 'A deep dive into React Server Components, their benefits, and how they work with Next.js.',
    content: `
      <p class="mb-4">React Server Components (RSCs) are a new paradigm in React that allows components to run on the server, reducing client-side JavaScript and improving performance.</p>
      <h2 class="text-2xl font-headline mt-6 mb-3">Benefits of RSCs</h2>
      <ul class="list-disc pl-5 mb-4 space-y-2">
        <li><strong>Zero-Bundle Size Components:</strong> Components that run only on the server don't add to your client-side JavaScript bundle.</li>
        <li><strong>Direct Backend Access:</strong> Server Components can directly access server-side resources like databases or file systems.</li>
        <li><strong>Automatic Code Splitting:</strong> Client Components imported by Server Components are automatically code-split.</li>
      </ul>
      <h2 class="text-2xl font-headline mt-6 mb-3">How They Work in Next.js</h2>
      <p class="mb-4">In Next.js, components inside the <code class="font-code bg-muted px-1 rounded">app</code> directory are Server Components by default. You can opt-in to Client Components using the <code class="font-code bg-muted px-1 rounded">"use client"</code> directive.</p>
      <p class="mb-4">This hybrid approach allows you to choose the best rendering strategy for each part of your application.</p>
    `,
    tags: ['React', 'Server Components', 'Next.js', 'Performance'],
    imageUrl: 'https://placehold.co/600x400.png',
  },
  {
    id: '4',
    slug: 'advanced-typescript-patterns',
    title: 'Advanced TypeScript Patterns for Robust Apps',
    date: '2024-03-28T11:00:00Z',
    excerpt: 'Explore advanced TypeScript features like conditional types, mapped types, and template literal types.',
    content: `
      <p class="mb-4">TypeScript's powerful type system can help you build more robust and maintainable applications. Let's explore some advanced patterns.</p>
      <h2 class="text-2xl font-headline mt-6 mb-3">Conditional Types</h2>
      <p class="mb-4">Conditional types allow you to choose types based on conditions. They take the form <code class="font-code bg-muted px-1 rounded">T extends U ? X : Y</code>.</p>
      <h2 class="text-2xl font-headline mt-6 mb-3">Mapped Types</h2>
      <p class="mb-4">Mapped types allow you to create new types by transforming properties of an existing type. For example, making all properties of a type optional or readonly.</p>
      <h2 class="text-2xl font-headline mt-6 mb-3">Template Literal Types</h2>
      <p class="mb-4">Template literal types allow you to create types that represent string patterns, enabling more precise string typing.</p>
      <p>Mastering these patterns will elevate your TypeScript skills and improve your codebase.</p>
    `,
    tags: ['TypeScript', 'Programming', 'Web Development', 'Advanced'],
    imageUrl: 'https://placehold.co/600x400.png',
  },
  {
    id: '5',
    slug: 'ai-in-web-development',
    title: 'The Rise of AI in Web Development',
    date: '2024-03-10T16:45:00Z',
    excerpt: 'How artificial intelligence is transforming web development, from code generation to automated testing.',
    content: `
      <p class="mb-4">Artificial Intelligence (AI) is rapidly changing the landscape of web development. Tools leveraging AI can now assist with various tasks, boosting productivity and enabling new capabilities.</p>
      <h2 class="text-2xl font-headline mt-6 mb-3">AI-Powered Code Generation</h2>
      <p class="mb-4">AI tools like GitHub Copilot and others can suggest code snippets, complete functions, and even generate entire components based on natural language prompts.</p>
      <h2 class="text-2xl font-headline mt-6 mb-3">Automated Testing and QA</h2>
      <p class="mb-4">AI can help in generating test cases, identifying bugs, and performing visual regression testing more efficiently than traditional methods.</p>
      <h2 class="text-2xl font-headline mt-6 mb-3">Personalized User Experiences</h2>
      <p class="mb-4">AI algorithms can analyze user behavior to deliver personalized content, recommendations, and UI adjustments, leading to higher engagement.</p>
      <p>The integration of AI into web development workflows is just beginning, and its impact will continue to grow.</p>
    `,
    tags: ['AI', 'Web Development', 'Technology', 'Future'],
    imageUrl: 'https://placehold.co/600x400.png',
  },
   {
    id: '6',
    slug: 'exploring-the-beauty-of-minimalism',
    title: 'Exploring the Beauty of Minimalism in Design',
    date: '2024-02-18T09:00:00Z',
    excerpt: 'An in-depth look at minimalist design principles and how they can create impactful user experiences.',
    content: `
      <p class="mb-4">Minimalism in design is not just about less; it's about conveying more with less. It focuses on simplicity, clarity, and purpose.</p>
      <h2 class="text-2xl font-headline mt-6 mb-3">Key Principles</h2>
      <ul class="list-disc pl-5 mb-4 space-y-2">
        <li><strong>Whitespace:</strong> Generous use of whitespace (negative space) to give elements breathing room and improve readability.</li>
        <li><strong>Simplicity:</strong> Reducing elements to their essential function, avoiding unnecessary decoration.</li>
        <li><strong>Typography:</strong> Strong emphasis on typography to convey hierarchy and tone.</li>
        <li><strong>Color Palette:</strong> Often monochromatic or limited color palettes to maintain focus.</li>
      </ul>
      <h2 class="text-2xl font-headline mt-6 mb-3">Benefits in Web Design</h2>
      <p class="mb-4">Minimalist web design leads to faster load times, improved usability, and a more focused user journey. It helps users find what they need without distractions.</p>
      <p>Adopting minimalist principles can lead to elegant and effective designs.</p>
    `,
    tags: ['Design', 'Minimalism', 'UI/UX', 'Web Design'],
    imageUrl: 'https://placehold.co/600x400.png',
  },
];

// Function to simulate fetching all posts
export const getAllPosts = async (): Promise<Post[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockPosts;
};

// Function to simulate fetching a single post by slug
export const getPostBySlug = async (slug: string): Promise<Post | undefined> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockPosts.find(post => post.slug === slug);
};
