import api from '../api/Axios';

export interface ScheduleClass {
  classroom: string;
  day: string;
  iniTime: string;
  endTime: string;
}

export interface Course {
  /** Id de la unidad de horario: el del curso, o 'cursoId::grupoId' si el horario es de un subgrupo. */
  id: string;
  courseId?: string;
  groupId?: string | null;
  nameCourse: string;
  group: string;
  profesorID: string;
  estudianteID: string[];
  schedule: ScheduleClass[];
}

export interface Estudiante {
  uid: string;
  namePerson: string;
  type: string;
}


// ============================================
// IMPORTACIÓN DE HORARIOS (Excel / PDF)
// ============================================

export type ModoImportacion = 'combinar' | 'reemplazar';

export interface FilaImportar {
  /** Código de Academusoft (opcional): si el curso se crea, se usa como su id. */
  codigo?: string;
  curso: string;
  grupo: string;
  day: string;
  iniTime: string;
  endTime: string;
  classroom: string;
}

export interface CursoPlan {
  accion: 'actualizar' | 'crear' | 'omitir' | 'archivar' | 'subgrupo';
  /** Solo en 'subgrupo': curso al que se agrega y nombre del subgrupo. */
  cursoPadre?: string;
  groupId?: string;
  courseId: string | null;
  /** Código con el que se creará el curso (solo en acción 'crear'). */
  codigo?: string | null;
  nameCourse: string;
  group: string;
  aproximado: boolean;
  motivo: string | null;
  similares: { id: string; nameCourse: string; group: string }[];
  nuevas: ScheduleClass[];
  iguales: ScheduleClass[];
  cambiosSalon: (ScheduleClass & { salonAnterior?: string })[];
  soloEnSistema: ScheduleClass[];
  resultado: ScheduleClass[];
}

export interface PlanImportacion {
  modo: ModoImportacion;
  cursos: CursoPlan[];
  filasInvalidas: { fila: number; datos: Partial<FilaImportar>; errores: string[] }[];
  advertencias: { tipo: 'sin_salon'; curso: string; group: string; day: string; iniTime: string; endTime: string }[];
  /** Cursos de un solo grupo que pasan a ser cursos con subgrupos para poder agregar un grupo nuevo. */
  conversiones: {
    desde: string;
    hacia: string;
    courseId: string;
    groupId: string;
    nameCourse: string;
    group: string;
    clases: number;
    estudiantes: number;
  }[];
  conflictos: {
    dia: string;
    a: { curso: string; iniTime: string; endTime: string };
    b: { curso: string; iniTime: string; endTime: string };
  }[];
  resumen: {
    filasLeidas: number;
    filasValidas: number;
    filasInvalidas: number;
    cursosActualizados: number;
    cursosNuevos: number;
    cursosOmitidos: number;
    cursosArchivados: number;
    subgruposNuevos: number;
    cursosConvertidos: number;
    clasesNuevas: number;
    hayCambios: boolean;
  };
}

export interface OpcionesImportacion {
  modo: ModoImportacion;
  crearFaltantes: boolean;
  /** Archivar los cursos que no vienen en el archivo: se les quita el horario (ya no se toma asistencia) y se conservan sus asistencias. */
  archivarOtros?: boolean;
  /** Período académico, ej: "2026-2". Si no se envía, el backend usa el que corresponde a la fecha. */
  periodo?: string;
  /** Nombre del archivo de origen (solo para el historial). */
  archivo?: string;
}

// ============================================
// HISTORIAL POR SEMESTRE
// ============================================

export interface CambioCurso {
  courseId: string;
  nameCourse: string;
  group: string;
  accion: 'creado' | 'modificado' | 'eliminado';
  agregadas: ScheduleClass[];
  quitadas: ScheduleClass[];
  cambiosSalon: (ScheduleClass & { salonAnterior?: string })[];
}

export interface EntradaHistorial {
  id: string;
  fecha: string;
  tipo: string;
  detalle: { modo?: string; archivo?: string; filas?: number; nota?: string };
  cambios: CambioCurso[];
  resumen: {
    clasesAgregadas: number;
    clasesQuitadas: number;
    cambiosSalon: number;
    cursosCreados: number;
    cursosEliminados: number;
  };
}

export interface CursoFoto {
  courseId: string;
  nameCourse: string;
  group: string;
  schedule: ScheduleClass[];
}

export interface HistorialHorario {
  periodos: { periodo: string; cambios: number; ultimaFecha: string }[];
  periodo: string;
  periodoActual: string;
  horario: CursoFoto[] | null;
  entradas: EntradaHistorial[];
}

