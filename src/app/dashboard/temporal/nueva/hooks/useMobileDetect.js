"use client";

import { useState, useEffect } from 'react';

/**
 * Hook para detectar si el dispositivo es móvil basado en el ancho del viewport
 * @param {number} breakpoint - Ancho en px para considerar móvil (default: 768)
 * @returns {boolean} true si es móvil
 */
export function useMobileDetect(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    // Inicializar correctamente en SSR
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Check inicial
    checkMobile();

    // Listener para cambios de tamaño
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}
