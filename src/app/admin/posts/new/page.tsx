
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
import { ArrowLeft, Loader2 as Loader2Icon, UploadCloud } from 'lucide-react';
import { storage } from '@/lib/firebase-config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { createPostAction } from '@/app/actions';
import type { Post } from '@/types';


const postFormSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }).max(100, { message: 'Title must be 100 characters or less.' }),
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters long.' }).max(100, { message: 'Slug must be 100 characters or less.' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens.' }),
  content: z.string().min(50, { message: 'Content must be at least 50 characters long (HTML content).' }),
  tags: z.string()
    .transform(val => val ? val.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0) : [])
    .optional(),
  thumbnailUrl: z.string().url({ message: 'Please upload a valid thumbnail or ensure the URL is correct.' }).optional().or(z.literal('')),
});

type PostFormClientValues = z.infer<typeof postFormSchema>;


export default function NewPostPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const editorRef = useRef<any>(null);
  const tinymceApiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY;

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);


  const form = useForm<PostFormClientValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      content: '<p>Write your blog post content here...</p>',
      tags: '',
      thumbnailUrl: '',
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

  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setThumbnailFile(file); // Keep file in state for potential retry or if needed
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      form.setValue('thumbnailUrl', '', { shouldValidate: false }); // Clear previous URL
      form.clearErrors('thumbnailUrl');
      
      setIsUploadingThumbnail(true);
      setUploadProgress(prev => ({ ...prev, thumbnail: 0 }));

      try {
        toast({ title: "Uploading Thumbnail...", description: "Please wait." });
        const uploadedThumbnailUrl = await uploadFile(file, 'posts_images/thumbnails', 'thumbnail');
        form.setValue('thumbnailUrl', uploadedThumbnailUrl, { shouldValidate: true });
        setThumbnailFile(null); // Clear file from state as it's uploaded and URL is set
        toast({ title: "Thumbnail Uploaded", description: "Thumbnail ready." });
      } catch (error) {
        toast({ variant: "destructive", title: "Thumbnail Auto-Upload Failed", description: "Please try selecting the file again or check console." });
        setThumbnailPreview(null); // Clear preview on error
        setThumbnailFile(null); // Clear file from state
        form.setValue('thumbnailUrl', '', { shouldValidate: true }); // Ensure URL is empty
      } finally {
        setIsUploadingThumbnail(false);
        // Optionally reset progress visual after a short delay or keep it at 100 if successful
        // For simplicity, we'll let the progress bar reflect the last state (100 or 0 if error)
        // or clear it: setUploadProgress(prev => ({ ...prev, thumbnail: 0 }));
      }
    } else {
      setThumbnailFile(null);
      setThumbnailPreview(null);
      form.setValue('thumbnailUrl', '', { shouldValidate: true });
    }
  };

  const uploadFile = async (file: File, path: string, progressKey: string): Promise<string> => {
    if (!storage) {
      toast({ variant: "destructive", title: "Error", description: "Firebase Storage is not configured." });
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
          toast({ variant: "destructive", title: `Upload Failed: ${progressKey}`, description: error.message });
          setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadProgress(prev => ({ ...prev, [progressKey]: 100 })); // Ensure it hits 100 on completion
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

  const onSubmit = async (data: PostFormClientValues) => {
    setIsSubmittingForm(true);
    
    // Thumbnail should already be uploaded and its URL in data.thumbnailUrl
    // if a file was selected.
    
    const validationResult = await form.trigger();
    if (!validationResult || (thumbnailFile && !form.getValues('thumbnailUrl'))) {
        let description = "Please check the form for errors.";
        if (thumbnailFile && !form.getValues('thumbnailUrl')) {
            description = "Thumbnail was selected but failed to upload. Please re-select or try again.";
        }
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: description,
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
      const result = await createPostAction(postPayload);
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
          description: `"${postPayload.title}" has been created.`,
        });
        // Reset form and local state after successful submission
        form.reset();
        setThumbnailPreview(null);
        setThumbnailFile(null);
        setUploadProgress({});
        // router.push('/admin/posts'); // Action already handles redirect
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
      // Clearing progress here might be too soon if user wants to see 100% for a bit
      // setUploadProgress({});
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
                    <Input placeholder="Your Post Title" {...field} disabled={isSubmittingForm || isUploadingThumbnail} />
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
                    <Input placeholder="your-post-slug" {...field} disabled={isSubmittingForm || isUploadingThumbnail}/>
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
                  disabled={isUploadingThumbnail || isSubmittingForm}
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
              <FormDescription>Select an image. It will be uploaded automatically (e.g., 400x300px).</FormDescription>
              <FormField control={form.control} name="thumbnailUrl" render={() => <FormMessage />} /> {/* To display validation errors for the URL */}
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
                      disabled={isSubmittingForm || isUploadingThumbnail}
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
                      disabled={isSubmittingForm || isUploadingThumbnail}
                    />
                  </FormControl>
                  <FormDescription>Comma-separated tags. e.g., tech, news, updates</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmittingForm || isUploadingThumbnail}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={form.formState.isSubmitting || isSubmittingForm || isUploadingThumbnail}>
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

