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
}

export const userService = new UserService(); 