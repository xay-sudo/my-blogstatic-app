
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
import { Loader2 as Loader2Icon, Save, ShieldAlert, ShieldCheck, TerminalSquare, Heading1 } from 'lucide-react';
import { updateSiteSettingsAction } from '@/app/actions'; 
import type { SiteSettings } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const CLIENT_DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "Newstoday",
  siteDescription: "A modern blog platform with AI-powered tagging.",
  postsPerPage: 6,
  adminUsername: '',
  adminPassword: '',
  globalHeaderScriptsEnabled: false,
  globalHeaderScriptsCustomHtml: '',
  globalFooterScriptsEnabled: false,
  globalFooterScriptsCustomHtml: '',
};


const siteSettingsFormSchema = z.object({
  siteTitle: z.string().min(3, { message: 'Site title must be at least 3 characters long.' }).max(100, {message: 'Site title must be 100 characters or less.'}),
  siteDescription: z.string().min(10, { message: 'Site description must be at least 10 characters long.' }).max(300, {message: 'Site description must be 300 characters or less.'}),
  postsPerPage: z.coerce
    .number({ invalid_type_error: 'Must be a number.'})
    .int({ message: 'Must be a whole number.'})
    .min(1, { message: 'Must display at least 1 post per page.' })
    .max(50, { message: 'Cannot display more than 50 posts per page.' }),
  adminUsername: z.string().min(3, {message: "Admin username must be at least 3 characters."}).max(50, {message: "Admin username must be 50 characters or less."}).optional().or(z.literal('')),
  adminPassword: z.string().min(6, {message: "Admin password must be at least 6 characters."}).max(100, {message: "Admin password must be 100 characters or less."}).optional().or(z.literal('')),
  globalHeaderScriptsEnabled: z.boolean().default(false),
  globalHeaderScriptsCustomHtml: z.string().optional(),
  globalFooterScriptsEnabled: z.boolean().default(false),
  globalFooterScriptsCustomHtml: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.globalHeaderScriptsEnabled && (!data.globalHeaderScriptsCustomHtml || data.globalHeaderScriptsCustomHtml.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Custom HTML for header scripts is required when enabled.',
      path: ['globalHeaderScriptsCustomHtml'],
    });
  }

  if (data.globalFooterScriptsEnabled && (!data.globalFooterScriptsCustomHtml || data.globalFooterScriptsCustomHtml.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Custom HTML for footer scripts is required when enabled.',
      path: ['globalFooterScriptsCustomHtml'],
    });
  }

  const usernameProvided = data.adminUsername && data.adminUsername.trim().length > 0;
  const passwordFieldHasInput = data.adminPassword && data.adminPassword.length > 0;
  const initialUsername = initialSettings?.adminUsername || '';
  const initialPasswordExists = !!initialSettings?.adminPassword && initialSettings.adminPassword.length > 0;

  if (usernameProvided) {
    if (initialUsername === '' || data.adminUsername !== initialUsername) {
      if (!passwordFieldHasInput) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A new password is required when setting or changing the username.",
          path: ['adminPassword'],
        });
      }
    }
    else if (data.adminUsername === initialUsername && !initialPasswordExists) {
        if (!passwordFieldHasInput) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Password is required when setting up admin access for the first time.",
                path: ['adminPassword'],
            });
        }
    }
  } else if (passwordFieldHasInput && !usernameProvided) { 
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Username is required if a password is set or being entered.",
      path: ['adminUsername'],
    });
  }
});

type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;

interface ClientSettingsPageProps {
  initialSettings: SiteSettings;
}

let initialSettings: SiteSettings | null = null; 

