
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription as ShadcnFormDescription, // Renamed to avoid conflict
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription as ShadcnCardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 as Loader2Icon, Sparkles, AlertCircle, Link2, DownloadCloud, Save, BrainCircuit } from 'lucide-react';
import { createPostAction } from '@/app/actions';
import { suggestTags } from '@/ai/flows/suggest-tags';
import { suggestTitles } from '@/ai/flows/suggest-titles';
import { suggestImageAltText } from '@/ai/flows/suggest-image-alt-text';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription as ShadcnAlertDescription } from '@/components/ui/alert'; // Renamed to avoid conflict
import { Label } from '@/components/ui/label';

const postFormClientSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }).max(255, { message: 'Title must be 255 characters or less.' }),
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters long.' }).max(150, { message: 'Slug must be 150 characters or less.' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens.' }),
  content: z.string().min(50, { message: 'Content must be at least 50 characters long (HTML content).' }),
  tags: z.string().optional(),
});

type PostFormClientValues = z.infer<typeof postFormClientSchema>;

const MAX_THUMBNAIL_SIZE_MB = 5;
const MAX_THUMBNAIL_SIZE_BYTES = MAX_THUMBNAIL_SIZE_MB * 1024 * 1024;

interface ScrapedPostData {
  title?: string;
  content?: string;
  thumbnailUrl?: string;
  thumbnailDataUri?: string;
  error?: string;
  details?: string;
}

async function dataUriToMimeType(dataUri: string): Promise<string> {
  return dataUri.substring(dataUri.indexOf(':') + 1, dataUri.indexOf(';'));
}

async function dataURIToFile(dataURI: string, fileName: string): Promise<File> {
  const mimeType = await dataUriToMimeType(dataURI);
  const response = await fetch(dataURI);
  const blob = await response.blob();
  return new File([blob], fileName, { type: mimeType });
}


