import { AUTH_ROUTES } from "../config/routes";

class AuthService {
  // Helper function para establecer cookies de forma segura
  setCookieSafely(name, value, options = {}) {
    try {
      // Encode the value to handle special characters
      const encodedValue = encodeURIComponent(value);

      // Check if the cookie size is reasonable (cookies have ~4KB limit)
      if (encodedValue.length > 3000) {
        console.warn(
          `Cookie ${name} is too large (${encodedValue.length} chars), truncating...`
        );
        // For user data, we'll still set it but warn
      }

      const defaultOptions = {
        path: "/",
        SameSite: "Strict",
      };

      const finalOptions = { ...defaultOptions, ...options };

      let cookieString = `${name}=${encodedValue}`;

      Object.entries(finalOptions).forEach(([key, val]) => {
        if (val) {
          cookieString += `; ${key}${val === true ? "" : `=${val}`}`;
        }
      });

      document.cookie = cookieString;
    } catch (error) {
      console.error(`Error setting cookie ${name}:`, error);
    }
  }

  // Helper function para obtener cookies de forma segura
  getCookieSafely(name) {
    try {
      const cookies = document.cookie.split(";").reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        if (key && value) {
          acc[key] = decodeURIComponent(value);
        }
        return acc;
      }, {});

      return cookies[name] || null;
    } catch (error) {
      console.error(`Error getting cookie ${name}:`, error);
      return null;
    }
  }

  async login(email, password, rememberMe = false) {
    try {
      // Primera llamada: obtener datos del usuario
      const userResponse = await fetch(AUTH_ROUTES.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        throw new Error(
          userData.validation?.email ||
            userData.validation?.pwd ||
            userData.message ||
            "Error al iniciar sesión"
        );
      }

      // Segunda llamada: obtener token
      const tokenResponse = await fetch(AUTH_ROUTES.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          gettoken: true,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokenData.message || "Error al obtener el token");
      }

      this.logout();

      const token = tokenData.token;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData.user));

      // Usar el método seguro para establecer cookies
      this.setCookieSafely("token", token, {
        ...(rememberMe && { "max-age": "2592000" }),
      });
      this.setCookieSafely("user", JSON.stringify(userData.user));

      const storedToken = this.getToken();
      const storedUser = this.getUser();

      if (!storedToken || !storedUser) {
        throw new Error("Error al establecer la sesión");
      }

      return {
        token: token,
        user: userData.user,
      };
    } catch (error) {
      this.logout();
      throw error;
    }
  }

  async register(name, lastName, email, password) {
    try {
      const response = await fetch(AUTH_ROUTES.REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          lastName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.validation?.email ||
          data.validation?.password ||
          data.message ||
          "Error en el registro";
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      const response = await fetch(AUTH_ROUTES.FORGOT_PASSWORD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.validation?.email ||
          data.message ||
          "Error al procesar la solicitud";
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error("Forgot password error:", error);
      throw error;
    }
  }

  async resetPassword(token, password, confirm) {
    try {
      const response = await fetch(`${AUTH_ROUTES.RESET_PASSWORD}/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          confirm,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.validation?.pwd2 ||
          data.message ||
          "Error al restablecer la contraseña";
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error("Reset password error:", error);
      throw error;
    }
  }

  async activateAccount(token) {
    try {
      const response = await fetch(`${AUTH_ROUTES.ACTIVATE_ACCOUNT}/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data.validation?.email ||
          data.message ||
          "Error al activar la cuenta";
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error("Account activation error:", error);
      throw error;
    }
  }

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }

  // Método para limpiar cookies corruptas y forzar un logout limpio
  clearCorruptedCookies() {
    try {
      console.warn("Clearing corrupted cookies and forcing clean logout");

      // Clear all authentication data
      this.logout();

      // Also clear any other potentially corrupted cookies by listing all cookies
      const cookies = document.cookie.split(";");

      cookies.forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name =
          eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

        // Clear any cookies that might be related to authentication
        if (name === "token" || name === "user" || name.includes("auth")) {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      });

      // Force a page reload to ensure clean state
      window.location.href = "/login";
    } catch (error) {
      console.error("Error clearing corrupted cookies:", error);
      // If all else fails, force navigation to login
      window.location.href = "/login";
    }
  }

  getToken() {
    return localStorage.getItem("token");
  }

  getUser() {
    const userStr = localStorage.getItem("user");
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      // If parsing fails, return null
      return null;
    }
  }

  isAuthenticated() {
    try {
      const token = this.getToken();
      const user = this.getUser();

      if (!token || !user) {
        return false;
      }

      const tokenCookie = this.getCookieSafely("token");
      const userCookie = this.getCookieSafely("user");

      if (!tokenCookie || !userCookie) {
        this.setCookieSafely("token", token);
        this.setCookieSafely("user", JSON.stringify(user));
      }

      return true;
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  }
}

export const authService = new AuthService();
