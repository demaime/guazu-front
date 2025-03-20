'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Verificar si hay un token en localStorage o sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (!token) {
      // Si no hay token, redirigir al login
      router.replace('/login');
    } else {
      // Si hay token, verificar si es válido y redirigir según el rol
      // Por ahora solo redirigimos al login
      router.replace('/login');
    }
  }, [router]);

  // Mientras se verifica la autenticación, mostramos una pantalla de carga
  return (
    <main className="min-h-screen flex items-center justify-center bg-primary">
      <div className="text-white text-xl">Cargando...</div>
    </main>
  );
} 