import { USER_ROUTES } from '@/config/routes';

class UserService {
  async getProfile(userId, token) {
    try {
      const response = await fetch(`${USER_ROUTES.GET_PROFILE}/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });

      const data = await response.json();

      if (data.error) {
        const userData = JSON.parse(localStorage.getItem('user'));
        return {
          ...userData,
          editableFields: this.getEditableFieldsByRole(userData.role)
        };
      }

      const updatedUser = data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return {
        ...updatedUser,
        editableFields: this.getEditableFieldsByRole(updatedUser.role)
      };
    } catch (error) {
      const userData = JSON.parse(localStorage.getItem('user'));
      return {
        ...userData,
        editableFields: this.getEditableFieldsByRole(userData.role)
      };
    }
  }

  getEditableFieldsByRole(role) {
    const baseFields = ['name', 'lastName', 'email', 'phone', 'cellular'];
    
    switch (role) {
      case 'ROLE_ADMIN':
        return ['all'];
      case 'SUPERVISOR':
        return [
          ...baseFields,
          'address',
          'addressNumber',
          'addressUnity',
          'city',
          'province',
          'section'
        ];
      case 'POLLSTER':
        return baseFields;
      default:
        return baseFields;
    }
  }

  async updateProfile(userId, userData, token) {
    try {
      const response = await fetch(`${USER_ROUTES.UPDATE}/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.validation?.pwd || data.validation || 'Error al actualizar el perfil');
      }

      const updatedUser = data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      throw new Error(error.message || 'Error al actualizar el perfil');
    }
  }

  async updatePassword(userId, currentPassword, newPassword, token) {
    try {
      const response = await fetch(`${USER_ROUTES.UPDATE_PASSWORD}/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({
          currentPwd: currentPassword,
          newPwd: newPassword
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.validation?.currentPwd || data.validation?.newPwd2 || data.validation || 'Error al actualizar la contraseña');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Error al actualizar la contraseña');
    }
  }

  async updateImage(userId, imageFile, token) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile, imageFile.name);

      const response = await fetch(`${USER_ROUTES.UPDATE_IMAGE}/${userId}/1`, {
        method: 'POST',
        headers: {
          'Authorization': token
        },
        body: formData
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.validation?.error || data.validation || 'Error al actualizar la imagen');
      }

      const currentUser = JSON.parse(localStorage.getItem('user'));
      const updatedUser = { ...currentUser, image: data.user.image };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      throw new Error(error.message || 'Error al actualizar la imagen');
    }
  }

  async deleteAccount(userId, token) {
    try {
      const response = await fetch(`${USER_ROUTES.DELETE_USER}/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.validation?.error || data.validation || 'Error al eliminar la cuenta');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Error al eliminar la cuenta');
    }
  }

  async getAllUsers() {
    try {
      console.log('=== Iniciando getAllUsers ===');
      
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('token');

      console.log('Usuario actual:', {
        role: user?.role,
        id: user?._id,
        name: user?.name
      });
      
      console.log('Token disponible:', !!token);
      
      const requestBody = {
        page: 0,
        pageSize: 1000
      };
      
      console.log('Request body:', requestBody);
      
      const response = await fetch(USER_ROUTES.GET_ALL, {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': token
        }),
        body: JSON.stringify(requestBody),
        credentials: 'include',
        mode: 'cors'
      });

      console.log('Status de la respuesta:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error en la respuesta:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Datos recibidos:', {
        totalCount: data.totalCount,
        usersCount: data.users?.length,
        hasError: !!data.error
      });
      
      if (data.error) {
        console.error('Error del API:', data.error);
        return Promise.reject(data.validation);
      }

      return { users: data.users || [], totalCount: data.totalCount || 0 };
    } catch (error) {
      console.error('Error en getAllUsers:', error);
      throw error;
    }
  }

  async getPollsters() {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(USER_ROUTES.GET_POLLSTERS, {
        method: 'GET',
        headers: new Headers({
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': token
        }),
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        return Promise.reject(data.validation);
      }

      return { pollsters: data.pollsters || [] };
    } catch (error) {
      console.error('Error in getPollsters:', error);
      throw error;
    }
  }

  async getSupervisors() {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(USER_ROUTES.GET_SUPERVISORS, {
        method: 'GET',
        headers: new Headers({
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': token
        }),
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        return Promise.reject(data.validation);
      }

      return { supervisors: data.supervisors || [] };
    } catch (error) {
      console.error('Error in getSupervisors:', error);
      throw error;
    }
  }
}

export const userService = new UserService(); 