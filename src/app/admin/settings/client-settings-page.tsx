
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Loader2 as Loader2Icon, Save, Image as ImageIcon, Code, ShieldAlert, ShieldCheck } from 'lucide-react';
import { updateSiteSettingsAction } from '@/app/actions'; 
import type { SiteSettings } from '@/types';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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
  adminUsername: '',
  adminPassword: '',
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
  adminUsername: z.string().min(3, {message: "Admin username must be at least 3 characters."}).max(50, {message: "Admin username must be 50 characters or less."}).optional().or(z.literal('')),
  adminPassword: z.string().min(6, {message: "Admin password must be at least 6 characters."}).max(100, {message: "Admin password must be 100 characters or less."}).optional().or(z.literal('')),
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
  // If either adminUsername or adminPassword is provided, both must be provided.
  const usernameProvided = data.adminUsername && data.adminUsername.trim().length > 0;
  const passwordProvided = data.adminPassword && data.adminPassword.length > 0;

  // Only require new password if username is set and different from initial, or if username is set and initially there was no password.
  const initialUsername = initialSettings?.adminUsername || '';
  const initialPasswordExists = !!initialSettings?.adminPassword;

  if (usernameProvided) {
    if (!passwordProvided) { // If password field is empty
      // If username has changed OR if there was no password initially, then password is required
      if (data.adminUsername !== initialUsername || !initialPasswordExists) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Password is required if username is set or changed.",
            path: ['adminPassword'],
        });
      }
    }
  } else if (passwordProvided) { // Password provided but username is empty
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Username is required if password is set.",
      path: ['adminUsername'],
    });
  }
});

type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;

interface ClientSettingsPageProps {
  initialSettings: SiteSettings;
}

let initialSettings: SiteSettings | null = null; // Store initial settings globally for refiner

