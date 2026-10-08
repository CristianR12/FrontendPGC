// src/utils/fechasAsistencia.ts
// La asistencia se guarda por FECHA de la sesión: `fechaYhora` llega como "AAAA-MM-DD".
// `new Date("2025-10-24")` lo toma como medianoche UTC y en Colombia (UTC-5) muestra "23/10/2025 19:00":
// el día anterior y una hora que nunca existió. Estas funciones leen la fecha tal cual y muestran la hora
// real de registro (`horaRegistro`) cuando existe.
import type { Asistencia } from '../services/asistenciaService';

const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const ZONA = 'America/Bogota';

interface Partes {
  /** AAAA-MM-DD, o null si no se pudo leer */
  iso: string | null;
  /** DD/MM/AAAA */
  fecha: string;
  /** HH:MM si el valor trae hora propia (una fecha completa); null si era solo la fecha */
  hora: string | null;
}

export function partesFechaAsistencia(valor: string | Date | undefined | null): Partes {
  if (typeof valor === 'string') {
    const m = SOLO_FECHA.exec(valor.trim());
    if (m) return { iso: valor.trim(), fecha: `${m[3]}/${m[2]}/${m[1]}`, hora: null };
  }
  const d = new Date(valor as string | Date);
  if (!valor || isNaN(d.getTime())) return { iso: null, fecha: String(valor ?? 'N/A'), hora: null };
  // Fecha y hora completas: se muestran en hora de Colombia, no en la del navegador
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  const [a, m, dd] = f.split('-');
  return { iso: f, fecha: `${dd}/${m}/${a}`, hora: h };
}

/** "24/10/2025, 14:03" si se conoce la hora de registro; "24/10/2025" si no (por ejemplo, un ausente). */
export function formatearFechaHoraAsistencia(a: Pick<Asistencia, 'fechaYhora' | 'horaRegistro'>): string {
  const p = partesFechaAsistencia(a.fechaYhora);
  const registro = /^(\d{1,2}):(\d{2})/.exec(String(a.horaRegistro ?? '').trim());
  const hora = p.hora ?? (registro ? `${registro[1].padStart(2, '0')}:${registro[2]}` : null);
  return hora ? `${p.fecha}, ${hora}` : p.fecha;
}

/** Día de la semana de la sesión (0 = domingo … 6 = sábado), sin el corrimiento de zona horaria. */
export function diaSemanaDeAsistencia(valor: string | Date): number {
  const iso = partesFechaAsistencia(valor).iso;
  return iso ? new Date(`${iso}T12:00:00Z`).getUTCDay() : NaN;
}

/** "24 oct" */
export function fechaCorta(valor: string | Date): string {
  const iso = partesFechaAsistencia(valor).iso;
  if (!iso) return String(valor);
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
