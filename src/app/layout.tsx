
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import { getSettings } from '@/lib/settings-service';
import type { SiteSettings } from '@/types';
import { cookies } from 'next/headers'; // Import cookies
import RenderHtmlContent from '@/components/RenderHtmlContent';
import HeadScriptInjector from '@/components/HeadScriptInjector';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';
// BannerAd is no longer imported here as it's rendered within Header

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Updated to import Inter font as configured in tailwind.config.ts */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {settings.globalHeaderScriptsEnabled && settings.globalHeaderScriptsCustomHtml && (
          <HeadScriptInjector htmlString={settings.globalHeaderScriptsCustomHtml} />
        )}
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col bg-background text-foreground">
        <ThemeProvider storageKey="newstoday-theme" defaultTheme="light">
          {/* Banner Ad is now rendered by the Header component */}
          <Header siteSettings={settings} isAdminLoggedIn={isAdminLoggedIn} />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Toaster />
          <footer className="bg-muted/50 py-8 text-muted-foreground text-sm">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <p className="text-center md:text-left">&copy; {new Date().getFullYear()} {settings.siteTitle || 'Blogstatic'}. All rights reserved.</p>
                <nav className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2">
                  <Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
                  <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                </nav>
              </div>
              <div className="flex justify-center md:justify-end items-center space-x-4 mt-6">
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-primary transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:text-primary transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-primary transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-primary transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                 <a href="#" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-primary transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
          </footer>
          {settings.globalFooterScriptsEnabled && settings.globalFooterScriptsCustomHtml && (
            <RenderHtmlContent
              htmlString={settings.globalFooterScriptsCustomHtml}
            />
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
