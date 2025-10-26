// src/api/Axios.ts
import axios from "axios";
import { auth } from "../firebaseConfig";

// ============================================
// CONFIGURACIÓN DE BASE URL CON PROXY
// ============================================
// En desarrollo: usa el proxy de Vite (/api)
// En producción: usa la URL completa del backend
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
    timeout: 30000, // Aumentado a 30 segundos
});

// ============================================
// INTERCEPTOR DE AUTENTICACIÓN CON FIREBASE
// ============================================
api.interceptors.request.use(
  async (config) => {
    try {
      console.log('🔵 Request:', config.method?.toUpperCase(), config.url);
      
      // Obtener el usuario autenticado de Firebase
      const user = auth.currentUser;
      
      if (user) {
        // Forzar la actualización del token para asegurar que sea válido
        const token = await user.getIdToken(true); // true = forceRefresh
        
        // Agregar el token al header Authorization
        config.headers.Authorization = `Bearer ${token}`;
        
        console.log('🔐 Token agregado al request');
        console.log('🔐 Token (primeros 20 caracteres):', token.substring(0, 20));
      } else {
        console.warn('⚠️ No hay usuario autenticado');
      }
      
      if (config.data) {
        console.log('📦 Data:', config.data);
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

// ============================================
// INTERCEPTOR DE RESPUESTAS
// ============================================
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.status, response.config.url);
    
    if (response.data) {
      console.log('📥 Data received:', typeof response.data === 'object' 
        ? JSON.stringify(response.data).substring(0, 200) + '...'
        : response.data
      );
    }
    
    return response;
  },
  (error) => {
    if (error.response) {
      // El servidor respondió con un código de error
      console.error('❌ Response Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
      
      // Manejo específico de errores
      switch (error.response.status) {
        case 401:
          console.error('🔒 Error 401: No autenticado o token inválido');
          throw new Error('No estás autenticado. Por favor, inicia sesión nuevamente.');
        
        case 403:
          console.error('🔒 Error 403: Acceso denegado');
          throw new Error('No tienes permisos para acceder a este recurso');
        
        case 404:
          console.error('🔍 Error 404: Recurso no encontrado');
          throw new Error('Recurso no encontrado en el servidor');
        
        case 500:
          console.error('🔥 Error 500: Error interno del servidor');
          throw new Error('Error interno del servidor. Por favor, intenta más tarde.');
        
        default:
          console.error(`❌ Error ${error.response.status}:`, error.response.data);
          throw new Error(
            error.response.data?.error || 
            error.response.data?.message || 
            'Error al procesar la solicitud'
          );
      }
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      console.error('📡 No response received:', error.request);
      console.error('📡 Request details:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      });
      throw new Error(
        'No se pudo conectar con el servidor. Verifica que el backend esté corriendo en http://127.0.0.1:8000'
      );
    } else {
      // Algo pasó al configurar la petición
      console.error('⚠️ Error:', error.message);
      throw new Error(error.message || 'Error al realizar la petición');
    }
  }
);

export default api;