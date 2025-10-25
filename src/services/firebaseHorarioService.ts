// src/services/firebaseHorarioService.ts
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  arrayUnion,
  arrayRemove,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Interfaces basadas en tu estructura de Firebase
export interface ScheduleClass {
  classroom: string;
  day: string; // "Lunes", "Martes", etc.
  endTime: string; // "17:59"
  iniTime: string; // "15:00"
}

export interface Course {
  id: string;
  nameCourse: string;
  group: string;
  profesorID: string;
  estudianteID: string[];
  schedule: ScheduleClass[];
}

export interface Person {
  id: string;
  namePerson: string;
  type: string; // "Estudiante" o "Profesor"
  courses: string[]; // Array de IDs de cursos
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const firebaseHorarioService = {
  
  /**
   * Obtener el horario completo de un profesor
   * Busca todos los cursos donde el profesor es el instructor
   */
  async getHorarioProfesor(profesorID: string): Promise<Course[]> {
    try {
      console.log('🔍 Obteniendo horario del profesor:', profesorID);
      
      const coursesRef = collection(db, 'courses');
      const q = query(coursesRef, where('profesorID', '==', profesorID));
      const querySnapshot = await getDocs(q);
      
      const cursos: Course[] = [];
      querySnapshot.forEach((doc) => {
        cursos.push({
          id: doc.id,
          ...doc.data()
        } as Course);
      });
      
      console.log('✅ Cursos encontrados:', cursos.length);
      return cursos;
    } catch (error) {
      console.error('❌ Error al obtener horario del profesor:', error);
      throw new Error('Error al cargar el horario del profesor');
    }
  },

  /**
   * Obtener el horario de un estudiante
   * Obtiene los cursos en los que está inscrito
   */
  async getHorarioEstudiante(estudianteID: string): Promise<Course[]> {
    try {
      console.log('🔍 Obteniendo horario del estudiante:', estudianteID);
      
      // Primero obtener el documento del estudiante
      const personDoc = await getDoc(doc(db, 'person', estudianteID));
      if (!personDoc.exists()) {
        throw new Error('Estudiante no encontrado');
      }
      
      const personData = personDoc.data() as Person;
      const courseIDs = personData.courses || [];
      
      if (courseIDs.length === 0) {
        console.log('ℹ️ El estudiante no tiene cursos asignados');
        return [];
      }
      
      // Obtener los datos de cada curso
      const cursos: Course[] = [];
      for (const courseId of courseIDs) {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (courseDoc.exists()) {
          cursos.push({
            id: courseDoc.id,
            ...courseDoc.data()
          } as Course);
        }
      }
      
      console.log('✅ Cursos del estudiante:', cursos.length);
      return cursos;
    } catch (error) {
      console.error('❌ Error al obtener horario del estudiante:', error);
      throw new Error('Error al cargar el horario del estudiante');
    }
  },

  /**
   * Crear un nuevo curso con horario
   */
  async crearCurso(curso: Omit<Course, 'id'>): Promise<string> {
    try {
      console.log('➕ Creando nuevo curso:', curso);
      
      const coursesRef = collection(db, 'courses');
      const newCourseRef = doc(coursesRef);
      
      await setDoc(newCourseRef, {
        nameCourse: curso.nameCourse,
        group: curso.group,
        profesorID: curso.profesorID,
        estudianteID: curso.estudianteID || [],
        schedule: curso.schedule || []
      });
      
      console.log('✅ Curso creado con ID:', newCourseRef.id);
      return newCourseRef.id;
    } catch (error) {
      console.error('❌ Error al crear curso:', error);
      throw new Error('Error al crear el curso');
    }
  },

  /**
   * Actualizar el horario de un curso existente
   */
  async actualizarHorarioCurso(courseId: string, schedule: ScheduleClass[]): Promise<void> {
    try {
      console.log('📝 Actualizando horario del curso:', courseId);
      
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        schedule: schedule
      });
      
      console.log('✅ Horario actualizado correctamente');
    } catch (error) {
      console.error('❌ Error al actualizar horario:', error);
      throw new Error('Error al actualizar el horario');
    }
  },

  /**
   * Agregar una clase al horario de un curso
   */
  async agregarClaseACurso(courseId: string, clase: ScheduleClass): Promise<void> {
    try {
      console.log('➕ Agregando clase al curso:', courseId);
      
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        schedule: arrayUnion(clase)
      });
      
      console.log('✅ Clase agregada correctamente');
    } catch (error) {
      console.error('❌ Error al agregar clase:', error);
      throw new Error('Error al agregar la clase');
    }
  },

  /**
   * Eliminar una clase del horario
   */
  async eliminarClaseDeCurso(courseId: string, clase: ScheduleClass): Promise<void> {
    try {
      console.log('🗑️ Eliminando clase del curso:', courseId);
      
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        schedule: arrayRemove(clase)
      });
      
      console.log('✅ Clase eliminada correctamente');
    } catch (error) {
      console.error('❌ Error al eliminar clase:', error);
      throw new Error('Error al eliminar la clase');
    }
  },

  /**
   * Organizar horario por días para visualización
   */
  organizarHorarioPorDias(cursos: Course[]): { [dia: string]: any[] } {
    const horarioPorDia: { [dia: string]: any[] } = {};
    
    // Inicializar todos los días
    DIAS_SEMANA.forEach(dia => {
      horarioPorDia[dia] = [];
    });
    
    // Organizar clases por día
    cursos.forEach(curso => {
      if (curso.schedule && curso.schedule.length > 0) {
        curso.schedule.forEach(clase => {
          if (horarioPorDia[clase.day]) {
            horarioPorDia[clase.day].push({
              ...clase,
              curso: curso.nameCourse,
              group: curso.group,
              courseId: curso.id
            });
          }
        });
      }
    });
    
    // Ordenar por hora de inicio
    Object.keys(horarioPorDia).forEach(dia => {
      horarioPorDia[dia].sort((a, b) => {
        return a.iniTime.localeCompare(b.iniTime);
      });
    });
    
    return horarioPorDia;
  },

  /**
   * Validar conflictos de horario
   */
  validarConflictos(schedule: ScheduleClass[]): { tieneConflictos: boolean; conflictos: string[] } {
    const conflictos: string[] = [];
    const clasesPorDia: { [dia: string]: ScheduleClass[] } = {};
    
    // Agrupar por día
    schedule.forEach(clase => {
      if (!clasesPorDia[clase.day]) {
        clasesPorDia[clase.day] = [];
      }
      clasesPorDia[clase.day].push(clase);
    });
    
    // Verificar solapamientos
    Object.entries(clasesPorDia).forEach(([dia, clases]) => {
      for (let i = 0; i < clases.length; i++) {
        for (let j = i + 1; j < clases.length; j++) {
          const clase1 = clases[i];
          const clase2 = clases[j];
          
          const [h1i, m1i] = clase1.iniTime.split(':').map(Number);
          const [h1f, m1f] = clase1.endTime.split(':').map(Number);
          const [h2i, m2i] = clase2.iniTime.split(':').map(Number);
          const [h2f, m2f] = clase2.endTime.split(':').map(Number);
          
          const inicio1 = h1i * 60 + m1i;
          const fin1 = h1f * 60 + m1f;
          const inicio2 = h2i * 60 + m2i;
          const fin2 = h2f * 60 + m2f;
          
          // Verificar solapamiento
          if (inicio1 < fin2 && inicio2 < fin1) {
            conflictos.push(
              `${dia}: ${clase1.classroom} (${clase1.iniTime}-${clase1.endTime}) se solapa con ${clase2.classroom} (${clase2.iniTime}-${clase2.endTime})`
            );
          }
        }
      }
    });
    
    return {
      tieneConflictos: conflictos.length > 0,
      conflictos
    };
  },

  /**
   * Obtener datos de un curso específico
   */
  async getCurso(courseId: string): Promise<Course | null> {
    try {
      const courseDoc = await getDoc(doc(db, 'courses', courseId));
      if (courseDoc.exists()) {
        return {
          id: courseDoc.id,
          ...courseDoc.data()
        } as Course;
      }
      return null;
    } catch (error) {
      console.error('❌ Error al obtener curso:', error);
      throw new Error('Error al cargar el curso');
    }
  },

  /**
   * Colores para las asignaturas
   */
  generarColor(index: number): string {
    const colores = [
      '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
      '#00BCD4', '#FFC107', '#E91E63', '#3F51B5', '#009688'
    ];
    return colores[index % colores.length];
  }
};

export default firebaseHorarioService;