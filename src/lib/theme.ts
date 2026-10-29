'use client';

import { useState, useEffect, useCallback } from 'react';

const THEME_STORAGE_KEY = 'khatma_theme';
const THEME_EVENT_NAME = 'khatma-theme-change';

export function getInitialDarkMode(defaultDark = false): boolean {
  if (typeof window === 'undefined') return defaultDark;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return document.documentElement.classList.contains('dark');
  } catch {
    return defaultDark;
  }
}

export function applyDarkModeToDocument(isDark: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    window.dispatchEvent(new CustomEvent(THEME_EVENT_NAME, { detail: { isDark } }));
  } catch {}
}

export function useKhatmaTheme() {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const initial = getInitialDarkMode(false);
    setIsDark(initial);
    if (initial) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isDark: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isDark === 'boolean') {
        setIsDark(customEvent.detail.isDark);
      }
    };

    window.addEventListener(THEME_EVENT_NAME, handleThemeChange);
    return () => {
      window.removeEventListener(THEME_EVENT_NAME, handleThemeChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const currentlyDark =
      typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const next = !currentlyDark;
    setIsDark(next);
    applyDarkModeToDocument(next);
  }, []);

  const setDarkMode = useCallback((next: boolean) => {
    setIsDark(next);
    applyDarkModeToDocument(next);
  }, []);

  return { isDark, toggleTheme, setDarkMode };
}