class HorarioApiService {
  // ============================================
  // OBTENER HORARIOS
  // ============================================

  async getHorariosProfesor(): Promise<Course[]> {
    try {
      console.log('[GET] /api/horarios/');
      const response = await api.get('/horarios/');
      const clases = response.data.clases || [];
      console.log(`Horarios obtenidos: ${clases.length} cursos`);
      return clases;
    } catch (error: any) {
      console.error('Error al obtener horarios:', error);
      throw new Error(error.message || 'Error al obtener horarios');
    }
  }

  async getHorarioEstudiante(): Promise<Course[]> {
    try {
      console.log('[GET] /api/horarios/');
      const response = await api.get('/horarios/');
      const clases = response.data.clases || [];
      console.log(`Horarios del estudiante obtenidos: ${clases.length} cursos`);
      return clases;
    } catch (error: any) {
      console.error('Error al obtener horarios del estudiante:', error);
      throw new Error(error.message || 'Error al obtener horarios');
    }
  }

  async getCursoById(courseId: string): Promise<Course> {
    try {
      console.log(`[GET] /api/horarios/cursos/${courseId}/`);
      const response = await api.get(`/horarios/cursos/${encodeURIComponent(courseId)}/`);
      console.log(`Curso obtenido: ${response.data.nameCourse}`);
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener curso:', error);
      throw new Error(error.message || 'Error al obtener curso');
    }
  }

  // ============================================
  // CREAR / ACTUALIZAR HORARIOS
  // ============================================

  async guardarHorariosProfesor(clases: Course[]): Promise<Course[]> {
    try {
      console.log('[POST] /api/horarios/ - Guardando horarios');
      const response = await api.post('/horarios/', { clases });
      console.log(`Horarios guardados: ${response.data.clases.length} cursos`);
      return response.data.clases;
    } catch (error: any) {
      console.error('Error al guardar horarios:', error);
      throw new Error(error.message || 'Error al guardar horarios');
    }
  }

  async actualizarScheduleCurso(courseId: string, schedule: ScheduleClass[]): Promise<Course> {
    try {
      console.log(`[PUT] /api/horarios/cursos/${courseId}/ - Actualizando schedule`);
      const response = await api.put(`/horarios/cursos/${encodeURIComponent(courseId)}/`, { schedule });
      console.log(`Schedule actualizado: ${schedule.length} clases`);
      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar schedule:', error);
      throw new Error(error.message || 'Error al actualizar schedule');
    }
  }

  // ============================================
  // AGREGAR CLASES
  // ============================================

  async agregarClase(courseId: string, clase: ScheduleClass): Promise<ScheduleClass> {
    try {
      console.log('[POST] /api/horarios/clases/ - Agregando clase');
      const response = await api.post('/horarios/clases/', { courseId, ...clase });
      console.log(`Clase agregada: ${clase.day} ${clase.iniTime}`);
      return response.data;
    } catch (error: any) {
      console.error('Error al agregar clase:', error);
      throw new Error(error.message || 'Error al agregar clase');
    }
  }

  // ============================================
  // ACTUALIZAR CLASES INDIVIDUALES
  // ============================================

  async actualizarClase(courseId: string, classIndex: number, clase: ScheduleClass): Promise<ScheduleClass> {
    try {
      console.log('[PUT] /api/horarios/clases/ - Actualizando clase');
      const response = await api.put('/horarios/clases/', { courseId, classIndex, ...clase });
      console.log('Clase actualizada');
      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar clase:', error);
      throw new Error(error.message || 'Error al actualizar clase');
    }
  }

  // ============================================
  // ELIMINAR CLASES Y CURSOS
  // ============================================

