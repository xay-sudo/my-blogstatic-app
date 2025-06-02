
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase-config'; // Import Firebase auth instance
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  type User 
} from 'firebase/auth';

interface AuthContextType {
  user: User | null; // Store the Firebase User object
  isAdminLoggedIn: boolean | null; // null when loading, true/false otherwise
  signInWithGoogle: () => Promise<void>;
  logoutAdmin: () => Promise<void>;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Start as true
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoadingAuth(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsLoadingAuth(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting the user and redirecting
      // No need to explicitly set user here, router.push('/admin') can be handled by login page useEffect
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setIsLoadingAuth(false); // Ensure loading is set to false on error
    }
    // setIsLoadingAuth(false) will be handled by onAuthStateChanged
  }, []);

  const logoutAdmin = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting user to null
      router.push('/'); // Redirect to homepage after logout
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
        // setIsLoadingAuth(false) will be handled by onAuthStateChanged
    }
  }, [router]);

  const isAdminLoggedIn = isLoadingAuth ? null : !!user;

  return (
    <AuthContext.Provider value={{ user, isAdminLoggedIn, signInWithGoogle, logoutAdmin, isLoadingAuth }}>
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
