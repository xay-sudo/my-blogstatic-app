
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { storage } from '@/lib/firebase-config'; 
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/contexts/AuthContext';


const postFormSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }).max(100, { message: 'Title must be 100 characters or less.' }),
  slug: z.string().min(3, { message: 'Slug must be at least 3 characters long.' }).max(100, { message: 'Slug must be 100 characters or less.' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens.' }),
  excerpt: z.string().min(10, { message: 'Excerpt must be at least 10 characters long.' }).max(300, { message: 'Excerpt must be 300 characters or less.' }),
  content: z.string().min(50, { message: 'Content must be at least 50 characters long (HTML content).' }),
  tags: z.string()
    .refine(value => value === '' || /^[a-zA-Z0-9\s,-]+$/.test(value), {
      message: 'Tags can only contain letters, numbers, spaces, commas, and hyphens.',
    })
    .transform(val => val ? val.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0) : [])
    .optional(),
  imageUrl: z.string().url({ message: 'Please enter a valid URL or upload an image.' }).optional().or(z.literal('')),
  thumbnailUrl: z.string().url({ message: 'Please enter a valid URL or upload a thumbnail.' }).optional().or(z.literal('')),
});

type PostFormValues = z.infer<typeof postFormSchema>;

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
  const [isUploading, setIsUploading] = useState(false);


  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      content: '<p>Write your blog post content here...</p>',
      tags: [],
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
    urlField: keyof PostFormValues
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue(urlField, ''); // Clear any manually entered URL, it will be set after upload
      form.clearErrors(urlField); // Clear potential URL validation errors
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  const uploadFile = async (file: File, path: string, progressKey: string): Promise<string> => {
    if (!storage) {
      toast({ variant: "destructive", title: "Error", description: "Firebase Storage is not configured. Check console and .env.local file." });
      throw new Error("Firebase Storage not configured.");
    }
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to upload files." });
      throw new Error("User not authenticated for upload.");
    }

    const timestamp = new Date().getTime();
    const uniqueFileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
    // Path structure: posts_images/thumbnails_or_main/userId/filename
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


  const onSubmit = async (data: PostFormValues) => {
    setIsUploading(true);
    let submittedData = { ...data }; // Work with a copy

    try {
      if (thumbnailFile) {
        toast({ title: "Uploading Thumbnail...", description: "Please wait." });
        const uploadedThumbnailUrl = await uploadFile(thumbnailFile, 'posts_images/thumbnails', 'thumbnail');
        submittedData.thumbnailUrl = uploadedThumbnailUrl;
        form.setValue('thumbnailUrl', uploadedThumbnailUrl, {shouldValidate: true}); 
      }
      if (mainImageFile) {
         toast({ title: "Uploading Main Image...", description: "Please wait." });
        const uploadedImageUrl = await uploadFile(mainImageFile, 'posts_images/main', 'mainImage');
        submittedData.imageUrl = uploadedImageUrl;
        form.setValue('imageUrl', uploadedImageUrl, {shouldValidate: true});
      }
    } catch (error) {
      setIsUploading(false);
      setUploadProgress({});
      // Error toast is handled within uploadFile
      return;
    }
    
    // Re-validate the entire form data now that URLs are potentially set
    const validationResult = await form.trigger();
    if (!validationResult) {
      toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please check the form for errors after image processing.",
      });
      setIsUploading(false);
      return;
    }

    // Get the latest values which include uploaded URLs
    const finalData = form.getValues();

    const finalTags = Array.isArray(finalData.tags) ? finalData.tags :
                      (typeof finalData.tags === 'string' ? finalData.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : []);

    const newPostData = {
      ...finalData,
      tags: finalTags,
    };

    console.log('New post data (mock submission):', newPostData);

    toast({
      title: 'Post Created (Mock)',
      description: `"${newPostData.title}" has been "created". This is a mock operation.`,
    });
    setIsUploading(false);
    setUploadProgress({});
    // Reset files and previews
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setMainImageFile(null);
    setMainImagePreview(null);
    form.reset(); // Reset the form to default values
    router.push('/admin/posts');
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
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Excerpt</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A short summary of your post..." {...field} rows={3} />
                  </FormControl>
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
                      {...field}
                      value={Array.isArray(field.value) ? field.value.join(', ') : (field.value || '')}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>Comma-separated tags. e.g., tech, news, updates</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Thumbnail Upload Field */}
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
                  <Image src={thumbnailPreview} alt="Thumbnail preview" width={128} height={128} objectFit="cover" className="rounded" />
                </div>
              )}
              <FormDescription>Upload a thumbnail (e.g., 400x300px). If you provide a URL below, this upload will be ignored.</FormDescription>
               <FormField
                control={form.control}
                name="thumbnailUrl"
                render={({ field }) => (
                  <FormItem className="mt-2">
                    <FormLabel>Or Enter Thumbnail URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://placehold.co/400x300.png" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          if (e.target.value) { setThumbnailFile(null); setThumbnailPreview(null); } // Clear file if URL is typed
                        }}
                        disabled={!!thumbnailFile}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormItem>

            {/* Main Image Upload Field */}
             <FormItem>
              <FormLabel htmlFor="main-image-upload">Main Post Image (Optional)</FormLabel>
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
                  <Image src={mainImagePreview} alt="Main image preview" width={192} height={192} objectFit="cover" className="rounded"/>
                </div>
              )}
              <FormDescription>Upload a main image for the post (e.g., 800x600px). If you provide a URL below, this upload will be ignored.</FormDescription>
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                   <FormItem className="mt-2">
                    <FormLabel>Or Enter Main Image URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://placehold.co/800x600.png" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                           if (e.target.value) { setMainImageFile(null); setMainImagePreview(null); } // Clear file if URL is typed
                        }}
                        disabled={!!mainImageFile}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormItem>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isUploading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={form.formState.isSubmitting || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : form.formState.isSubmitting ? 'Creating...' : 'Create Post'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Minimal Loader2Icon component
const Loader2Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
