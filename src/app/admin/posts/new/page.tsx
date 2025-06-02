
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 as Loader2Icon, Sparkles, AlertCircle, Link2, DownloadCloud } from 'lucide-react';
import { createPostAction } from '@/app/actions';
import { suggestTags } from '@/ai/flows/suggest-tags';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert'; 
import { Label } from '@/components/ui/label'; 


// Client-side schema for immediate validation of text fields
const postFormClientSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }).max(100, { message: 'Title must be 100 characters or less.' }),
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters long.' }).max(100, { message: 'Slug must be 100 characters or less.' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens.' }),
  content: z.string().min(50, { message: 'Content must be at least 50 characters long (HTML content).' }),
  tags: z.string().optional(),
});

type PostFormClientValues = z.infer<typeof postFormClientSchema>;

const MAX_THUMBNAIL_SIZE_MB = 5;
const MAX_THUMBNAIL_SIZE_BYTES = MAX_THUMBNAIL_SIZE_MB * 1024 * 1024;

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

  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingError, setScrapingError] = useState<string | null>(null);


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
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
        toast({
          variant: "default", 
          title: "Large File Selected",
          description: `The image "${file.name}" is larger than ${MAX_THUMBNAIL_SIZE_MB}MB. Consider optimizing it first.`,
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

  const handleSuggestTags = async () => {
    const content = editorRef.current ? editorRef.current.getContent() : form.getValues('content');
    if (!content || content.trim().length < 50) {
      setAiTagsError('Please write more content (at least 50 characters) before suggesting tags.');
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
      setSuggestedAiTags(Array.from(new Set(newSuggestions)));
      if (newSuggestions.length === 0 && result.tags.length > 0) {
        toast({ title: "AI Suggestions", description: "All suggested tags are already in your list or no new unique tags found."});
      } else if (newSuggestions.length === 0) {
        toast({ title: "AI Suggestions", description: "No new tags suggested."});
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

  const handleFetchContentFromUrl = async () => {
    if (!scrapeUrl) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a URL to fetch content from." });
      return;
    }
    setIsScraping(true);
    setScrapingError(null);
  
    // --- Placeholder for Firebase Cloud Function Call ---
    // In a real implementation, you would call your Firebase Cloud Function here.
    // This requires setting up Firebase SDK for functions if not already done.
    // Example:
    // try {
    //   // Ensure you have Firebase initialized and functions imported:
    //   // import { getFunctions, httpsCallable } from 'firebase/functions';
    //   // import { app } from '@/lib/firebase-config'; // Your Firebase app instance
    //   // const functions = getFunctions(app);
    //   // const scrapePostFunction = httpsCallable(functions, 'yourScrapeFunctionName'); // Replace 'yourScrapeFunctionName'
    //   
    //   // const result = await scrapePostFunction({ url: scrapeUrl });
    //   // const scrapedData = result.data as { title?: string; content?: string; slug?: string; thumbnailUrl?: string /* and other fields */ };
    //   
    //   // if (scrapedData.title) form.setValue('title', scrapedData.title);
    //   // if (scrapedData.content) {
    //   //   form.setValue('content', scrapedData.content);
    //   //   if (editorRef.current) editorRef.current.setContent(scrapedData.content);
    //   // }
    //   // if (scrapedData.slug) form.setValue('slug', scrapedData.slug);
    //   // else if (scrapedData.title) { /* auto-generate slug from title if no slug provided */ }
    //   
    //   // if (scrapedData.thumbnailUrl) {
    //   //    setThumbnailPreview(scrapedData.thumbnailUrl); 
    //   //    // To actually use it as the uploaded file for local storage, you'd need to fetch it as a blob,
    //   //    // then create a File object and setThumbnailFile. This is an advanced step.
    //   //    // For Firebase Storage, you might just store this URL.
    //   //    toast({ title: "Thumbnail Info", description: "A thumbnail URL was found. Review and select manually if needed."});
    //   // }
    //   
    //   // toast({ title: "Content Fetched", description: "Form fields populated. Please review." });
    // } catch (error: any) {
    //   // console.error("Error scraping content:", error);
    //   // setScrapingError(error.message || "Failed to scrape content from URL.");
    //   // toast({ variant: "destructive", title: "Scraping Error", description: error.message || "Could not fetch content." });
    // } finally {
    //   // setIsScraping(false);
    // }
    // --- End Placeholder ---
  
    // Simulated delay and response for UI demonstration:
    toast({ title: "Fetching Content (Simulated)", description: "This is a simulation. Implement your Cloud Function call." });
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let host;
    try {
      host = new URL(scrapeUrl).hostname;
    } catch (e) {
      host = "source";
    }

    const simulatedScrapedData = {
      title: `Simulated Title from ${host}`,
      content: `<p>This is <strong>simulated content</strong> scraped from the URL: ${scrapeUrl}.</p><p>It includes some basic HTML structure like paragraphs, lists, and maybe an image if your actual scraper finds one.</p><h2>A Subheading</h2><p>More details would appear here, parsed from the article body of the source page.</p><ul><li>List item 1</li><li>List item 2</li></ul><p><em>Remember to replace this simulation with a real call to your Firebase Cloud Function that performs the actual scraping.</em></p>`,
      thumbnailUrl: `https://placehold.co/600x400.png?text=Scraped+Image+from+${host}`, // Simulate a found thumbnail
    };
  
    form.setValue('title', simulatedScrapedData.title, { shouldValidate: true, shouldDirty: true });
    // The watchedTitle useEffect should auto-update the slug.
    form.setValue('content', simulatedScrapedData.content, { shouldValidate: true, shouldDirty: true });
    if (editorRef.current) {
      editorRef.current.setContent(simulatedScrapedData.content);
    }
    
    // Simulate setting the thumbnail preview from the scraped data
    if (simulatedScrapedData.thumbnailUrl) {
        setThumbnailPreview(simulatedScrapedData.thumbnailUrl);
        // Note: This only sets the preview. For the image to be saved with the post,
        // your actual implementation would need to:
        // 1. If storing locally: Fetch this scraped thumbnailUrl as a Blob, create a File object, and set `thumbnailFile`.
        // 2. Or, if your backend Cloud Function already uploaded it to Firebase/local storage and returned a usable path/URL,
        //    you might store that path directly.
        // For now, user still needs to manually select a file if they want this previewed image to be uploaded.
    }

    toast({ title: "Content Populated (Simulated)", description: "Form fields have been filled with simulated data. Please review and adjust as needed." });
    setIsScraping(false);
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
    
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('slug', data.slug);
    formData.append('content', data.content);
    formData.append('tags', data.tags || '');

    if (thumbnailFile) {
      formData.append('thumbnailFile', thumbnailFile);
    }
    // If thumbnailPreview is set from scraping but thumbnailFile is null,
    // the server action needs to be aware that it might need to fetch the previewed URL
    // or the user has to manually select a file. Current action expects `thumbnailFile`.


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
        setScrapeUrl(''); 
        const thumbnailUploadInput = document.getElementById('thumbnail-upload') as HTMLInputElement;
        if (thumbnailUploadInput) {
          thumbnailUploadInput.value = '';
        }
        if (editorRef.current) {
          editorRef.current.setContent('<p>Write your blog post content here...</p>');
        }
        router.push('/admin/posts'); 
      }
    } catch (error) {
      console.error("Error submitting post:", error);
      toast({
        variant: "destructive",
        title: 'Submission Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred during submission.',
      });
    } finally {
      setIsSubmittingForm(false);
    }
  };


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
        <CardDescription>Fill in the details below or import from a URL to publish a new blog post.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Scrape from URL Section */}
        <div className="mb-8 p-4 border rounded-lg bg-muted/50">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Link2 className="w-5 h-5 mr-2 text-primary" />
            Import Content from URL
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-grow">
                <Label htmlFor="scrape-url" className="text-sm font-medium">Content URL</Label>
                <Input
                  id="scrape-url"
                  type="url"
                  placeholder="https://example.com/blog-post-to-scrape"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  disabled={isScraping || isSubmittingForm}
                  className="mt-1"
                />
              </div>
              <Button 
                type="button" 
                onClick={handleFetchContentFromUrl} 
                disabled={isScraping || isSubmittingForm || !scrapeUrl}
                className="w-full sm:w-auto"
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
                <AlertDescription>{scrapingError}</AlertDescription>
              </Alert>
            )}

            {/* Placeholder scraping options */}
            <div className="space-y-3 text-sm mt-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2">
                <Label className="font-medium w-32 shrink-0">Feature Image:</Label>
                <RadioGroup defaultValue="keep_original" className="flex flex-wrap gap-x-4 gap-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="crop" id="scrape-img-crop" disabled={isScraping || isSubmittingForm} />
                    <Label htmlFor="scrape-img-crop" className="font-normal">Crop</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flip" id="scrape-img-flip" disabled={isScraping || isSubmittingForm} />
                    <Label htmlFor="scrape-img-flip" className="font-normal">Flip</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="keep_original" id="scrape-img-keep" disabled={isScraping || isSubmittingForm} />
                    <Label htmlFor="scrape-img-keep" className="font-normal">Keep Original</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2">
                <Label className="font-medium w-32 shrink-0">White Space:</Label>
                <RadioGroup defaultValue="keep_original" className="flex flex-wrap gap-x-4 gap-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="scrape-ws-yes" disabled={isScraping || isSubmittingForm} />
                    <Label htmlFor="scrape-ws-yes" className="font-normal">Remove</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="keep_original" id="scrape-ws-keep" disabled={isScraping || isSubmittingForm} />
                    <Label htmlFor="scrape-ws-keep" className="font-normal">Keep Original</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2">
                <Label className="font-medium w-32 shrink-0">Random Img Order:</Label>
                <RadioGroup defaultValue="keep_original" className="flex flex-wrap gap-x-4 gap-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="scrape-rio-yes" disabled={isScraping || isSubmittingForm} />
                    <Label htmlFor="scrape-rio-yes" className="font-normal">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="keep_original" id="scrape-rio-keep" disabled={isScraping || isSubmittingForm} />
                    <Label htmlFor="scrape-rio-keep" className="font-normal">Keep Original</Label>
                  </div>
                </RadioGroup>
              </div>
              <Button variant="link" size="sm" className="p-0 h-auto text-primary" disabled={isScraping || isSubmittingForm}>
                 Set Content Rules (placeholder)
              </Button>
            </div>
          </div>
        </div>
        <Separator className="my-6" />

        {/* Existing Post Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Post Title" {...field} disabled={isSubmittingForm || isSuggestingTags || isScraping} />
                  </FormControl>
                  <FormMessage />
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
                    <Input placeholder="your-post-slug" {...field} disabled={isSubmittingForm || isSuggestingTags || isScraping}/>
                  </FormControl>
                  <FormDescription>URL-friendly version of the title (auto-updated).</FormDescription>
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
                  disabled={isSubmittingForm || isSuggestingTags || isScraping}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </FormControl>
              {thumbnailPreview && (
                <div className="mt-2 p-2 border rounded-md inline-block">
                  <Image src={thumbnailPreview} alt="Thumbnail preview" width={128} height={128} style={{objectFit:"cover"}} className="rounded" data-ai-hint="thumbnail preview" />
                </div>
              )}
              <FormDescription>
                Select an image. It will be uploaded with the post. For faster uploads and better performance, use optimized images (e.g., under {MAX_THUMBNAIL_SIZE_MB}MB). If importing from URL, you may need to save and re-upload the suggested image if you wish to use it.
              </FormDescription>
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
                      onEditorChange={(content, _editor) => {
                        field.onChange(content);
                        form.trigger('content');
                      }}
                      disabled={isSubmittingForm || isSuggestingTags || isScraping}
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
                  <FormDescription>The main body of your post. Use the rich text editor for formatting.</FormDescription>
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
                      disabled={isSubmittingForm || isSuggestingTags || isScraping}
                    />
                  </FormControl>
                  <FormDescription>Comma-separated tags. e.g., tech, news, updates</FormDescription>
                  <FormMessage />
                  <div className="mt-3 space-y-2">
                    <Button 
                      type="button" 
                      onClick={handleSuggestTags} 
                      disabled={isSuggestingTags || isSubmittingForm || !form.getValues('content') || form.getValues('content').length < 50 || isScraping}
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                    >
                      {isSuggestingTags ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Suggesting Tags...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 text-primary" />
                          Suggest Tags with AI
                        </>
                      )}
                    </Button>

                    {aiTagsError && (
                      <div className="text-destructive flex items-center text-sm">
                        <AlertCircle className="w-4 h-4 mr-2" /> {aiTagsError}
                      </div>
                    )}

                    {suggestedAiTags.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1 text-muted-foreground">Click to add:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestedAiTags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              onClick={() => addAiTagToForm(tag)}
                              className="cursor-pointer hover:bg-primary/20 text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {suggestedAiTags.length === 0 && !isSuggestingTags && !aiTagsError && (
                        <p className="text-xs text-muted-foreground">
                          Write some content (at least 50 characters) and click the button above to get tag suggestions.
                        </p>
                      )}
                  </div>
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmittingForm || isSuggestingTags || isScraping}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={form.formState.isSubmitting || isSubmittingForm || isSuggestingTags || isScraping}>
                {isSubmittingForm ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Creating Post...
                  </>
                ) : 'Create Post'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

