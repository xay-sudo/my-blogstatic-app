
import type { Metadata } from 'next';
import Script from 'next/script'; // Import next/script
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';
import { AuthProvider } from '@/contexts/AuthContext'; 

export const metadata: Metadata = {
  title: 'Newstoday',
  description: 'A modern blog platform with AI-powered tagging.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
        
        {/* Added custom scripts */}
        <Script id="atoptions-config" strategy="beforeInteractive">
          {`
            atOptions = {
              'key' : 'fff490176317327192fad7d937b02c1b',
              'format' : 'iframe',
              'height' : 90,
              'width' : 728,
              'params' : {}
            };
          `}
        </Script>
        <Script 
          id="warningcanshipment-invoke"
          src="//warningcanshipment.com/fff490176317327192fad7d937b02c1b/invoke.js"
          strategy="afterInteractive" 
        />
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
