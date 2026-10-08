// src/services/registroApiService.ts
import api from '../api/Axios';

export type EstadoRegistro =
  | 'activo'
  | 'pendiente'
  | 'rechazada'
  | 'requiere_datos'
  | 'no_verificado'
  | 'dominio_no_permitido'
  | 'cedula_en_uso'
  | 'sin_correo'
  | 'cedula_no_encontrada'
  | 'estudiante_inactivo'
  | 'cuenta_docente';

export type Rol = 'Profesor' | 'Estudiante';

export interface RespuestaRegistro {
  estado: EstadoRegistro;
  mensaje: string;
  esAdmin: boolean;
  /** Rol de la cuenta cuando está activa (lo decide el servidor) */
  rol?: Rol | null;
  nombre?: string;
}

export interface CambioEstudiante {
  id: string;
  tipo: 'perfil' | 'vinculacion';
  cedula: string;
  nombre: string;
  email?: string;
  /** ISO con zona horaria */
  fecha: string;
  cambios: { campo: string; antes: unknown; despues: unknown }[];
}

export interface Solicitud {
  uid: string;
  email: string;
  nombre: string;
  cedula: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fecha: string;
  nota?: string | null;
}

export interface DocenteAutorizado {
  email: string;
  cedula: string;
  nombre: string;
}

const enc = encodeURIComponent;

class RegistroApiService {
  /** Se llama al iniciar sesión. Es idempotente; el servidor decide el estado y el rol. */
  async registrar(datos?: { cedula: string; nombre: string }): Promise<RespuestaRegistro> {
    try {
      const response = await api.post('/registro/', datos ?? {});
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo verificar tu cuenta');
    }
  }

  /** Estudiante: liga su cuenta con su cédula (solo si es un estudiante activo sin otra cuenta). */
  async vincularEstudiante(cedula: string): Promise<RespuestaRegistro> {
    try {
      return (await api.post('/registro/estudiante/', { cedula })).data;
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo vincular tu cuenta');
    }
  }

  // ----- administración -----

  async listarCambiosEstudiantes(): Promise<CambioEstudiante[]> {
    try {
      return (await api.get('/admin/cambios-estudiantes/')).data.cambios;
    } catch (error: any) {
      throw new Error(error.message || 'Error al cargar los cambios de estudiantes');
    }
  }

  async listarSolicitudes(): Promise<Solicitud[]> {
    try {
      return (await api.get('/admin/solicitudes/')).data.solicitudes;
    } catch (error: any) {
      throw new Error(error.message || 'Error al cargar las solicitudes');
    }
  }

  async resolverSolicitud(uid: string, accion: 'aprobar' | 'rechazar', nota?: string): Promise<void> {
    try {
      await api.post(`/admin/solicitudes/${enc(uid)}/${accion}/`, accion === 'rechazar' ? { nota } : {});
    } catch (error: any) {
      throw new Error(error.message || 'Error al resolver la solicitud');
    }
  }

  async listarAutorizados(): Promise<DocenteAutorizado[]> {
    try {
      return (await api.get('/admin/autorizados/')).data.docentes;
    } catch (error: any) {
      throw new Error(error.message || 'Error al cargar los docentes autorizados');
    }
  }

  async guardarAutorizados(docentes: DocenteAutorizado[]): Promise<number> {
    try {
      return (await api.post('/admin/autorizados/', { docentes })).data.guardados;
    } catch (error: any) {
      throw new Error(error.message || 'Error al guardar los docentes autorizados');
    }
  }

  async quitarAutorizado(email: string): Promise<void> {
    try {
      await api.delete(`/admin/autorizados/${enc(email)}/`);
    } catch (error: any) {
      throw new Error(error.message || 'Error al quitar la autorización');
    }
  }
}

const registroApiService = new RegistroApiService();
export default registroApiService;
