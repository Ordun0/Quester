// Archivo placeholder para conexión con backend
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:3000/api',
});

export default api;
