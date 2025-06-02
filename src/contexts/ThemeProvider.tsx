
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'newstoday-theme',
}: ThemeProviderProps) {
  // Initialize theme state. On the server, this will be `defaultTheme`.
  // On the client, this will be `defaultTheme` initially, then potentially updated by the first useEffect.
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    // This effect runs only on the client after the initial render.
    // It determines the theme from localStorage or system preference and updates the state.
    let resolvedClientTheme = defaultTheme;
    try {
      const storedTheme = window.localStorage.getItem(storageKey) as Theme | null;
      if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
        resolvedClientTheme = storedTheme;
      } else {
        // If no stored theme, check system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemPrefersDark) {
          resolvedClientTheme = 'dark';
        }
        // Else, it remains the defaultTheme (e.g., 'light' as set in useState initially)
      }
    } catch (e) {
      console.error('Error reading theme from localStorage or system preference:', e);
      // Fallback to defaultTheme if error
    }
    
    // Update the theme state with the resolved client-side theme.
    // This will trigger the second useEffect to apply classes and save to localStorage.
    setThemeState(resolvedClientTheme);

  }, [defaultTheme, storageKey]); // Runs once on client mount to determine initial client theme


  useEffect(() => {
    // This effect applies the theme to the document (<html> tag) and saves to localStorage
    // whenever the `theme` state changes. It's crucial this runs client-side.
    // The `theme` state is initialized above and updated by the first useEffect or toggleTheme.
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
      try {
        window.localStorage.setItem(storageKey, theme);
      } catch (e) {
        console.error('Error saving theme to localStorage:', e);
      }
    }
  }, [theme, storageKey]); // Runs when theme or storageKey changes, on client side

  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    // The useEffect above, dependent on `theme`, will handle applying the class and saving to localStorage.
  }, []);
  
  // ThemeContext.Provider MUST always wrap children to make the context available.
  // The `theme` value provided will be `defaultTheme` on server and initial client render,
  // then update to the resolved client theme after the first useEffect runs.
  // Child components like `ThemeToggle` use their own `mounted` state to avoid UI flicker based on
  // the initial potentially incorrect theme.
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
