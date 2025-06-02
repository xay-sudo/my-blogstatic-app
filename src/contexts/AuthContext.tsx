
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAdminLoggedIn: boolean | null; // null when loading, true/false otherwise
  loginAsAdmin: () => void;
  logoutAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'blogstatic_isAdmin';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check localStorage on initial client-side load
    try {
      const storedIsAdmin = localStorage.getItem(LOCAL_STORAGE_KEY);
      setIsAdminLoggedIn(storedIsAdmin === 'true');
    } catch (error) {
      console.error("Could not access localStorage:", error);
      setIsAdminLoggedIn(false); // Default to not logged in if localStorage fails
    }
  }, []);

  const loginAsAdmin = useCallback(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
    } catch (error) {
      console.error("Could not set localStorage:", error);
    }
    setIsAdminLoggedIn(true);
  }, []);

  const logoutAdmin = useCallback(() => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.error("Could not remove from localStorage:", error);
    }
    setIsAdminLoggedIn(false);
    router.push('/'); // Redirect to homepage after logout
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAdminLoggedIn, loginAsAdmin, logoutAdmin }}>
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
