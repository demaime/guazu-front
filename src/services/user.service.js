import { USER_ROUTES } from "@/config/routes";
import { API_URL } from "@/config/constants";
import { HttpError } from "@/utils/httpError";

class UserService {
  // Helper function para procesar URLs de imágenes
  processUserImage(imageUrl) {
    if (!imageUrl) return null;

    // Si ya es una URL completa, devolverla tal como está
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // Si es base64, devolverlo tal como está
    if (imageUrl.startsWith("data:image/")) {
      return imageUrl;
    }

    // Si es solo el nombre del archivo, construir la URL completa
    if (imageUrl.includes("/")) {
      // Si ya tiene path, asumir que es relativo al API
      return `${API_URL}${imageUrl}`;
    } else {
      // Si es solo el nombre del archivo, construir la ruta completa
      return `${API_URL}/uploads/users/${imageUrl}`;
    }
  }

  // Helper function para procesar un usuario y sus imágenes
  processUserData(user) {
    if (!user) return user;

    return {
      ...user,
      image: this.processUserImage(user.image),
    };
  }

  async getProfile(userId, token) {
    try {
      const response = await fetch(USER_ROUTES.GET_BY_ID(userId), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new HttpError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData.code,
          errorData
        );
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || "Error fetching user profile");
      }

