
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase-config'; // Import Firebase auth instance
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup, // Added for Google Sign-In
  GoogleAuthProvider, // Added for Google Sign-In
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
  signInWithGoogle: () => Promise<void>; // Added for Google Sign-In
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
      const initErrorMessage = "Firebase auth service could not be initialized. This is critical. Please verify all NEXT_PUBLIC_FIREBASE_... environment variables in your deployment (e.g., Vercel settings) and check the browser console for detailed logs from 'firebase-config.ts'.";
      console.error("AuthContext: " + initErrorMessage);
      setAuthError(initErrorMessage); 
      setIsLoadingAuth(false);
      setUser(null);
      return; 
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoadingAuth(false);
      if (currentUser) {
        setAuthError(null); 
      }
    });

    return () => unsubscribe();
  }, []); 

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
    } catch (error: any) {
      console.error("Error signing up:", error);
      const displayError = error.message || "Failed to sign up. Please check your credentials or network.";
      setAuthError(displayError);
      throw error; 
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
    } catch (error: any) {
      console.error("Error signing in:", error);
      const displayError = error.message || "Failed to sign in. Please check your credentials or network.";
      setAuthError(displayError);
      throw error; 
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      const errMessage = "Google Sign-in failed: Firebase auth is not properly initialized. Check deployment configuration.";
      setAuthError(errMessage);
      console.error(errMessage);
      throw new Error(errMessage);
    }
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting the user and redirecting
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      let displayError = error.message || "Failed to sign in with Google.";
      if (error.code === 'auth/popup-closed-by-user') {
        displayError = 'Google Sign-in popup was closed before completion.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        displayError = 'Google Sign-in was cancelled.';
      } else if (error.code === 'auth/operation-not-allowed') {
        displayError = 'Google Sign-in is not enabled for this project. Please enable it in the Firebase console.';
      } else if (error.code === 'auth/network-request-failed') {
        displayError = 'Network error during Google Sign-in. Please check your connection.';
      }
      setAuthError(displayError);
      throw error; // Re-throw to be caught in the form if needed, or handled by UI
    } finally {
      // setIsLoadingAuth(false) will be handled by onAuthStateChanged
      // or if auth.currentUser remains, set it explicitly.
      if (auth.currentUser || !auth) setIsLoadingAuth(false);
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
        signInWithGoogle, // Exposed Google Sign-In
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
