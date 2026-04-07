// frontend/src/services/auth.service.js

import axios from 'axios';

const API_URL = import.meta.env.VITE_AWS_BACKEND_URL || 'http://localhost:3000/api';

class AuthService {
  /**
   * Registrar usuario nuevo
   */
  async register(userData) {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al registrar usuario' };
    }
  }

  /**
   * Login de usuario
   */
  async login(credentials) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al iniciar sesión' };
    }
  }

  /**
   * RF-04.01 - Obtener perfil del usuario
   */
  async getProfile(token) {
    try {
      const response = await axios.get(`${API_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al obtener perfil' };
    }
  }

  /**
   * RF-04.02 - Actualizar perfil del usuario
   */
  async updateProfile(token, data) {
    try {
      const response = await axios.put(`${API_URL}/profile`, data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al actualizar perfil' };
    }
  }

  /**
   * RF-04.03 - Cambiar contraseña
   */
  async changePassword(token, data) {
    try {
      const response = await axios.post(`${API_URL}/profile/change-password`, data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al cambiar contraseña' };
    }
  }

  /**
   * RF-04.05 - Eliminar cuenta
   */
  async deleteAccount(token) {
    try {
      const response = await axios.delete(`${API_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al eliminar cuenta' };
    }
  }

  /**
   * RF-03.01 - Solicitar recuperación de contraseña
   */
  async forgotPassword(data) {
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al solicitar recuperación' };
    }
  }

  /**
   * RF-03.03 - Resetear contraseña con token
   */
  async resetPassword(data) {
    try {
      const response = await axios.post(`${API_URL}/auth/reset-password`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error al resetear contraseña' };
    }
  }

  /**
   * RF-05.01 - Cerrar sesión
   */
  logout() {
    // ✅ RF-05.02.01 - Eliminar de localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // ✅ RF-05.02.02 - Eliminar de sessionStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    // ✅ RF-05.02.03 - Eliminar datos sensibles temporales
    sessionStorage.clear();
  }

  /**
   * RF-05.02 - Obtener token almacenado
   */
  getToken() {
    // ✅ RF-05.04.03 - Usar sessionStorage en lugar de localStorage
    return sessionStorage.getItem('token');
  }

  /**
   * RF-05.02 - Verificar si usuario está autenticado
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * RF-05.02 - Guardar token después de login
   */
  saveToken(token, user) {
    // ✅ RF-05.04.03 - Usar sessionStorage (se elimina al cerrar navegador)
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
  }
}

export default new AuthService();