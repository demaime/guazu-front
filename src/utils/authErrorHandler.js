import { authService } from '@/services/auth.service';
import { toast } from 'react-toastify';

export function handleAuthError(error, router, options = {}) {
  // 1. Token expirado
  if (error.isTokenExpired && error.isTokenExpired()) {
    console.warn('🔐 [AUTH] Token expirado detectado:', {
      message: error.message,
      code: error.errorCode,
      timestamp: new Date().toISOString()
    });
    
    authService.logout();
    
    if (!options.silent) {
      toast.error(
        'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        { 
          toastId: 'session-expired',
          autoClose: 5000
        }
      );
    }
    
    if (router) {
      setTimeout(() => router.push('/login'), 500);
    }
    
    return { handled: true, type: 'token_expired' };
  }
  
  // 2. Token inválido
  if (error.isTokenInvalid && error.isTokenInvalid()) {
    console.warn('🔐 [AUTH] Token inválido detectado:', {
      message: error.message,
      code: error.errorCode
    });
    
    authService.logout();
    
    if (!options.silent) {
      toast.error(
        'Tu sesión no es válida. Por favor, inicia sesión nuevamente.',
        { toastId: 'session-invalid' }
      );
    }
    
    if (router) {
      setTimeout(() => router.push('/login'), 500);
    }
    
    return { handled: true, type: 'token_invalid' };
  }
  
  // 3. Cualquier error 401
  if (error.isUnauthorized && error.isUnauthorized()) {
    console.warn('🔐 [AUTH] Error de autenticación:', error.message);
    
    authService.logout();
    
    if (!options.silent) {
      toast.error(
        'Error de autenticación. Por favor, inicia sesión nuevamente.',
        { toastId: 'auth-error' }
      );
    }
    
    if (router) {
      setTimeout(() => router.push('/login'), 500);
    }
    
    return { handled: true, type: 'unauthorized' };
  }
  
  // No es error de autenticación
  return { handled: false, type: 'other' };
}