export default function ClientSettingsPage({ initialSettings: propsInitialSettings }: ClientSettingsPageProps) {
  initialSettings = propsInitialSettings; 
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsFormSchema),
    defaultValues: {
      siteTitle: propsInitialSettings?.siteTitle || CLIENT_DEFAULT_SETTINGS.siteTitle,
      siteDescription: propsInitialSettings?.siteDescription || CLIENT_DEFAULT_SETTINGS.siteDescription,
      postsPerPage: propsInitialSettings?.postsPerPage || CLIENT_DEFAULT_SETTINGS.postsPerPage,
      adminUsername: propsInitialSettings?.adminUsername || CLIENT_DEFAULT_SETTINGS.adminUsername,
      adminPassword: '', 
      globalHeaderScriptsEnabled: propsInitialSettings?.globalHeaderScriptsEnabled || CLIENT_DEFAULT_SETTINGS.globalHeaderScriptsEnabled,
      globalHeaderScriptsCustomHtml: propsInitialSettings?.globalHeaderScriptsCustomHtml || CLIENT_DEFAULT_SETTINGS.globalHeaderScriptsCustomHtml,
      globalFooterScriptsEnabled: propsInitialSettings?.globalFooterScriptsEnabled || CLIENT_DEFAULT_SETTINGS.globalFooterScriptsEnabled,
      globalFooterScriptsCustomHtml: propsInitialSettings?.globalFooterScriptsCustomHtml || CLIENT_DEFAULT_SETTINGS.globalFooterScriptsCustomHtml,
    },
    mode: 'onChange',
  });
  
  useEffect(() => {
    initialSettings = propsInitialSettings; 
    form.reset({
      siteTitle: propsInitialSettings?.siteTitle || CLIENT_DEFAULT_SETTINGS.siteTitle,
      siteDescription: propsInitialSettings?.siteDescription || CLIENT_DEFAULT_SETTINGS.siteDescription,
      postsPerPage: propsInitialSettings?.postsPerPage || CLIENT_DEFAULT_SETTINGS.postsPerPage,
      adminUsername: propsInitialSettings?.adminUsername || CLIENT_DEFAULT_SETTINGS.adminUsername,
      adminPassword: '',
      globalHeaderScriptsEnabled: propsInitialSettings?.globalHeaderScriptsEnabled || CLIENT_DEFAULT_SETTINGS.globalHeaderScriptsEnabled,
      globalHeaderScriptsCustomHtml: propsInitialSettings?.globalHeaderScriptsCustomHtml || CLIENT_DEFAULT_SETTINGS.globalHeaderScriptsCustomHtml,
      globalFooterScriptsEnabled: propsInitialSettings?.globalFooterScriptsEnabled || CLIENT_DEFAULT_SETTINGS.globalFooterScriptsEnabled,
      globalFooterScriptsCustomHtml: propsInitialSettings?.globalFooterScriptsCustomHtml || CLIENT_DEFAULT_SETTINGS.globalFooterScriptsCustomHtml,
    });
  }, [propsInitialSettings, form]);

  const watchedAdminUsername = form.watch('adminUsername');
  const watchedAdminPassword = form.watch('adminPassword');
  const watchedGlobalHeaderScriptsEnabled = form.watch('globalHeaderScriptsEnabled');
  const watchedGlobalFooterScriptsEnabled = form.watch('globalFooterScriptsEnabled');

  const generalSettingFields: (keyof SiteSettingsFormValues)[] = [
    'siteTitle', 'siteDescription', 'postsPerPage', 
    'globalHeaderScriptsEnabled', 'globalHeaderScriptsCustomHtml',
    'globalFooterScriptsEnabled', 'globalFooterScriptsCustomHtml',
  ];
  const isAdminSettingsDirty = form.formState.dirtyFields.adminUsername || (watchedAdminPassword && watchedAdminPassword.length > 0);
  const isGeneralSettingsDirty = generalSettingFields.some(field => form.formState.dirtyFields[field]);


  const isGeneralSaveDisabled = isSubmitting || !isGeneralSettingsDirty;
  const isAdminSaveDisabled = isSubmitting || !isAdminSettingsDirty;


  const onSubmit = async (data: SiteSettingsFormValues) => {
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('siteTitle', data.siteTitle);
    formData.append('siteDescription', data.siteDescription);
    formData.append('postsPerPage', String(data.postsPerPage));
    formData.append('adminUsername', data.adminUsername || '');
    formData.append('globalHeaderScriptsEnabled', data.globalHeaderScriptsEnabled ? 'on' : 'off');
    formData.append('globalHeaderScriptsCustomHtml', data.globalHeaderScriptsCustomHtml || '');
    formData.append('globalFooterScriptsEnabled', data.globalFooterScriptsEnabled ? 'on' : 'off');
    formData.append('globalFooterScriptsCustomHtml', data.globalFooterScriptsCustomHtml || '');


    if (data.adminPassword && data.adminPassword.length > 0) {
      formData.append('adminPassword', data.adminPassword);
    } else if (data.adminUsername && propsInitialSettings.adminUsername === data.adminUsername && propsInitialSettings.adminPassword) {
       formData.append('adminPassword', ''); 
    } else {
       formData.append('adminPassword', data.adminPassword || ''); 
    }


    try {
      const result = await updateSiteSettingsAction(formData);
      if (result?.success) {
        toast({
          title: 'Settings Updated',
          description: 'Site settings have been saved successfully.',
        });
        router.refresh(); 
        
        const newInitialSettings = { ...propsInitialSettings, ...data };
        if (!data.adminPassword || data.adminPassword.length === 0) {
          if (propsInitialSettings.adminUsername === data.adminUsername && propsInitialSettings.adminPassword) {
             newInitialSettings.adminPassword = propsInitialSettings.adminPassword;
          }
        }
        initialSettings = {
           ...propsInitialSettings, 
           ...data, 
           adminPassword: (data.adminPassword && data.adminPassword.length > 0) 
                          ? data.adminPassword 
                          : (data.adminUsername === propsInitialSettings.adminUsername && propsInitialSettings.adminPassword)
                            ? propsInitialSettings.adminPassword 
                            : '' 
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
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="scripts">Scripts</TabsTrigger>
                <TabsTrigger value="admin_access">Admin Access</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-8">
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
                <div className="flex justify-end pt-4">
                  <Button type="submit" variant="primary" disabled={isGeneralSaveDisabled || isAdminSettingsDirty}>
                    {isSubmitting ? (
                      <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" />Save General Settings</>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="scripts" className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Heading1 className="w-5 h-5 mr-2 text-primary" />
                    Global Header Scripts
                  </h3>
                  <FormField
                    control={form.control}
                    name="globalHeaderScriptsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Global Header Scripts</FormLabel>
                          <FormDescription>Inject custom HTML/scripts into the &lt;head&gt; tag.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {watchedGlobalHeaderScriptsEnabled && (
                     <div className="mt-6 space-y-6 pl-2 border-l-2 border-primary/50 ml-1">
                        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                            <FormField
                                control={form.control}
                                name="globalHeaderScriptsCustomHtml"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Custom HTML/Script for Header</FormLabel>
                                    <FormControl>
                                    <Textarea
                                        placeholder="<!-- Your analytics, meta tags, or other head scripts here -->"
                                        {...field}
                                        rows={8}
                                        disabled={isSubmitting}
                                    />
                                    </FormControl>
                                    <FormDescription>
                                    This code will be injected on all pages inside the &lt;head&gt; tag.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <TerminalSquare className="w-5 h-5 mr-2 text-primary" />
                    Global Footer Scripts
                  </h3>
                  <FormField
                    control={form.control}
                    name="globalFooterScriptsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Global Footer Scripts</FormLabel>
                          <FormDescription>Inject custom HTML/scripts before the closing &lt;/body&gt; tag.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {watchedGlobalFooterScriptsEnabled && (
                     <div className="mt-6 space-y-6 pl-2 border-l-2 border-primary/50 ml-1">
                        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                            <FormField
                                control={form.control}
                                name="globalFooterScriptsCustomHtml"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Custom HTML/Script for Footer</FormLabel>
                                    <FormControl>
                                    <Textarea
                                        placeholder="<!-- Your analytics, ad, or other scripts here -->"
                                        {...field}
                                        rows={8}
                                        disabled={isSubmitting}
                                    />
                                    </FormControl>
                                    <FormDescription>
                                    This code will be injected on all pages. Useful for analytics, global ad network scripts, etc.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </div>
                  )}
                </div>


                <div className="flex justify-end pt-4">
                  <Button type="submit" variant="primary" disabled={isGeneralSaveDisabled || isAdminSettingsDirty}>
                    {isSubmitting ? (
                      <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" />Save Scripts Settings</>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="admin_access" className="space-y-6">
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
                <div className="flex justify-end pt-4">
                  <Button type="submit" variant="primary" disabled={isAdminSaveDisabled || isGeneralSettingsDirty}>
                    {isSubmitting ? (
                      <><Loader2Icon className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" />Save Admin Access</>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
