// src/services/adminAsistenciasApiService.ts
// Buscador de asistencias de todo el sistema para el panel de administración (ver api_app/views.py: AdminAsistencias*).
import api from '../api/Axios';
import type { Course } from './horarioApiService';

export interface FiltroDocente {
  cedula: string;
  nombre: string;
}

export interface FiltrosAsistenciaAdmin {
  /** Mismas unidades (cursos y subgrupos) que GET /api/horarios/, para alimentar "Generar reporte". */
  cursos: Course[];
  docentes: FiltroDocente[];
}

export type EstadoAsistencia = 'Presente' | 'Ausente' | 'Tiene Excusa';

export interface FilaAsistenciaAdmin {
  estudiante: string;
  asignatura: string;
  docente: string;
  docenteId: string;
  fechaDocId: string;
  estadoAsistencia: EstadoAsistencia;
  horaRegistro: string;
}

export interface ResumenAsistenciaAdmin {
  total: number;
  presentes: number;
  ausentes: number;
  conExcusa: number;
}

export interface BusquedaAsistenciaAdmin {
  filas: FilaAsistenciaAdmin[];
  page: number;
  size: number;
  totalPaginas: number;
  totalGeneral: number;
  resumen: ResumenAsistenciaAdmin;
  nombres: Record<string, string>;
}

export interface FiltrosBusquedaAsistenciaAdmin {
  curso?: string;
  docente?: string;
  fecha?: string;
  estado?: EstadoAsistencia;
  q?: string;
  page?: number;
  size?: number;
}

function parametros(f: FiltrosBusquedaAsistenciaAdmin) {
  const p: Record<string, string | number> = {};
  if (f.curso) p.curso = f.curso;
  if (f.docente) p.docente = f.docente;
  if (f.fecha) p.fecha = f.fecha;
  if (f.estado) p.estado = f.estado;
  if (f.q) p.q = f.q;
  if (f.page) p.page = f.page;
  if (f.size) p.size = f.size;
  return p;
}

class AdminAsistenciasApiService {
  async filtros(): Promise<FiltrosAsistenciaAdmin> {
    const { data } = await api.get<FiltrosAsistenciaAdmin>('/admin/asistencias/filtros/');
    return data;
  }

  async buscar(filtros: FiltrosBusquedaAsistenciaAdmin): Promise<BusquedaAsistenciaAdmin> {
    const { data } = await api.get<BusquedaAsistenciaAdmin>('/admin/asistencias/', { params: parametros(filtros) });
    return data;
  }
}

export default new AdminAsistenciasApiService();
