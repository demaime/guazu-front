'use client';

import { ThemeProvider } from '@/providers/ThemeProvider';
import { useEffect } from 'react';

export function ClientThemeWrapper({ children }) {
  // Prevenir errores de hidratación esperando a que el cliente esté listo
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    const theme = localStorage.getItem('theme-preference') || 'light';
    document.documentElement.classList.add(theme);
  }, []);

  return <ThemeProvider>{children}</ThemeProvider>;
} 