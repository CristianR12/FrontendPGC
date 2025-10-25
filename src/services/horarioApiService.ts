import api from '../api/Axios';

export interface ScheduleClass {
  classroom: string;
  day: string;
  iniTime: string;
  endTime: string;
}

export interface Course {
  id: string;
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

class HorarioApiService {
  // ============================================
  // OBTENER HORARIOS
  // ============================================

  async getHorariosProfesor(): Promise<Course[]> {
    try {
      console.log('📥 [GET] /api/horarios/');
      const response = await api.get('/horarios/');
      const clases = response.data.clases || [];
      console.log(`✅ Horarios obtenidos: ${clases.length} cursos`);
      return clases;
    } catch (error: any) {
      console.error('❌ Error al obtener horarios:', error);
      throw new Error(error.message || 'Error al obtener horarios');
    }
  }

  async getHorarioEstudiante(): Promise<Course[]> {
    try {
      console.log('📥 [GET] /api/horarios/');
      const response = await api.get('/horarios/');
      const clases = response.data.clases || [];
      console.log(`✅ Horarios del estudiante obtenidos: ${clases.length} cursos`);
      return clases;
    } catch (error: any) {
      console.error('❌ Error al obtener horarios del estudiante:', error);
      throw new Error(error.message || 'Error al obtener horarios');
    }
  }

  async getCursoById(courseId: string): Promise<Course> {
    try {
      console.log(`📖 [GET] /api/horarios/cursos/${courseId}/`);
      const response = await api.get(`/horarios/cursos/${courseId}/`);
      console.log(`✅ Curso obtenido: ${response.data.nameCourse}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al obtener curso:', error);
      throw new Error(error.message || 'Error al obtener curso');
    }
  }

  // ============================================
  // CREAR / ACTUALIZAR HORARIOS
  // ============================================

  async guardarHorariosProfesor(clases: Course[]): Promise<Course[]> {
    try {
      console.log('📤 [POST] /api/horarios/ - Guardando horarios');
      const response = await api.post('/horarios/', { clases });
      console.log(`✅ Horarios guardados: ${response.data.clases.length} cursos`);
      return response.data.clases;
    } catch (error: any) {
      console.error('❌ Error al guardar horarios:', error);
      throw new Error(error.message || 'Error al guardar horarios');
    }
  }

  async actualizarScheduleCurso(courseId: string, schedule: ScheduleClass[]): Promise<Course> {
    try {
      console.log(`📝 [PUT] /api/horarios/cursos/${courseId}/ - Actualizando schedule`);
      const response = await api.put(`/horarios/cursos/${courseId}/`, { schedule });
      console.log(`✅ Schedule actualizado: ${schedule.length} clases`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al actualizar schedule:', error);
      throw new Error(error.message || 'Error al actualizar schedule');
    }
  }

  // ============================================
  // AGREGAR CLASES
  // ============================================

  async agregarClase(courseId: string, clase: ScheduleClass): Promise<ScheduleClass> {
    try {
      console.log('➕ [POST] /api/horarios/clases/ - Agregando clase');
      const response = await api.post('/horarios/clases/', { courseId, ...clase });
      console.log(`✅ Clase agregada: ${clase.day} ${clase.iniTime}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al agregar clase:', error);
      throw new Error(error.message || 'Error al agregar clase');
    }
  }

  // ============================================
  // ACTUALIZAR CLASES INDIVIDUALES
  // ============================================

  async actualizarClase(courseId: string, classIndex: number, clase: ScheduleClass): Promise<ScheduleClass> {
    try {
      console.log('✏️ [PUT] /api/horarios/clases/ - Actualizando clase');
      const response = await api.put('/horarios/clases/', { courseId, classIndex, ...clase });
      console.log('✅ Clase actualizada');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al actualizar clase:', error);
      throw new Error(error.message || 'Error al actualizar clase');
    }
  }

  // ============================================
  // ELIMINAR CLASES Y CURSOS
  // ============================================

  async eliminarClase(courseId: string, classIndex: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🗑️ [DELETE] /api/horarios/clases/ - Eliminando clase');
      const response = await api.delete('/horarios/clases/', { data: { courseId, classIndex } });
      console.log('✅ Clase eliminada');
      return { success: true, message: response.data.message };
    } catch (error: any) {
      console.error('❌ Error al eliminar clase:', error);
      throw new Error(error.message || 'Error al eliminar clase');
    }
  }

  async eliminarCurso(courseId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🗑️ [DELETE] /api/horarios/cursos/${courseId}/ - Eliminando curso`);
      const response = await api.delete(`/horarios/cursos/${courseId}/`);
      console.log('✅ Curso eliminado');
      return { success: true, message: response.data.message };
    } catch (error: any) {
      console.error('❌ Error al eliminar curso:', error);
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
      console.log('⚠️ [POST] /api/horarios/validar-conflictos/');
      const response = await api.post('/horarios/validar-conflictos/', {
        profesorId,
        clase,
        excludeCourseId,
        excludeClassIndex,
      });
      return { hasConflict: response.data.hasConflict, message: response.data.message };
    } catch (error: any) {
      console.error('❌ Error al validar conflictos:', error);
      return { hasConflict: false, message: null };
    }
  }

  // ============================================
  // ESTUDIANTES
  // ============================================

  async getEstudiantesDeCurso(courseId: string): Promise<Estudiante[]> {
    try {
      console.log(`👥 [GET] /api/horarios/cursos/${courseId}/estudiantes/`);
      const response = await api.get(`/horarios/cursos/${courseId}/estudiantes/`);
      console.log(`✅ Estudiantes obtenidos: ${response.data.estudiantes.length}`);
      return response.data.estudiantes;
    } catch (error: any) {
      console.error('❌ Error al obtener estudiantes:', error);
      return [];
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
          horarioPorDia[clase.day].push({ curso: curso.nameCourse, grupo: curso.group, ...clase });
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

// ✅ Exportación por defecto correcta
const horarioApiService = new HorarioApiService();
export default horarioApiService;
