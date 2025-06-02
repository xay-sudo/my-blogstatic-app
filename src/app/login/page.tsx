
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogIn } from 'lucide-react'; // Or a Google icon if you prefer

export default function LoginPage() {
  const { signInWithGoogle, isAdminLoggedIn, isLoadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in (and auth state is determined), redirect to admin
    if (isAdminLoggedIn === true) {
      router.push('/admin');
    }
  }, [isAdminLoggedIn, router]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      // Successful sign-in will trigger onAuthStateChanged in AuthContext,
      // which updates isAdminLoggedIn, and the useEffect above will handle redirection.
    } catch (error) {
      console.error("Login failed:", error);
      // Handle login failure (e.g., show a toast message)
    }
  };

  if (isLoadingAuth || isAdminLoggedIn === true) { // Show loading if auth is loading OR if already logged in (and about to redirect)
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
            <p className="text-muted-foreground">Loading...</p>
        </div>
    );
  }

  // If not logged in and auth state is determined (false), show login form
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] py-12">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Admin Login</CardTitle>
          <CardDescription>Sign in with Google to access the admin panel.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Button onClick={handleLogin} className="w-full" variant="primary">
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.5 512 0 398.8 0 256S110.5 0 244 0c78.2 0 139.5 30.4 188.8 78.2L370.5 140.7C343.1 116.9 300.8 96 244 96c-83.6 0-151.3 67.8-151.3 151.3s67.8 151.3 151.3 151.3c43.2 0 78.7-11.5 107.2-33.3 28.1-21.5 48.9-57.9 52.4-95.7H244V261.8h244z"></path></svg>
            Sign In with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
