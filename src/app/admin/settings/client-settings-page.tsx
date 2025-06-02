
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
import { Loader2 as Loader2Icon, Save, Image as ImageIcon, Code } from 'lucide-react';
import { updateSiteSettingsAction } from '@/app/actions'; 
import type { SiteSettings } from '@/types';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';


const CLIENT_DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "Newstoday",
  siteDescription: "A modern blog platform with AI-powered tagging.",
  postsPerPage: 6,
  bannerEnabled: false,
  bannerType: 'image',
  bannerImageUrl: '',
  bannerImageLink: '',
  bannerImageAltText: 'Banner',
  bannerCustomHtml: '',
};


const siteSettingsFormSchema = z.object({
  siteTitle: z.string().min(3, { message: 'Site title must be at least 3 characters long.' }).max(100, {message: 'Site title must be 100 characters or less.'}),
  siteDescription: z.string().min(10, { message: 'Site description must be at least 10 characters long.' }).max(300, {message: 'Site description must be 300 characters or less.'}),
  postsPerPage: z.coerce
    .number({ invalid_type_error: 'Must be a number.'})
    .int({ message: 'Must be a whole number.'})
    .min(1, { message: 'Must display at least 1 post per page.' })
    .max(50, { message: 'Cannot display more than 50 posts per page.' }),
  bannerEnabled: z.boolean().default(false),
  bannerType: z.enum(['image', 'customHtml']).default('image'),
  bannerImageUrl: z.string().url({ message: 'Please enter a valid URL for the banner image.' }).optional().or(z.literal('')),
  bannerImageLink: z.string().url({ message: 'Please enter a valid URL for the banner link.' }).optional().or(z.literal('')),
  bannerImageAltText: z.string().max(120, {message: 'Alt text should be 120 characters or less.'}).optional(),
  bannerCustomHtml: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.bannerEnabled && data.bannerType === 'image') {
    if (!data.bannerImageUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Image URL is required when image banner is enabled.',
        path: ['bannerImageUrl'],
      });
    }
  }
  if (data.bannerEnabled && data.bannerType === 'customHtml') {
    if (!data.bannerCustomHtml || data.bannerCustomHtml.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Custom HTML is required when HTML banner is enabled.',
        path: ['bannerCustomHtml'],
      });
    }
  }
});

type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;

interface ClientSettingsPageProps {
  initialSettings: SiteSettings;
}

