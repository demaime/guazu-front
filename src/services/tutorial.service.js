import { API_URL } from "@/config/constants";
import { authService } from "./auth.service";

class TutorialService {
  async completeTutorial() {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error("No token available");
      }

      const response = await fetch(`${API_URL}/api/complete-tutorial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al completar el tutorial");
      }

      const data = await response.json();

      // Actualizar el usuario en localStorage
      const user = authService.getUser();
      if (user) {
        user.hasCompletedTutorial = true;
        user.tutorialCompletedAt = new Date().toISOString();
        localStorage.setItem("user", JSON.stringify(user));

        // También actualizar la cookie
        try {
          authService.setCookieSafely("user", JSON.stringify(user));
        } catch (e) {
          console.warn("Could not update user cookie:", e);
        }
      }

      return data;
    } catch (error) {
      console.error("Error completing tutorial:", error);
      throw error;
    }
  }

  hasCompletedTutorial() {
    try {
      const user = authService.getUser();
      return user?.hasCompletedTutorial === true;
    } catch {
      return false;
    }
  }

  shouldShowTutorial() {
    try {
      const user = authService.getUser();

      // Solo mostrar para pollsters
      if (user?.role !== "POLLSTER") {
        return false;
      }

      // Solo mostrar si explícitamente es false (usuarios nuevos)
      // Si no existe el campo (usuarios viejos), no mostrar
      if (user?.hasCompletedTutorial !== false) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}

export const tutorialService = new TutorialService();
