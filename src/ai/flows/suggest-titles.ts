
'use server';
/**
 * @fileOverview Suggests alternative titles for a blog post using AI.
 *
 * - suggestTitles - A function that suggests titles for a blog post.
 * - SuggestTitlesInput - The input type for the suggestTitles function.
 * - SuggestTitlesOutput - The return type for the suggestTitles function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTitlesInputSchema = z.object({
  blogPostContent: z
    .string()
    .describe('The content of the blog post for which titles are suggested.'),
  currentTitle: z.string().optional().describe('The current title of the blog post, if available, for context or improvement.'),
});
export type SuggestTitlesInput = z.infer<typeof SuggestTitlesInputSchema>;

const SuggestTitlesOutputSchema = z.object({
  titles: z
    .array(z.string())
    .describe('An array of 3-5 suggested alternative titles for the blog post. The titles should be engaging and relevant to the content.'),
});
export type SuggestTitlesOutput = z.infer<typeof SuggestTitlesOutputSchema>;

export async function suggestTitles(input: SuggestTitlesInput): Promise<SuggestTitlesOutput> {
  return suggestTitlesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTitlesPrompt',
  input: {schema: SuggestTitlesInputSchema},
  output: {schema: SuggestTitlesOutputSchema},
  prompt: `You are an expert blog title writer.
Given the content of a blog post{{#if currentTitle}} and its current title "{{currentTitle}}"{{/if}}, suggest 3 to 5 alternative, engaging, and SEO-friendly titles.
The titles should accurately reflect the main topic of the post and entice readers to click.
Ensure the suggested titles are distinct from each other and are relatively concise.

Blog Post Content:
{{{blogPostContent}}}
`,
});

const suggestTitlesFlow = ai.defineFlow(
  {
    name: 'suggestTitlesFlow',
    inputSchema: SuggestTitlesInputSchema,
    outputSchema: SuggestTitlesOutputSchema,
  },
  async (input): Promise<SuggestTitlesOutput> => {
    try {
      const response = await prompt(input);
      if (response.output) {
        return response.output;
      } else {
        const contentPreview = input.blogPostContent.length > 200
          ? input.blogPostContent.substring(0, 200) + '...'
          : input.blogPostContent;
        console.warn(
          `[${new Date().toISOString()}] AI prompt 'suggestTitlesPrompt' did not return structured output. ` +
          `Input content preview: "${contentPreview}". Raw text response from LLM: "${response.text ?? '[No text response]'}". ` +
          `Falling back to empty titles array.`
        );
        return { titles: [] };
      }
    } catch (error: any) {
      const contentPreview = input.blogPostContent.length > 200
        ? input.blogPostContent.substring(0, 200) + '...'
        : input.blogPostContent;
      console.error(
        `[${new Date().toISOString()}] Error calling 'suggestTitlesPrompt' AI model. ` +
        `Input content preview: "${contentPreview}". Error: ${error.message || JSON.stringify(error)}. ` +
        `Falling back to empty titles array.`
      );
      return { titles: [] };
    }
  }
);
