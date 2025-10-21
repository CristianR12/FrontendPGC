import { api } from '../api/Axios';

// Interfaces TypeScript
export interface Asistencia {
  id: string;
  estudiante: string;
  estadoAsistencia: 'Presente' | 'Ausente' | 'Tiene Excusa';
  fechaYhora: string | Date;
  asignatura?: string;
}

export interface CreateAsistenciaDto {
  estudiante: string;
  estadoAsistencia: string;
  asignatura?: string;
}

export interface UpdateAsistenciaDto {
  estudiante?: string;
  estadoAsistencia?: string;
  asignatura?: string;
}

// Servicio de API
export const asistenciaService = {
  // Listar todas las asistencias
  async getAll(): Promise<Asistencia[]> {
    const response = await api.get('/asistencias/');
    return response.data;
  },

  // Obtener una asistencia por ID
  async getById(id: string): Promise<Asistencia> {
    const response = await api.get(`/asistencias/${id}/`);
    return response.data;
  },

  // Crear nueva asistencia
  async create(data: CreateAsistenciaDto): Promise<Asistencia> {
    const response = await api.post('/asistencias/crear/', data);
    return response.data;
  },

  // Actualizar asistencia
  async update(id: string, data: UpdateAsistenciaDto): Promise<Asistencia> {
    const response = await api.put(`/asistencias/${id}/update/`, data);
    return response.data;
  },

  // Eliminar asistencia
  async delete(id: string): Promise<void> {
    await api.delete(`/asistencias/${id}/delete/`);
  },
};

export default asistenciaService;
