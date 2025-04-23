import { AUTH_ROUTES } from "@/config/routes";

class AuthService {
  async login(email, password, rememberMe = false) {
    try {
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

      document.cookie = `token=${token}; path=/; ${
        rememberMe ? "max-age=2592000" : ""
      }`;
      document.cookie = `user=${JSON.stringify(userData.user)}; path=/;`;

      return {
        token: token,
        user: userData.user,
      };
    } catch (error) {
      // eslint-disable-next-line no-useless-catch
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
    const token = this.getToken();
    const user = this.getUser();
    return Boolean(token && user);
  }
}

export const authService = new AuthService();
