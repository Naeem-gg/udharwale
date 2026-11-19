'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'dark' | 'light';

const THEME_TOKENS: Record<Theme, Record<string, string>> = {
  light: {
    '--background': '#f4f1ec',
    '--foreground': '#14201c',
    '--card': '#fffcf7',
    '--card-foreground': '#14201c',
    '--primary': '#0f766e',
    '--primary-foreground': '#ffffff',
    '--secondary': '#ebe6df',
    '--secondary-foreground': '#1f2d28',
    '--muted': '#ebe6df',
    '--muted-foreground': '#5f6f68',
    '--accent': 'rgba(15, 118, 110, 0.1)',
    '--accent-foreground': '#0f766e',
    '--destructive': '#c23b4a',
    '--destructive-foreground': '#ffffff',
    '--border': 'rgba(20, 32, 28, 0.1)',
    '--input': 'rgba(20, 32, 28, 0.12)',
    '--ring': 'rgba(15, 118, 110, 0.45)',
    '--bg-base': '#f4f1ec',
    '--bg-surface': '#fffcf7',
    '--bg-raised': '#ebe6df',
    '--bg-overlay': '#ddd6cc',
    '--bg-glass': 'rgba(255, 252, 247, 0.92)',
    '--border-soft': 'rgba(20, 32, 28, 0.08)',
    '--border-muted': 'rgba(20, 32, 28, 0.05)',
    '--border-bright': 'rgba(15, 118, 110, 0.28)',
    '--violet': '#0f766e',
    '--violet-light': '#0d9488',
    '--violet-bright': '#14b8a6',
    '--violet-glow': 'rgba(15, 118, 110, 0.12)',
    '--violet-glow-soft': 'rgba(15, 118, 110, 0.06)',
    '--cyan': '#0e7490',
    '--cyan-light': '#0891b2',
    '--cyan-glow': 'rgba(14, 116, 144, 0.12)',
    '--emerald': '#047857',
    '--emerald-light': '#059669',
    '--emerald-glow': 'rgba(4, 120, 87, 0.1)',
    '--rose': '#c23b4a',
    '--rose-light': '#b91c1c',
    '--rose-glow': 'rgba(194, 59, 74, 0.1)',
    '--amber': '#b45309',
    '--text-primary': '#14201c',
    '--text-secondary': '#3d4f47',
    '--text-muted': '#5f6f68',
    '--text-faint': '#8a9891',
    '--shadow-violet': '0 1px 2px rgba(20, 32, 28, 0.06)',
    '--shadow-card': '0 1px 2px rgba(20, 32, 28, 0.04)',
    '--shadow-glow': 'none',
    '--shadow-elevated': '0 8px 24px rgba(20, 32, 28, 0.08)',
  },
  dark: {
    '--background': '#0d1210',
    '--foreground': '#eef3f0',
    '--card': '#151b18',
    '--card-foreground': '#eef3f0',
    '--primary': '#2dd4bf',
    '--primary-foreground': '#042f2e',
    '--secondary': '#1c2420',
    '--secondary-foreground': '#eef3f0',
    '--muted': '#1c2420',
    '--muted-foreground': '#9aaba3',
    '--accent': 'rgba(45, 212, 191, 0.12)',
    '--accent-foreground': '#5eead4',
    '--destructive': '#f07178',
    '--destructive-foreground': '#1a0a0c',
    '--border': 'rgba(238, 243, 240, 0.1)',
    '--input': 'rgba(238, 243, 240, 0.12)',
    '--ring': 'rgba(45, 212, 191, 0.45)',
    '--bg-base': '#0d1210',
    '--bg-surface': '#151b18',
    '--bg-raised': '#1c2420',
    '--bg-overlay': '#24302b',
    '--bg-glass': 'rgba(21, 27, 24, 0.94)',
    '--border-soft': 'rgba(238, 243, 240, 0.08)',
    '--border-muted': 'rgba(238, 243, 240, 0.05)',
    '--border-bright': 'rgba(45, 212, 191, 0.28)',
    '--violet': '#2dd4bf',
    '--violet-light': '#5eead4',
    '--violet-bright': '#99f6e4',
    '--violet-glow': 'rgba(45, 212, 191, 0.12)',
    '--violet-glow-soft': 'rgba(45, 212, 191, 0.06)',
    '--cyan': '#22d3ee',
    '--cyan-light': '#67e8f9',
    '--cyan-glow': 'rgba(34, 211, 238, 0.12)',
    '--emerald': '#34d399',
    '--emerald-light': '#6ee7b7',
    '--emerald-glow': 'rgba(52, 211, 153, 0.12)',
    '--rose': '#fb7185',
    '--rose-light': '#fda4af',
    '--rose-glow': 'rgba(251, 113, 133, 0.12)',
    '--amber': '#fbbf24',
    '--text-primary': '#eef3f0',
    '--text-secondary': '#b7c4bd',
    '--text-muted': '#8a9891',
    '--text-faint': '#5f6f68',
    '--shadow-violet': '0 1px 2px rgba(0, 0, 0, 0.35)',
    '--shadow-card': '0 1px 2px rgba(0, 0, 0, 0.35)',
    '--shadow-glow': 'none',
    '--shadow-elevated': '0 10px 28px rgba(0, 0, 0, 0.4)',
  },
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('udharwale-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return 'light';
};

const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.remove(theme === 'dark' ? 'light' : 'dark');
  root.classList.add(theme);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  Object.entries(THEME_TOKENS[theme]).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const setTheme = useCallback((nextTheme: Theme) => {
    applyTheme(nextTheme);
    window.localStorage.setItem('udharwale-theme', nextTheme);
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      window.localStorage.setItem('udharwale-theme', nextTheme);
      return nextTheme;
    });
  }, []);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem('udharwale-theme', theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
