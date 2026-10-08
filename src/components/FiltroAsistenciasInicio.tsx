// src/components/FiltroAsistenciasInicio.tsx
// Filtro de "Gestión de asistencias" del Inicio: curso, grupo, día, fecha y hora.
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import type { Course } from '../services/horarioApiService';
import { SelectorFechaClase } from './SelectorFechaClase';
import {
  claveFranja,
  diaDeFecha,
  diasDeClase,
  fechaLarga,
  fechaSeleccionable,
  franjas,
  hayFiltroDeSesion,
  opcionesCurso,
  unidadesDeCurso,
  unidadSeleccionada,
} from '../utils/filtroInicio';
import type { FiltroInicio } from '../utils/filtroInicio';

interface Props {
  cursos: Course[];
  /** Fechas (AAAA-MM-DD) con asistencias de la unidad elegida; se marcan en el calendario */
  fechasConAsistencia: Set<string>;
  filtro: FiltroInicio;
  onChange: (f: FiltroInicio) => void;
  oscuro: boolean;
  /** Hoy, AAAA-MM-DD */
  hoy: string;
  /** Fecha de la sesión que se está mostrando por filtro (null si no hay ninguna para ese día) */
  fechaSesion: string | null;
  /** Registros de esa sesión que quedan fuera de la franja de hora elegida */
  fueraDeFranja?: number;
}

/** Un campo del filtro: etiqueta arriba y control debajo. Todos comparten estructura y alto. */
function Campo({ etiqueta, ancho, oscuro, children }: { etiqueta: string; ancho: string; oscuro: boolean; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: '6px', flex: ancho, minWidth: 0, alignContent: 'start' }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: oscuro ? '#aaa' : '#666' }}>{etiqueta}</span>
      {children}
    </div>
  );
}