export default function NewPostPage() {
  const { toast } = useToast();
  const router = useRouter();
  const editorRef = useRef<any>(null);
  const tinymceApiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY;

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [suggestedAiTags, setSuggestedAiTags] = useState<string[]>([]);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiTagsError, setAiTagsError] = useState<string | null>(null);

  const [suggestedAiTitles, setSuggestedAiTitles] = useState<string[]>([]);
  const [isSuggestingTitles, setIsSuggestingTitles] = useState(false);
  const [aiTitlesError, setAiTitlesError] = useState<string | null>(null);

  const [suggestedAiAltText, setSuggestedAiAltText] = useState<string | null>(null);
  const [isSuggestingAltText, setIsSuggestingAltText] = useState(false);
  const [aiAltTextError, setAiAltTextError] = useState<string | null>(null);

  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingError, setScrapingError] = useState<string | null>(null);

  const [isProcessingScrapedThumbnail, setIsProcessingScrapedThumbnail] = useState(false);


  const form = useForm<PostFormClientValues>({
    resolver: zodResolver(postFormClientSchema),
    defaultValues: {
      title: '',
      slug: '',
      content: '<p>Write your blog post content here...</p>',
      tags: '',
    },
    mode: 'onChange',
  });

  const watchedTitle = form.watch('title');

  useEffect(() => {
    if (watchedTitle && form.formState.dirtyFields.title) {
      const newSlug = watchedTitle
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
      form.setValue('slug', newSlug, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedTitle, form]);

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSuggestedAiAltText(null); // Reset AI alt text when image changes
    setAiAltTextError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
        toast({
          variant: "default",
          title: "Large File Selected",
          description: `The image "${file.name}" is larger than ${MAX_THUMBNAIL_SIZE_MB}MB. Consider optimizing it first. This warning is informational; the file will still be processed if you submit the form.`,
          duration: 7000,
        });
      }

      setThumbnailFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setThumbnailFile(null);
      setThumbnailPreview(null);
       if (e.target) {
            e.target.value = '';
       }
    }
  };

  const autoProcessScrapedThumbnail = async (dataUri: string | undefined, originalUrl?: string) => {
    setSuggestedAiAltText(null); 
    setAiAltTextError(null);
    if (!dataUri) {
      setThumbnailPreview(originalUrl ? `https://placehold.co/200x200.png?text=No+Valid+Img` : `https://placehold.co/200x200.png?text=No+Img+Found`);
      toast({ title: "No Usable Thumbnail", description: "A featured image could not be processed from the URL. You can manually upload one.", duration: 7000 });
      return;
    }

    setIsProcessingScrapedThumbnail(true);
    toast({ title: "Processing Scraped Image...", description: "Attempting to automatically use the found thumbnail." });

    try {
      const fileName = originalUrl ? originalUrl.substring(originalUrl.lastIndexOf('/') + 1) || 'scraped-thumbnail.png' : 'scraped-thumbnail.png';
      const mimeType = dataUri.substring(dataUri.indexOf(':') + 1, dataUri.indexOf(';'));
      let ext = mimeType.split('/')[1] || fileName.split('.').pop() || 'png';
      if (ext.includes('jpeg')) ext = 'jpg';
      const finalFileName = `${fileName.split('.').slice(0, -1).join('.') || 'scraped-thumbnail'}-${Date.now()}.${ext}`;

      const file = await dataURIToFile(dataUri, finalFileName);

      if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
        toast({
          variant: "default",
          title: "Large Scraped Image",
          description: `The scraped image "${file.name}" is larger than ${MAX_THUMBNAIL_SIZE_MB}MB. It has been prepared for upload, but consider optimizing it if possible.`,
          duration: 8000,
        });
      }

      setThumbnailFile(file);
      setThumbnailPreview(dataUri);

      const fileInput = document.getElementById('thumbnail-upload') as HTMLInputElement | null;
      if (fileInput) {
          fileInput.value = '';
      }

      toast({ title: "Scraped Thumbnail Ready", description: "The found thumbnail has been prepared for upload. You can override it by selecting another file." });
    } catch (error: any) {
      console.error("Error auto-processing scraped thumbnail data URI:", error);
      setThumbnailFile(null);
      setThumbnailPreview(`https://placehold.co/200x200.png?text=Process+Failed`);
      toast({ variant: "destructive", title: "Auto Thumbnail Process Failed", description: `Could not automatically use the scraped image data: ${error.message}. Please upload one manually.` });
    } finally {
      setIsProcessingScrapedThumbnail(false);
    }
  };


  const handleSuggestTags = async (contentToUse?: string) => {
    const content = contentToUse || (editorRef.current ? editorRef.current.getContent({format: 'text'}) : form.getValues('content'));
    if (!content || content.trim().length < 50) {
      setAiTagsError('Content is too short (less than 50 characters) to suggest tags effectively.');
      setSuggestedAiTags([]);
      return;
    }
    setIsSuggestingTags(true);
    setAiTagsError(null);
    setSuggestedAiTags([]);
    try {
      const result = await suggestTags({ blogPostContent: content });
      const currentTagsString = form.getValues('tags') || '';
      const currentTagsArray = currentTagsString.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
      const newSuggestions = result.tags.filter(tag => !currentTagsArray.includes(tag.toLowerCase()));

      if (newSuggestions.length > 0) {
        setSuggestedAiTags(Array.from(new Set(newSuggestions)));
        toast({ title: "AI Tags Suggested!", description: "Review the suggestions below."});
      } else if (result.tags.length > 0) {
        toast({ title: "AI Suggestions", description: "All suggested tags are already in your list or no new unique tags found."});
      } else {
        toast({ title: "AI Suggestions", description: "No new tags suggested by AI."});
      }
    } catch (e) {
      console.error('Error suggesting tags:', e);
      setAiTagsError('Failed to suggest tags. Please try again.');
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const addAiTagToForm = (tagToAdd: string) => {
    const currentTagsString = form.getValues('tags') || '';
    const currentTagsArray = currentTagsString.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);

    const tagToAddLower = tagToAdd.toLowerCase();
    if (!currentTagsArray.includes(tagToAddLower)) {
      const newTagsString = currentTagsArray.length > 0 ? currentTagsArray.join(', ') + ', ' + tagToAddLower : tagToAddLower;
      form.setValue('tags', newTagsString, { shouldValidate: true, shouldDirty: true });
      setSuggestedAiTags(prev => prev.filter(t => t.toLowerCase() !== tagToAddLower));
    } else {
      toast({
        title: "Tag exists",
        description: `The tag "${tagToAdd}" is already in your list.`
      })
    }
  };

  const handleSuggestTitles = async () => {
    const content = editorRef.current ? editorRef.current.getContent({format: 'text'}) : form.getValues('content');
    if (!content || content.trim().length < 50) {
      setAiTitlesError('Content is too short (less than 50 characters) to suggest titles effectively.');
      setSuggestedAiTitles([]);
      toast({
        variant: "destructive",
        title: "Content Too Short for Title Suggestion",
        description: "AI title suggestions require at least 50 characters of content.",
      });
      return;
    }
    setIsSuggestingTitles(true);
    setAiTitlesError(null);
    setSuggestedAiTitles([]);
    try {
      const currentTitle = form.getValues('title');
      const result = await suggestTitles({ blogPostContent: content, currentTitle: currentTitle || undefined });
      
      if (result.titles.length > 0) {
        setSuggestedAiTitles(result.titles);
        toast({ title: "AI Titles Suggested!", description: "Click a suggestion to use it."});
      } else {
         toast({ title: "AI Title Suggestions", description: "No new titles suggested by AI for this content."});
      }
    } catch (e) {
      console.error('Error suggesting titles:', e);
      setAiTitlesError('Failed to suggest titles. Please try again.');
      toast({ variant: "destructive", title: "AI Titling Error", description: 'Could not fetch AI title suggestions.' });
    } finally {
      setIsSuggestingTitles(false);
    }
  };

  const applyAiTitle = (title: string) => {
    form.setValue('title', title, { shouldValidate: true, shouldDirty: true });
    setSuggestedAiTitles([]); 
  };

  const handleSuggestAltText = async () => {
    if (!thumbnailPreview) {
      toast({
        variant: "destructive",
        title: "No Thumbnail",
        description: "Please select or scrape a thumbnail image first.",
      });
      return;
    }
    if (!thumbnailPreview.startsWith('data:image')) {
      toast({
        variant: "destructive",
        title: "Invalid Image Data",
        description: "Cannot suggest alt text for non-data URI images. This might happen if the preview is an external URL that hasn't been processed.",
      });
      return;
    }

    setIsSuggestingAltText(true);
    setAiAltTextError(null);
    setSuggestedAiAltText(null);
    try {
      const result = await suggestImageAltText({ imageDataUri: thumbnailPreview });
      if (result.altText) {
        setSuggestedAiAltText(result.altText);
        toast({ title: "AI Alt Text Suggested!", description: "Review the suggestion below." });
      } else {
        toast({ title: "AI Alt Text", description: "AI did not suggest any alt text for this image." });
      }
    } catch (e) {
      console.error('Error suggesting alt text:', e);
      setAiAltTextError('Failed to suggest alt text. Please try again.');
      toast({ variant: "destructive", title: "AI Alt Text Error", description: 'Could not fetch AI alt text suggestion.' });
    } finally {
      setIsSuggestingAltText(false);
    }
  };


  const handleFetchContentFromUrl = async () => {
    if (!scrapeUrl) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a URL to fetch content from." });
      return;
    }
    setIsScraping(true);
    setScrapingError(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setSuggestedAiTags([]);
    setAiTagsError(null);
    setSuggestedAiTitles([]);
    setAiTitlesError(null);
    setSuggestedAiAltText(null);
    setAiAltTextError(null);


    toast({ title: "Fetching Content...", description: "Attempting to scrape content from the URL. This may take a moment." });

    try {
      const apiResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: scrapeUrl }),
      });

      let responseBodyText: string | null = null;
      let isJsonResponse = apiResponse.headers.get('content-type')?.includes('application/json');

      if (!apiResponse.ok) {
        let errorJson;
        let errorDesc = `Server returned status ${apiResponse.status}.`;
        try {
          responseBodyText = await apiResponse.text();
          if (isJsonResponse) {
            errorJson = JSON.parse(responseBodyText);
            const errorMsg = errorJson.error || 'Scraping failed.';
            const details = errorJson.details ? ` Details: ${errorJson.details}` : '';
            errorDesc = `${errorMsg}${details}`;
            if (errorJson.from === 'api-scrape') {
                 errorDesc += ' Please check the server logs for /api/scrape.';
            }
          } else {
             errorDesc += ` Response was not JSON. Preview: ${(responseBodyText || "Could not read response body.").substring(0, 200)}... Check server logs for /api/scrape.`;
          }
        } catch (e) {
          errorDesc += ` Could not parse response. Preview: ${(responseBodyText || "Could not read response body.").substring(0, 200)}... Check server logs for /api/scrape.`;
        }
        setScrapingError(errorDesc);
        toast({ variant: "destructive", title: "Scraping Error", description: errorDesc, duration: 10000 });
        setIsScraping(false);
        return;
      }

      let scrapedData: ScrapedPostData;
      try {
        responseBodyText = await apiResponse.text();
        if (!isJsonResponse) {
          throw new Error("Response was not JSON.");
        }
        scrapedData = JSON.parse(responseBodyText);
      } catch (jsonParseError: any) {
        console.error("Failed to parse JSON response from /api/scrape. Status: " + apiResponse.status + ". Response body:", responseBodyText);
        const errorDesc = `Could not understand the server's response (status ${apiResponse.status}). Expected JSON. Preview: ${(responseBodyText || "Could not read response body.").substring(0, 200)}... Check server logs for /api/scrape.`;
        setScrapingError(errorDesc);
        toast({ variant: "destructive", title: "Scraping Error", description: errorDesc, duration: 10000 });
        setIsScraping(false);
        return;
      }

      if (scrapedData.error) {
        let errorMsg = scrapedData.error;
        const details = scrapedData.details ? ` Details: ${scrapedData.details}` : '';
        if (scrapedData.error === 'internal' || (scrapedData as any).from === 'api-scrape') {
          errorMsg += ' Please check the server logs for /api/scrape.';
        }
        setScrapingError(`${errorMsg}${details}`);
        toast({ variant: "destructive", title: "Scraping Error From API", description: `${errorMsg}${details}`, duration: 8000 });
        setIsScraping(false);
        return;
      }

      let populatedTitle = 'Untitled Post';
      if (scrapedData.title) {
        form.setValue('title', scrapedData.title, { shouldValidate: true, shouldDirty: true });
        populatedTitle = scrapedData.title;
      } else {
        form.setValue('title', `Post from ${new URL(scrapeUrl).hostname}`, { shouldValidate: true, shouldDirty: true });
      }

      if (scrapedData.content) {
        form.setValue('content', scrapedData.content, { shouldValidate: true, shouldDirty: true });
        if (editorRef.current) {
          editorRef.current.setContent(scrapedData.content);
        }
      } else {
        const defaultContent = `<p>Content from ${scrapeUrl} could not be fully extracted. Please review and edit.</p>`;
        form.setValue('content', defaultContent, { shouldValidate: true, shouldDirty: true });
        if (editorRef.current) {
          editorRef.current.setContent(defaultContent);
        }
      }

      toast({ title: `Content Populated: "${populatedTitle}"`, description: "Form fields have been populated. Review and adjust. AI suggestions will follow." });

      await autoProcessScrapedThumbnail(scrapedData.thumbnailDataUri, scrapedData.thumbnailUrl);

      const contentForAiAfterScrape = editorRef.current ? editorRef.current.getContent({ format: 'text' }) : scrapedData.content;
      if (contentForAiAfterScrape && contentForAiAfterScrape.trim().length >= 50) {
        await handleSuggestTags(contentForAiAfterScrape);
        await handleSuggestTitles(); 
        if (thumbnailPreview && thumbnailPreview.startsWith('data:image')) { // Check if thumbnailPreview got set by autoProcess
            await handleSuggestAltText();
        }
      } else if (scrapedData.content) {
        setAiTagsError('Scraped content is too short (less than 50 characters) for effective AI tag suggestions.');
        setSuggestedAiTags([]);
        setAiTitlesError('Scraped content is too short (less than 50 characters) for effective AI title suggestions.');
        setSuggestedAiTitles([]);
        setAiAltTextError('Scraped content might be too short or image not suitable for alt text.');
        setSuggestedAiAltText(null);
      }

    } catch (error: any) {
      console.error("Error calling /api/scrape:", error);
      const fullErrorMessageForState = `Scraping failed: ${error.message || 'Unknown client-side error during fetch'}. Please check your network or try again. If the problem persists, check server logs for /api/scrape.`;
      setScrapingError(fullErrorMessageForState);
      toast({ variant: "destructive", title: "Network or Fetch Error", description: error.message || "An unknown error occurred while trying to fetch content. Check server logs for /api/scrape.", duration: 8000 });
    } finally {
      setIsScraping(false);
    }
  };


  const onSubmit = async (data: PostFormClientValues) => {
    setIsSubmittingForm(true);

    const validationResult = await form.trigger();
    if (!validationResult) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please check the form for errors.",
        });
        setIsSubmittingForm(false);
        return;
    }

    let finalTags = data.tags ? data.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0) : [];

    const contentForAi = editorRef.current ? editorRef.current.getContent({format: 'text'}) : data.content;

    if (contentForAi && contentForAi.trim().length >= 50) {
      try {
        toast({title: "Generating AI Tags...", description: "Please wait while tags are being generated for the content."});
        setIsSuggestingTags(true); 
        const aiResult = await suggestTags({ blogPostContent: contentForAi });
        setIsSuggestingTags(false);
        const newAiTags = aiResult.tags.filter(tag => !finalTags.includes(tag.toLowerCase()));
        if (newAiTags.length > 0) {
          finalTags = [...finalTags, ...newAiTags.map(t => t.toLowerCase())];
           toast({title: "AI Tags Added", description: `${newAiTags.length} new AI tags were automatically added.`});
        } else if (aiResult.tags.length > 0) {
          toast({title: "AI Tags Checked", description: "AI suggestions were already covered by manual tags or no new unique tags found."});
        } else {
           toast({title: "AI Tags", description: "No specific tags suggested by AI for this content."});
        }
      } catch (e) {
        console.error('Error suggesting tags during save:', e);
        toast({variant: "destructive", title: "AI Tagging Failed on Save", description: "Could not generate AI tags automatically. Post will be saved with manual tags only."});
        setIsSuggestingTags(false);
      }
    }

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('slug', data.slug);
    formData.append('content', data.content);
    formData.append('tags', Array.from(new Set(finalTags)).join(', ')); 

    if (thumbnailFile) {
      formData.append('thumbnailFile', thumbnailFile);
    }

    try {
      const result = await createPostAction(formData);
      if (result?.success === false) {
         toast({
          variant: "destructive",
          title: 'Failed to Create Post',
          description: result.message || 'An unknown error occurred on the server.',
        });
        if (result.errors) {
          Object.entries(result.errors).forEach(([fieldName, errors]) => {
             if (Array.isArray(errors) && errors.length > 0) {
                form.setError(fieldName as keyof PostFormClientValues, { type: 'server', message: errors.join(', ') });
             }
          });
        }
      } else {
        toast({
          title: 'Post Created Successfully',
          description: `"${data.title}" has been created.`,
        });
        form.reset();
        setThumbnailPreview(null);
        setThumbnailFile(null);
        setSuggestedAiTags([]); 
        setAiTagsError(null);
        setSuggestedAiTitles([]);
        setAiTitlesError(null);
        setSuggestedAiAltText(null);
        setAiAltTextError(null);
        setScrapeUrl('');
        const thumbnailUploadInput = document.getElementById('thumbnail-upload') as HTMLInputElement;
        if (thumbnailUploadInput) {
          thumbnailUploadInput.value = '';
        }
        if (editorRef.current) {
          editorRef.current.setContent('<p>Write your blog post content here...</p>');
        }
      }
    } catch (error: any) {
       if (typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
      console.error("Error submitting post:", error);
      toast({
        variant: "destructive",
        title: 'Submission Error',
        description: error.message || 'An unexpected error occurred during submission.',
      });
    } finally {
      if (!(typeof (Error as any).digest === 'string' && (Error as any).digest.startsWith('NEXT_REDIRECT'))) {
         setIsSubmittingForm(false);
       }
    }
  };


  const allSuggestionsDisabled = isSubmittingForm || isSuggestingTags || isScraping || isProcessingScrapedThumbnail || isSuggestingTitles || isSuggestingAltText;

  return (
    <Card className="max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Create New Post</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/posts">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Posts
            </Link>
          </Button>
        </div>
        <ShadcnCardDescription>Fill in the details below or import from a URL to publish a new blog post.</ShadcnCardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-8 p-4 border rounded-lg bg-muted/50">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Link2 className="w-5 h-5 mr-2 text-primary" />
            Import Content from URL
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 items-start">
              <div className="flex-grow">
                <Label htmlFor="scrape-url" className="text-sm font-medium">Content URL</Label>
                <Input
                  id="scrape-url"
                  type="url"
                  placeholder="https://example.com/blog-post-to-scrape"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  disabled={isScraping || isSubmittingForm || isProcessingScrapedThumbnail}
                  className="mt-1"
                />
                 <p className="text-xs text-muted-foreground mt-1">
                  Enter a URL to attempt to scrape content. Works best with simple article pages.
                  Many sites have protections that may prevent successful scraping.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleFetchContentFromUrl}
                disabled={isScraping || isSubmittingForm || !scrapeUrl || isProcessingScrapedThumbnail}
                className="w-full sm:w-auto mt-1 sm:mt-[1.875rem]"
              >
                {isScraping ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                   <DownloadCloud className="w-4 h-4 mr-2" />
                    Get Content
                  </>
                )}
              </Button>
            </div>
            {scrapingError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <ShadcnAlertDescription>{scrapingError}</ShadcnAlertDescription>
              </Alert>
            )}

            <div className="space-y-3 text-sm mt-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2">
                <Label className="font-medium w-32 shrink-0">Feature Image:</Label>
                <RadioGroup defaultValue="keep_original" className="flex flex-wrap gap-x-4 gap-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="crop" id="scrape-img-crop" disabled={allSuggestionsDisabled} />
                    <Label htmlFor="scrape-img-crop" className="font-normal">Crop</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flip" id="scrape-img-flip" disabled={allSuggestionsDisabled} />
                    <Label htmlFor="scrape-img-flip" className="font-normal">Flip</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="keep_original" id="scrape-img-keep" disabled={allSuggestionsDisabled} />
                    <Label htmlFor="scrape-img-keep" className="font-normal">Keep Original</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2">
                <Label className="font-medium w-32 shrink-0">White Space:</Label>
                <RadioGroup defaultValue="keep_original" className="flex flex-wrap gap-x-4 gap-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="scrape-ws-yes" disabled={allSuggestionsDisabled} />
                    <Label htmlFor="scrape-ws-yes" className="font-normal">Remove</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="keep_original" id="scrape-ws-keep" disabled={allSuggestionsDisabled} />
                    <Label htmlFor="scrape-ws-keep" className="font-normal">Keep Original</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2">
                <Label className="font-medium w-32 shrink-0">Random Img Order:</Label>
                <RadioGroup defaultValue="keep_original" className="flex flex-wrap gap-x-4 gap-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="scrape-rio-yes" disabled={allSuggestionsDisabled} />
                    <Label htmlFor="scrape-rio-yes" className="font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="keep_original" id="scrape-rio-keep" disabled={allSuggestionsDisabled} />
                    <Label htmlFor="scrape-rio-keep" className="font-normal">Keep Original</Label>
                  </div>
                </RadioGroup>
              </div>
              <Button variant="link" size="sm" className="p-0 h-auto text-primary" disabled={allSuggestionsDisabled}>
                 Set Content Rules (placeholder)
              </Button>
            </div>
          </div>
        </div>
        <Separator className="my-6" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Post Title" {...field} disabled={allSuggestionsDisabled} />
                  </FormControl>
                  <FormMessage />
                   <div className="mt-2 space-y-1">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleSuggestTitles} 
                      disabled={isSuggestingTitles || allSuggestionsDisabled}
                      className="text-xs"
                    >
                      {isSuggestingTitles ? (
                        <>
                          <Loader2Icon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Suggesting Titles...
                        </>
                      ) : (
                        <>
                          <BrainCircuit className="w-3.5 h-3.5 mr-1.5" />
                          Suggest Titles with AI
                        </>
                      )}
                    </Button>
                    {aiTitlesError && (
                      <div className="text-destructive flex items-center text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" /> {aiTitlesError}
                      </div>
                    )}
                    {suggestedAiTitles.length > 0 && (
                      <div className="pt-1">
                        <p className="text-xs font-medium mb-0.5 text-muted-foreground flex items-center">
                          <BrainCircuit className="w-3 h-3 mr-1 text-primary" />
                          AI Title Suggestions (click to use):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {suggestedAiTitles.map((titleSuggestion, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              onClick={() => applyAiTitle(titleSuggestion)}
                              className="cursor-pointer hover:bg-primary/10 text-xs"
                              title={`Use title: ${titleSuggestion}`}
                            >
                              {titleSuggestion}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="your-post-slug" {...field} disabled={allSuggestionsDisabled}/>
                  </FormControl>
                  <ShadcnFormDescription>URL-friendly version of the title (auto-updated).</ShadcnFormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel htmlFor="thumbnail-upload">Thumbnail Image</FormLabel>
              <FormControl>
                <Input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailFileChange}
                  disabled={allSuggestionsDisabled}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </FormControl>
              {thumbnailPreview && (
                <div className="mt-2 space-y-3">
                  <div className="p-2 border rounded-md inline-block relative group">
                    <Image src={thumbnailPreview} alt="Thumbnail preview" width={200} height={200} style={{objectFit:"cover"}} className="rounded" data-ai-hint="thumbnail preview image" />
                    {isProcessingScrapedThumbnail && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                        <Loader2Icon className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSuggestAltText}
                      disabled={isSuggestingAltText || allSuggestionsDisabled || !thumbnailPreview.startsWith('data:image')}
                      className="text-xs"
                    >
                      {isSuggestingAltText ? (
                        <>
                          <Loader2Icon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Suggesting Alt Text...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          Suggest Alt Text for Thumbnail
                        </>
                      )}
                    </Button>
                    {aiAltTextError && (
                      <div className="text-destructive flex items-center text-xs mt-1">
                        <AlertCircle className="w-3 h-3 mr-1" /> {aiAltTextError}
                      </div>
                    )}
                    {suggestedAiAltText && (
                      <div className="mt-2 max-w-md">
                        <Label htmlFor="suggested-alt-text" className="text-xs font-medium text-muted-foreground">AI Suggested Alt Text (copy if needed):</Label>
                        <Input
                          id="suggested-alt-text"
                          type="text"
                          value={suggestedAiAltText}
                          readOnly
                          className="mt-1 text-xs bg-muted/50 h-auto py-1.5"
                          onClick={(e) => e.currentTarget.select()}
                        />
                      </div>
                    )}
                    {!thumbnailPreview.startsWith('data:image') && !isProcessingScrapedThumbnail &&(
                      <p className="text-xs text-muted-foreground mt-1 max-w-md">
                        Alt text suggestion requires the image to be fully processed (available as a Data URI). If this image was scraped, it might still be loading or failed to process. Try uploading directly if issues persist.
                      </p>
                    )}
                  </div>
                </div>
              )}
              <ShadcnFormDescription>
                If content was imported, an attempt was made to use the scraped image.
                You can override it by selecting a different file. Use optimized images (under {MAX_THUMBNAIL_SIZE_MB}MB).
              </ShadcnFormDescription>
            </FormItem>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Editor
                      apiKey={tinymceApiKey || 'no-api-key'}
                      onInit={(_evt, editor) => editorRef.current = editor}
                      initialValue={field.value}
                      value={field.value}
                      onEditorChange={(content, _editor) => {
                        field.onChange(content);
                        form.trigger('content');
                      }}
                      disabled={allSuggestionsDisabled}
                      init={{
                        height: 500,
                        menubar: 'file edit view insert format tools table help',
                        plugins: [
                          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                          'insertdatetime', 'media', 'table', 'help', 'wordcount', 'codesample'
                        ],
                        toolbar: 'undo redo | blocks | ' +
                        'bold italic forecolor backcolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'link image media codesample | removeformat | help',
                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:16px }',
                        skin: (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oxide-dark' : 'oxide'),
                        content_css: (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default'),
                      }}
                    />
                  </FormControl>
                  <ShadcnFormDescription>The main body of your post. Use the rich text editor for formatting.</ShadcnFormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., nextjs, react, webdev"
                      {...field}
                      disabled={allSuggestionsDisabled}
                    />
                  </FormControl>
                  <ShadcnFormDescription>Comma-separated tags. AI will also attempt to add tags on save.</ShadcnFormDescription>
                  <FormMessage />
                  <div className="mt-3 space-y-2">
                     <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSuggestTags()}
                      disabled={isSuggestingTags || allSuggestionsDisabled}
                      className="text-xs"
                    >
                      {isSuggestingTags && !isSubmittingForm ? (
                        <>
                          <Loader2Icon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Suggesting Tags...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          Suggest Tags with AI
                        </>
                      )}
                    </Button>
                    {aiTagsError && (
                      <div className="text-destructive flex items-center text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" /> {aiTagsError}
                      </div>
                    )}
                    {suggestedAiTags.length > 0 && (
                      <div className="pt-1">
                        <p className="text-xs font-medium mb-0.5 text-muted-foreground flex items-center">
                          <Sparkles className="w-3 h-3 mr-1 text-primary" />
                          AI Tag Suggestions (click to add):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {suggestedAiTags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              onClick={() => addAiTagToForm(tag)}
                              className="cursor-pointer hover:bg-primary/20 text-xs"
                              title={`Add tag: ${tag}`}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {suggestedAiTags.length === 0 && !isSuggestingTags && !aiTagsError && form.getValues('content').length < 50 && (
                        <p className="text-xs text-muted-foreground">
                          If you import content or write more, AI tag suggestions will appear here (requires 50+ characters).
                        </p>
                    )}
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={allSuggestionsDisabled}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={form.formState.isSubmitting || allSuggestionsDisabled}>
                {isSubmittingForm || (isSuggestingTags && isSubmittingForm) || (isSuggestingTitles && isSubmittingForm) ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Creating Post...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                     Create Post
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
