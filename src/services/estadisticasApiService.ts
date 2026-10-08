// src/services/estadisticasApiService.ts
import api from '../api/Axios';

export interface ResumenGeneral {
  total: number;
  presentes: number;
  ausentes: number;
  excusas: number;
  tardes: number;
  tasa: number | null;
  sesiones: number;
  estudiantes: number;
}

export interface PuntoTendencia { fecha: string; presentes: number; ausentes: number; excusas: number; total: number; tasa: number }
export interface PuntoDia { dia: string; presentes: number; ausentes: number; excusas: number; total: number; tasa: number }
export interface PuntoCurso { unidadId: string; nombre: string; total: number; presentes: number; ausentes: number; excusas: number; tasa: number | null }

export interface MapaCalor {
  fechas: string[];
  filas: { cedula: string; nombre: string; celdas: ('P' | 'A' | 'E' | '-')[]; faltas: number }[];
}

interface ConsejoBase { cedula: string; nombre: string; curso: string; unidadId: string; detalle: string; mensaje: string }
export interface Recordatorio extends ConsejoBase { motivo: string; prioridad: number }
export interface ConsejoTardanza extends ConsejoBase { veces: number; dia: string | null; consejo: string }
export interface Incentivo extends ConsejoBase { racha: number; tipo: 'perfecta' | 'racha'; insignia: string }

export interface Estadisticas {
  unidades: { id: string; nombre: string }[];
  resumen: ResumenGeneral;
  tendencia: PuntoTendencia[];
  porDia: PuntoDia[];
  porCurso: PuntoCurso[];
  mapa: MapaCalor | null;
  consejos: { recordatorios: Recordatorio[]; tardanzas: ConsejoTardanza[]; incentivos: Incentivo[] };
}

export interface AvisoCampana {
  id: string;
  tipo: 'critica' | 'recordatorio' | 'consejo' | 'incentivo';
  titulo: string;
  texto: string;
  /** AAAA-MM-DD */
  fecha: string;
}

class EstadisticasApiService {
  async obtener(p: { unidad?: string | null; desde?: string | null; hasta?: string | null }): Promise<Estadisticas> {
    try {
      const response = await api.get('/estadisticas/', {
        params: { unidad: p.unidad || undefined, desde: p.desde || undefined, hasta: p.hasta || undefined },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error?.message || 'No se pudieron cargar las estadísticas');
    }
  }

  async avisos(): Promise<AvisoCampana[]> {
    try {
      return (await api.get('/notificaciones/')).data.avisos ?? [];
    } catch (error: any) {
      throw new Error(error?.message || 'No se pudieron cargar los avisos');
    }
  }
}

const estadisticasApiService = new EstadisticasApiService();
export default estadisticasApiService;
