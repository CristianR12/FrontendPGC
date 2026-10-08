// src/services/legalApiService.ts
import api from '../api/Axios';

export interface AceptacionLegal {
  version: string;
  fecha: string;
  terminos: boolean;
  datosPersonales: boolean;
  biometrico: boolean;
}

export interface EstadoLegal {
  version: string;
  vigente: boolean;
  aceptacion: AceptacionLegal | null;
  /** false para cuentas sin persona vinculada (no hay nada que aceptar todavía) */
  aplica: boolean;
}

export type TipoSolicitud = 'consulta' | 'rectificacion' | 'supresion' | 'revocatoria';

export interface SolicitudDatos {
  id: string;
  tipo: TipoSolicitud;
  detalle: string;
  estado: 'pendiente' | 'atendida';
  fecha: string;
  respuesta?: string | null;
  fechaRespuesta?: string | null;
}

export interface SolicitudAdmin extends SolicitudDatos {
  cedula: string;
  nombre: string;
  rol: string;
  email?: string;
}

export interface ConstanciaAceptacion {
  evento: 'aceptacion' | 'biometrico_otorgado' | 'biometrico_revocado';
  version: string;
  fecha: string;
  cedula: string;
  nombre: string;
  rol: string;
  biometrico: boolean;
}

class LegalApiService {
  async estado(): Promise<EstadoLegal> {
    try {
      return (await api.get('/legal/aceptacion/')).data;
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo consultar tu aceptación');
    }
  }

  async aceptar(biometrico: boolean): Promise<EstadoLegal> {
    try {
      return (await api.post('/legal/aceptacion/', { terminos: true, datosPersonales: true, biometrico })).data;
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo guardar tu aceptación');
    }
  }

  async autorizarBiometria(autoriza: boolean): Promise<AceptacionLegal> {
    try {
      return (await api.post('/legal/biometrico/', { autoriza })).data.aceptacion;
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo guardar tu decisión');
    }
  }

  async misSolicitudes(): Promise<SolicitudDatos[]> {
    try {
      return (await api.get('/legal/solicitudes/')).data.solicitudes;
    } catch (error: any) {
      throw new Error(error.message || 'No se pudieron cargar tus solicitudes');
    }
  }

  async solicitar(tipo: TipoSolicitud, detalle: string): Promise<void> {
    try {
      await api.post('/legal/solicitudes/', { tipo, detalle });
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo enviar tu solicitud');
    }
  }

  // ----- administración -----

  async panelAdmin(): Promise<{ aceptaciones: ConstanciaAceptacion[]; solicitudes: SolicitudAdmin[] }> {
    try {
      return (await api.get('/admin/legal/')).data;
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo cargar la información legal');
    }
  }

  async atender(id: string, respuesta: string): Promise<void> {
    try {
      await api.post(`/admin/legal/solicitudes/${encodeURIComponent(id)}/atender/`, { respuesta });
    } catch (error: any) {
      throw new Error(error.message || 'No se pudo atender la solicitud');
    }
  }
}

const legalApiService = new LegalApiService();
export default legalApiService;
