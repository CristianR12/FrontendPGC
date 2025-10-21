// src/api/Axios.ts
import axios from "axios";

// URL del backend
const baseURL = 'http://127.0.0.1:8000/api/';

export const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,  // Importante para CORS con credenciales
    timeout: 10000,
});

// Interceptor para logging y manejo de errores
api.interceptors.request.use(
  (config) => {
    console.log(' Request:', config.method?.toUpperCase(), config.url);
    console.log(' Data:', config.data);
    return config;
  },
  (error) => {
    console.error(' Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(' Response:', response.status, response.config.url);
    console.log(' Data:', response.data);
    return response;
  },
  (error) => {
    if (error.response) {
      // El servidor respondió con un código de error
      console.error(' Response Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
      
      // Manejo específico de errores
      if (error.response.status === 404) {
        throw new Error('Recurso no encontrado en el servidor');
      } else if (error.response.status === 500) {
        throw new Error('Error interno del servidor');
      } else if (error.response.status === 403) {
        throw new Error('Acceso denegado');
      }
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      console.error(' No response received:', error.request);
      throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo en http://localhost:8000');
    } else {
      // Algo pasó al configurar la petición
      console.error(' Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;