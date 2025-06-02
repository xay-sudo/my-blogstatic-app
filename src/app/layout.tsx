
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import { getSettings } from '@/lib/settings-service';
import type { SiteSettings } from '@/types';
import { cookies } from 'next/headers'; // Import cookies
import RenderHtmlContent from '@/components/RenderHtmlContent';
import HeadScriptInjector from '@/components/HeadScriptInjector'; 

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.siteTitle || 'Blogstatic',
    description: settings.siteDescription || 'A modern blog platform with AI-powered tagging.',
  };
}

const SESSION_COOKIE_NAME = 'newstoday-adminsession';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings: SiteSettings = await getSettings();
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  const isAdminLoggedIn = !!sessionCookie && sessionCookie.value === 'true';

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
        {settings.globalHeaderScriptsEnabled && settings.globalHeaderScriptsCustomHtml && (
          <HeadScriptInjector htmlString={settings.globalHeaderScriptsCustomHtml} />
        )}
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col bg-background text-foreground">
        <Header siteSettings={settings} isAdminLoggedIn={isAdminLoggedIn} />
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
        <Toaster />
        <footer className="py-6 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} {settings.siteTitle || 'Blogstatic'}. All rights reserved.</p>
        </footer>
        {settings.globalFooterScriptsEnabled && settings.globalFooterScriptsCustomHtml && (
          <RenderHtmlContent
            htmlString={settings.globalFooterScriptsCustomHtml}
          />
        )}
      </body>
    </html>
  );
}