  async eliminarClase(courseId: string, classIndex: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[DELETE] /api/horarios/clases/ - Eliminando clase');
      const response = await api.delete('/horarios/clases/', { data: { courseId, classIndex } });
      console.log('Clase eliminada');
      return { success: true, message: response.data.message };
    } catch (error: any) {
      console.error('Error al eliminar clase:', error);
      throw new Error(error.message || 'Error al eliminar clase');
    }
  }

  async eliminarCurso(courseId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[DELETE] /api/horarios/cursos/${courseId}/ - Eliminando curso`);
      const response = await api.delete(`/horarios/cursos/${encodeURIComponent(courseId)}/`);
      console.log('Curso eliminado');
      return { success: true, message: response.data.message };
    } catch (error: any) {
      console.error('Error al eliminar curso:', error);
      throw new Error(error.message || 'Error al eliminar curso');
    }
  }

  // ============================================
  // VALIDACIONES
  // ============================================

  async validarConflictos(
    profesorId: string,
    clase: ScheduleClass,
    excludeCourseId?: string,
    excludeClassIndex?: number
  ): Promise<{ hasConflict: boolean; message: string | null }> {
    try {
      console.log('[POST] /api/horarios/validar-conflictos/');
      const response = await api.post('/horarios/validar-conflictos/', {
        profesorId,
        clase,
        excludeCourseId,
        excludeClassIndex,
      });
      return { hasConflict: response.data.hasConflict, message: response.data.message };
    } catch (error: any) {
      console.error('Error al validar conflictos:', error);
      return { hasConflict: false, message: null };
    }
  }

  // ============================================
  // ESTUDIANTES
  // ============================================

  async getEstudiantesDeCurso(courseId: string): Promise<Estudiante[]> {
    try {
      console.log(`[GET] /api/horarios/cursos/${courseId}/estudiantes/`);
      const response = await api.get(`/horarios/cursos/${courseId}/estudiantes/`);
      console.log(`Estudiantes obtenidos: ${response.data.estudiantes.length}`);
      return response.data.estudiantes;
    } catch (error: any) {
      console.error('Error al obtener estudiantes:', error);
      return [];
    }
  }

  // ============================================
  // IMPORTAR HORARIO DESDE ARCHIVO
  // ============================================

  /** Vista previa: calcula qué cambiaría, sin guardar nada. */
  async previsualizarImportacion(filas: FilaImportar[], opciones: OpcionesImportacion): Promise<PlanImportacion> {
    try {
      const response = await api.post('/horarios/importar/', { filas, ...opciones, confirmar: false });
      return response.data.plan;
    } catch (error: any) {
      throw new Error(error.message || 'Error al revisar el horario');
    }
  }

  /** Aplica la importación (el backend recalcula el mismo plan y lo guarda en un solo lote). */
  async confirmarImportacion(
    filas: FilaImportar[],
    opciones: OpcionesImportacion
  ): Promise<{
    plan: PlanImportacion;
    cursosCreados: { id: string; nameCourse: string; group: string }[];
    subgruposCreados: { id: string; nameCourse: string; group: string }[];
    cursosConvertidos: number;
  }> {
    try {
      const response = await api.post('/horarios/importar/', { filas, ...opciones, confirmar: true });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Error al guardar el horario');
    }
  }

  // ============================================
  // HISTORIAL POR SEMESTRE
  // ============================================

  async obtenerHistorial(periodo?: string): Promise<HistorialHorario> {
    try {
      const response = await api.get('/horarios/historial/', { params: periodo ? { periodo } : undefined });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Error al cargar el historial');
    }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  generarColor(index: number): string {
    const colores = [
      '#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
      '#43e97b', '#fa709a', '#fee140', '#30b0fe', '#ec008c',
    ];
    return colores[index % colores.length];
  }

  organizarHorarioPorDias(cursos: Course[]): Record<string, any[]> {
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const horarioPorDia: Record<string, any[]> = {};

    diasSemana.forEach(dia => (horarioPorDia[dia] = []));

    cursos.forEach(curso => {
      curso.schedule?.forEach(clase => {
        if (horarioPorDia[clase.day]) {
          horarioPorDia[clase.day].push({ curso: curso.nameCourse, grupo: curso.group, courseId: curso.id, ...clase });
        }
      });
    });

    Object.keys(horarioPorDia).forEach(dia => {
      horarioPorDia[dia].sort((a, b) => parseInt(a.iniTime.replace(':', '')) - parseInt(b.iniTime.replace(':', '')));
    });

    return horarioPorDia;
  }

  validarClase(clase: ScheduleClass): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    if (!clase.classroom.trim()) errores.push('El salón es requerido');
    if (!clase.day) errores.push('El día es requerido');
    if (!clase.iniTime) errores.push('La hora de inicio es requerida');
    if (!clase.endTime) errores.push('La hora de fin es requerida');

    if (clase.iniTime && clase.endTime) {
      const [hIni, mIni] = clase.iniTime.split(':').map(Number);
      const [hFin, mFin] = clase.endTime.split(':').map(Number);
      if (hFin * 60 + mFin <= hIni * 60 + mIni)
        errores.push('La hora de fin debe ser posterior a la hora de inicio');
    }

    return { valido: errores.length === 0, errores };
  }

  obtenerDiaActual(): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[new Date().getDay()];
  }
}

// Exportación por defecto correcta
const horarioApiService = new HorarioApiService();
export default horarioApiService;
