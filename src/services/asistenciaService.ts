// src/services/asistenciaService.ts
import { api } from '../api/Axios';
import { getAuth } from "firebase/auth";

async function getAuthHeader() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado");
  
  const token = await user.getIdToken(); 
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// Interfaces TypeScript
export interface Asistencia {
  id: string;
  estudiante: string;
  estudianteCedula?: string;
  estadoAsistencia: 'Presente' | 'Ausente' | 'Tiene Excusa';
  fechaYhora: string | Date;
  asignatura?: string;
  horaRegistro?: string;
  late?: boolean; // ✅ NUEVO: Indica si llegó tarde (> 15 minutos)
  courseId?: string;
  groupId?: string | null;
  fechaDocId?: string;
  hasGroups?: boolean;
}

export interface CreateAsistenciaDto {
  estudiante: string;
  estadoAsistencia: string;
  asignatura?: string;
}

export interface UpdateAsistenciaDto {
  estadoAsistencia?: string;
}

// Servicio de API con manejo de errores mejorado
export const asistenciaService = {
  // Listar todas las asistencias
  async getAll(): Promise<Asistencia[]> {
    try {
      console.log('🔍 Obteniendo todas las asistencias...');
      const headers = await getAuthHeader();
      const response = await api.get('/asistencias/', { headers });
      console.log('✅ Asistencias obtenidas:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al obtener asistencias:', error);
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Error al cargar las asistencias. Verifica la conexión con el backend.');
    }
  },

  // Obtener una asistencia por ID
  async getById(id: string): Promise<Asistencia> {
    try {
      console.log(`🔍 Obteniendo asistencia con ID: ${id}`);
      const headers = await getAuthHeader();
      const response = await api.get(`/asistencias/${id}/`, { headers });
      console.log('✅ Asistencia obtenida:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error al obtener asistencia ${id}:`, error);
      if (error.response?.status === 404) {
        throw new Error('Asistencia no encontrada');
      }
      throw new Error('Error al cargar la asistencia');
    }
  },

  // Crear nueva asistencia
  async create(data: CreateAsistenciaDto): Promise<Asistencia> {
    try {
      console.log('➕ Creando nueva asistencia:', data);
      const headers = await getAuthHeader();
      const response = await api.post('/asistencias/crear/', data, { headers });
      console.log('✅ Asistencia creada:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al crear asistencia:', error);
      if (error.response?.data) {
        const errorMessages = Object.values(error.response.data).flat().join(', ');
        throw new Error(`Error de validación: ${errorMessages}`);
      }
      throw new Error('Error al crear la asistencia');
    }
  },

  // Actualizar asistencia
  async update(id: string, data: UpdateAsistenciaDto): Promise<Asistencia> {
    try {
      console.log(`✏️ Actualizando asistencia ${id}:`, data);
      const headers = await getAuthHeader();
      const response = await api.put(`/asistencias/${id}/update/`, data, { headers });
      console.log('✅ Asistencia actualizada:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error al actualizar asistencia ${id}:`, error);
      if (error.response?.status === 404) {
        throw new Error('Asistencia no encontrada');
      }
      if (error.response?.data) {
        const errorMessages = Object.values(error.response.data).flat().join(', ');
        throw new Error(`Error de validación: ${errorMessages}`);
      }
      throw new Error('Error al actualizar la asistencia');
    }
  },

  // Eliminar asistencia
  async delete(id: string): Promise<void> {
    try {
      console.log(`🗑️ Eliminando asistencia ${id}`);
      const headers = await getAuthHeader();
      await api.delete(`/asistencias/${id}/delete/`, { headers });
      console.log('✅ Asistencia eliminada correctamente');
    } catch (error: any) {
      console.error(`❌ Error al eliminar asistencia ${id}:`, error);
      if (error.response?.status === 404) {
        throw new Error('Asistencia no encontrada');
      }
      throw new Error('Error al eliminar la asistencia');
    }
  },

  // ✅ NUEVO: Buscar nombre de estudiante por cédula
  async getNombreEstudiante(cedula: string): Promise<string> {
    try {
      console.log(`🔍 Buscando nombre para cédula: ${cedula}`);
      const headers = await getAuthHeader();
      const response = await api.get(`/estudiantes/nombre/${cedula}/`, { headers });
      console.log('✅ Nombre obtenido:', response.data.nombre);
      return response.data.nombre;
    } catch (error: any) {
      console.error(`❌ Error al obtener nombre para ${cedula}:`, error);
      // Si falla, retorna la cédula
      return cedula;
    }
  },

  /**
 * Obtiene los nombres de múltiples estudiantes en batch
 */
async getNombresEstudiantes(cedulas: string[]): Promise<Record<string, string>> {
  try {
    console.log(`🔍 Buscando nombres para ${cedulas.length} estudiantes`);
    const headers = await getAuthHeader();
    
    const nombres: Record<string, string> = {};
    
    // Hacer peticiones en paralelo
    const promesas = cedulas.map(async (cedula) => {
      try {
        const response = await api.get(`/estudiantes/nombre/${cedula}/`, { headers });
        return { cedula, nombre: response.data.nombre };
      } catch (error) {
        console.warn(`⚠️ No se pudo obtener nombre para ${cedula}`);
        return { cedula, nombre: cedula };
      }
    });
    
    const resultados = await Promise.all(promesas);
    
    resultados.forEach(({ cedula, nombre }) => {
      nombres[cedula] = nombre;
    });
    
    console.log('✅ Nombres obtenidos:', nombres);
    return nombres;
  } catch (error: any) {
    console.error('❌ Error al obtener nombres:', error);
    return {};
  }
},

  // Verificar conexión con el backend
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔌 Verificando conexión con el backend...');
      const headers = await getAuthHeader();
      await api.get('/asistencias/', { headers });
      console.log('✅ Conexión exitosa con el backend');
      return true;
    } catch (error) {
      console.error('❌ No se pudo conectar con el backend:', error);
      return false;
    }
  }
};

export default asistenciaService;