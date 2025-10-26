// src/services/profesorService.ts
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface ProfesorInfo {
  uid: string;
  namePerson: string;
  type: string;
  courses: string[]; // Array de IDs de cursos
}

export interface CourseInfo {
  id: string;
  nameCourse: string;
  group: string;
  profesorID: string;
}

class ProfesorService {
  /**
   * Verifica si el usuario es un profesor basándose en su UID
   */
  async verificarProfesor(uid: string): Promise<{ esProfesor: boolean; info?: ProfesorInfo }> {
    try {
      console.log(`🔍 Verificando si ${uid} es profesor...`);
      
      // Buscar documento en la colección "person"
      const personDoc = await getDoc(doc(db, 'person', uid));
      
      if (!personDoc.exists()) {
        console.log('❌ No se encontró documento en person');
        return { esProfesor: false };
      }
      
      const data = personDoc.data();
      
      // Verificar que tenga type: "Profesor"
      if (data.type !== 'Profesor') {
        console.log(`❌ El usuario es de tipo: ${data.type}`);
        return { esProfesor: false };
      }
      
      console.log('✅ Usuario es profesor');
      
      const profesorInfo: ProfesorInfo = {
        uid: uid,
        namePerson: data.namePerson || '',
        type: data.type,
        courses: data.courses || []
      };
      
      return { esProfesor: true, info: profesorInfo };
      
    } catch (error) {
      console.error('❌ Error al verificar profesor:', error);
      return { esProfesor: false };
    }
  }
  
  /**
   * Obtiene la información de los cursos del profesor
   */
  async obtenerCursosProfesor(courseIds: string[]): Promise<CourseInfo[]> {
    try {
      console.log(`📚 Obteniendo ${courseIds.length} cursos...`);
      
      if (courseIds.length === 0) {
        return [];
      }
      
      const cursosPromises = courseIds.map(async (courseId) => {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (courseDoc.exists()) {
          return {
            id: courseDoc.id,
            ...courseDoc.data()
          } as CourseInfo;
        }
        return null;
      });
      
      const cursos = await Promise.all(cursosPromises);
      const cursosValidos = cursos.filter((c): c is CourseInfo => c !== null);
      
      console.log(`✅ Cursos obtenidos: ${cursosValidos.length}`);
      return cursosValidos;
      
    } catch (error) {
      console.error('❌ Error al obtener cursos:', error);
      return [];
    }
  }
  
  /**
   * Obtiene los nombres de las asignaturas del profesor
   */
  async obtenerNombresAsignaturas(uid: string): Promise<string[]> {
    try {
      const { esProfesor, info } = await this.verificarProfesor(uid);
      
      if (!esProfesor || !info) {
        return [];
      }
      
      const cursos = await this.obtenerCursosProfesor(info.courses);
      const nombresAsignaturas = cursos.map(curso => curso.nameCourse);
      
      // Eliminar duplicados
      const asignaturasUnicas = [...new Set(nombresAsignaturas)];
      
      console.log(`✅ Asignaturas únicas: ${asignaturasUnicas.join(', ')}`);
      return asignaturasUnicas;
      
    } catch (error) {
      console.error('❌ Error al obtener nombres de asignaturas:', error);
      return [];
    }
  }
}

const profesorService = new ProfesorService();
export default profesorService;