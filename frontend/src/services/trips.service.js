// frontend/src/services/trips.service.js

import axios from 'axios';

// ✅ CORREGIDO: Usar solo import.meta.env para Vite
// Vite expone variables con prefijo VITE_ a través de import.meta.env
const API_BASE_URL = import.meta.env?.VITE_AWS_BACKEND_URL || 'http://44.200.204.224:3000/api';

/**
 * Servicio para manejar operaciones con trips
 */
const tripsService = {
  /**
   * Guardar itinerario generado
   */
  async saveItinerary(token, itineraryPayload) {
    const response = await axios.post(
      `${API_BASE_URL}/trips`,
      itineraryPayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  },

  /**
   * Obtener lista de trips del usuario
   */
  async getUserTrips(token) {
    const response = await axios.get(
      `${API_BASE_URL}/trips`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  },

  /**
   * Obtener un trip específico por ID
   */
  async getTripById(token, tripId) {
    const response = await axios.get(
      `${API_BASE_URL}/trips/${tripId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  },

  /**
   * Eliminar un trip
   */
  async deleteTrip(token, tripId) {
    const response = await axios.delete(
      `${API_BASE_URL}/trips/${tripId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  }
};

export default tripsService;