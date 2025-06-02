
'use client';

import { useAuth, type AuthFormValues } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle, LogIn } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import GoogleIcon from '@/components/GoogleIcon'; // Import the GoogleIcon

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const signUpFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], 
});


export default function LoginPage() {
  const { 
    signInWithEmailPassword, 
    signUpWithEmailPassword, 
    signInWithGoogle, // Added Google Sign-In
    isAdminLoggedIn, 
    isLoadingAuth, 
    authError,
    setAuthError 
  } = useAuth();
  const router = useRouter();
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const formSchema = isSignUpMode ? signUpFormSchema : loginFormSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      ...(isSignUpMode && { confirmPassword: '' }),
    },
  });

  useEffect(() => {
    if (isAdminLoggedIn === true) {
      router.push('/admin');
    }
  }, [isAdminLoggedIn, router]);
  
  useEffect(() => {
    setAuthError(null);
    form.reset({ email: '', password: '', ...(isSignUpMode && { confirmPassword: '' }) });
  }, [isSignUpMode, setAuthError, form]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setAuthError(null); 
    try {
      if (isSignUpMode) {
        await signUpWithEmailPassword(values as AuthFormValues);
      } else {
        await signInWithEmailPassword(values as AuthFormValues);
      }
    } catch (error: any) {
      console.error(isSignUpMode ? "Sign up failed:" : "Login failed:", error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // onAuthStateChanged in AuthContext will redirect if successful
    } catch (error: any) {
      console.error("Google Sign in failed on page:", error.message);
      // AuthError is already set in context, so no need to set it here explicitly unless specific message is needed
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  const toggleMode = () => {
    setIsSignUpMode(!isSignUpMode);
    form.reset(); 
    setAuthError(null); 
  };

  if (isLoadingAuth && isAdminLoggedIn !== false) { 
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  if (isAdminLoggedIn === true) {
     return (
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
            <p className="text-muted-foreground">Redirecting to admin...</p>
        </div>
    );
  }


  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">
            {isSignUpMode ? 'Create Admin Account' : 'Admin Login'}
          </CardTitle>
          <CardDescription>
            {isSignUpMode ? 'Fill in the details to create a new admin account.' : 'Sign in with your email and password, or use Google.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@example.com" {...field} disabled={isLoadingAuth || form.formState.isSubmitting || isGoogleLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isLoadingAuth || form.formState.isSubmitting || isGoogleLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isSignUpMode && (
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} disabled={isLoadingAuth || form.formState.isSubmitting || isGoogleLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {authError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" variant="primary" disabled={isLoadingAuth || form.formState.isSubmitting || isGoogleLoading}>
                {isLoadingAuth || form.formState.isSubmitting ? (isSignUpMode ? 'Creating Account...' : 'Signing In...') : (isSignUpMode ? 'Create Account' : 'Sign In')}
                <LogIn className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </Form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleSignIn}
            disabled={isLoadingAuth || isGoogleLoading || form.formState.isSubmitting}
          >
            {isGoogleLoading ? (
              'Signing in with Google...'
            ) : (
              <>
                <GoogleIcon className="mr-2 h-5 w-5" />
                Sign in with Google
              </>
            )}
          </Button>

        </CardContent>
        <CardFooter className="flex flex-col items-center">
            <Button variant="link" onClick={toggleMode} disabled={isLoadingAuth || isGoogleLoading || form.formState.isSubmitting}>
              {isSignUpMode ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
