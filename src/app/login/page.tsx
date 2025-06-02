
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const { loginAsAdmin, isAdminLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in (and auth state is determined), redirect to admin
    if (isAdminLoggedIn === true) {
      router.push('/admin');
    }
  }, [isAdminLoggedIn, router]);

  const handleLogin = () => {
    loginAsAdmin();
    router.push('/admin'); // Explicitly redirect after attempting login
  };

  // Show loading state while auth status is being determined or if already logged in
  if (isAdminLoggedIn === true || isAdminLoggedIn === null) {
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
          <CardDescription>Please log in to access the admin panel.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <p className="text-sm text-muted-foreground mb-6 text-center">
            This is a simplified login for prototype purposes.
          </p>
          <Button onClick={handleLogin} className="w-full" variant="primary">
            <LogIn className="mr-2 h-4 w-4" /> Log In as Admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
