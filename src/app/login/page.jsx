'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authService } from '@/services/auth.service';
import { Loader } from '@/components/ui/Loader';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    // Si ya está autenticado, redirigir al dashboard
    if (authService.isAuthenticated()) {
      window.location.href = '/dashboard';
    }
    setIsPageLoading(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await authService.login(
        formData.email,
        formData.password,
        formData.rememberMe
      );
      
      // Verificar que tenemos el token antes de redirigir
      if (authService.isAuthenticated()) {
        window.location.href = '/dashboard';
      } else {
        throw new Error('No se pudo obtener el token de autenticación');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="xl" />
      </div>
    );
  }

  return (
    <div className="login-page min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-white/10 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
        <div className="flex justify-center w-full">
          <div className="w-[300px] h-[150px] relative mx-auto">
            <Image
              src="/login-logo.png"
              alt="Guazú - Argentina - Santa Fe - Encuestas"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        
        <form className="mt-12 space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white uppercase">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                placeholder="Ingrese su email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white uppercase">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900 placeholder-gray-500 sm:text-sm"
                placeholder="Ingrese su contraseña"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-white/80 focus:ring-white/80 border-white/60 rounded"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-white/80">
                Recordarme
              </label>
            </div>

            <div className="text-sm">
              <a href="/forgot-password" className="font-medium text-white/80 hover:text-white">
                ¿Olvidó su contraseña?
              </a>
            </div>
          </div>

          {error && (
            <div className="text-white bg-white/60 p-3 rounded-md text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader size="sm" className="mr-2" />
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <a href="/register" className="text-sm text-white/80 hover:text-white">
            ¿No tiene una cuenta? Regístrese
          </a>
        </div>
      </div>
    </div>
  );
} 