export default function ClientSettingsPage({ initialSettings: propsInitialSettings }: ClientSettingsPageProps) {
  initialSettings = propsInitialSettings; // Set the global initial settings
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsFormSchema),
    defaultValues: {
      siteTitle: propsInitialSettings?.siteTitle || CLIENT_DEFAULT_SETTINGS.siteTitle,
      siteDescription: propsInitialSettings?.siteDescription || CLIENT_DEFAULT_SETTINGS.siteDescription,
      postsPerPage: propsInitialSettings?.postsPerPage || CLIENT_DEFAULT_SETTINGS.postsPerPage,
      bannerEnabled: propsInitialSettings?.bannerEnabled || CLIENT_DEFAULT_SETTINGS.bannerEnabled,
      bannerType: propsInitialSettings?.bannerType || CLIENT_DEFAULT_SETTINGS.bannerType,
      bannerImageUrl: propsInitialSettings?.bannerImageUrl || CLIENT_DEFAULT_SETTINGS.bannerImageUrl,
      bannerImageLink: propsInitialSettings?.bannerImageLink || CLIENT_DEFAULT_SETTINGS.bannerImageLink,
      bannerImageAltText: propsInitialSettings?.bannerImageAltText || CLIENT_DEFAULT_SETTINGS.bannerImageAltText,
      bannerCustomHtml: propsInitialSettings?.bannerCustomHtml || CLIENT_DEFAULT_SETTINGS.bannerCustomHtml,
      adminUsername: propsInitialSettings?.adminUsername || CLIENT_DEFAULT_SETTINGS.adminUsername,
      adminPassword: '', // Always start empty for password field for security
    },
    mode: 'onChange',
  });
  
  useEffect(() => {
    initialSettings = propsInitialSettings; // Ensure global `initialSettings` is up-to-date for the refiner
    form.reset({
      siteTitle: propsInitialSettings?.siteTitle || CLIENT_DEFAULT_SETTINGS.siteTitle,
      siteDescription: propsInitialSettings?.siteDescription || CLIENT_DEFAULT_SETTINGS.siteDescription,
      postsPerPage: propsInitialSettings?.postsPerPage || CLIENT_DEFAULT_SETTINGS.postsPerPage,
      bannerEnabled: propsInitialSettings?.bannerEnabled || CLIENT_DEFAULT_SETTINGS.bannerEnabled,
      bannerType: propsInitialSettings?.bannerType || CLIENT_DEFAULT_SETTINGS.bannerType,
      bannerImageUrl: propsInitialSettings?.bannerImageUrl || CLIENT_DEFAULT_SETTINGS.bannerImageUrl,
      bannerImageLink: propsInitialSettings?.bannerImageLink || CLIENT_DEFAULT_SETTINGS.bannerImageLink,
      bannerImageAltText: propsInitialSettings?.bannerImageAltText || CLIENT_DEFAULT_SETTINGS.bannerImageAltText,
      bannerCustomHtml: propsInitialSettings?.bannerCustomHtml || CLIENT_DEFAULT_SETTINGS.bannerCustomHtml,
      adminUsername: propsInitialSettings?.adminUsername || CLIENT_DEFAULT_SETTINGS.adminUsername,
      adminPassword: '',
    });
  }, [propsInitialSettings, form]);

  const watchedBannerType = form.watch('bannerType');
  const watchedBannerEnabled = form.watch('bannerEnabled');
  const watchedAdminUsername = form.watch('adminUsername');
  const watchedAdminPassword = form.watch('adminPassword'); // Watch the password field

  const isSaveButtonDisabled = isSubmitting || 
    (!form.formState.isDirty && (!watchedAdminPassword || watchedAdminPassword.length === 0));


  const onSubmit = async (data: SiteSettingsFormValues) => {
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('siteTitle', data.siteTitle);
    formData.append('siteDescription', data.siteDescription);
    formData.append('postsPerPage', String(data.postsPerPage));
    formData.append('bannerEnabled', data.bannerEnabled ? 'on' : 'off');
    formData.append('bannerType', data.bannerType || 'image');
    formData.append('bannerImageUrl', data.bannerImageUrl || '');
    formData.append('bannerImageLink', data.bannerImageLink || '');
    formData.append('bannerImageAltText', data.bannerImageAltText || '');
    formData.append('bannerCustomHtml', data.bannerCustomHtml || '');
    formData.append('adminUsername', data.adminUsername || '');

    // Only include adminPassword in formData if it's explicitly provided by the user
    // OR if the username hasn't changed AND an initial password existed (meaning we're keeping the old one by submitting blank)
    if (data.adminPassword && data.adminPassword.length > 0) {
      formData.append('adminPassword', data.adminPassword);
    } else if (data.adminUsername && propsInitialSettings.adminUsername === data.adminUsername && propsInitialSettings.adminPassword) {
       // If username is same and initial password existed, an empty password field means keep old one.
       // The action.ts will handle this by not updating password if this field is empty in this scenario.
       // So, we can just send the empty string, or not append at all. For clarity, sending empty.
       formData.append('adminPassword', ''); 
    } else {
       // If username is new, or username changed and no new password provided, action.ts will handle validation.
       // For new username with no password, it's an error handled by Zod.
       // If username changed and password field is blank, it's an error.
       formData.append('adminPassword', data.adminPassword || ''); // send what's there (empty or not)
    }


    try {
      const result = await updateSiteSettingsAction(formData);
      if (result?.success) {
        toast({
          title: 'Settings Updated',
          description: 'Site settings have been saved successfully.',
        });
        router.refresh(); 
        // Update initialSettings with the newly saved data (excluding password for form reset)
        initialSettings = { 
          ...propsInitialSettings, 
          ...data, 
          adminPassword: propsInitialSettings.adminPassword // Keep current known password for next validation cycle if not changed
        }; 
        form.reset({ ...data, adminPassword: '' }); 
      } else {
        let toastDescription = result?.message || 'An unknown error occurred.';
        
        if (result?.errors) {
          const fieldErrorEntries = Object.entries(result.errors);
          if (fieldErrorEntries.length > 0) {
            fieldErrorEntries.forEach(([fieldName, errors]) => {
              if (Array.isArray(errors) && errors.length > 0) {
                form.setError(fieldName as keyof SiteSettingsFormValues, { type: 'server', message: errors.join(', ') });
              }
            });

            if (fieldErrorEntries.length === 1 && fieldErrorEntries[0][1] && fieldErrorEntries[0][1].length > 0) {
              toastDescription = fieldErrorEntries[0][1][0];
            } else {
              const errorFieldsSummary = fieldErrorEntries.map(entry => entry[0]).slice(0, 2).join(', ');
              toastDescription = `Validation failed for fields like ${errorFieldsSummary}${fieldErrorEntries.length > 2 ? '...' : ''}.`;
            }
          }
        }

        toast({
          variant: "destructive",
          title: 'Update Failed',
          description: `${toastDescription} Please review the form for specific details.`,
        });
      }
    } catch (error: any) {
      console.error("Error updating site settings:", error);
      toast({
        variant: "destructive",
        title: 'SubmissionError',
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
        <CardDescription>Manage general configuration for your website and admin access.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="general">General & Ads</TabsTrigger>
                <TabsTrigger value="admin_access">Admin Access</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-8">
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
                      <FormDescription>The main title for your website.</FormDescription>
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
                      <FormDescription>A short summary for search engines.</FormDescription>
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
                      <FormDescription>Number of posts on the homepage.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator />

                {/* Header Ad Slot Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Header Ad Slot (728x90)</h3>
                  <FormField
                    control={form.control}
                    name="bannerEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Ad Slot</FormLabel>
                          <FormDescription>Show an ad slot in the site header.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
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
                            <FormLabel>Ad Slot Type</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                                disabled={isSubmitting}
                              >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="image" /></FormControl>
                                  <FormLabel className="font-normal flex items-center"><ImageIcon className="w-4 h-4 mr-2" /> Image</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl><RadioGroupItem value="customHtml" /></FormControl>
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
                          <FormField control={form.control} name="bannerImageUrl" render={({ field }) => (<FormItem><FormLabel>Image URL</FormLabel><FormControl><Input type="url" placeholder="https://example.com/ad-image.jpg" {...field} disabled={isSubmitting} /></FormControl><FormDescription>Direct URL to the ad image.</FormDescription><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="bannerImageLink" render={({ field }) => (<FormItem><FormLabel>Image Link URL (Optional)</FormLabel><FormControl><Input type="url" placeholder="https://advertiser.com/product" {...field} disabled={isSubmitting} /></FormControl><FormDescription>Where the ad links.</FormDescription><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="bannerImageAltText" render={({ field }) => (<FormItem><FormLabel>Image Alt Text</FormLabel><FormControl><Input placeholder="Descriptive alt text" {...field} disabled={isSubmitting} /></FormControl><FormDescription>Important for accessibility.</FormDescription><FormMessage /></FormItem>)} />
                        </div>
                      )}
                      {watchedBannerType === 'customHtml' && (
                        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                          <FormField control={form.control} name="bannerCustomHtml" render={({ field }) => (<FormItem><FormLabel>Custom HTML Code</FormLabel><FormControl><Textarea placeholder="<div>Your ad script...</div>" {...field} rows={6} disabled={isSubmitting} /></FormControl><FormDescription>Paste your ad code. Ensure it's valid.</FormDescription><FormMessage /></FormItem>)} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="admin_access" className="space-y-6">
                {/* Admin Credentials Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-1">Admin Credentials</h3>
                  <p className="text-sm text-muted-foreground mb-4">Set or update the local admin username and password.</p>
                  
                  <Alert variant="destructive" className="mb-6">
                    <ShieldAlert className="h-5 w-5" />
                    <AlertTitle className="font-semibold">Security Warning!</AlertTitle>
                    <AlertDescription>
                      The password stored here is **plaintext** in a local file. This is **NOT SECURE** for production environments.
                      Use this local authentication for development or testing purposes only. For a live site, implement a robust authentication system with hashed passwords.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-6 p-4 border rounded-md bg-muted/30">
                    <FormField
                      control={form.control}
                      name="adminUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Username</FormLabel>
                          <FormControl>
                            <Input placeholder="admin" {...field} disabled={isSubmitting} autoComplete="username" />
                          </FormControl>
                          <FormDescription>Username to log into the admin panel. Leave empty to disable local admin login (not recommended if you need to manage settings).</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="adminPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} autoComplete="new-password"/>
                          </FormControl>
                          <FormDescription>
                            {propsInitialSettings?.adminUsername ? 'Enter a new password to change it. Leave blank ONLY if you are NOT changing the username AND a password was previously set (this will keep the current password).' : 'Set a password for the admin user.'}
                            {' Minimum 6 characters.'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {!propsInitialSettings.adminUsername && !watchedAdminUsername && (
                    <Alert className="mt-4">
                      <ShieldCheck className="h-5 w-5" />
                      <AlertTitle>Setup Admin Access</AlertTitle>
                      <AlertDescription>
                        To secure your admin panel, please set an Admin Username and Password.
                        If both are left empty, the admin panel might be unprotected or use default (insecure) credentials if any were previously set.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end pt-4">
              <Button type="submit" variant="primary" disabled={isSaveButtonDisabled}>
                {isSubmitting ? (
                  <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                   <><Save className="w-4 h-4 mr-2" />Save Settings</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


    
