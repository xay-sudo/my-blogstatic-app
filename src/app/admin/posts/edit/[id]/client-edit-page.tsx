
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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 as Loader2Icon, Sparkles, AlertCircle, Save } from 'lucide-react';
import { storage } from '@/lib/firebase-config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { updatePostAction } from '@/app/actions'; // Use updatePostAction
import type { Post } from '@/types';
import { suggestTags } from '@/ai/flows/suggest-tags';
import { Badge } from '@/components/ui/badge';

// This schema can be the same as for new posts
const postFormSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }).max(100, { message: 'Title must be 100 characters or less.' }),
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters long.' }).max(100, { message: 'Slug must be 100 characters or less.' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens.' }),
  content: z.string().min(50, { message: 'Content must be at least 50 characters long (HTML content).' }),
  tags: z.string() // Keep as string for input, transform in onSubmit or action
    .transform(val => val ? val.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0) : [])
    .optional(),
  thumbnailUrl: z.string().url({ message: 'Please upload a valid thumbnail or ensure the URL is correct.' }).optional().or(z.literal('')),
});

type PostFormClientValues = z.infer<typeof postFormSchema>;

interface ClientEditPageProps {
  initialPostData: Post;
}

const MAX_THUMBNAIL_SIZE_MB = 2;
const MAX_THUMBNAIL_SIZE_BYTES = MAX_THUMBNAIL_SIZE_MB * 1024 * 1024;

