
'use server';
/**
 * @fileOverview Suggests related articles based on the current article's content and title.
 *
 * - suggestRelatedArticles - A function that suggests related articles.
 * - SuggestRelatedArticlesInput - The input type.
 * - SuggestRelatedArticlesOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AvailablePostSchema = z.object({
  id: z.string().describe('The unique ID of the available post.'),
  title: z.string().describe('The title of the available post.'),
});

const SuggestRelatedArticlesInputSchema = z.object({
  currentPostId: z.string().describe('The ID of the current post, to exclude it from suggestions.'),
  currentPostTitle: z.string().describe("The title of the current post."),
  currentPostContentExcerpt: z.string().describe("An excerpt of the current post's content (e.g., first 200-300 words)."),
  availablePosts: z.array(AvailablePostSchema).describe('A list of all other available posts with their IDs and titles.'),
  count: z.number().optional().default(8).describe('The maximum number of related articles to suggest.'),
});
export type SuggestRelatedArticlesInput = z.infer<typeof SuggestRelatedArticlesInputSchema>;

const SuggestRelatedArticlesOutputSchema = z.object({
  relatedPostIds: z.array(z.string()).describe('An array of post IDs that are most relevant to the current article, up to the specified count.'),
});
export type SuggestRelatedArticlesOutput = z.infer<typeof SuggestRelatedArticlesOutputSchema>;

export async function suggestRelatedArticles(input: SuggestRelatedArticlesInput): Promise<SuggestRelatedArticlesOutput> {
  return suggestRelatedArticlesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRelatedArticlesPrompt',
  input: {schema: SuggestRelatedArticlesInputSchema},
  output: {schema: SuggestRelatedArticlesOutputSchema},
  prompt: `You are a sophisticated content recommendation engine for a blog.
Your task is to suggest up to {{{count}}} related articles based on the currently viewed article.
Analyze the current article's title and content excerpt to understand its main themes and topics.
Then, from the list of other available articles, select those that are most semantically similar, thematically related, or would likely be of interest to someone who read the current article.
Do not suggest the current article itself.

Current Article Details:
Title: "{{currentPostTitle}}"
Content Excerpt:
{{{currentPostContentExcerpt}}}

List of Other Available Articles (ID and Title):
{{#if availablePosts.length}}
  {{#each availablePosts}}
- ID: {{this.id}}, Title: "{{this.title}}"
  {{/each}}
{{else}}
There are no other articles available to suggest.
{{/if}}

Based on this, provide a list of IDs for the most relevant articles.
Prioritize strong thematic connections and semantic relevance over simple keyword overlap.
Return up to {{{count}}} post IDs. If no articles are suitably relevant, you can return an empty list.
`,
});

const suggestRelatedArticlesFlow = ai.defineFlow(
  {
    name: 'suggestRelatedArticlesFlow',
    inputSchema: SuggestRelatedArticlesInputSchema,
    outputSchema: SuggestRelatedArticlesOutputSchema,
  },
  async (input): Promise<SuggestRelatedArticlesOutput> => {
    try {
      const {output} = await prompt(input);
      if (output) {
        // Ensure the current post ID is not in the suggestions, just in case AI includes it.
        const filteredOutput = output.relatedPostIds.filter(id => id !== input.currentPostId);
        return { relatedPostIds: filteredOutput.slice(0, input.count) };
      } else {
        console.warn(
          `[${new Date().toISOString()}] AI prompt 'suggestRelatedArticlesPrompt' did not return structured output. Falling back to empty suggestions.`
        );
        return { relatedPostIds: [] };
      }
    } catch (error: any) {
      console.error(
        `[${new Date().toISOString()}] Error calling 'suggestRelatedArticlesPrompt' AI model. Error: ${error.message || JSON.stringify(error)}. Falling back to empty suggestions.`
      );
      return { relatedPostIds: [] };
    }
  }
);