export function FiltroAsistenciasInicio({ cursos, fechasConAsistencia: conAsistencia, filtro, onChange, oscuro, hoy, fechaSesion, fueraDeFranja = 0 }: Props) {
  const cursosOpciones = useMemo(() => opcionesCurso(cursos), [cursos]);
  const unidades = useMemo(() => unidadesDeCurso(cursos, filtro.curso), [cursos, filtro.curso]);
  const unidad = useMemo(() => unidadSeleccionada(cursos, filtro), [cursos, filtro]);
  const dias = unidad ? diasDeClase(unidad) : [];

  // Día cuyas horas se ofrecen: el de la fecha elegida o, si no, el día filtrado
  const diaDeLaSesion = filtro.fecha ? diaDeFecha(filtro.fecha) : filtro.dia;
  const horas = unidad ? franjas(unidad, diaDeLaSesion) : [];

  const sinCurso = !unidad;
  const hayFiltro = hayFiltroDeSesion(filtro);
  const fondo = oscuro ? '#2d2d2d' : 'white';
  const borde = oscuro ? '#3d3d3d' : '#d0d0d0';

  // Mismo alto, borde y fondo para los desplegables y para el botón de fecha
  const control = (apagado: boolean): React.CSSProperties => ({
    width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box',
    border: `1px solid ${borde}`, background: oscuro ? '#1e1e1e' : 'white', color: oscuro ? '#fff' : '#333',
    opacity: apagado ? 0.55 : 1, cursor: apagado ? 'not-allowed' : 'pointer',
  });

  const cambiarCurso = (nombre: string) => {
    const lista = unidadesDeCurso(cursos, nombre || null);
    onChange({ curso: nombre || null, unidadId: lista.length > 1 ? lista[0].id : null, dia: null, fecha: null, hora: null });
  };
  const cambiarGrupo = (id: string) => onChange({ ...filtro, unidadId: id, dia: null, fecha: null, hora: null });
  const cambiarDia = (dia: string) => {
    const mismaFecha = filtro.fecha && dia && diaDeFecha(filtro.fecha) === dia;
    onChange({ ...filtro, dia: dia || null, fecha: mismaFecha ? filtro.fecha : null, hora: null });
  };
  const cambiarFecha = (fecha: string | null) => onChange({ ...filtro, fecha, dia: fecha ? diaDeFecha(fecha) : filtro.dia, hora: null });
  const cambiarHora = (hora: string) => onChange({ ...filtro, hora: hora || null });
  const limpiar = () => onChange({ ...filtro, dia: null, fecha: null, hora: null });

  const ayuda = !filtro.curso
    ? 'Elige un curso para ver sus asistencias. Solo aparecen los cursos activos (con clases en su horario).'
    : !unidad
      ? 'Este curso tiene varios grupos: elige uno.'
      : hayFiltro
        ? fechaSesion
          ? `Mostrando la sesión del ${fechaLarga(fechaSesion)}${filtro.hora ? `, clase de ${filtro.hora.replace('-', ' – ')}` : ''}.${
              filtro.hora && fueraDeFranja > 0
                ? ` ${fueraDeFranja} ${fueraDeFranja === 1 ? 'registro queda' : 'registros quedan'} fuera de esa franja y no se muestran.`
                : ''}`
          : 'No hay sesiones registradas para ese día.'
        : 'Mostrando la clase en curso o, si no hay clase ahora, la última. Usa Día o Fecha para ver otra clase.';

  return (
    <div style={{
      background: fondo, padding: '18px', borderRadius: '10px', marginBottom: '20px',
      boxShadow: oscuro ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.08)', border: oscuro ? '1px solid #3d3d3d' : 'none',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
        <Campo etiqueta="Curso" ancho="2 1 260px" oscuro={oscuro}>
          <select aria-label="Curso" value={filtro.curso ?? ''} onChange={(e) => cambiarCurso(e.target.value)} style={control(false)}>
            <option value="">Sin selección</option>
            {cursosOpciones.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>

        {unidades.length > 1 && (
          <Campo etiqueta="Grupo" ancho="1 1 150px" oscuro={oscuro}>
            <select aria-label="Grupo" value={filtro.unidadId ?? ''} onChange={(e) => cambiarGrupo(e.target.value)} style={control(false)}>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.group}</option>)}
            </select>
          </Campo>
        )}

        <Campo etiqueta="Día" ancho="1 1 150px" oscuro={oscuro}>
          <select aria-label="Día" value={filtro.dia ?? ''} onChange={(e) => cambiarDia(e.target.value)} disabled={sinCurso} style={control(sinCurso)}>
            <option value="">Todos</option>
            {dias.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Campo>

        <Campo etiqueta="Fecha" ancho="1 1 170px" oscuro={oscuro}>
          <SelectorFechaClase
            valor={filtro.fecha}
            onChange={cambiarFecha}
            habilitada={(iso) => !!unidad && fechaSeleccionable(iso, unidad, filtro.dia, hoy)}
            marcada={(iso) => conAsistencia.has(iso)}
            hoy={hoy}
            oscuro={oscuro}
            deshabilitado={sinCurso}
            textoVacio={sinCurso ? 'Elige un curso' : 'Elegir fecha'}
          />
        </Campo>

        <Campo etiqueta="Hora" ancho="1 1 170px" oscuro={oscuro}>
          <select aria-label="Hora" value={filtro.hora ?? ''} onChange={(e) => cambiarHora(e.target.value)} disabled={sinCurso || horas.length === 0} style={control(sinCurso || horas.length === 0)}>
            <option value="">{horas.length === 0 ? 'Elige día o fecha' : 'Toda la clase'}</option>
            {horas.map((h) => <option key={claveFranja(h)} value={claveFranja(h)}>{h.iniTime} – {h.endTime}</option>)}
          </select>
        </Campo>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>
        <p style={{ margin: 0, fontSize: '0.84rem', color: oscuro ? '#aaa' : '#777' }}>{ayuda}</p>
        {hayFiltro && (
          <button
            type="button"
            onClick={limpiar}
            title="Quitar día, fecha y hora, y volver a ver la clase en curso o la última"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'transparent',
              border: '1px solid var(--color-primary)', color: 'var(--color-uni)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
            }}
          >
            <RotateCcw size={14} /> Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
