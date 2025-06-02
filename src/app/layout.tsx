
import type { Metadata } from 'next';
// import Script from 'next/script'; // No longer needed
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import { AuthProvider } from '@/contexts/AuthContext'; 
import { getSettings } from '@/lib/settings-service'; // Import getSettings

// export const metadata: Metadata = {
//   title: 'Newstoday',
//   description: 'A modern blog platform with AI-powered tagging.',
// };

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.siteTitle || 'Newstoday',
    description: settings.siteDescription || 'A modern blog platform with AI-powered tagging.',
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Scripts removed from here */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <AuthProvider> {/* Wrap with AuthProvider */}
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Toaster />
          <footer className="py-6 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Newstoday. All rights reserved.</p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
