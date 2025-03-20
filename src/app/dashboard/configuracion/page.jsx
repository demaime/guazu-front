'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

export default function ConfiguracionPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-[var(--text-primary)] sm:truncate sm:text-3xl sm:tracking-tight">
            Configuración
          </h2>
        </div>
      </div>

      <div className="bg-[var(--card-background)] border border-[var(--card-border)] shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-[var(--text-primary)]">
                Apariencia
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Personaliza el aspecto visual de la aplicación
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)]">
                  Modo oscuro
                </h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  {theme === 'dark' ? 'Activado' : 'Desactivado'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-10 w-20 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 bg-gray-200 dark:bg-gray-700"
              >
                <span className="sr-only">Cambiar tema</span>
                <span
                  className={`pointer-events-none relative inline-block h-9 w-9 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    theme === 'dark' ? 'translate-x-10' : 'translate-x-0'
                  }`}
                >
                  {theme === 'dark' ? (
                    <Moon className="h-6 w-6 text-gray-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  ) : (
                    <Sun className="h-6 w-6 text-gray-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 