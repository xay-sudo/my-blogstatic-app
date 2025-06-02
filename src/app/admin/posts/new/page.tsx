
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
import { ArrowLeft, Loader2 as Loader2Icon } from 'lucide-react'; 
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
  imageUrl: z.string().url({ message: 'Please upload a valid image or ensure the URL is correct.' }).optional().or(z.literal('')),
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
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isSubmittingForm, setIsSubmittingForm] = useState(false); 


  const form = useForm<PostFormClientValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      content: '<p>Write your blog post content here...</p>',
      tags: '', 
      imageUrl: '',
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

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>,
    urlField: keyof Pick<PostFormClientValues, 'imageUrl' | 'thumbnailUrl'>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue(urlField, ''); 
      form.clearErrors(urlField); 
    } else {
      setFile(null);
      setPreview(null);
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

  const onSubmit = async (data: PostFormClientValues) => {
    setIsSubmittingForm(true);
    let finalData = { ...data }; // Use a mutable copy

    try {
      if (thumbnailFile) {
        toast({ title: "Uploading Thumbnail...", description: "Please wait." });
        const uploadedThumbnailUrl = await uploadFile(thumbnailFile, 'posts_images/thumbnails', 'thumbnail');
        finalData.thumbnailUrl = uploadedThumbnailUrl; // Update the mutable copy
        form.setValue('thumbnailUrl', uploadedThumbnailUrl, {shouldValidate: true}); 
      }
      if (mainImageFile) {
         toast({ title: "Uploading Main Image...", description: "Please wait." });
        const uploadedImageUrl = await uploadFile(mainImageFile, 'posts_images/main', 'mainImage');
        finalData.imageUrl = uploadedImageUrl; // Update the mutable copy
        form.setValue('imageUrl', uploadedImageUrl, {shouldValidate: true});
      }
    } catch (error) {
      setIsSubmittingForm(false);
      setUploadProgress({});
      // Toast for upload failure is handled in uploadFile
      return; 
    }
    
    // Re-validate the form after URLs might have been populated by uploads
    const validationResult = await form.trigger(); 
    if (!validationResult) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please check the form for errors. Ensure uploaded images resulted in valid URLs.",
        });
        setIsSubmittingForm(false);
        return;
    }
    
    // Use the latest form values which include uploaded URLs
    const dataForAction = form.getValues();

    const processedTags = typeof dataForAction.tags === 'string'
        ? dataForAction.tags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0)
        : (Array.isArray(dataForAction.tags) ? dataForAction.tags : []);


    const postPayload: Omit<Post, 'id' | 'date'> = {
      title: dataForAction.title,
      slug: dataForAction.slug,
      content: dataForAction.content,
      tags: processedTags,
      imageUrl: dataForAction.imageUrl,
      thumbnailUrl: dataForAction.thumbnailUrl,
    };

    try {
      const result = await createPostAction(postPayload); // Server action call
      if (result?.success === false) { // Check if the action returned a specific failure
         toast({
          variant: "destructive",
          title: 'Failed to Create Post',
          description: result.message || 'An unknown error occurred on the server.',
        });
        // If server action returns specific field errors, apply them to the form
        if (result.errors) {
          Object.entries(result.errors).forEach(([fieldName, errors]) => {
             // Ensure errors is an array and fieldName is a valid key
             if (Array.isArray(errors) && errors.length > 0) {
                form.setError(fieldName as keyof PostFormClientValues, { type: 'server', message: errors.join(', ') });
             }
          });
        }
      } else { // Success case (redirect is handled by server action)
        toast({
          title: 'Post Created Successfully',
          description: `"${postPayload.title}" has been created.`,
        });
        // Server action handles revalidation and redirection.
      }
    } catch (error) { // Catch unexpected errors from the action call itself
      console.error("Error submitting post:", error);
      toast({
        variant: "destructive",
        title: 'Submission Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred during submission.',
      });
    } finally {
      setIsSubmittingForm(false);
      setUploadProgress({}); // Reset progress for all uploads
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
                    <Input placeholder="Your Post Title" {...field} />
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
                    <Input placeholder="your-post-slug" {...field} />
                  </FormControl>
                  <FormDescription>URL-friendly version of the title (auto-updated).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                        readonly: false,
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
                      {...field} // field already includes value and onChange
                    />
                  </FormControl>
                  <FormDescription>Comma-separated tags. e.g., tech, news, updates</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel htmlFor="thumbnail-upload">Thumbnail Image (Optional)</FormLabel>
              <FormControl>
                <Input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, setThumbnailFile, setThumbnailPreview, 'thumbnailUrl')}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </FormControl>
              {uploadProgress['thumbnail'] > 0 && uploadProgress['thumbnail'] < 100 && (
                <Progress value={uploadProgress['thumbnail']} className="w-full mt-2 h-2" />
              )}
              {thumbnailPreview && (
                <div className="mt-2 p-2 border rounded-md inline-block">
                  <Image src={thumbnailPreview} alt="Thumbnail preview" width={128} height={128} style={{objectFit:"cover"}} className="rounded" />
                </div>
              )}
              <FormDescription>Upload an optional thumbnail image for the post (e.g., 400x300px).</FormDescription>
              {/* FormMessage for thumbnailUrl can be shown if server validation returns error for this field */}
              <FormField control={form.control} name="thumbnailUrl" render={() => <FormMessage />} />
            </FormItem>

             <FormItem>
              <FormLabel htmlFor="main-image-upload">Main Post Image</FormLabel>
              <FormControl>
                <Input
                  id="main-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, setMainImageFile, setMainImagePreview, 'imageUrl')}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </FormControl>
              {uploadProgress['mainImage'] > 0 && uploadProgress['mainImage'] < 100 && (
                <Progress value={uploadProgress['mainImage']} className="w-full mt-2 h-2" />
              )}
              {mainImagePreview && (
                <div className="mt-2 p-2 border rounded-md inline-block">
                  <Image src={mainImagePreview} alt="Main image preview" width={192} height={192} style={{objectFit:"cover"}} className="rounded"/>
                </div>
              )}
              <FormDescription>Upload an optional main image for the post (e.g., 800x600px).</FormDescription>
              {/* FormMessage for imageUrl can be shown if server validation returns error for this field */}
              <FormField control={form.control} name="imageUrl" render={() => <FormMessage />} />
            </FormItem>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmittingForm}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={form.formState.isSubmitting || isSubmittingForm}>
                {isSubmittingForm ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
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

    