
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

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
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; 
import { ArrowLeft } from 'lucide-react';

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
  imageUrl: z.string().url({ message: 'Please enter a valid URL for the image.' }).optional().or(z.literal('')),
});

type PostFormValues = z.infer<typeof postFormSchema>;

export default function NewPostPage() {
  const { toast } = useToast();
  const router = useRouter();
  const editorRef = useRef<any>(null);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      content: '<p>Write your blog post content here...</p>',
      tags: [], 
      imageUrl: '',
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


  const onSubmit = (data: PostFormValues) => {
    const finalTags = Array.isArray(data.tags) ? data.tags : 
                      (typeof data.tags === 'string' ? data.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : []);

    const newPostData = {
      ...data,
      tags: finalTags,
    };

    console.log('New post data (mock submission):', newPostData);
    
    toast({
      title: 'Post Created (Mock)',
      description: `"${data.title}" has been "created". This is a mock operation.`,
    });
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
                      apiKey="fhz6kca5oz1s8icmehxt7tz2m4l3xz37vcei0tqa1dorl6tk"
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
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://placehold.co/600x400.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Create Post'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

