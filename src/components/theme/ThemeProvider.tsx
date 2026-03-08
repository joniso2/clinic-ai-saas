'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read the actual DOM state — the blocking script may have already applied .dark
    // This avoids a toggle flicker where React thinks it's light but the page is dark
    const alreadyDark = document.documentElement.classList.contains('dark');
    const resolved: Theme = alreadyDark ? 'dark' : 'light';

    setTheme(resolved);
    setMounted(true);
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      applyTheme(next);
      return next;
    });
  }, []);

  const resolvedTheme = mounted ? theme : 'light';
  const ctxValue = useMemo<ThemeContextValue>(
    () => ({ theme: resolvedTheme, toggleTheme }),
    [resolvedTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={ctxValue}>
      {children}
    </ThemeContext.Provider>
  );
}
