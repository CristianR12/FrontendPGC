// src/utils/filtroInicio.ts
// Lógica del filtro de "Gestión de asistencias" del Inicio: curso, grupo, día, fecha y hora.
// Solo se puede ver lo que realmente tuvo clase: las fechas y las horas que se ofrecen salen del
// horario del curso o grupo elegido. Funciones puras (sin React) para poder probarlas.
import type { Course, ScheduleClass } from '../services/horarioApiService';
import type { Asistencia } from '../services/asistenciaService';

export const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIA_POR_NUMERO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export interface FiltroInicio {
  /** Nombre del curso */
  curso: string | null;
  /** Id de la unidad de horario (grupo) cuando el curso tiene varios grupos */
  unidadId: string | null;
  dia: string | null;
  /** AAAA-MM-DD */
  fecha: string | null;
  /** Franja de clase: "HH:MM-HH:MM" */
  hora: string | null;
}

export const FILTRO_VACIO: FiltroInicio = { curso: null, unidadId: null, dia: null, fecha: null, hora: null };

/** Cursos activos: los que tienen al menos una clase en su horario. */
export const unidadesActivas = (cursos: Course[]): Course[] => cursos.filter((c) => (c.schedule?.length ?? 0) > 0);

export function opcionesCurso(cursos: Course[]): string[] {
  return [...new Set(unidadesActivas(cursos).map((c) => c.nameCourse))].sort((a, b) => a.localeCompare(b, 'es'));
}

export function unidadesDeCurso(cursos: Course[], nombre: string | null): Course[] {
  if (!nombre) return [];
  return unidadesActivas(cursos)
    .filter((c) => c.nameCourse === nombre)
    .sort((a, b) => String(a.group).localeCompare(String(b.group), 'es'));
}

/** La unidad (curso o grupo) elegida; con varios grupos hace falta haber elegido uno. */
export function unidadSeleccionada(cursos: Course[], f: FiltroInicio): Course | null {
  const unidades = unidadesDeCurso(cursos, f.curso);
  if (unidades.length === 0) return null;
  if (unidades.length === 1) return unidades[0];
  return unidades.find((u) => u.id === f.unidadId) ?? null;
}

/** Misma etiqueta con la que el backend nombra la asignatura de una asistencia. */
export const etiquetaAsignatura = (u: Course): string => (u.groupId ? `${u.nameCourse} - Grupo ${u.group}` : u.nameCourse);

export function diasDeClase(u: Course): string[] {
  const dias = new Set((u.schedule ?? []).map((c) => c.day));
  return DIAS_ORDEN.filter((d) => dias.has(d));
}

/** Día de la semana de una fecha AAAA-MM-DD (sin depender de la zona horaria del navegador). */
export function diaDeFecha(iso: string): string {
  return DIA_POR_NUMERO[new Date(`${iso}T12:00:00Z`).getUTCDay()];
}

/** Una fecha se puede elegir si no es futura y ese día de la semana hay clase (o es el día filtrado). */
export function fechaSeleccionable(iso: string, u: Course, dia: string | null, hoy: string): boolean {
  if (iso > hoy) return false;
  const d = diaDeFecha(iso);
  return diasDeClase(u).includes(d) && (!dia || d === dia);
}

export function franjas(u: Course, dia: string | null): ScheduleClass[] {
  if (!dia) return [];
  return (u.schedule ?? []).filter((c) => c.day === dia).sort((a, b) => a.iniTime.localeCompare(b.iniTime));
}

export const claveFranja = (c: ScheduleClass): string => `${c.iniTime}-${c.endTime}`;

export function filasDeUnidad(asistencias: Asistencia[], u: Course): Asistencia[] {
  const cursoId = u.courseId ?? u.id;
  return asistencias.filter((a) => a.courseId === cursoId && (u.groupId ? a.groupId === u.groupId : !a.groupId));
}

/** Fechas en las que esta unidad tiene asistencia registrada (para marcarlas en el calendario). */
export function fechasConAsistencia(asistencias: Asistencia[], u: Course): Set<string> {
  return new Set(filasDeUnidad(asistencias, u).map((a) => a.fechaDocId).filter((x): x is string => !!x));
}

const aMinutos = (hm: string | undefined): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hm ?? '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** ¿Hay un filtro de día o fecha activo? Si no, el Inicio muestra la sesión en curso o la última. */
export const hayFiltroDeSesion = (f: FiltroInicio): boolean => !!(f.fecha || f.dia);

/**
 * Asistencias de la sesión elegida. Con solo el día, se toma la sesión más reciente de ese día de la semana.
 * La hora filtra por franja de clase: se incluyen quienes se registraron durante esa clase y quienes no
 * tienen hora de registro (ausentes y con excusa), porque su asistencia es de la fecha completa.
 */
export function sesionFiltrada(
  asistencias: Asistencia[],
  u: Course,
  f: FiltroInicio,
  hoy: string
): { fecha: string | null; filas: Asistencia[]; fueraDeFranja: number } {
  if (!hayFiltroDeSesion(f)) return { fecha: null, filas: [], fueraDeFranja: 0 };
  const propias = filasDeUnidad(asistencias, u);

  let fecha = f.fecha;
  if (!fecha && f.dia) {
    const candidatas = [...new Set(propias.map((a) => a.fechaDocId).filter((x): x is string => !!x))]
      .filter((x) => x <= hoy && diaDeFecha(x) === f.dia)
      .sort();
    fecha = candidatas[candidatas.length - 1] ?? null;
  }
  if (!fecha) return { fecha: null, filas: [], fueraDeFranja: 0 };

  let filas = propias.filter((a) => a.fechaDocId === fecha);
  const total = filas.length;
  if (f.hora) {
    const franja = franjas(u, diaDeFecha(fecha)).find((c) => claveFranja(c) === f.hora);
    if (franja) {
      const desde = (aMinutos(franja.iniTime) ?? 0) - 15; // el reconocimiento admite llegadas desde 5 min antes
      const hasta = aMinutos(franja.endTime) ?? 24 * 60;
      filas = filas.filter((a) => {
        const m = aMinutos(a.horaRegistro);
        return m === null || (m >= desde && m <= hasta);
      });
    }
  }
  return { fecha, filas, fueraDeFranja: total - filas.length };
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const nombreMes = (m: number): string => MESES[m];

/** "martes 3 de octubre de 2026" */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return `${diaDeFecha(iso).toLowerCase()} ${d} de ${MESES[m - 1]} de ${a}`;
}