export default function ClientEditPage({ initialPostData }: ClientEditPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const editorRef = useRef<any>(null);
  const tinymceApiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY;

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(initialPostData.thumbnailUrl || null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const [suggestedAiTags, setSuggestedAiTags] = useState<string[]>([]);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiTagsError, setAiTagsError] = useState<string | null>(null);

  const form = useForm<PostFormClientValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: initialPostData.title || '',
      slug: initialPostData.slug || '',
      content: initialPostData.content || '<p>Edit your content...</p>',
      tags: initialPostData.tags ? initialPostData.tags.join(', ') : '',
      thumbnailUrl: initialPostData.thumbnailUrl || '',
    },
    mode: 'onChange',
  });

  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > MAX_THUMBNAIL_SIZE_BYTES) {
        toast({
          variant: "default",
          title: "Large File Selected",
          description: `The image "${file.name}" is larger than ${MAX_THUMBNAIL_SIZE_MB}MB. Upload may take a while. Consider optimizing it first or proceed with caution.`,
          duration: 7000,
        });
      }
      
      setThumbnailFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => setThumbnailPreview(reader.result as string);
      reader.readAsDataURL(file);

      form.setValue('thumbnailUrl', '', { shouldValidate: false });
      form.clearErrors('thumbnailUrl');
      
      setIsUploadingThumbnail(true);
      setUploadProgress(prev => ({ ...prev, thumbnail: 0 }));

      try {
        toast({ title: "Uploading Thumbnail...", description: "Please wait." });
        const uploadedThumbnailUrl = await uploadFile(file, 'posts_images/thumbnails', 'thumbnail');
        form.setValue('thumbnailUrl', uploadedThumbnailUrl, { shouldValidate: true });
        setThumbnailFile(null);
        toast({ title: "Thumbnail Uploaded", description: "New thumbnail ready." });
      } catch (error) {
        toast({ variant: "destructive", title: "Thumbnail Auto-Upload Failed", description: "Please try selecting the file again or check console." });
        setThumbnailPreview(initialPostData.thumbnailUrl || null); 
        setThumbnailFile(null);
        form.setValue('thumbnailUrl', initialPostData.thumbnailUrl || '', { shouldValidate: true });
        if (e.target) { // Reset file input value
            e.target.value = '';
        }
      } finally {
        setIsUploadingThumbnail(false);
      }
    } else {
      // If no file is selected, revert to the original thumbnail if it exists.
      setThumbnailFile(null);
      setThumbnailPreview(initialPostData.thumbnailUrl || null);
      form.setValue('thumbnailUrl', initialPostData.thumbnailUrl || '', { shouldValidate: true });
       if (e.target) { // Also reset if no file is selected (e.g. dialog cancelled)
            e.target.value = '';
       }
    }
  };

  const uploadFile = async (file: File, path: string, progressKey: string): Promise<string> => {
    if (!storage) {
      toast({ variant: "destructive", title: "Error", description: "Firebase Storage is not configured. Check console." });
      console.error("Firebase Storage is not configured. Ensure NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET and other Firebase config variables are set.");
      throw new Error("Firebase Storage not configured.");
    }
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to upload files." });
      throw new Error("User not authenticated for upload.");
    }

    const timestamp = new Date().getTime();
    const uniqueFileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
    const storageRef = ref(storage, `${path}/${user.uid}/${uniqueFileName}`);
    
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({ ...prev, [progressKey]: progress }));
        },
        (error) => {
          console.error(`Upload error for ${progressKey}:`, error);
           let errorMessage = "An unknown error occurred during upload.";
          switch (error.code) {
            case 'storage/unauthorized':
              errorMessage = "Permission denied. Check Firebase Storage rules.";
              break;
            case 'storage/canceled':
              errorMessage = "Upload canceled.";
              break;
            case 'storage/unknown':
              errorMessage = "An unknown error occurred, possibly network-related.";
              break;
          }
          toast({ variant: "destructive", title: `Upload Failed: ${progressKey}`, description: errorMessage });
          setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadProgress(prev => ({ ...prev, [progressKey]: 100 }));
            resolve(downloadURL);
          } catch (error) {
             console.error(`Failed to get download URL for ${progressKey}:`, error);
             toast({ variant: "destructive", title: `Upload Error: ${progressKey}`, description: "Could not get download URL."});
             reject(error);
          }
        }
      );
    });
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
        
    // Check if a new thumbnail was selected for upload but the upload didn't complete/failed.
    // thumbnailFile would be set if a file was selected, and thumbnailUrl would not have the new URL.
    if (thumbnailFile && form.getValues('thumbnailUrl') !== initialPostData.thumbnailUrl && !form.getValues('thumbnailUrl')) {
      // This condition means: a file is staged (thumbnailFile is not null),
      // AND the current thumbnailUrl in the form is not the original one (so a change was intended),
      // AND the current thumbnailUrl in the form is empty (meaning new upload failed to populate it).
      toast({
          variant: "destructive",
          title: "Thumbnail Upload Incomplete",
          description: "A new thumbnail image was selected, but its upload did not complete successfully. Please re-select the image or ensure the existing thumbnail is intended.",
      });
      setIsSubmittingForm(false);
      return;
    }

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
    
    const dataForAction = form.getValues();

    const processedTags = typeof dataForAction.tags === 'string'
        ? dataForAction.tags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0)
        : (Array.isArray(dataForAction.tags) ? dataForAction.tags : []);

    const postPayload: Omit<Post, 'id' | 'date'> = {
      title: dataForAction.title,
      slug: dataForAction.slug,
      content: dataForAction.content,
      tags: processedTags,
      thumbnailUrl: dataForAction.thumbnailUrl,
    };

    try {
      const result = await updatePostAction(initialPostData.id, postPayload); 
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
          description: `"${postPayload.title}" has been updated.`,
        });
         if (document.getElementById('thumbnail-upload') as HTMLInputElement) {
          (document.getElementById('thumbnail-upload') as HTMLInputElement).value = '';
        }
        router.push('/admin/posts'); 
      }
    } catch (error) {
      console.error("Error updating post:", error);
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
                    <Input placeholder="Your Post Title" {...field} disabled={isSubmittingForm || isUploadingThumbnail || isSuggestingTags} />
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
                    <Input placeholder="your-post-slug" {...field} disabled={isSubmittingForm || isUploadingThumbnail || isSuggestingTags}/>
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
                  disabled={isUploadingThumbnail || isSubmittingForm || isSuggestingTags}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </FormControl>
              {isUploadingThumbnail && (
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  <span>Uploading thumbnail...</span>
                </div>
              )}
              {uploadProgress['thumbnail'] > 0 && (
                <Progress value={uploadProgress['thumbnail']} className="w-full mt-2 h-2" />
              )}
              {thumbnailPreview && (
                <div className="mt-2 p-2 border rounded-md inline-block">
                  <Image src={thumbnailPreview} alt="Thumbnail preview" width={128} height={128} style={{objectFit:"cover"}} className="rounded" data-ai-hint="thumbnail preview"/>
                </div>
              )}
              <FormDescription>
                Select a new image to change the thumbnail. It will be uploaded automatically. For faster uploads, use optimized images (e.g., under {MAX_THUMBNAIL_SIZE_MB}MB).
              </FormDescription>
              <FormField control={form.control} name="thumbnailUrl" render={() => <FormMessage />} /> 
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
                      disabled={isSubmittingForm || isUploadingThumbnail || isSuggestingTags}
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
                      disabled={isSubmittingForm || isUploadingThumbnail || isSuggestingTags}
                    />
                  </FormControl>
                  <FormDescription>Comma-separated tags. e.g., tech, news, updates</FormDescription>
                  <FormMessage />
                  <div className="mt-3 space-y-2">
                    <Button 
                      type="button" 
                      onClick={handleSuggestTags} 
                      disabled={isSuggestingTags || isSubmittingForm || isUploadingThumbnail || !form.getValues('content') || form.getValues('content').length < 50}
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
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmittingForm || isUploadingThumbnail || isSuggestingTags}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={form.formState.isSubmitting || isSubmittingForm || isUploadingThumbnail || isSuggestingTags}>
                {isSubmittingForm ? (
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
    

    