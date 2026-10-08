// src/services/profesorService.ts
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface ProfesorInfo {
  docId: string; // ID del documento en Firestore
  uid: string; // UID de Firebase Auth (campo profesorUID)
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
   * Busca un documento en 'person' donde el campo 'profesorUID' coincida con el UID
   * 
   * @param uid - UID de Firebase Auth
   * @returns Información del profesor si existe, null si no
   */
  async buscarPorUID(uid: string): Promise<ProfesorInfo | null> {
    try {
      console.log(`Buscando persona con UID: ${uid}`);
      
      const personsRef = collection(db, 'person');
      const q = query(personsRef, where('profesorUID', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No se encontró documento en person');
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      console.log('Documento encontrado:', doc.id);
      
      return {
        docId: doc.id,
        uid: data.profesorUID || uid,
        namePerson: data.namePerson || '',
        type: data.type || '',
        courses: data.courses || []
      };
      
    } catch (error) {
      console.error('Error al buscar por UID:', error);
      return null;
    }
  }
  
  /**
   * Verifica si el usuario es un profesor basándose en su UID
   */
  async verificarProfesor(uid: string): Promise<{ esProfesor: boolean; info?: ProfesorInfo }> {
    try {
      console.log(`Verificando si ${uid} es profesor...`);
      
      const profesorInfo = await this.buscarPorUID(uid);
      
      if (!profesorInfo) {
        return { esProfesor: false };
      }
      
      // Verificar que tenga type: "Profesor"
      if (profesorInfo.type !== 'Profesor') {
        console.log(`El usuario es de tipo: ${profesorInfo.type}`);
        return { esProfesor: false };
      }
      
      console.log('Usuario es profesor');
      return { esProfesor: true, info: profesorInfo };
      
    } catch (error) {
      console.error('Error al verificar profesor:', error);
      return { esProfesor: false };
    }
  }
  
  /**
   * Obtiene la información de los cursos del profesor (desde Firestore directamente)
   * Nota: Este método ya no es necesario si usas la API del backend
   */
  async obtenerCursosProfesor(courseIds: string[]): Promise<CourseInfo[]> {
    try {
      console.log(`Obteniendo ${courseIds.length} cursos desde Firestore...`);
      
      if (courseIds.length === 0) {
        return [];
      }
      
      // Este código sería reemplazado por llamadas a tu API
      // Lo dejo aquí por si lo necesitas para debug
      
      return [];
      
    } catch (error) {
      console.error('Error al obtener cursos:', error);
      return [];
    }
  }
  
  /**
   * Obtiene los nombres de las asignaturas del profesor (desde la API)
   */
  async obtenerNombresAsignaturas(_uid: string): Promise<string[]> {
    try {
      // Este método ahora debería usar horarioApiService
      // en lugar de acceder directamente a Firestore
      console.log('Este método debería usar horarioApiService');
      return [];
      
    } catch (error) {
      console.error('Error al obtener nombres de asignaturas:', error);
      return [];
    }
  }
}

const profesorService = new ProfesorService();
export default profesorService;