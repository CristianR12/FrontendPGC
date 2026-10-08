// src/services/cursosApiService.ts
import api from '../api/Axios';
import type { Course } from './horarioApiService';

// ============================================
// ESTUDIANTES DE UN CURSO
// ============================================

export interface EstudianteCurso {
  cedula: string;
  nombre: string;
  /** false si la cédula está inscrita en el curso pero no tiene documento en el sistema */
  registrado: boolean;
}

export interface FilaEstudiante {
  cedula: string;
  nombre: string;
}

export interface ItemPlanEstudiante {
  cedula: string;
  nombre: string;
  nombreActual: string | null;
  motivo: string | null;
  accion: 'crear' | 'inscribir' | 'ya_inscrito' | 'conflicto';
}

export interface PlanInscripcion {
  estudiantes: ItemPlanEstudiante[];
  quitar: { cedula: string; nombre: string }[];
  filasInvalidas: { fila: number; datos: { nombre?: string | null }; errores: string[] }[];
  resumen: {
    filasLeidas: number;
    filasInvalidas: number;
    porCrear: number;
    porInscribir: number;
    yaInscritos: number;
    conflictos: number;
    porQuitar: number;
    hayCambios: boolean;
  };
}

export interface OpcionesInscripcion {
  /** Dejar el curso exactamente con la lista: quita a quien no aparezca en ella. */
  sincronizar?: boolean;
}

// ============================================
// PERFIL
// ============================================

export interface Perfil {
  nombre: string;
  email: string | null;
  tipo: string;
  telefono: string;
  programa: string;
  facultad: string;
  totalCursos: number;
  /** Solo estudiantes */
  cedula?: string;
  emailPersonal?: string;
  contactoEmergencia?: { nombre: string; telefono: string };
  equipos?: Equipo[];
}

export interface Equipo {
  marca: string;
  serial: string;
}

export type CambiosPerfil = Partial<Pick<Perfil, 'telefono' | 'programa' | 'facultad' | 'emailPersonal' | 'contactoEmergencia' | 'equipos'>> & { nombre?: string };

const enc = encodeURIComponent;

class CursosApiService {
  // ----- cursos -----

  async crearCurso(datos: { nameCourse: string; group: string; codigo?: string }): Promise<Course> {
    try {
      const response = await api.post('/cursos/', datos);
      return response.data.curso;
    } catch (error: any) {
      throw new Error(error.message || 'Error al crear el curso');
    }
  }

  async editarCurso(unidadId: string, datos: { nameCourse?: string; group?: string }): Promise<void> {
    try {
      await api.patch(`/cursos/${enc(unidadId)}/`, datos);
    } catch (error: any) {
      throw new Error(error.message || 'Error al editar el curso');
    }
  }

  // ----- estudiantes -----

  async listarEstudiantes(unidadId: string): Promise<EstudianteCurso[]> {
    try {
      const response = await api.get(`/cursos/${enc(unidadId)}/estudiantes/`);
      return response.data.estudiantes;
    } catch (error: any) {
      throw new Error(error.message || 'Error al cargar los estudiantes');
    }
  }

  /** Vista previa: qué se crearía, inscribiría o quitaría. No guarda nada. */
  async previsualizarInscripcion(unidadId: string, filas: FilaEstudiante[], opciones: OpcionesInscripcion = {}): Promise<PlanInscripcion> {
    try {
      const response = await api.post(`/cursos/${enc(unidadId)}/estudiantes/`, { estudiantes: filas, ...opciones, confirmar: false });
      return response.data.plan;
    } catch (error: any) {
      throw new Error(error.message || 'Error al revisar la lista');
    }
  }

  async confirmarInscripcion(
    unidadId: string,
    filas: FilaEstudiante[],
    opciones: OpcionesInscripcion = {}
  ): Promise<{ plan: PlanInscripcion; resultado: { inscritos: number; creados: number; quitados: number } }> {
    try {
      const response = await api.post(`/cursos/${enc(unidadId)}/estudiantes/`, { estudiantes: filas, ...opciones, confirmar: true });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Error al inscribir a los estudiantes');
    }
  }

  async quitarEstudiante(unidadId: string, cedula: string): Promise<void> {
    try {
      await api.delete(`/cursos/${enc(unidadId)}/estudiantes/${enc(cedula)}/`);
    } catch (error: any) {
      throw new Error(error.message || 'Error al quitar al estudiante');
    }
  }

  // ----- perfil -----

  async obtenerPerfil(): Promise<Perfil | null> {
    try {
      const response = await api.get('/perfil/');
      return response.data;
    } catch (error: any) {
      // 404: el usuario inició sesión pero no tiene documento en el sistema
      if (/no encontrado/i.test(error.message || '')) return null;
      throw new Error(error.message || 'Error al cargar el perfil');
    }
  }

  async guardarPerfil(cambios: CambiosPerfil): Promise<void> {
    try {
      await api.patch('/perfil/', cambios);
    } catch (error: any) {
      throw new Error(error.message || 'Error al guardar el perfil');
    }
  }
}

const cursosApiService = new CursosApiService();
export default cursosApiService;
