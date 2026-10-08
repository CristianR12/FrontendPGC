// src/components/GenerarReporteModal.tsx
// "Generar reporte" como ventana flotante. Llega rellena con el filtro que tengas aplicado y se puede cambiar:
// asignatura (y grupo, si tiene varios), fecha (solo días con clase) y hora.
import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, X } from 'lucide-react';
import type { Course } from '../services/horarioApiService';
import asistenciaService from '../services/asistenciaService';
import { SelectorFechaClase } from './SelectorFechaClase';
import {
  claveFranja, diaDeFecha, fechaSeleccionable, franjas, opcionesCurso, unidadesDeCurso,
} from '../utils/filtroInicio';
import { construirReporte, generarExcel, generarPdf } from '../utils/reporteAsistencia';

export interface FiltroReporte {
  curso: string | null;
  unidadId: string | null;
  fecha: string | null;
  hora: string | null;
}

interface Props {
  cursos: Course[];
  inicial: FiltroReporte;
  /** Hoy, AAAA-MM-DD */
  hoy: string;
  oscuro?: boolean;
  onCerrar: () => void;
  onMensaje: (mensaje: string, tipo: 'success' | 'error') => void;
}

export function GenerarReporteModal({ cursos, inicial, hoy, oscuro = false, onCerrar, onMensaje }: Props) {
  const [curso, setCurso] = useState<string | null>(inicial.curso);
  const [unidadId, setUnidadId] = useState<string | null>(inicial.unidadId);
  const [fecha, setFecha] = useState<string | null>(inicial.fecha);
  const [hora, setHora] = useState<string | null>(inicial.hora);
  const [fechasConAsistencia, setFechasConAsistencia] = useState<Set<string>>(new Set());
  const [generando, setGenerando] = useState<'pdf' | 'excel' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const asignaturas = useMemo(() => opcionesCurso(cursos), [cursos]);
  const unidades = useMemo(() => unidadesDeCurso(cursos, curso), [cursos, curso]);
  // Con un solo grupo se elige solo; con varios hay que escoger uno
  const unidad = unidades.length === 1 ? unidades[0] : unidades.find((u) => u.id === unidadId) ?? null;
  const horas = unidad && fecha ? franjas(unidad, diaDeFecha(fecha)) : [];

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && !generando && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [generando, onCerrar]);

  // Fechas con asistencias de la unidad elegida (se marcan en el calendario)
  useEffect(() => {
    if (!unidad) {
      setFechasConAsistencia(new Set());
      return;
    }
    let cancelado = false;
    asistenciaService.getFechas(unidad.id)
      .then((f) => { if (!cancelado) setFechasConAsistencia(new Set(f)); })
      .catch(() => undefined);
    return () => { cancelado = true; };
  }, [unidad?.id]);

  const cambiarCurso = (nombre: string) => {
    const lista = unidadesDeCurso(cursos, nombre || null);
    setCurso(nombre || null);
    setUnidadId(lista.length > 1 ? lista[0].id : null);
    setFecha(null);
    setHora(null);
  };

  const cambiarGrupo = (id: string) => {
    setUnidadId(id);
    setFecha(null);
    setHora(null);
  };

  const generar = async (formato: 'pdf' | 'excel') => {
    if (!unidad) return setError('Elige la asignatura (y el grupo) del reporte.');
    setGenerando(formato);
    setError(null);
    try {
      const datos = await asistenciaService.getReporte(unidad.id, fecha, fecha ? hora : null);
      if (datos.estudiantes.length === 0) {
        setError('Ese curso no tiene estudiantes ni asistencias para reportar.');
        return;
      }
      const tabla = construirReporte(datos, fecha);
      if (formato === 'pdf') await generarPdf(tabla);
      else await generarExcel(tabla);
      onMensaje(`Reporte ${formato === 'pdf' ? 'PDF' : 'Excel'} generado correctamente`, 'success');
      onCerrar();
    } catch (e: any) {
      setError(e.message || 'No se pudo generar el reporte.');
    } finally {
      setGenerando(null);
    }
  };

  const fondo = oscuro ? '#2d2d2d' : 'white';
  const texto = oscuro ? '#fff' : '#2b2b2b';
  const tenue = oscuro ? '#aaa' : '#666';
  const borde = oscuro ? '#3d3d3d' : '#d0d0d0';
  const etiqueta: React.CSSProperties = { display: 'grid', gap: '6px', alignContent: 'start', fontSize: '0.88rem', color: oscuro ? '#ddd' : '#444', fontWeight: 600 };
  const control: React.CSSProperties = {
    width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', fontSize: '0.92rem', boxSizing: 'border-box',
    border: `1px solid ${borde}`, background: oscuro ? '#1e1e1e' : 'white', color: texto,
  };
  // Selectores y botones comparten columnas: cada botón queda del ancho (y alineado) del selector que tiene encima
  const dosColumnas: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' };
  const botonFormato = (apagado: boolean): React.CSSProperties => ({
    width: '100%', height: '42px', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, fontSize: '0.95rem',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    cursor: apagado ? 'not-allowed' : 'pointer', opacity: apagado ? 0.6 : 1,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-reporte"
      onClick={(e) => e.target === e.currentTarget && !generando && onCerrar()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}
    >
      <div style={{ background: fondo, color: texto, borderRadius: '16px', width: '100%', maxWidth: '640px', margin: 'auto', padding: '26px 26px 30px', boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h2 id="titulo-reporte" style={{ margin: 0, fontSize: '1.3rem', color: texto }}>Generar reporte de asistencia</h2>
          <button onClick={onCerrar} disabled={!!generando} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: tenue, padding: '4px', display: 'flex' }}>
            <X size={22} />
          </button>
        </div>
        <p style={{ margin: '0 0 16px', color: tenue, fontSize: '0.88rem' }}>
          Se llena con tu filtro actual; cámbialo si necesitas otro. Sin fecha, el reporte incluye todas las clases del curso.
        </p>

        {error && (
          <div role="alert" style={{ background: oscuro ? '#3a1f1f' : '#fdecea', color: oscuro ? '#ff8a80' : '#b71c1c', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: '14px' }}>
          <label style={etiqueta}>
            Asignatura
            <select aria-label="Asignatura" value={curso ?? ''} onChange={(e) => cambiarCurso(e.target.value)} style={control} disabled={!!generando}>
              <option value="">Elige una asignatura</option>
              {asignaturas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>

          {unidades.length > 1 && (
            <label style={etiqueta}>
              Curso (grupo)
              <select aria-label="Curso (grupo)" value={unidad?.id ?? ''} onChange={(e) => cambiarGrupo(e.target.value)} style={control} disabled={!!generando}>
                {unidad === null && <option value="">Elige el grupo</option>}
                {unidades.map((u) => <option key={u.id} value={u.id}>{u.group}</option>)}
              </select>
            </label>
          )}

          <div style={{ ...dosColumnas, alignItems: 'start' }}>
            <div style={etiqueta}>
              Fecha (opcional)
              <SelectorFechaClase
                valor={fecha}
                onChange={(f) => { setFecha(f); setHora(null); }}
                habilitada={(iso) => !!unidad && fechaSeleccionable(iso, unidad, null, hoy)}
                marcada={(iso) => fechasConAsistencia.has(iso)}
                hoy={hoy}
                oscuro={oscuro}
                deshabilitado={!unidad || !!generando}
                textoVacio={unidad ? 'Todas las clases' : 'Elige un curso'}
              />
            </div>
            <label style={etiqueta}>
              Hora
              <select aria-label="Hora" value={hora ?? ''} onChange={(e) => setHora(e.target.value || null)} style={{ ...control, opacity: horas.length === 0 ? 0.55 : 1 }} disabled={horas.length === 0 || !!generando}>
                <option value="">{horas.length === 0 ? 'Elige una fecha' : 'Toda la clase'}</option>
                {horas.map((h) => <option key={claveFranja(h)} value={claveFranja(h)}>{h.iniTime} – {h.endTime}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div style={{ ...dosColumnas, marginTop: '24px' }}>
          <button onClick={() => generar('pdf')} disabled={!!generando} style={{ ...botonFormato(!!generando), background: '#e53935' }}>
            <FileText size={18} /> {generando === 'pdf' ? 'Generando…' : 'Generar PDF'}
          </button>
          <button onClick={() => generar('excel')} disabled={!!generando} style={{ ...botonFormato(!!generando), background: '#4CAF50' }}>
            <FileSpreadsheet size={18} /> {generando === 'excel' ? 'Generando…' : 'Generar Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
