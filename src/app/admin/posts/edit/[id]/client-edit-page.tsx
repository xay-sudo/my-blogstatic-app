
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
import { ArrowLeft, Loader2 as Loader2Icon, Sparkles, AlertCircle, Save } from 'lucide-react';
import { updatePostAction } from '@/app/actions'; 
import type { Post } from '@/types';
import { suggestTags } from '@/ai/flows/suggest-tags';
import { Badge } from '@/components/ui/badge';

const postFormClientSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }).max(255, { message: 'Title must be 255 characters or less.' }),
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters long.' }).max(150, { message: 'Slug must be 150 characters or less.' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens.' }),
  content: z.string().min(50, { message: 'Content must be at least 50 characters long (HTML content).' }),
  tags: z.string().optional(), 
  thumbnailUrl: z.string().optional(), 
});

type PostFormClientValues = z.infer<typeof postFormClientSchema>;

interface ClientEditPageProps {
  initialPostData: Post;
}

const MAX_THUMBNAIL_SIZE_MB = 5;
const MAX_THUMBNAIL_SIZE_BYTES = MAX_THUMBNAIL_SIZE_MB * 1024 * 1024;

export default function ClientEditPage({ initialPostData }: ClientEditPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const editorRef = useRef<any>(null);
  const tinymceApiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY;

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null); 
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(initialPostData.thumbnailUrl || null); 
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const [suggestedAiTags, setSuggestedAiTags] = useState<string[]>([]);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiTagsError, setAiTagsError] = useState<string | null>(null);


  const form = useForm<PostFormClientValues>({
    resolver: zodResolver(postFormClientSchema),
    defaultValues: {
      title: initialPostData.title || '',
      slug: initialPostData.slug || '',
      content: initialPostData.content || '<p>Edit your content...</p>',
      tags: initialPostData.tags ? initialPostData.tags.join(', ') : '',
      thumbnailUrl: initialPostData.thumbnailUrl || '', 
    },
    mode: 'onChange',
  });

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
        toast({
          variant: "default",
          title: "Large File Selected",
          description: `The image "${file.name}" is larger than ${MAX_THUMBNAIL_SIZE_MB}MB. Consider optimizing it.`,
          duration: 7000,
        });
      }
      
      setThumbnailFile(file); 
      
      const reader = new FileReader();
      reader.onloadend = () => setThumbnailPreview(reader.result as string); 
      reader.readAsDataURL(file);
      
    } else {
      setThumbnailFile(null); 
      setThumbnailPreview(initialPostData.thumbnailUrl || null); 
       if (e.target) { 
            e.target.value = '';
       }
    }
  };

  const handleManualSuggestTags = async () => {
    const content = editorRef.current ? editorRef.current.getContent({format: 'text'}) : form.getValues('content');
    if (!content || content.trim().length < 50) {
      setAiTagsError('Content is too short (less than 50 characters) to suggest tags effectively.');
      setSuggestedAiTags([]);
      toast({
        variant: "destructive",
        title: "Content Too Short",
        description: "AI tag suggestions require at least 50 characters of content.",
      });
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
         toast({ title: "AI Suggestions", description: "No new tags suggested by AI for this content."});
      }
    } catch (e) {
      console.error('Error suggesting tags:', e);
      setAiTagsError('Failed to suggest tags. Please try again.');
      toast({ variant: "destructive", title: "AI Tagging Error", description: 'Could not fetch AI tag suggestions.' });
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

    let finalTags = data.tags ? data.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0) : [];
    const contentForAi = editorRef.current ? editorRef.current.getContent({format: 'text'}) : data.content;

    if (contentForAi && contentForAi.trim().length >= 50) {
      try {
        toast({title: "Checking for AI Tags...", description: "Please wait while tags are being generated for the content."});
        const tempIsSuggestingTags = isSuggestingTags; // Store current state
        if (!isSuggestingTags) setIsSuggestingTags(true); // Set if not already suggesting (manual might be running)
        
        const aiResult = await suggestTags({ blogPostContent: contentForAi });
        
        if (!tempIsSuggestingTags) setIsSuggestingTags(false); // Revert if this was an auto-suggestion

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
        if (!isSuggestingTags) setIsSuggestingTags(false); // Ensure it's reset if save-time suggestion failed
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
      const result = await updatePostAction(initialPostData.id, formData); 
      if (result?.success === false) {
         toast({
          variant: "destructive",
          title: 'Failed to Update Post',
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
          title: 'Post Updated Successfully',
          description: `"${data.title}" has been updated.`,
        });
        const thumbnailUploadInput = document.getElementById('thumbnail-upload') as HTMLInputElement;
        if (thumbnailUploadInput) {
          thumbnailUploadInput.value = '';
        }
        // Don't reset the form automatically, just the file input
        // Keep AI suggestions if any, as user might want to save again.
      }
    } catch (error: any) {
      if (typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
        throw error; 
      }
      console.error("Error updating post:", error);
      toast({
        variant: "destructive",
        title: 'Submission Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred during submission.',
      });
    } finally {
       if (!(typeof (Error as any).digest === 'string' && (Error as any).digest.startsWith('NEXT_REDIRECT'))) {
         setIsSubmittingForm(false);
       }
    }
  };

  return (
    <Card className="max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">Edit Post</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/posts">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Posts
            </Link>
          </Button>
        </div>
        <CardDescription>Modify the details below to update your blog post.</CardDescription>
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
                  <FormDescription>URL-friendly version of the title.</FormDescription>
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
              {thumbnailPreview && (
                <div className="mt-2 p-2 border rounded-md inline-block">
                  <Image src={thumbnailPreview} alt="Thumbnail preview" width={200} height={200} style={{objectFit:"cover"}} className="rounded" data-ai-hint="thumbnail preview"/>
                </div>
              )}
              <FormDescription>
                Select a new image to change the thumbnail. It will be uploaded with the post. Current image will be kept if no new image is selected. Use optimized images (under {MAX_THUMBNAIL_SIZE_MB}MB).
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
                  <FormDescription>Comma-separated tags. AI will also attempt to add relevant tags on save.</FormDescription>
                  <FormMessage />
                  <div className="mt-3 space-y-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleManualSuggestTags} 
                      disabled={isSuggestingTags || isSubmittingForm}
                      className="text-sm"
                    >
                      {isSuggestingTags && !isSubmittingForm ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Suggesting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
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
                        <p className="text-xs font-medium mb-1 text-muted-foreground flex items-center">
                          <Sparkles className="w-3 h-3 mr-1.5 text-primary" />
                          AI Suggestions (click to add):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
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
                    {suggestedAiTags.length === 0 && !isSuggestingTags && !aiTagsError && (
                      <p className="text-xs text-muted-foreground">
                        Click the button above to get AI tag suggestions based on the current content.
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
                {isSubmittingForm || (isSuggestingTags && isSubmittingForm) ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
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

