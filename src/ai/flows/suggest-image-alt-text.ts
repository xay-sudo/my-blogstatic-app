
'use server';
/**
 * @fileOverview Suggests alt text for an image using AI.
 *
 * - suggestImageAltText - A function that suggests alt text.
 * - SuggestImageAltTextInput - The input type.
 * - SuggestImageAltTextOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestImageAltTextInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SuggestImageAltTextInput = z.infer<typeof SuggestImageAltTextInputSchema>;

const SuggestImageAltTextOutputSchema = z.object({
  altText: z.string().describe('A concise and descriptive alt text for the image, suitable for accessibility and SEO. Aim for under 125 characters if possible, describing the main subject and context.'),
});
export type SuggestImageAltTextOutput = z.infer<typeof SuggestImageAltTextOutputSchema>;

export async function suggestImageAltText(input: SuggestImageAltTextInput): Promise<SuggestImageAltTextOutput> {
  return suggestImageAltTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestImageAltTextPrompt',
  input: {schema: SuggestImageAltTextInputSchema},
  output: {schema: SuggestImageAltTextOutputSchema},
  prompt: `Analyze the following image and generate a concise and descriptive alt text.
This alt text will be used for web accessibility (e.g., for screen readers) and SEO.
Focus on describing the main subject, any important actions, and the overall context of the image.
If there is significant text within the image that is central to its meaning, try to include it.
Aim for the alt text to be informative and ideally under 125 characters. Avoid starting with "Image of..." or "Picture of...".

Image:
{{media url=imageDataUri}}
`,
});

const suggestImageAltTextFlow = ai.defineFlow(
  {
    name: 'suggestImageAltTextFlow',
    inputSchema: SuggestImageAltTextInputSchema,
    outputSchema: SuggestImageAltTextOutputSchema,
  },
  async (input): Promise<SuggestImageAltTextOutput> => {
    try {
      // The default model configured in ai/genkit.ts (gemini-2.0-flash) supports multimodal input.
      // The {{media url=imageDataUri}} syntax in the prompt will pass the image data.
      const {output} = await prompt(input);

      if (output) {
        return output;
      } else {
        console.warn(
          `[${new Date().toISOString()}] AI prompt 'suggestImageAltTextPrompt' did not return structured output for the provided image. Input might be a very small or abstract image. Falling back to empty alt text.`
        );
        return { altText: '' };
      }
    } catch (error: any) {
      console.error(
        `[${new Date().toISOString()}] Error calling 'suggestImageAltTextPrompt' AI model. Error: ${error.message || JSON.stringify(error)}. Falling back to empty alt text.`
      );
      return { altText: '' };
    }
  }
);
