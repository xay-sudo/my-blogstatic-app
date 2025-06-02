
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
    if (!auth) {
      console.error(
        "AuthContext: Firebase auth object is not available. " +
        "This usually indicates a problem with Firebase initialization, " +
        "possibly due to missing environment variables. " +
        "Please check your Vercel/deployment environment variables and " +
        "the browser console for more specific Firebase initialization errors from 'firebase-config.ts'."
      );
      setIsLoadingAuth(false);
      setUser(null);
      setAuthError("Firebase initialization failed. Critical environment variables might be missing in your deployment settings.");
      return; // Don't try to subscribe if auth object isn't there
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoadingAuth(false);
      if (currentUser) {
        setAuthError(null); // Clear error on successful auth state change
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // `auth` is not a reactive dependency here; its availability is determined at module load.

  const signUpWithEmailPassword = useCallback(async ({ email, password }: AuthFormValues) => {
    if (!auth) {
      const errMessage = "Sign-up failed: Firebase is not initialized. Check deployment configuration.";
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
    if (!password) {
      setAuthError("Password is required for sign up.");
      throw new Error("Password is required for sign up.");
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the user
    } catch (error: any) {
      console.error("Error signing up:", error);
      setAuthError(error.message || "Failed to sign up.");
      throw error; // Re-throw to be caught in the form
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const signInWithEmailPassword = useCallback(async ({ email, password }: AuthFormValues) => {
    if (!auth) {
      const errMessage = "Sign-in failed: Firebase is not initialized. Check deployment configuration.";
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
    if (!password) {
      setAuthError("Password is required for sign in.");
      throw new Error("Password is required for sign in.");
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the user
    } catch (error: any) {
      console.error("Error signing in:", error);
      setAuthError(error.message || "Failed to sign in.");
      throw error; // Re-throw to be caught in the form
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const logoutAdmin = useCallback(async () => {
    if (!auth) {
      const errMessage = "Logout failed: Firebase is not initialized. Check deployment configuration.";
      setAuthError(errMessage);
      console.error(errMessage);
      return;
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      await firebaseSignOut(auth);
      router.push('/'); 
    } catch (error: any) {
      console.error("Error signing out:", error);
      setAuthError(error.message || "Failed to sign out.");
    } finally {
      // setIsLoadingAuth(false) will be handled by onAuthStateChanged
      // or if auth.currentUser remains, set it explicitly.
      if (auth.currentUser) setIsLoadingAuth(false); 
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
