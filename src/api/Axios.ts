// src/api/Axios.ts
import axios from "axios";
import { auth } from "../firebaseConfig";

const isDevelopment = import.meta.env.DEV;
const baseURL = isDevelopment ? '/api/' : 'http://127.0.0.1:8000/api/';

console.log('🔧 Configuración Axios:', {
  isDevelopment,
  baseURL,
  mode: import.meta.env.MODE
});

export const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
    timeout: 30000,
});

// Variable para evitar múltiples refreshes simultáneos
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      
      if (user) {
        // SIEMPRE forzar refresh del token en cada request
        const token = await user.getIdToken(true);
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔐 Token actualizado y agregado');
      } else {
        console.warn('⚠️ No hay usuario autenticado');
      }
      
      return config;
    } catch (error) {
      console.error('❌ Error en interceptor de request:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Si es 401 y no hemos intentado refrescar aún
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Si ya estamos refrescando, esperar
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const user = auth.currentUser;
        
        if (!user) {
          console.error('🔒 No hay usuario autenticado');
          processQueue(new Error('No autenticado'), null);
          throw new Error('No estás autenticado. Por favor, inicia sesión nuevamente.');
        }

        // Forzar refresh del token
        console.log('🔄 Refrescando token...');
        const newToken = await user.getIdToken(true);
        console.log('✅ Token refrescado exitosamente');
        
        // Actualizar el header
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        processQueue(null, newToken);
        isRefreshing = false;
        
        // Reintentar el request original
        return api(originalRequest);
        
      } catch (refreshError) {
        console.error('❌ Error al refrescar token:', refreshError);
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Redirigir al login
        window.location.href = '/';
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
    }

    // Manejo de otros errores
    if (error.response) {
      console.error('❌ Response Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
      
      switch (error.response.status) {
        case 403:
          throw new Error('No tienes permisos para acceder a este recurso');
        case 404:
          throw new Error('Recurso no encontrado en el servidor');
        case 500:
          throw new Error('Error interno del servidor. Por favor, intenta más tarde.');
        default:
          throw new Error(
            error.response.data?.error || 
            error.response.data?.message || 
            'Error al procesar la solicitud'
          );
      }
    } else if (error.request) {
      console.error('📡 No response received:', error.request);
      throw new Error(
        'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en http://127.0.0.1:8000'
      );
    } else {
      console.error('⚠️ Error:', error.message);
      throw new Error(error.message || 'Error al realizar la petición');
    }
  }
);

export default api;