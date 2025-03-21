import { AUTH_ROUTES } from '@/config/routes';
import axios from 'axios';

class AuthService {
  async login(email, password, rememberMe = false) {
    try {
      const userResponse = await fetch(AUTH_ROUTES.LOGIN, {
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

      const tokenResponse = await fetch(AUTH_ROUTES.LOGIN, {
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

      this.logout();

      const token = tokenData.token;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData.user));

      document.cookie = `token=${token}; path=/; ${rememberMe ? 'max-age=2592000' : ''}`;

      return {
        token: token,
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
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }

  getToken() {
    return localStorage.getItem('token');
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  }

  isAuthenticated() {
    const token = this.getToken();
    const user = this.getUser();
    return Boolean(token && user);
  }

  async updateProfile(userData) {
    try {
      const response = await axios.put(`${API_URL}/users/profile`, userData, {
        headers: { Authorization: `Bearer ${this.getToken()}` }
      });
      
      // Actualizar el usuario en el localStorage
      const currentUser = this.getUser();
      const updatedUser = { ...currentUser, ...response.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export const authService = new AuthService(); 