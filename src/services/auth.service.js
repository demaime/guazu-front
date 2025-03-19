import { API_URL, API_ENDPOINTS, getHeaders } from '@/config/api';

class AuthService {
  async login(email, password, rememberMe = false) {
    try {
      // Primer request para obtener el usuario
      const userResponse = await fetch(`${API_URL}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        }),
      });

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        throw new Error(userData.validation?.email || userData.validation?.pwd || userData.message || 'Error al iniciar sesión');
      }

      // Segundo request para obtener el token
      const tokenResponse = await fetch(`${API_URL}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          gettoken: true
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokenData.message || 'Error al obtener el token');
      }

      // Limpiar cualquier token anterior
      this.logout();

      // Guardar el token y el usuario
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', tokenData.token);
      storage.setItem('user', JSON.stringify(userData.user));

      // Guardar el token como cookie
      document.cookie = `token=${tokenData.token}; path=/; ${rememberMe ? 'max-age=2592000' : ''}`;

      return {
        token: tokenData.token,
        user: userData.user
      };
    } catch (error) {
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    // Eliminar la cookie del token
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }

  getToken() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token;
  }

  getUser() {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  }

  isAuthenticated() {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  }
}

export const authService = new AuthService(); 