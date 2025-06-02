
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase-config'; // Import Firebase auth instance
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import type { AuthCredential } from 'firebase/auth'; // For type only

export interface AuthFormValues {
  email: string;
  password?: string; // Password is not always needed, e.g. for OAuth
  credential?: AuthCredential; // For OAuth
}

interface AuthContextType {
  user: User | null; // Store the Firebase User object
  isAdminLoggedIn: boolean | null; // null when loading, true/false otherwise
  signUpWithEmailPassword: (values: AuthFormValues) => Promise<void>;
  signInWithEmailPassword: (values: AuthFormValues) => Promise<void>;
  logoutAdmin: () => Promise<void>;
  isLoadingAuth: boolean;
  authError: string | null;
  setAuthError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Start as true
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // This check is critical: if auth is undefined, Firebase didn't initialize.
    if (!auth) {
      const initErrorMessage = "Firebase auth service could not be initialized. This is critical. Please verify all NEXT_PUBLIC_FIREBASE_... environment variables in your deployment (e.g., Vercel settings) and check the browser console for detailed logs from 'firebase-config.ts'.";
      console.error("AuthContext: " + initErrorMessage);
      setAuthError(initErrorMessage); // Set a persistent error message
      setIsLoadingAuth(false);
      setUser(null);
      return; // Stop further execution of this effect
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoadingAuth(false);
      if (currentUser) {
        setAuthError(null); // Clear error on successful auth state change
      }
    });

    // Cleanup subscription on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => unsubscribe();
  }, []); // Empty dependency array: run once on mount.

  const signUpWithEmailPassword = useCallback(async ({ email, password }: AuthFormValues) => {
    if (!auth) {
      const errMessage = "Sign-up failed: Firebase auth is not properly initialized. Please check your deployment configuration and ensure all NEXT_PUBLIC_FIREBASE_ environment variables are correctly set.";
      setAuthError(errMessage);
      console.error(errMessage);
      throw new Error(errMessage);
    }
    if (!password) {
      const errMessage = "Password is required for sign up.";
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the user
    } catch (error: any) {
      console.error("Error signing up:", error);
      const displayError = error.message || "Failed to sign up. Please check your credentials or network.";
      setAuthError(displayError);
      throw error; // Re-throw to be caught in the form
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const signInWithEmailPassword = useCallback(async ({ email, password }: AuthFormValues) => {
    if (!auth) {
      const errMessage = "Sign-in failed: Firebase auth is not properly initialized. Please check your deployment configuration and ensure all NEXT_PUBLIC_FIREBASE_ environment variables are correctly set.";
      setAuthError(errMessage);
      console.error(errMessage);
      throw new Error(errMessage);
    }
    if (!password) {
      const errMessage = "Password is required for sign in.";
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the user
    } catch (error: any) {
      console.error("Error signing in:", error);
      const displayError = error.message || "Failed to sign in. Please check your credentials or network.";
      setAuthError(displayError);
      throw error; // Re-throw to be caught in the form
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const logoutAdmin = useCallback(async () => {
    if (!auth) {
      const errMessage = "Logout failed: Firebase auth is not properly initialized. Check deployment configuration.";
      setAuthError(errMessage);
      console.error(errMessage);
      return;
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await firebaseSignOut(auth);
      router.push('/'); 
    } catch (error: any)
    {
      console.error("Error signing out:", error);
      const displayError = error.message || "Failed to sign out.";
      setAuthError(displayError);
    } finally {
      // setIsLoadingAuth(false) will be handled by onAuthStateChanged
      // or if auth.currentUser remains, set it explicitly.
      if (auth.currentUser || !auth) setIsLoadingAuth(false); 
    }
  }, [router]);

  const isAdminLoggedIn = isLoadingAuth ? null : !!user;

  return (
    <AuthContext.Provider value={{ 
        user, 
        isAdminLoggedIn, 
        signUpWithEmailPassword,
        signInWithEmailPassword, 
        logoutAdmin, 
        isLoadingAuth,
        authError,
        setAuthError
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
