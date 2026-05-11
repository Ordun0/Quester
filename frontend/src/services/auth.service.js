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
  
  /**
   * Tarea 54 - Guardar Paso 1 del Trip Builder
   */
  async saveTripStep1(token, data) {
    try {
      const response = await axios.post(`${API_URL}/trip/step1`, data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error saving trip step 1' };
    }
  }
 
/**
 * Tarea 68 - Guardar Paso 2 del Trip Builder
 */
  async saveTripStep2(token, data) {
    try {
      console.log('📤 authService.saveTripStep2 called');
      console.log('Token:', token ? 'Present' : 'MISSING');
      console.log('Data:', data);
      console.log('API_URL:', API_URL);
    
      const response = await axios.post(`${API_URL}/trip/step2`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
        }
      });
    
      console.log('✅ authService.saveTripStep2 response status:', response.status);
      console.log('✅ authService.saveTripStep2 response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ authService.saveTripStep2 error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error headers:', error.response?.headers);
      throw error.response?.data || { message: 'Error saving trip step 2' };
    }
  }
  
  /**
   * Tarea 80 - Guardar Paso 3 del Trip Builder
   */
  async saveTripStep3(token, data) {
    try {
      console.log('📤 authService.saveTripStep3 called');
      console.log('Token:', token ? 'Present' : 'MISSING');
      console.log('Data:', data);
    
      const response = await axios.post(`${API_URL}/trip/step3`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    
      console.log('✅ authService.saveTripStep3 response status:', response.status);
      console.log('✅ authService.saveTripStep3 response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ authService.saveTripStep3 error:', error);
      console.error('❌ Error response:', error.response?.data);
      throw error.response?.data || { message: 'Error saving trip step 3' };
    }
  }

  async generateItinerary(token, payload) {
    const response = await axios.post(
      `${API_BASE_URL}/api/extraction`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }  
}

export default new AuthService();