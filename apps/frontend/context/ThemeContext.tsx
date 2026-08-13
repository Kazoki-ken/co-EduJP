'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'vocabjp-theme';

/* Runs before React hydrates so the first paint already has the right
   palette — otherwise a saved light theme flashes dark for a frame.
   Kept in sync with STORAGE_KEY above. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('${STORAGE_KEY}');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.style.colorScheme = t;
  } catch (e) {}
})();
`;

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The inline script already picked a theme; read it back rather than
  // guessing, so the provider and the DOM never disagree.
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    setThemeState(
      document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    );
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — the theme just will not persist */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(
      document.documentElement.classList.contains('dark') ? 'light' : 'dark',
    );
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
