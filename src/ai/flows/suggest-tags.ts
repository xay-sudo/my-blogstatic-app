
'use server';

/**
 * @fileOverview Suggests relevant tags for a blog post using AI.
 *
 * - suggestTags - A function that suggests tags for a blog post.
 * - SuggestTagsInput - The input type for the suggestTags function.
 * - SuggestTagsOutput - The return type for the suggestTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTagsInputSchema = z.object({
  blogPostContent: z
    .string()
    .describe('The content of the blog post for which tags are suggested.'),
});
export type SuggestTagsInput = z.infer<typeof SuggestTagsInputSchema>;

const SuggestTagsOutputSchema = z.object({
  tags: z
    .array(z.string())
    .describe('An array of suggested tags for the blog post.'),
});
export type SuggestTagsOutput = z.infer<typeof SuggestTagsOutputSchema>;

export async function suggestTags(input: SuggestTagsInput): Promise<SuggestTagsOutput> {
  return suggestTagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTagsPrompt',
  input: {schema: SuggestTagsInputSchema},
  output: {schema: SuggestTagsOutputSchema},
  prompt: `You are an expert in blog post tagging.

  Given the content of a blog post, you will suggest relevant tags that can be used to categorize the post and improve its discoverability.

  The tags should be relevant to the content and should be commonly used in the blogging community.

  Blog Post Content: {{{blogPostContent}}}
  `,
});

const suggestTagsFlow = ai.defineFlow(
  {
    name: 'suggestTagsFlow',
    inputSchema: SuggestTagsInputSchema,
    outputSchema: SuggestTagsOutputSchema,
  },
  async (input): Promise<SuggestTagsOutput> => {
    try {
      const response = await prompt(input); // Get the whole response object

      if (response.output) {
        return response.output; // If structured output exists, return it
      } else {
        // Log a warning if structured output is missing and provide the raw text for debugging
        // Truncate blogPostContent in log to avoid overly long log messages.
        const contentPreview = input.blogPostContent.length > 200
          ? input.blogPostContent.substring(0, 200) + '...'
          : input.blogPostContent;
        
        console.warn(
          `[${new Date().toISOString()}] AI prompt 'suggestTagsPrompt' did not return structured output. ` +
          `Input content preview: "${contentPreview}". Raw text response from LLM: "${response.text ?? '[No text response]'}". ` +
          `Falling back to empty tags array.`
        );
        // Fallback to returning an empty tags array, which conforms to SuggestTagsOutputSchema
        return { tags: [] };
      }
    } catch (error: any) {
      const contentPreview = input.blogPostContent.length > 200
        ? input.blogPostContent.substring(0, 200) + '...'
        : input.blogPostContent;
      console.error(
        `[${new Date().toISOString()}] Error calling 'suggestTagsPrompt' AI model. ` +
        `Input content preview: "${contentPreview}". Error: ${error.message || JSON.stringify(error)}. ` +
        `Falling back to empty tags array.`
      );
      return { tags: [] };
    }
  }
);

