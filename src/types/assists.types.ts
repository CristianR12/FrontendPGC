// src/types/asistencia.types.ts

/**
 * Tipo principal de Asistencia
 */
export interface Asistencia {
  id: string;
  estudiante: string;
  estadoAsistencia: 'Presente' | 'Ausente' | 'Tiene Excusa';
  fechaYhora: string | Date;
  asignatura?: string;
}

/**
 * DTO para crear asistencia
 */
export interface CreateAsistenciaDto {
  estudiante: string;
  estadoAsistencia: string;
  asignatura?: string;
}

/**
 * DTO para actualizar asistencia (campos opcionales)
 */
export interface UpdateAsistenciaDto {
  estudiante?: string;
  estadoAsistencia?: string;
  asignatura?: string;
}

/**
 * Respuesta de la API con paginación (para futuro)
 */
export interface AsistenciasResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Asistencia[];
}

/**
 * Filtros para buscar asistencias
 */
export interface AsistenciaFilters {
  asignatura?: string;
  estadoAsistencia?: string;
  fechaInicio?: string;
  fechaFin?: string;
}