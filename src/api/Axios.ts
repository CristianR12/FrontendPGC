// src/api/Axios.ts
import axios from "axios";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

// El servidor rechaza el token pasadas SESSION_MAX_HORAS desde el inicio de sesión (ver obtener_uid_usuario
// en el backend). Evita cerrar sesión varias veces si varias peticiones fallan con 401 al mismo tiempo.
let cerrandoSesionPorExpiracion = false;

async function cerrarSesionPorExpiracion(mensaje: string) {
  if (cerrandoSesionPorExpiracion || !auth.currentUser) return;
  cerrandoSesionPorExpiracion = true;
  try { localStorage.setItem('motivo_cierre_sesion', mensaje); } catch { /* ignorar */ }
  try { await signOut(auth); } catch { /* ignorar */ }
  window.location.href = '/';
}

const isDevelopment = import.meta.env.DEV;

// En desarrollo se usa el proxy de Vite (/api -> localhost:8000).
// En producción la URL del backend viene de VITE_API_URL (ej: https://mi-backend.onrender.com/api).
const baseURL: string = isDevelopment ? '/api' : (import.meta.env.VITE_API_URL ?? '');

if (!isDevelopment && !baseURL) {
  console.error('Falta la variable VITE_API_URL: el frontend no sabe dónde está el backend.');
}

console.log('Configuración Axios:', {
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
    // El plan gratis de Render duerme el backend y tarda cerca de 1 minuto en despertar.
    timeout: isDevelopment ? 30000 : 90000,
});

// Interceptor - enviar ID token verificable de Firebase
api.interceptors.request.use(
  async (config) => {
    try {
      console.log('Request:', config.method?.toUpperCase(), config.url);

      const user = auth.currentUser;

      if (user) {
        const idToken = await user.getIdToken();
        config.headers['Authorization'] = `Bearer ${idToken}`;

        console.log('Token enviado para UID:', user.uid);
      } else {
        console.warn('No hay usuario autenticado');
      }
      
      if (config.data) {
        console.log('Data:', config.data);
      }
      
      return config;
    } catch (error) {
      console.error('Error en interceptor:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor de respuesta
api.interceptors.response.use(
  (response) => {
    console.log('Response:', response.status, response.config.url);
    
    if (response.data) {
      console.log('Data received:', typeof response.data === 'object' 
        ? JSON.stringify(response.data).substring(0, 200) + '...'
        : response.data
      );
    }
    
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('Response Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
      
      switch (error.response.status) {
        case 401: {
          console.error('Error 401: No autenticado');
          const esSesionExpirada = error.response.data?.codigo === 'sesion_expirada';
          const mensaje = esSesionExpirada
            ? 'Tu sesión expiró por seguridad. Inicia sesión de nuevo.'
            : 'Tu sesión ya no es válida. Inicia sesión de nuevo.';
          cerrarSesionPorExpiracion(mensaje);
          throw new Error(mensaje);
        }

        case 403:
          console.error('Error 403: Acceso denegado');
          throw new Error('No tienes permisos para acceder a este recurso');
        
        case 404:
          console.error('Error 404: Recurso no encontrado');
          throw new Error('Recurso no encontrado en el servidor');
        
        case 500:
          console.error('Error 500: Error interno del servidor');
          throw new Error('Error interno del servidor. Por favor, intenta más tarde.');
        
        default:
          console.error(`Error ${error.response.status}:`, error.response.data);
          throw new Error(
            error.response.data?.error || 
            error.response.data?.message || 
            'Error al procesar la solicitud'
          );
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error(
        'No se pudo conectar con el servidor. Si lleva un rato sin usarse puede estar despertando (hasta 1 minuto): espera e intenta de nuevo.'
      );
    } else {
      console.error('Error:', error.message);
      throw new Error(error.message || 'Error al realizar la petición');
    }
  }
);

export default api;