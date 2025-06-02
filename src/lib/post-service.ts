
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
    // If the file doesn't exist, create it with initial data
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
    // If reading fails (e.g. corrupted JSON), it's safer to return empty or default.
    // For now, return empty and let ensurePostsFileExists handle creation with defaults if needed on next run.
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
    throw new Error('Could not save posts.'); 
  }
}

export const getAllPosts = async (): Promise<Post[]> => {
  const posts = await readPostsFromFile();
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

export const addPost = async (newPostData: Omit<Post, 'id' | 'date'>): Promise<Post> => {
  let posts = await readPostsFromFile();
  const postWithMetadata: Post = {
    ...newPostData,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    viewCount: 0,
  };
  posts.unshift(postWithMetadata); 
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  await writePostsToFile(posts);
  return postWithMetadata;
};

export const updatePost = async (postId: string, updatedPostData: Omit<Post, 'id' | 'date'>): Promise<Post | undefined> => {
  let posts = await readPostsFromFile();
  const postIndex = posts.findIndex(post => post.id === postId);

  if (postIndex === -1) {
    return undefined; 
  }

  const existingPost = posts[postIndex];
  const modifiedPost: Post = {
    ...existingPost, 
    ...updatedPostData, 
  };

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

// Updated initialPostsData to use placehold.co for thumbnails
const initialPostsData: Post[] = [
  {
    "id": "1",
    "slug": "getting-started-with-nextjs",
    "title": "Getting Started with Next.js 14",
    "date": "2024-05-01T10:00:00Z",
    "content": "\n      <p class=\"mb-4\">Next.js is a popular React framework for building server-rendered applications, static websites, and more. Version 14 introduces several exciting features and improvements, particularly around the App Router.</p>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">Installation</h2>\n      <p class=\"mb-4\">To create a new Next.js app, you can use the following command:</p>\n      <pre class=\"bg-muted p-4 rounded-md overflow-x-auto mb-4\"><code class=\"font-code\">npx create-next-app@latest</code></pre>\n      <p class=\"mb-4\">Follow the prompts to configure your project. We recommend choosing TypeScript and Tailwind CSS for a modern development experience.</p>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">App Router</h2>\n      <p class=\"mb-4\">The App Router, introduced in Next.js 13 and refined in 14, provides a new way to structure your application using file-system routing within the <code class=\"font-code bg-muted px-1 rounded\">app</code> directory. It supports layouts, nested routes, loading UI, error handling, and more, out of the box.</p>\n      <p class=\"mb-4\">Key concepts include Server Components, Client Components, and Route Handlers for API endpoints.</p>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">Conclusion</h2>\n      <p>Next.js 14 continues to push the boundaries of web development, offering powerful tools and a great developer experience. Dive in and start building!</p>\n    ",
    "tags": ["Next.js", "JavaScript", "Web Development", "React"],
    "thumbnailUrl": "https://placehold.co/600x400.png?text=NextJS+14", 
    "viewCount": 150
  },
  {
    "id": "2",
    "slug": "mastering-tailwind-css",
    "title": "Mastering Tailwind CSS for Modern UIs",
    "date": "2024-04-22T14:30:00Z",
    "content": "\n      <p class=\"mb-4\">Tailwind CSS is a utility-first CSS framework that provides low-level utility classes to build custom designs without writing any custom CSS.</p>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">Core Concepts</h2>\n      <ul class=\"list-disc pl-5 mb-4 space-y-2\">\n        <li><strong>Utility-First:</strong> Style elements by applying pre-existing classes directly in your HTML.</li>\n        <li><strong>Responsive Design:</strong> Easily build responsive layouts using Tailwind’s screen variant prefixes (e.g., <code class=\"font-code bg-muted px-1 rounded\">md:text-lg</code>).</li>\n        <li><strong>Customization:</strong> Highly customizable via the <code class=\"font-code bg-muted px-1 rounded\">tailwind.config.js</code> file.</li>\n      </ul>\n      <h2 class=\"text-2xl font-headline mt-6 mb-3\">Productivity Boost</h2>\n      <p class=\"mb-4\">Tailwind CSS significantly speeds up UI development by eliminating the need to switch between HTML and CSS files constantly. It also helps maintain consistency across your project.</p>\n      <p class=\"mb-4\">Embrace the utility-first workflow and see your productivity soar!</p>\n    ",
    "tags": ["Tailwind CSS", "CSS", "Frontend", "UI Design"],
    "thumbnailUrl": "https://placehold.co/600x400.png?text=TailwindCSS", 
    "viewCount": 275
  },
  {
    "title": "«And he replaced Jolie with her?» This is what is going on in the relationship between Brad Pitt and Ines",
    "slug": "and-he-replaced-jolie-with-her-this-is-what-is-going-on-in-the-relationship-between-brad-pitt-and-ines",
    "content": "<div class=\"b-r b-r--before-article\"><!-- dreamy-smile.com_above_article --></div>\r\n<p><strong data-start=\"0\" data-end=\"41\" data-is-only-node=\"\">&ldquo;From Brangelina to a new beginning&hellip;&rdquo;</strong> 💔🔥 After years of legal drama and heartbreak, he&rsquo;s finally found peace &mdash; and a new love. But will this relationship go the distance, or is it just a calm after the storm? See their latest photos together and judge for yourself in the article below 👇</p>\r\n<p>They were often called Brangelina, one of Hollywood&rsquo;s most famous couples. They met in 2004 while filming at a time when he was still married to J. Aniston. Their relationship became public in 2005 after the spouses divorced. Together, they had six children &mdash; three adopted and three biological. They got married in 2014 at their estate in France. However, she filed for divorce in 2016, citing irreconcilable differences which wasn&rsquo;t finalized until 2019.</p>\r\n<p><span itemprop=\"image\" itemscope=\"\" itemtype=\"https://schema.org/ImageObject\"><img class=\"alignnone size-full wp-image-335983\" itemprop=\"url image\" src=\"https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/2in1-2021new-2-pic_32ratio_900x600-900x600-61520.jpg\" sizes=\"(max-width: 900px) 100vw, 900px\" srcset=\"https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/2in1-2021new-2-pic_32ratio_900x600-900x600-61520.jpg 900w, https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/2in1-2021new-2-pic_32ratio_900x600-900x600-61520-768x512.jpg 768w\" alt=\"\" width=\"900\" height=\"600\"></span></p>\r\n<div class=\"b-r b-r--after-p\"><!-- dreamy-smile.com_below_article --></div>\r\n<p>Since their split, they have been involved in ongoing legal disputes, particularly over child custody and ownership of their shared French estate. The actor is currently in a relationship with Ines de Ramon, a jewelry executive and certified nutritionist. They began dating in late 2022 after both had gone through separations.</p>\r\n<p>She works as the vice president of Anita Ko Jewelry holding a business degree from the University of Geneva and previously worked at Christie&rsquo;s and De Grisogono.</p>\r\n<div class=\"b-r b-r--after-p\"><!-- dreamy-smile.com_above_article --></div>\r\n<div class=\"b-r b-r--after-p\"><!-- dreamy-smile.com_below_article --></div>\r\n<p><span itemprop=\"image\" itemscope=\"\" itemtype=\"https://schema.org/ImageObject\"><img class=\"alignnone size-full wp-image-335984\" itemprop=\"url image\" src=\"https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/1024-768-ines-de-ramon-brad-pit.jpg\" sizes=\"(max-width: 1024px) 100vw, 1024px\" srcset=\"https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/1024-768-ines-de-ramon-brad-pit.jpg 1024w, https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/1024-768-ines-de-ramon-brad-pit-768x576.jpg 768w\" alt=\"\" width=\"1024\" height=\"768\"></span></p>\r\n<p>The pair made their red carpet debut in 2024 at the Venice International Film Festival, where they attended the premiere of his film Wolfs. Their relationship has grown more serious, with her reportedly moving into his Los Angeles home in 2024. Sources describe their relationship as strong and easygoing, with the actor said to be very happy.</p>\r\n<p><span itemprop=\"image\" itemscope=\"\" itemtype=\"https://schema.org/ImageObject\"><img class=\"alignnone size-full wp-image-335986\" itemprop=\"url image\" src=\"https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/1720446232978130204.jpg\" sizes=\"auto, (max-width: 1240px) 100vw, 1240px\" srcset=\"https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/1720446232978130204.jpg 1240w, https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/1720446232978130204-768x512.jpg 768w\" alt=\"\" width=\"1240\" height=\"827\" loading=\"lazy\"></span></p>\r\n<p>Currently, he is not planning to marry his girlfriend. While their relationship is serious and they are living together, sources say marriage isn&rsquo;t a priority right now. They&rsquo;re focused on enjoying their time together and building their future without rushing.</p>\r\n<p><span itemprop=\"image\" itemscope=\"\" itemtype=\"https://schema.org/ImageObject\"><img class=\"alignnone size-full wp-image-335985\" itemprop=\"url image\" src=\"https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/347252616933088.jpeg\" sizes=\"auto, (max-width: 1600px) 100vw, 1600px\" srcset=\"https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/347252616933088.jpeg 1600w, https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/347252616933088-768x432.jpeg 768w, https://media.starlifemag.com/cute-smile.com/wp-content/uploads/2025/06/347252616933088-1536x864.jpeg 1536w\" alt=\"\" width=\"1600\" height=\"900\" loading=\"lazy\"></span></p>\r\n<p>What can you say?</p>\r\n<div class=\"b-r b-r--after-article\"><!-- dreamy-smile.com_below_article --></div>",
    "tags": [],
    "thumbnailUrl": "https://placehold.co/600x400.png?text=Brad+Ines",
    "id": "7016265b-a66f-42c3-8e06-b064375a2b1b",
    "date": "2025-06-02T10:36:44.280Z",
    "viewCount": 0
  },
  {
    "title": "“I’m Too Pretty to Work”!: Young Woman’s Bold Claim Sparks Online Backlash and Fierce Debate!",
    "slug": "im-too-pretty-to-work-young-womans-bold-claim-sparks-online-backlash-and-fierce-debate",
    "content": "<p>Sarcasm, a subtle and often misunderstood form of humor, can create significant communication barriers, especially across generations. Generation Z, born between 1997 and 2012, frequently uses sarcasm in everyday conversation and social media, which sometimes leaves older audiences confused or offended. This generational gap was recently spotlighted in a viral incident involving TikTok influencer Lucy Welcher, whose attempt at humor sparked a heated debate about work culture and online interpretation.</p><div class=\"code-block code-block-2\" style=\"margin: 8px 0; clear: both;\">\r\n</div>\r\n<p><img class=\"alignnone size-full wp-image-56526\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_77.jpg\" alt=\"\" width=\"355\" height=\"624\"></p><div class=\"code-block code-block-3\" style=\"margin: 8px 0; clear: both;\">\r\n</div>\r\n<p>In November 2022, Welcher posted a short nine-second TikTok video where she jokingly lamented the idea of working a traditional job. While sipping iced coffee, she said, “I do not want to work for the rest of my life. Does it look like I want to get up at 6 a.m. every f\\*\\*king day for the next 60 years? No! I’m too pretty for that!” The clip, originally tagged with&nbsp; #working #scam,” quickly went viral. However, many viewers took her statement at face value, criticizing her as lazy, entitled, and out of touch, prompting her to delete the video shortly afterward.</p><div class=\"code-block code-block-4\" style=\"margin: 8px 0; clear: both;\">\r\n</div>\r\n<p><img loading=\"lazy\" class=\"alignnone size-full wp-image-56527\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_78.jpg\" alt=\"\" width=\"358\" height=\"634\"></p>\r\n<p>Refusing to be silenced by the backlash, Welcher reposted the same video a week later, this time with clearer hashtags like #relatable, #work, and #joke to indicate that the content was meant as satire. The tone of the public reaction shifted dramatically. Where her first post was met with hostility, the repost attracted more supportive and understanding comments. Many viewers began to see her monologue as a tongue-in-cheek critique of exhausting work routines, echoing a sentiment that resonates with many people, especially younger workers disillusioned with traditional career paths.</p>\r\n<p><img loading=\"lazy\" class=\"alignnone size-full wp-image-56528\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_79.jpg\" alt=\"\" width=\"466\" height=\"757\"></p>\r\n<p>Welcher embraced the backlash in true Gen Z fashion—by turning it into content. She released a follow-up video where she rated some of the harshest insults she received, joking about comparisons to Humpty Dumpty and her eyebrows being shaped like a ramp. While she maintained a lighthearted approach, she also revealed a darker reality: the viral attention brought not just jokes, but threats and deeply disturbing messages telling her to harm herself. These extreme reactions reflect a troubling pattern of online discourse, where humor and context are often overlooked in favor of outrage.</p>\r\n<p><img loading=\"lazy\" class=\"alignnone size-full wp-image-56529\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_80.jpg\" alt=\"\" width=\"501\" height=\"752\"></p>\r\n<p>Ultimately, Lucy Welcher’s viral moment reveals the fragile nature of digital communication, especially when humor lacks visual or tonal cues to guide interpretation. Her experience underscores the importance of context in understanding sarcasm and highlights the volatility of internet opinion. By standing by her message and reintroducing it with clearer intent, Welcher not only reclaimed her voice but also opened a broader conversation about burnout, workplace expectations, and how humor can be a powerful way to express generational discontent.</p>\r\n<!-- AI CONTENT END 3 -->\r\n          <!-- .entry-footer -->",
    "tags": [],
    "thumbnailUrl": "https://placehold.co/600x400.png?text=Too+Pretty",
    "id": "5c54a236-83df-46e7-a964-1256290e7ad2",
    "date": "2025-06-02T09:26:51.057Z",
    "viewCount": 1
  },
  {
    "title": "Newborn Twin Sisters Caught “Talking” Just an Hour After Birth!: The Video Is Melting Hearts Everywhere!",
    "slug": "newborn-twin-sisters-caught-talking-just-an-hour-after-birth-the-video-is-melting-hearts-everywhere",
    "content": "<div id=\"model-response-message-contentr_3e1c4d0cc60ac418\" class=\"markdown markdown-main-panel enable-updated-hr-color\" dir=\"ltr\">\r\n<p data-sourcepos=\"1:1-1:538\">Giving birth is a profound and transformative experience that forever changes a parent&rsquo;s life. While the immediate aftermath can be a whirlwind of new emotions and adjustments, sometimes unexpected and heartwarming moments emerge. A delightful video from 2014 captured just such an instance, showing a pair of newborn twin girls who, just one hour after their birth, appeared to be engaged in a babbling &ldquo;conversation,&rdquo; turning their heads to acknowledge each other in an incredibly sweet display that their parents quickly began filming.</p>\r\n<div class=\"code-block code-block-2\" style=\"margin: 8px 0; clear: both;\">&nbsp;</div>\r\n<p data-sourcepos=\"1:1-1:538\"><img class=\"alignnone size-full wp-image-56503\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_53-1.jpg\" sizes=\"(max-width: 1055px) 100vw, 1055px\" srcset=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_53-1.jpg 1055w, https://beaware.fun/wp-content/uploads/2025/05/Screenshot_53-1-768x402.jpg 768w\" alt=\"\" width=\"1055\" height=\"552\"></p>\r\n<div class=\"code-block code-block-3\" style=\"margin: 8px 0; clear: both;\">&nbsp;</div>\r\n<p data-sourcepos=\"3:1-3:651\">The viral thirty-second clip resonated with viewers globally, who were as charmed and surprised as the twins&rsquo; parents. The video quickly swept the internet, drawing a variety of playful interpretations. Some viewers imagined the twins sharing humorous post-birth reflections, such as &ldquo;We finally did it. We escaped&rdquo; or &ldquo;Told you it would work, man,&rdquo; as if the tiny infants were discussing their dramatic arrival into the world. Others pondered the implications for early language development, theorizing that this early babbling might be an initial step in how babies learn to communicate and strengthen the muscles essential for speech later in life.</p>\r\n<div class=\"code-block code-block-4\" style=\"margin: 8px 0; clear: both;\">&nbsp;</div>\r\n<p data-sourcepos=\"3:1-3:651\"><img class=\"alignnone size-full wp-image-56504\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_54.jpg\" sizes=\"(max-width: 1065px) 100vw, 1065px\" srcset=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_54.jpg 1065w, https://beaware.fun/wp-content/uploads/2025/05/Screenshot_54-768x396.jpg 768w\" alt=\"\" width=\"1065\" height=\"549\" loading=\"lazy\"></p>\r\n<p data-sourcepos=\"5:1-5:432\">Regardless of the scientific explanations or humorous interpretations, the undeniable charm of the moment captivated audiences. The footage beautifully highlighted the unique and immediate bond that twins often share, seemingly from the very first moments of their lives outside the womb. This early interaction underscored the special connection between the sisters, presenting an endearing glimpse into their nascent relationship.</p>\r\n<p data-sourcepos=\"5:1-5:432\"><img class=\"alignnone size-full wp-image-56505\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_55-1.jpg\" sizes=\"(max-width: 1036px) 100vw, 1036px\" srcset=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_55-1.jpg 1036w, https://beaware.fun/wp-content/uploads/2025/05/Screenshot_55-1-768x450.jpg 768w\" alt=\"\" width=\"1036\" height=\"607\" loading=\"lazy\"></p>\r\n<p data-sourcepos=\"7:1-7:311\">The video serves as a touching reminder of the extraordinary nature of birth and the unexpected joys that new parents encounter. It captures a fleeting, intimate moment of connection between two newborns, showcasing the innate human tendency towards communication and relationship, even in their earliest hours.</p>\r\n<p data-sourcepos=\"9:1-9:330\">Ultimately, the viral success of the video underscores the universal appeal of such tender and rare moments. It&rsquo;s a testament to the fact that even in the chaotic early hours of parenthood, there are instances of pure, unadulterated sweetness that can captivate hearts and demonstrate the unique and profound bond shared by twins.</p>\r\n</div>\r\n<!-- AI CONTENT END 3 --><!-- .entry-footer -->",
    "tags": [],
    "thumbnailUrl": "https://placehold.co/600x400.png?text=Talking+Twins",
    "id": "15356f6e-b093-404e-8a55-a4d95c46c52f",
    "date": "2025-06-02T08:40:09.197Z",
    "viewCount": 75
  },
  {
    "title": "Mama June Drops 78 lbs and Looks Totally Unrecognizable!: See Her Stunning Transformation!",
    "slug": "mama-june-drops-78-lbs-and-looks-totally-unrecognizable-see-her-stunning-transformation",
    "content": "<div id=\"model-response-message-contentr_caaeb55a01fef706\" class=\"markdown markdown-main-panel enable-updated-hr-color\" dir=\"ltr\">\r\n<p data-sourcepos=\"1:1-1:715\">June Shannon, famously known as Mama June, rose to reality television fame through her daughter Alana &ldquo;Honey Boo Boo&rdquo; Thompson&rsquo;s appearance on &ldquo;Toddlers and Tiaras&rdquo; in 2011. Mama June&rsquo;s early life was challenging, becoming a mother at 14 to Anna Cardwell, followed by three more daughters: Jessica, Lauryn (&ldquo;Pumpkin&rdquo;), and Alana. The family&rsquo;s subsequent spin-off show, &ldquo;Here Comes Honey Boo Boo,&rdquo; further cemented their public presence. Throughout her time in the spotlight, Mama June has faced numerous complex situations and controversies, leading to the abrupt end of various shows, yet fans have continued to follow her journey as a mother and her personal transformations, particularly her weight loss efforts.</p>\r\n<div class=\"code-block code-block-2\" style=\"margin: 8px 0; clear: both;\">&nbsp;</div>\r\n<p data-sourcepos=\"1:1-1:715\"><img class=\"alignnone size-full wp-image-56516\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_57.jpg\" alt=\"\" width=\"610\" height=\"839\"></p>\r\n<div class=\"code-block code-block-3\" style=\"margin: 8px 0; clear: both;\">&nbsp;</div>\r\n<p data-sourcepos=\"1:1-1:715\"><img class=\"alignnone size-full wp-image-56510\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_68.jpg\" alt=\"\" width=\"640\" height=\"496\" loading=\"lazy\"></p>\r\n<div class=\"code-block code-block-4\" style=\"margin: 8px 0; clear: both;\">&nbsp;</div>\r\n<p data-sourcepos=\"3:1-3:729\">Mama June&rsquo;s life has been marked by significant personal struggles, including a public battle with drug addiction. In 2019, she was arrested for possession of crack cocaine and drug paraphernalia alongside her then-boyfriend, Geno Doak, which strained her relationship with her children. After entering rehab in 2020, she began the difficult process of mending her relationships with her daughters and embarking on a path to sobriety. Her renewed commitment to health and family culminated in her marriage to tattoo artist Justin Stroud in March 2022, followed by a more elaborate ceremony in 2023, which notably brought together her entire family for the first time since 2014, marking a significant step towards reconciliation.</p>\r\n<p data-sourcepos=\"3:1-3:729\"><img class=\"alignnone size-full wp-image-56511\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_70.jpg\" alt=\"\" width=\"407\" height=\"530\" loading=\"lazy\"></p>\r\n<p data-sourcepos=\"5:1-5:597\">Beyond her personal life, Mama June has also drawn considerable attention for her physical transformation. Her weight loss journey began as early as 2015 with gastric sleeve surgery. However, maintaining the weight proved challenging, leading her to explore weight loss medications, a decision her daughter Lauryn noted had been &ldquo;a little overboard.&rdquo; Mama June confirmed this, stating that while the weight loss was slower than surgical methods, it felt &ldquo;more safer.&rdquo; By June 2024, she was actively working towards a goal weight of 170 to 180 pounds, aiming to lose approximately 74.2 more pounds.</p>\r\n<p data-sourcepos=\"5:1-5:597\"><img class=\"alignnone size-full wp-image-56512\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_64.jpg\" alt=\"\" width=\"458\" height=\"746\" loading=\"lazy\"></p>\r\n<p data-sourcepos=\"7:1-7:482\">Mama June consistently shares updates on her health and beauty journey with her substantial social media following. Her Instagram often features glam shots and reels, showcasing her transformation, though these posts sometimes attract mixed reactions from users, with some praising her beauty and others speculating about the use of filters and makeup. Despite the criticism, Mama June remains transparent about her efforts, sharing daily workouts and promoting a high-protein diet.</p>\r\n<p data-sourcepos=\"7:1-7:482\"><img class=\"alignnone size-full wp-image-56513\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_67.jpg\" alt=\"\" width=\"470\" height=\"760\" loading=\"lazy\"></p>\r\n<p data-sourcepos=\"7:1-7:482\"><img class=\"alignnone size-full wp-image-56514\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_61-1.jpg\" alt=\"\" width=\"461\" height=\"804\" loading=\"lazy\"></p>\r\n<p data-sourcepos=\"9:1-9:599\">By November 2024, Mama June proudly announced on social media that she had lost 78 pounds, starting from a weight of 285 pounds. This progress has garnered significant support and encouraging comments from her fans, who express pride and admiration for her commitment to a healthier lifestyle. Her husband, Justin Stroud, has also voiced his pride, emphasizing that her journey is about becoming healthy rather than just losing weight. Mama June&rsquo;s ongoing transformation continues to inspire many, showcasing her determination to prioritize her well-being and maintain a more stable, healthier life.</p>\r\n</div>\r\n<!-- AI CONTENT END 3 --><!-- .entry-footer -->",
    "tags": [],
    "thumbnailUrl": "https://placehold.co/600x400.png?text=Mama+June",
    "id": "3d473663-ffee-42b0-8f6b-cb0d3f038930",
    "date": "2025-06-02T08:33:10.332Z",
    "viewCount": 120
  },
  {
    "title": "Beloved Actor’s Bond With Gorilla Leaves the World in Tears!: But Who Is This World-Famous Actor? - Beaware",
    "slug": "beloved-actors-bond-with-gorilla-leaves-the-world-in-tears-but-who-is-this-world-famous-actor-beaware",
    "content": "<div id=\"model-response-message-contentr_13f27013329f8466\" class=\"markdown markdown-main-panel enable-updated-hr-color\" dir=\"ltr\">\r\n<p data-sourcepos=\"1:1-1:625\">Robin Williams, an extraordinary comedian whose passing in 2014 shocked the world, is still remembered for his unique ability to connect with people and bring laughter to any room. Details of his struggles with depression only deepened the public&rsquo;s understanding of his complex nature. Six years after his death, this iconic actor, comedian, and singer remains beloved, especially for his remarkable connection with Koko, a gorilla trained in sign language. A 2014 tribute video captures their initial meeting in 2001, showcasing Williams&rsquo;s profound talent for brightening lives, a talent that led to their special encounter.</p>\r\n<div class=\"code-block code-block-2\" style=\"margin: 8px 0; clear: both;\">\r\n<p>&nbsp;</p>\r\n</div>\r\n<p data-sourcepos=\"1:1-1:625\"><img class=\"alignnone size-full wp-image-56519\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_72.jpg\" alt=\"\" width=\"701\" height=\"550\"></p>\r\n<div class=\"code-block code-block-3\" style=\"margin: 8px 0; clear: both;\">\r\n<p>&nbsp;</p>\r\n</div>\r\n<p data-sourcepos=\"3:1-3:568\">The Gorilla Foundation, concerned about Koko&rsquo;s depression after the loss of her best friend and playmate, Michael, a few months prior, reached out to Robin Williams in hopes of lifting her spirits. Williams, known for his compassionate nature, agreed to meet Koko. Shortly after their encounter, Williams described the experience to <em>Today</em>, stating, &ldquo;We shared something extraordinary: Laughter.&rdquo; He marveled at Koko&rsquo;s ability to understand spoken English and use over 1,000 signs to express her thoughts and feelings, calling the meeting &ldquo;awesome and unforgettable.&rdquo;</p>\r\n<div class=\"code-block code-block-4\" style=\"margin: 8px 0; clear: both;\">\r\n<p>&nbsp;</p>\r\n</div>\r\n<p data-sourcepos=\"3:1-3:568\"><img class=\"alignnone size-full wp-image-56520\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_73.jpg\" alt=\"\" width=\"685\" height=\"539\" loading=\"lazy\"></p>\r\n<p data-sourcepos=\"3:1-3:568\"><img class=\"alignnone size-full wp-image-56521\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_71.jpg\" alt=\"\" width=\"699\" height=\"528\" loading=\"lazy\"></p>\r\n<p data-sourcepos=\"5:1-5:401\">The video of their meeting vividly illustrates the immediate comfort and bond they shared. Koko playfully interacted with Williams, even stealing his glasses to try them on and picking his pocket to examine his wallet. This lighthearted exchange underscored the deep connection formed between the human and the gorilla, showcasing Williams&rsquo;s unique ability to bridge species through humor and empathy.</p>\r\n<p data-sourcepos=\"5:1-5:401\"><img class=\"alignnone size-full wp-image-56523\" src=\"https://beaware.fun/wp-content/uploads/2025/05/Screenshot_76.jpg\" alt=\"\" width=\"747\" height=\"769\" loading=\"lazy\"></p>\r\n<p data-sourcepos=\"7:1-7:475\">Years later, the profound impact of their bond became evident when Koko learned of Williams&rsquo;s death in 2014. According to her caregivers at the Gorilla Foundation, Koko was visibly distressed, looking down and ceasing movement. She then signed &ldquo;cry&rdquo; in American Sign Language, a poignant display of genuine grief and sadness over the comedian&rsquo;s passing. This emotional response further solidified the extraordinary nature of their connection and Williams&rsquo;s lasting influence.</p>\r\n<p data-sourcepos=\"9:1-9:374\">Tragically, Koko herself passed away in 2018 at the respectable age of 46, leaving behind a legacy of interspecies communication and a testament to her unique bond with Robin Williams. Their story continues to be a heartwarming reminder of the power of laughter, empathy, and the deep connections that can form across different species, even in the face of sadness and loss.</p>\r\n</div>\r\n<div class=\"code-block code-block-5\" style=\"margin: 8px 0; clear: both;\">&nbsp;</div>\r\n<!-- AI CONTENT END 3 -->\r\n<div class=\"post-footer clearfix\">&nbsp;</div>\r\n<!-- .entry-footer -->",
    "tags": [],
    "thumbnailUrl": "https://placehold.co/600x400.png?text=Robin+Koko",
    "id": "b7233222-d22a-4a47-9f82-45be1b2e05d2",
    "date": "2025-06-02T08:30:50.872Z",
    "viewCount": 90
  },
  {
    "title": "6-Year-Old ‘Mom’ Sings Like an Angel – Judges Can’t Hold Back Tears!",
    "slug": "6-year-old-mom-sings-like-an-angel-judges-cant-hold-back-tears",
    "content": "<div class=\"code-block code-block-1\" style=\"margin: 8px 0; clear: both;\">\r\n<div id=\"newvideo1.info_responsive_1\"></div>\r\n</div>\r\n<p>When a tiny 6-year-old girl stepped onto the America&rsquo;s Got Talent stage dressed like a little mom &mdash; apron and all &mdash; no one expected what came next. She gripped the mic,</p>\r\n<p>took a deep breath, and began to sing. From the first note, the room fell silent.</p>\r\n<div class=\"code-block code-block-2\" style=\"margin: 8px 0; clear: both;\">\r\n<div id=\"newvideo1.info_responsive_2\"></div>\r\n</div>\r\n<p>Her voice was pure, angelic, and filled with raw emotion that touched every heart in the audience. Judges exchanged looks of disbelief, and by the time she reached the chorus, some were visibly wiping away tears. It wasn&rsquo;t just the song &mdash;</p>\r\n<div class=\"code-block code-block-5\" style=\"margin: 8px 0; clear: both;\">&nbsp;</div>\r\n<p>it was the innocence, the heart, the unexpected power behind such a small frame. The crowd gave her a standing ovation. One judge whispered, &ldquo;She&rsquo;s not just a child&hellip; she&rsquo;s a gift.&rdquo; A performance that no one will ever forget.</p>\r\n<figure class=\"wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio\">\r\n<div class=\"wp-block-embed__wrapper\">&nbsp;</div>\r\n</figure>\r\n<!-- toc empty --><!-- CONTENT END 3 -->",
    "tags": [],
    "thumbnailUrl": "https://placehold.co/600x400.png?text=Singing+Angel",
    "id": "285b13ec-6060-4600-8716-ad4004fa81ae",
    "date": "2025-06-02T08:21:14.779Z",
    "viewCount": 300
  }
];


ensurePostsFileExists(initialPostsData)
  .catch(console.error);
