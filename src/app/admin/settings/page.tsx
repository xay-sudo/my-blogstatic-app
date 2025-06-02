
import { getSettings } from '@/lib/settings-service';
import ClientSettingsPage from './client-settings-page';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { SiteSettings } from '@/types';

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

        {/* Script Settings Skeletons */}
        <div>
          <Skeleton className="h-6 w-1/3 mb-4" />
          <div className="flex items-center justify-between p-3 border rounded-lg mb-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
           <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        </div>

        <Skeleton className="h-px w-full" />

        {/* Admin Auth Skeletons */}
        <div>
          <Skeleton className="h-6 w-1/3 mb-4" />
           <Skeleton className="h-20 w-full mb-4" /> {/* For Alert */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2 mt-4">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-10 w-full" />
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
  const currentSettings: SiteSettings = await getSettings();
  // Pass the complete currentSettings object.
  // ClientSettingsPage will handle defaultValues for the form, including setting adminPassword to '' for display.
  return <ClientSettingsPage initialSettings={currentSettings} />;
}

export const dynamic = 'force-dynamic'; 
export const revalidate = 0; // Ensure fresh data on each load for settings