export default function ClientSettingsPage({ initialSettings }: ClientSettingsPageProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsFormSchema),
    defaultValues: {
      siteTitle: initialSettings?.siteTitle || CLIENT_DEFAULT_SETTINGS.siteTitle,
      siteDescription: initialSettings?.siteDescription || CLIENT_DEFAULT_SETTINGS.siteDescription,
      postsPerPage: initialSettings?.postsPerPage || CLIENT_DEFAULT_SETTINGS.postsPerPage,
      bannerEnabled: initialSettings?.bannerEnabled || CLIENT_DEFAULT_SETTINGS.bannerEnabled,
      bannerType: initialSettings?.bannerType || CLIENT_DEFAULT_SETTINGS.bannerType,
      bannerImageUrl: initialSettings?.bannerImageUrl || CLIENT_DEFAULT_SETTINGS.bannerImageUrl,
      bannerImageLink: initialSettings?.bannerImageLink || CLIENT_DEFAULT_SETTINGS.bannerImageLink,
      bannerImageAltText: initialSettings?.bannerImageAltText || CLIENT_DEFAULT_SETTINGS.bannerImageAltText,
      bannerCustomHtml: initialSettings?.bannerCustomHtml || CLIENT_DEFAULT_SETTINGS.bannerCustomHtml,
    },
    mode: 'onChange',
  });
  
  useEffect(() => {
    form.reset({
      siteTitle: initialSettings?.siteTitle || CLIENT_DEFAULT_SETTINGS.siteTitle,
      siteDescription: initialSettings?.siteDescription || CLIENT_DEFAULT_SETTINGS.siteDescription,
      postsPerPage: initialSettings?.postsPerPage || CLIENT_DEFAULT_SETTINGS.postsPerPage,
      bannerEnabled: initialSettings?.bannerEnabled || CLIENT_DEFAULT_SETTINGS.bannerEnabled,
      bannerType: initialSettings?.bannerType || CLIENT_DEFAULT_SETTINGS.bannerType,
      bannerImageUrl: initialSettings?.bannerImageUrl || CLIENT_DEFAULT_SETTINGS.bannerImageUrl,
      bannerImageLink: initialSettings?.bannerImageLink || CLIENT_DEFAULT_SETTINGS.bannerImageLink,
      bannerImageAltText: initialSettings?.bannerImageAltText || CLIENT_DEFAULT_SETTINGS.bannerImageAltText,
      bannerCustomHtml: initialSettings?.bannerCustomHtml || CLIENT_DEFAULT_SETTINGS.bannerCustomHtml,
    });
  }, [initialSettings, form]);

  const watchedBannerType = form.watch('bannerType');
  const watchedBannerEnabled = form.watch('bannerEnabled');

  const onSubmit = async (data: SiteSettingsFormValues) => {
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('siteTitle', data.siteTitle);
    formData.append('siteDescription', data.siteDescription);
    formData.append('postsPerPage', String(data.postsPerPage));
    formData.append('bannerEnabled', data.bannerEnabled ? 'on' : 'off'); // 'on' or 'off' for FormData
    formData.append('bannerType', data.bannerType || 'image');
    formData.append('bannerImageUrl', data.bannerImageUrl || '');
    formData.append('bannerImageLink', data.bannerImageLink || '');
    formData.append('bannerImageAltText', data.bannerImageAltText || '');
    formData.append('bannerCustomHtml', data.bannerCustomHtml || '');


    try {
      const result = await updateSiteSettingsAction(formData);
      if (result?.success) {
        toast({
          title: 'Settings Updated',
          description: 'Site settings have been saved successfully.',
        });
        router.refresh(); 
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
            {/* General Settings */}
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
            
            <Separator />

            {/* Homepage Banner Settings */}
            <div>
              <h3 className="text-lg font-medium mb-4">Homepage Banner</h3>
              <FormField
                control={form.control}
                name="bannerEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Banner</FormLabel>
                      <FormDescription>
                        Show a banner at the top of the homepage.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {watchedBannerEnabled && (
                <div className="mt-6 space-y-6 pl-2 border-l-2 border-primary/50 ml-1">
                  <FormField
                    control={form.control}
                    name="bannerType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Banner Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                            disabled={isSubmitting}
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="image" />
                              </FormControl>
                              <FormLabel className="font-normal flex items-center"><ImageIcon className="w-4 h-4 mr-2" /> Image Banner</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="customHtml" />
                              </FormControl>
                              <FormLabel className="font-normal flex items-center"><Code className="w-4 h-4 mr-2" /> Custom HTML</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchedBannerType === 'image' && (
                    <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                      <FormField
                        control={form.control}
                        name="bannerImageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banner Image URL</FormLabel>
                            <FormControl>
                              <Input type="url" placeholder="https://example.com/banner.jpg" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormDescription>The direct URL to the banner image (e.g., 728x90px).</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bannerImageLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banner Link URL (Optional)</FormLabel>
                            <FormControl>
                              <Input type="url" placeholder="https://example.com/your-link" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormDescription>Where the banner image should link to when clicked.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="bannerImageAltText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banner Image Alt Text</FormLabel>
                            <FormControl>
                              <Input placeholder="Descriptive alt text" {...field} disabled={isSubmitting} />
                            </FormControl>
                            <FormDescription>Important for accessibility and SEO.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchedBannerType === 'customHtml' && (
                    <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                      <FormField
                        control={form.control}
                        name="bannerCustomHtml"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom HTML Code</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="<div>Your HTML banner code here...</div>"
                                {...field}
                                rows={6}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormDescription>Paste your ad code or custom HTML. Ensure it's valid and safe.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            
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
