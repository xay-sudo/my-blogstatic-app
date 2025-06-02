
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
  };
  return <ClientSettingsPage initialSettings={initialData} />;
}

export const dynamic = 'force-dynamic'; // Ensure fresh data on each load for settings
