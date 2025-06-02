
'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link'; // Import Link
import { loginAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Signing In...
        </>
      ) : (
        <>
          <LogIn className="mr-2 h-5 w-5" /> Sign In
        </>
      )}
    </Button>
  );
}

const ADMIN_NOT_CONFIGURED_MESSAGE = 'Admin account is not configured. Please set it up in Site Settings.';

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, undefined);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state?.success === false && state.message && state.message !== ADMIN_NOT_CONFIGURED_MESSAGE) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: state.message,
      });
    }
    // Successful login redirect is handled by the server action, so no client-side redirect needed here.
    // However, a toast for success can still be useful if state.message confirms it before redirect.
    if (state?.success === true && state.message) {
       toast({
        title: 'Login Successful!',
        description: state.message, // e.g., "Redirecting to admin dashboard..."
      });
      // The redirect is now primarily handled by the server action.
      // router.push('/admin'); // This line can be removed if server action handles redirect
    }
  }, [state, toast, router]);

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Admin Login</CardTitle>
          <CardDescription>Enter your credentials to access the admin panel.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="admin"
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {state?.success === false && state.message && state.message !== ADMIN_NOT_CONFIGURED_MESSAGE && (
              <div className="flex items-center text-sm text-destructive">
                <AlertCircle className="mr-2 h-4 w-4" />
                <p>{state.message}</p>
              </div>
            )}
            <SubmitButton />
          </form>
           {state?.success === false && state.message === ADMIN_NOT_CONFIGURED_MESSAGE && (
              <div className="mt-4 text-center text-sm">
                <div className="flex items-center justify-center text-sm text-destructive mb-2">
                  <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
                  <p>{state.message}</p>
                </div>
                <Link href="/admin/settings" className="font-medium text-primary hover:underline">
                  Go to Site Settings to configure admin access.
                </Link>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
