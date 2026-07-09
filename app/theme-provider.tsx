'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'dark' | 'light';

const THEME_TOKENS: Record<Theme, Record<string, string>> = {
  dark: {
    '--background': '#080c18',
    '--foreground': '#eef2ff',
    '--card': 'rgba(8, 12, 24, 0.84)',
    '--card-foreground': '#eef2ff',
    '--primary': '#7c3aed',
    '--primary-foreground': '#ffffff',
    '--secondary': 'rgba(14, 20, 38, 0.86)',
    '--secondary-foreground': '#eef2ff',
    '--muted': 'rgba(14, 20, 38, 0.7)',
    '--muted-foreground': '#9ca3c4',
    '--accent': 'rgba(124, 58, 237, 0.12)',
    '--accent-foreground': '#c084fc',
    '--destructive': '#f43f5e',
    '--destructive-foreground': '#ffffff',
    '--border': 'rgba(139, 92, 246, 0.14)',
    '--input': 'rgba(139, 92, 246, 0.16)',
    '--ring': 'rgba(168, 85, 247, 0.55)',
    '--bg-base': '#03040a',
    '--bg-surface': '#080c18',
    '--bg-raised': '#0e1426',
    '--bg-overlay': '#141c30',
    '--bg-glass': 'rgba(8, 12, 24, 0.72)',
    '--border-soft': 'rgba(139, 92, 246, 0.12)',
    '--border-muted': 'rgba(139, 92, 246, 0.06)',
    '--border-bright': 'rgba(139, 92, 246, 0.28)',
    '--violet': '#7c3aed',
    '--violet-light': '#a855f7',
    '--violet-bright': '#c084fc',
    '--violet-glow': 'rgba(124, 58, 237, 0.22)',
    '--violet-glow-soft': 'rgba(124, 58, 237, 0.10)',
    '--cyan': '#06b6d4',
    '--cyan-light': '#22d3ee',
    '--cyan-glow': 'rgba(6, 182, 212, 0.18)',
    '--emerald': '#10b981',
    '--emerald-light': '#34d399',
    '--emerald-glow': 'rgba(16, 185, 129, 0.15)',
    '--rose': '#f43f5e',
    '--rose-light': '#fb7185',
    '--rose-glow': 'rgba(244, 63, 94, 0.15)',
    '--amber': '#f59e0b',
    '--text-primary': '#eef2ff',
    '--text-secondary': '#9ca3c4',
    '--text-muted': '#4b5680',
    '--text-faint': '#2a3050',
    '--shadow-violet': '0 4px 28px rgba(124, 58, 237, 0.22)',
    '--shadow-card': '0 2px 20px rgba(0, 0, 0, 0.5)',
    '--shadow-glow': '0 0 40px rgba(124, 58, 237, 0.12)',
    '--shadow-elevated': '0 8px 40px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(139, 92, 246, 0.08) inset',
  },
  light: {
    '--background': '#f6f8fc',
    '--foreground': '#0f172a',
    '--card': 'rgba(255, 255, 255, 0.9)',
    '--card-foreground': '#0f172a',
    '--primary': '#6d28d9',
    '--primary-foreground': '#ffffff',
    '--secondary': 'rgba(241, 245, 249, 0.9)',
    '--secondary-foreground': '#172033',
    '--muted': 'rgba(226, 232, 240, 0.8)',
    '--muted-foreground': '#64748b',
    '--accent': 'rgba(109, 40, 217, 0.1)',
    '--accent-foreground': '#5b21b6',
    '--destructive': '#dc2626',
    '--destructive-foreground': '#ffffff',
    '--border': 'rgba(99, 102, 241, 0.18)',
    '--input': 'rgba(99, 102, 241, 0.22)',
    '--ring': 'rgba(109, 40, 217, 0.45)',
    '--bg-base': '#f6f8fc',
    '--bg-surface': '#ffffff',
    '--bg-raised': '#eef2f7',
    '--bg-overlay': '#e2e8f0',
    '--bg-glass': 'rgba(255, 255, 255, 0.76)',
    '--border-soft': 'rgba(99, 102, 241, 0.18)',
    '--border-muted': 'rgba(99, 102, 241, 0.1)',
    '--border-bright': 'rgba(99, 102, 241, 0.32)',
    '--violet': '#6d28d9',
    '--violet-light': '#7c3aed',
    '--violet-bright': '#6d28d9',
    '--violet-glow': 'rgba(109, 40, 217, 0.16)',
    '--violet-glow-soft': 'rgba(109, 40, 217, 0.08)',
    '--cyan': '#0891b2',
    '--cyan-light': '#0e7490',
    '--cyan-glow': 'rgba(8, 145, 178, 0.14)',
    '--emerald': '#059669',
    '--emerald-light': '#047857',
    '--emerald-glow': 'rgba(5, 150, 105, 0.12)',
    '--rose': '#e11d48',
    '--rose-light': '#be123c',
    '--rose-glow': 'rgba(225, 29, 72, 0.12)',
    '--amber': '#d97706',
    '--text-primary': '#0f172a',
    '--text-secondary': '#475569',
    '--text-muted': '#64748b',
    '--text-faint': '#94a3b8',
    '--shadow-violet': '0 4px 24px rgba(109, 40, 217, 0.16)',
    '--shadow-card': '0 10px 30px rgba(15, 23, 42, 0.08)',
    '--shadow-glow': '0 0 32px rgba(109, 40, 217, 0.1)',
    '--shadow-elevated': '0 18px 50px rgba(15, 23, 42, 0.12), 0 1px 0 rgba(255, 255, 255, 0.8) inset',
  },
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem('udharwale-theme') === 'light' ? 'light' : 'dark';
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
