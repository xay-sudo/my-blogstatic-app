
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useEffect, useState } from 'react';

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
import { Loader2 as Loader2Icon, Save } from 'lucide-react';
import { updateSiteSettingsAction } from '@/app/actions'; 
import type { SiteSettings } from '@/types';
import { getSettings as getDefaultSettingsObject } from '@/lib/settings-service'; // Import to get default structure/values if needed

// Re-fetch default settings for client-side consistency if needed, or define them statically.
// For simplicity, let's assume settings-service's DEFAULT_SETTINGS is what we want if props are incomplete.
// However, initialSettings prop should already be complete due to getSettings() in parent.
const CLIENT_DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "Newstoday", // Default if not provided by prop
  siteDescription: "A modern blog platform with AI-powered tagging.",
  postsPerPage: 6,
};


const siteSettingsFormSchema = z.object({
  siteTitle: z.string().min(3, { message: 'Site title must be at least 3 characters long.' }).max(100, {message: 'Site title must be 100 characters or less.'}),
  siteDescription: z.string().min(10, { message: 'Site description must be at least 10 characters long.' }).max(300, {message: 'Site description must be 300 characters or less.'}),
  postsPerPage: z.coerce
    .number({ invalid_type_error: 'Must be a number.'})
    .int({ message: 'Must be a whole number.'})
    .min(1, { message: 'Must display at least 1 post per page.' })
    .max(50, { message: 'Cannot display more than 50 posts per page.' }),
});

type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;

interface ClientSettingsPageProps {
  initialSettings: SiteSettings;
}

export default function ClientSettingsPage({ initialSettings }: ClientSettingsPageProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsFormSchema),
    defaultValues: {
      siteTitle: initialSettings?.siteTitle || CLIENT_DEFAULT_SETTINGS.siteTitle,
      siteDescription: initialSettings?.siteDescription || CLIENT_DEFAULT_SETTINGS.siteDescription,
      postsPerPage: initialSettings?.postsPerPage || CLIENT_DEFAULT_SETTINGS.postsPerPage,
    },
    mode: 'onChange',
  });
  
  useEffect(() => {
    form.reset({
      siteTitle: initialSettings?.siteTitle || CLIENT_DEFAULT_SETTINGS.siteTitle,
      siteDescription: initialSettings?.siteDescription || CLIENT_DEFAULT_SETTINGS.siteDescription,
      postsPerPage: initialSettings?.postsPerPage || CLIENT_DEFAULT_SETTINGS.postsPerPage,
    });
  }, [initialSettings, form]);


  const onSubmit = async (data: SiteSettingsFormValues) => {
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('siteTitle', data.siteTitle);
    formData.append('siteDescription', data.siteDescription);
    formData.append('postsPerPage', String(data.postsPerPage));

    try {
      const result = await updateSiteSettingsAction(formData);
      if (result?.success) {
        toast({
          title: 'Settings Updated',
          description: 'Site settings have been saved successfully.',
        });
        // Form will be reset by useEffect if initialSettings prop updates due to revalidation
      } else {
        toast({
          variant: "destructive",
          title: 'Update Failed',
          description: result?.message || 'An unknown error occurred.',
        });
        if (result?.errors) {
          Object.entries(result.errors).forEach(([fieldName, errors]) => {
            if (Array.isArray(errors) && errors.length > 0) {
              form.setError(fieldName as keyof SiteSettingsFormValues, { type: 'server', message: errors.join(', ') });
            }
          });
        }
      }
    } catch (error: any) {
      console.error("Error updating site settings:", error);
      toast({
        variant: "destructive",
        title: 'Submission Error',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight">Site Settings</CardTitle>
        <CardDescription>Manage general configuration for your website.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="siteTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Site Name" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormDescription>The main title for your website (e.g., used in browser tabs and search results).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="siteDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Description / Tagline</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A brief description of your site." {...field} rows={3} disabled={isSubmitting} />
                  </FormControl>
                  <FormDescription>A short summary used by search engines and for site previews.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postsPerPage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posts Per Page (Homepage)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 6" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormDescription>Number of posts to show on the homepage before pagination.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" disabled={isSubmitting || !form.formState.isDirty}>
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                   <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
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
