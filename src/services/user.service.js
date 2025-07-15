import { USER_ROUTES } from "@/config/routes";
import { API_URL } from "@/config/constants";

class UserService {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || "Error fetching user profile");
      }

      const updatedUser = data.user;
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
    const baseFields = ["name", "lastName", "email", "phone", "cellular"];

    switch (role) {
      case "ROLE_ADMIN":
        return ["all"];
      case "SUPERVISOR":
        return [
          ...baseFields,
          "address",
          "addressNumber",
          "addressUnity",
          "city",
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

      const updatedUser = data.user;
      localStorage.setItem("user", JSON.stringify(updatedUser));

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
      console.log("Respuesta del servidor al subir imagen:", data);

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

      console.log("Usuario actualizado recibido:", data.user);
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
      console.log("=== Iniciando getAllUsers ===");

      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      console.log("Usuario actual:", {
        role: user?.role,
        id: user?._id,
        name: user?.name,
      });

      console.log("Token disponible:", !!token);

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

      console.log("Request body:", body);

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

      console.log("Status de la respuesta:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error en la respuesta:", errorData);
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Datos recibidos:", {
        totalCount: data.totalCount,
        usersCount: data.users?.length || data.pollsters?.length,
        hasError: !!data.error,
      });

      if (data.error) {
        console.error("Error del API:", data.error);
        return Promise.reject(data.validation);
      }

      // Adaptar la respuesta según el endpoint usado
      if (user?.role === "SUPERVISOR") {
        return {
          users: data.pollsters || [],
          totalCount: data.pollsters?.length || 0,
        };
      }

      return { users: data.users || [], totalCount: data.totalCount || 0 };
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
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
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
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
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
