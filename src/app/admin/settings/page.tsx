
import { getSettings } from '@/lib/settings-service';
import ClientSettingsPage from './client-settings-page';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

function SettingsPageSkeleton() {
  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <Skeleton className="h-8 w-1/2 mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-8">
        {/* General Settings Skeletons */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-10 w-1/2" />
        </div>
        
        <Skeleton className="h-px w-full" /> 

        {/* Banner Settings Skeletons */}
        <div>
          <Skeleton className="h-6 w-1/3 mb-4" />
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
          <div className="mt-6 space-y-6 pl-2 ml-1">
             <Skeleton className="h-5 w-1/5 mb-2" />
             <div className="flex space-x-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
             </div>
            <div className="space-y-4 p-4 border rounded-md">
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-2">
          <Skeleton className="h-10 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}


export default async function AdminSettingsPage() {
  const currentSettings = await getSettings();
  // Fallback in case settings are not fully formed, though getSettings should handle defaults.
  const initialData = {
    siteTitle: currentSettings.siteTitle || "Newstoday",
    siteDescription: currentSettings.siteDescription || "Your awesome blog.",
    postsPerPage: currentSettings.postsPerPage || 6,
    bannerEnabled: currentSettings.bannerEnabled || false,
    bannerType: currentSettings.bannerType || 'image',
    bannerImageUrl: currentSettings.bannerImageUrl || '',
    bannerImageLink: currentSettings.bannerImageLink || '',
    bannerImageAltText: currentSettings.bannerImageAltText || 'Banner',
    bannerCustomHtml: currentSettings.bannerCustomHtml || '',
  };
  return <ClientSettingsPage initialSettings={initialData} />;
}

export const dynamic = 'force-dynamic'; // Ensure fresh data on each load for settings
