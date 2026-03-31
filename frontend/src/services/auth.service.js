// frontend/src/services/auth.service.js

import axios from 'axios';

const API_URL = import.meta.env.VITE_AWS_BACKEND_URL || 'http://localhost:3000/api';

class AuthService {
  /**
   * Registrar usuario nuevo
   * @param {Object} userData - { email, password, nombreCompleto }
   * @returns {Promise} - Response del backend
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
   * @param {Object} credentials - { email, password }
   * @returns {Promise} - Response con token
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
   * Obtener perfil del usuario
   * @param {String} token - JWT token
   * @returns {Promise} - Perfil del usuario
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
   * Cerrar sesión (limpiar token)
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Obtener token almacenado
   */
  getToken() {
    return localStorage.getItem('token');
  }

  /**
   * Verificar si usuario está autenticado
   */
  isAuthenticated() {
    return !!this.getToken();
  }
}

export default new AuthService();