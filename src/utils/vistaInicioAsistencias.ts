/**
 * Reglas vista Inicio (U1/U2) alineadas con TrialREC (ventana iniTime−5 … iniTime+30, sin salón)
 * y con GET /api/asistencias/vista-inicio/. Usado como respaldo si falla la API.
 */
import type { Asistencia } from "../services/asistenciaService";
import type { Course, ScheduleClass } from "../services/horarioApiService";

const BOGOTA_TZ = "America/Bogota";

const DIAS_INGLES_A_ESPANOL: Record<string, string> = {
  Monday: "Lunes",
  Tuesday: "Martes",
  Wednesday: "Miércoles",
  Thursday: "Jueves",
  Friday: "Viernes",
  Saturday: "Sábado",
  Sunday: "Domingo",
};

export function normalizeAsignaturaLabel(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function todayDateStringBogota(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function weekdayEnglishBogota(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BOGOTA_TZ,
    weekday: "long",
  }).format(now);
}

function timeHmBogota(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BOGOTA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function parseHmToMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Misma ventana que TrialREC/recFacial verificar_horario_salon; ignora salón. */
export function isClaseActivaTrialRecSinSalon(
  schedule: ScheduleClass[],
  now: Date = new Date()
): boolean {
  if (!schedule.length) return false;
  const diaIngles = weekdayEnglishBogota(now);
  const diaEspanol = DIAS_INGLES_A_ESPANOL[diaIngles] ?? diaIngles;
  const horaActualStr = timeHmBogota(now);
  const curMin = parseHmToMinutes(horaActualStr);
  if (curMin === null) return false;

  for (const horario of schedule) {
    const diaHorario = horario.day ?? "";
    if (diaHorario !== diaEspanol && diaHorario !== diaIngles) continue;
    const ini = horario.iniTime ?? "00:00";
    const startMin = parseHmToMinutes(ini);
    if (startMin === null) continue;
    const ventanaInicio = startMin - 5;
    const ventanaFin = startMin + 30;
    if (ventanaInicio <= curMin && curMin <= ventanaFin) return true;
  }
  return false;
}

/**
 * Última sesión: convención fechaDocId como id de doc en Firestore (p. ej. YYYY-MM-DD).
 * Comparación lexicográfica coincide con orden cronológico para ese formato.
 */
function maxFechaDocId(fechas: string[]): string | null {
  if (!fechas.length) return null;
  return fechas.reduce((a, b) => (a >= b ? a : b));
}

export function computeVistaRowsLocal(
  asistencias: Asistencia[],
  cursos: Course[],
  asignaturaLabel: string
): Asistencia[] {
  const canon = normalizeAsignaturaLabel(asignaturaLabel);
  const subject = asistencias.filter(
    (a) => a.asignatura && normalizeAsignaturaLabel(a.asignatura) === canon
  );
  if (!subject.length) return [];

  const courseId = subject[0].courseId;
  const course = courseId ? cursos.find((c) => c.id === courseId) : undefined;
  const schedule: ScheduleClass[] = course?.schedule ?? [];

  const now = new Date();
  if (isClaseActivaTrialRecSinSalon(schedule, now)) {
    const today = todayDateStringBogota(now);
    return subject.filter((a) => (a.fechaDocId ?? "") === today);
  }

  const fechas = subject.map((a) => a.fechaDocId).filter((f): f is string => Boolean(f));
  const ultima = maxFechaDocId(fechas);
  if (!ultima) return [];
  return subject.filter((a) => (a.fechaDocId ?? "") === ultima);
}
