
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
// Progress component might not be needed if not doing live client-side upload progress to Firebase
// import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 as Loader2Icon, Sparkles, AlertCircle } from 'lucide-react';
// Firebase storage imports are no longer needed here
// import { storage } from '@/lib/firebase-config';
// import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
// import { useAuth } from '@/contexts/AuthContext'; // Only needed if you restrict by user for local uploads, not for now
import { createPostAction } from '@/app/actions';
import type { Post } from '@/types'; // Keep for Post type if needed elsewhere, but payload to action changes
import { suggestTags } from '@/ai/flows/suggest-tags';
import { Badge } from '@/components/ui/badge';

// Client-side schema for immediate validation of text fields
const postFormClientSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }).max(100, { message: 'Title must be 100 characters or less.' }),
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters long.' }).max(100, { message: 'Slug must be 100 characters or less.' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens.' }),
  content: z.string().min(50, { message: 'Content must be at least 50 characters long (HTML content).' }),
  tags: z.string().optional(), // Tags are sent as a comma-separated string
  // thumbnailUrl is handled by file upload, not a direct form field string for URL
});

type PostFormClientValues = z.infer<typeof postFormClientSchema>;

const MAX_THUMBNAIL_SIZE_MB = 5; // Max size for client-side warning
const MAX_THUMBNAIL_SIZE_BYTES = MAX_THUMBNAIL_SIZE_MB * 1024 * 1024;

export default function NewPostPage() {
  const { toast } = useToast();
  const router = useRouter();
  // const { user } = useAuth(); // Not directly used for local file saving path here
  const editorRef = useRef<any>(null);
  const tinymceApiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY;

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  // const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({}); // Firebase specific
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  // const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false); // Firebase specific

  const [suggestedAiTags, setSuggestedAiTags] = useState<string[]>([]);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiTagsError, setAiTagsError] = useState<string | null>(null);


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
      // No auto-upload here for local storage, file is sent with form
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
    formData.append('tags', data.tags || ''); // Send as comma-separated string

    if (thumbnailFile) {
      formData.append('thumbnailFile', thumbnailFile);
    }

    try {
      // @ts-ignore createPostAction expects FormData, but TS might not infer it well here
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
        // setUploadProgress({}); // Not needed for local
        setSuggestedAiTags([]);
        setAiTagsError(null);
        const thumbnailUploadInput = document.getElementById('thumbnail-upload') as HTMLInputElement;
        if (thumbnailUploadInput) {
          thumbnailUploadInput.value = '';
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
        <CardDescription>Fill in the details below to publish a new blog post.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Post Title" {...field} disabled={isSubmittingForm || isSuggestingTags} />
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
                    <Input placeholder="your-post-slug" {...field} disabled={isSubmittingForm || isSuggestingTags}/>
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
                  disabled={isSubmittingForm || isSuggestingTags}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </FormControl>
              {/* Remove Firebase specific upload indicators
              {isUploadingThumbnail && (
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  <span>Uploading thumbnail...</span>
                </div>
              )}
              {uploadProgress['thumbnail'] > 0 && (
                <Progress value={uploadProgress['thumbnail']} className="w-full mt-2 h-2" />
              )}
              */}
              {thumbnailPreview && (
                <div className="mt-2 p-2 border rounded-md inline-block">
                  <Image src={thumbnailPreview} alt="Thumbnail preview" width={128} height={128} style={{objectFit:"cover"}} className="rounded" data-ai-hint="thumbnail preview"/>
                </div>
              )}
              <FormDescription>
                Select an image. It will be uploaded with the post. For faster uploads and better performance, use optimized images (e.g., under {MAX_THUMBNAIL_SIZE_MB}MB).
              </FormDescription>
              {/* No direct FormField for thumbnailUrl, handled by file input and server */}
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
                      disabled={isSubmittingForm || isSuggestingTags}
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
                      disabled={isSubmittingForm || isSuggestingTags}
                    />
                  </FormControl>
                  <FormDescription>Comma-separated tags. e.g., tech, news, updates</FormDescription>
                  <FormMessage />
                  <div className="mt-3 space-y-2">
                    <Button 
                      type="button" 
                      onClick={handleSuggestTags} 
                      disabled={isSuggestingTags || isSubmittingForm || !form.getValues('content') || form.getValues('content').length < 50}
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
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmittingForm || isSuggestingTags}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={form.formState.isSubmitting || isSubmittingForm || isSuggestingTags}>
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