      const updatedUser = this.processUserData(data.user);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      return {
        ...updatedUser,
        editableFields: this.getEditableFieldsByRole(updatedUser.role),
      };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
  }

  getEditableFieldsByRole(role) {
    const baseFields = [
      "name",
      "lastName",
      "email",
      "phone",
      "cellular",
      "dni",
      "city",
      "province",
    ]; // permitir completar dni, ciudad y provincia

    switch (role) {
      case "ROLE_ADMIN":
        return ["all"]; // admins pueden editar todo
      case "SUPERVISOR":
        return [
          ...baseFields,
          "address",
          "addressNumber",
          "addressUnity",
          "province",
          "section",
        ];
      case "POLLSTER":
        return baseFields;
      default:
        return baseFields;
    }
  }

  async updateProfile(userId, userData, token) {
    try {
      const response = await fetch(`${USER_ROUTES.UPDATE}/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(
          data.validation?.pwd ||
            data.validation ||
            "Error al actualizar el perfil"
        );
      }

      const updatedUser = this.processUserData(data.user);

      // ✅ SOLO actualizar localStorage si se está editando el usuario actual
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (currentUser._id === userId) {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      return updatedUser;
    } catch (error) {
      throw new Error(error.message || "Error al actualizar el perfil");
    }
  }

  async updatePassword(userId, currentPassword, newPassword, token) {
    try {
      const response = await fetch(`${USER_ROUTES.UPDATE_PASSWORD}/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          currentPwd: currentPassword,
          newPwd: newPassword,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(
          data.validation?.currentPwd ||
            data.validation?.newPwd2 ||
            data.validation ||
            "Error al actualizar la contraseña"
        );
      }

      return data;
    } catch (error) {
      throw new Error(error.message || "Error al actualizar la contraseña");
    }
  }

  async updateImage(userId, imageFile, token) {
    try {
      const formData = new FormData();
      formData.append("image", imageFile, imageFile.name);

      const response = await fetch(`${USER_ROUTES.UPDATE_IMAGE}/${userId}/1`, {
        method: "POST",
        headers: {
          Authorization: token,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        console.error("Error del servidor:", data);
        throw new Error(
          data.message ||
            data.validation?.error ||
            data.validation ||
            "Error al actualizar la imagen"
        );
      }

      if (!data.user) {
        console.error("No se recibió usuario en la respuesta:", data);
        throw new Error("Respuesta inválida del servidor");
      }

      // Retornar el usuario actualizado del backend
      return data.user;
    } catch (error) {
      throw new Error(error.message || "Error al actualizar la imagen");
    }
  }

  async deleteAccount(userId, token) {
    try {
      const response = await fetch(`${USER_ROUTES.DELETE_USER}/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(
          data.validation?.error ||
            data.validation ||
            "Error al eliminar la cuenta"
        );
      }

      return data;
    } catch (error) {
      throw new Error(error.message || "Error al eliminar la cuenta");
    }
  }

  async getAllUsers() {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        throw new Error("Usuario no autenticado");
      }

      // Determinar el endpoint según el rol
      let endpoint = USER_ROUTES.GET_ALL;
      let method = "POST";
      let body = {
        page: 0,
        pageSize: 1000,
      };

      if (user?.role === "SUPERVISOR") {
        endpoint = USER_ROUTES.GET_POLLSTERS;
        method = "GET";
        body = undefined;
      }

      const response = await fetch(endpoint, {
        method,
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
        mode: "cors",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new HttpError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData.code,
          errorData
        );
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || "Error del servidor");
      }

      // Adaptar la respuesta según el endpoint usado
      if (user?.role === "SUPERVISOR") {
        const processedPollsters = (data.pollsters || []).map((pollster) =>
          this.processUserData(pollster)
        );
        return {
          users: processedPollsters,
          totalCount: processedPollsters.length,
        };
      }

      const processedUsers = (data.users || []).map((user) =>
        this.processUserData(user)
      );
      return { users: processedUsers, totalCount: data.totalCount || 0 };
    } catch (error) {
      console.error("Error en getAllUsers:", error);
      throw error;
    }
  }

  async getPollsters() {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(USER_ROUTES.GET_POLLSTERS, {
        method: "GET",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new HttpError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData.code,
          errorData
        );
      }

      const data = await response.json();

      if (data.error) {
        return Promise.reject(data.validation);
      }

      // Adaptar la respuesta según el rol
      const pollsters = data.pollsters || data.users || [];
      return {
        users: pollsters,
        totalCount: pollsters.length,
      };
    } catch (error) {
      console.error("Error en getPollsters:", error);
      throw error;
    }
  }

  async getSupervisors() {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(USER_ROUTES.GET_SUPERVISORS, {
        method: "GET",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new HttpError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData.code,
          errorData
        );
      }

      const data = await response.json();

      if (data.error) {
        return Promise.reject(data.validation);
      }

      return { supervisors: data.supervisors || [] };
    } catch (error) {
      console.error("Error in getSupervisors:", error);
      throw error;
    }
  }

  async getFavorites(type) {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Usuario no autenticado");

      const response = await fetch(USER_ROUTES.FAVORITES_BY_TYPE(type), {
        method: "GET",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.message || "Error al obtener favoritos");
      }

      // Back devuelve objetos poblados en `favorites`
      const favorites = Array.isArray(data.favorites) ? data.favorites : [];
      return favorites.map((u) => this.processUserData(u));
    } catch (error) {
      console.error("Error in getFavorites:", error);
      throw error;
    }
  }

  async addFavorite(targetUserId, type) {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Usuario no autenticado");

      const response = await fetch(USER_ROUTES.FAVORITES_ADD, {
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
        body: JSON.stringify({ targetUserId, type }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.message || "Error al agregar a favoritos");
      }

      // Back devuelve `favorites` como array de IDs
      return data;
    } catch (error) {
      console.error("Error in addFavorite:", error);
      throw error;
    }
  }

  async removeFavorite(targetUserId, type) {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Usuario no autenticado");

      const response = await fetch(USER_ROUTES.FAVORITES_REMOVE, {
        method: "POST",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
        body: JSON.stringify({ targetUserId, type }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.message || "Error al eliminar de favoritos");
      }

      return data;
    } catch (error) {
      console.error("Error in removeFavorite:", error);
      throw error;
    }
  }

  async getUserStats(userId) {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Usuario no autenticado");

      const response = await fetch(USER_ROUTES.GET_STATS(userId), {
        method: "GET",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
          Authorization: token,
        }),
        credentials: "include",
        mode: "cors",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.message || "Error al obtener estadísticas");
      }

      return data.stats;
    } catch (error) {
      console.error("Error in getUserStats:", error);
      throw error;
    }
  }
}

export const userService = new UserService();

export const updateUserProfile = async (userId, userData, token) => {
  try {
    const response = await fetch(`${API_URL}/api/update/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(userData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Error al actualizar perfil");
    }

    return result;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};
