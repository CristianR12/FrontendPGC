// src/pages/HistorialHorariosPage.tsx
import { useEffect, useState } from 'react';

import horarioApiService from '../services/horarioApiService';
import type { HistorialHorario, EntradaHistorial, CursoFoto, ScheduleClass } from '../services/horarioApiService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const ETIQUETAS_TIPO: Record<string, string> = {
  importacion: 'Importación de archivo',
  edicion_horario_curso: 'Edición del horario de un curso',
  curso_guardado: 'Curso guardado',
  clase_agregada: 'Clase agregada',
  clase_editada: 'Clase editada',
  clase_eliminada: 'Clase eliminada',
  curso_eliminado: 'Curso eliminado',
  horario_eliminado: 'Horario eliminado',
  curso_archivado: 'Curso archivado (sin horario)',
  horario_archivado: 'Horario archivado (sin horario)',
  respaldo_automatico: 'Copia automática del horario anterior',
};

const formatearFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

const claseTexto = (c: ScheduleClass) => `${c.day} ${c.iniTime}–${c.endTime} · ${c.classroom}`;

const tarjeta: React.CSSProperties = {
  background: 'white',
  borderRadius: '20px',
  padding: '24px',
  marginBottom: '24px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
};

export function HistorialHorariosPage() {
  const [datos, setDatos] = useState<HistorialHorario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false, message: '', type: 'success',
  });

  const cargar = async (periodo?: string) => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await horarioApiService.obtenerHistorial(periodo));
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar el historial.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const entradasConCambios = (datos?.entradas ?? []).filter((e) => (e.cambios?.length ?? 0) > 0);

  // Chips de período: los que tienen historial, más el actual si todavía no tiene
  const periodosChips = datos
    ? [...new Set([...(datos.periodos.map((p) => p.periodo)), datos.periodoActual])].sort().reverse()
    : [];
  const cambiosPorPeriodo = new Map((datos?.periodos ?? []).map((p) => [p.periodo, p.cambios]));

  return (
    <>
      {aviso.show && (
        <Toast message={aviso.message} type={aviso.type} onClose={() => setAviso({ ...aviso, show: false })} />
      )}

      <div>
        <div>
          {cargando && !datos && <LoadingSpinner message="Cargando historial..." />}

          {error && (
            <div role="alert" style={{ ...tarjeta, color: '#b71c1c' }}>{error}</div>
          )}

          {datos && (
            <>
              {/* Selector de período */}
              <div style={tarjeta}>
                <h2 style={{ margin: '0 0 12px', fontSize: '1.15rem', color: '#2b2b2b' }}>Período</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {periodosChips.map((p) => {
                    const activo = p === datos.periodo;
                    const n = cambiosPorPeriodo.get(p) ?? 0;
                    return (
                      <button
                        key={p}
                        aria-pressed={activo}
                        onClick={() => cargar(p)}
                        disabled={cargando}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '999px',
                          border: `2px solid ${activo ? 'var(--color-primary)' : 'var(--border-color)'}`,
                          background: activo ? 'var(--color-primary)' : 'white',
                          color: activo ? 'white' : '#444',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {p}{p === datos.periodoActual ? ' (actual)' : ''} · {n} {n === 1 ? 'cambio' : 'cambios'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horario del período */}
              <div style={tarjeta}>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem', color: '#2b2b2b' }}>Horario del período {datos.periodo}</h2>
                {datos.horario ? (
                  <>
                    <p style={{ margin: '0 0 14px', color: '#777', fontSize: '0.85rem' }}>
                      Así quedó tu horario con el último cambio registrado en este período.
                    </p>
                    <SemanaDelPeriodo cursos={datos.horario} />
                  </>
                ) : (
                  <p style={{ margin: '8px 0 0', color: '#666' }}>
                    Todavía no hay registros de este período. El historial se llena solo cuando subes o editas tu horario;
                    al subir uno nuevo, el anterior queda guardado automáticamente.
                  </p>
                )}
              </div>

              {/* Cambios */}
              <div style={tarjeta}>
                <h2 style={{ margin: '0 0 12px', fontSize: '1.15rem', color: '#2b2b2b' }}>Cambios del período {datos.periodo}</h2>
                {/* Las copias del horario (sin cambios dentro) solo sirven para ver el semestre; no se listan aquí */}
                {entradasConCambios.length === 0 ? (
                  <p style={{ margin: 0, color: '#666' }}>No hay cambios registrados.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {entradasConCambios.map((e) => <EntradaCambio key={e.id} entrada={e} />)}
                  </div>
                )}
              </div>

            </>
          )}
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------
// Semana del período
// ------------------------------------------------------------
function SemanaDelPeriodo({ cursos }: { cursos: CursoFoto[] }) {
  const clases = cursos.flatMap((c, i) =>
    (c.schedule ?? []).map((cl) => ({ ...cl, curso: c.nameCourse, grupo: c.group, color: horarioApiService.generarColor(i) }))
  );
  if (clases.length === 0) return <p style={{ margin: 0, color: '#666' }}>El horario de este período no tenía clases.</p>;

  const dias = DIAS.filter((d) => clases.some((c) => c.day === d));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
      {dias.map((dia) => (
        <div key={dia} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', height: '300px', minWidth: 0 }}>
          <strong style={{ color: '#2b2b2b' }}>{dia}</strong>
          <div style={{ display: 'grid', gap: '8px', marginTop: '8px', flex: 1, minHeight: 0, overflowY: 'auto', alignContent: 'start', paddingRight: '4px' }}>
            {clases
              .filter((c) => c.day === dia)
              .sort((a, b) => a.iniTime.localeCompare(b.iniTime))
              .map((c, i) => (
                <div key={i} style={{ borderLeft: `4px solid ${c.color}`, background: 'var(--color-uni-suave)', borderRadius: '6px', padding: '6px 8px', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: '#2b2b2b' }}>{c.curso}</div>
                  <div style={{ color: '#666' }}>{c.grupo}</div>
                  <div style={{ color: '#444' }}>{c.iniTime}–{c.endTime} · {c.classroom}</div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Entrada del registro de cambios
// ------------------------------------------------------------
function EntradaCambio({ entrada }: { entrada: EntradaHistorial }) {
  const r = entrada.resumen ?? ({} as EntradaHistorial['resumen']);
  const chips = [
    r.clasesAgregadas > 0 && { t: `+${r.clasesAgregadas} ${r.clasesAgregadas === 1 ? 'clase' : 'clases'}`, f: '#e6f4ea', c: '#1b6e34' },
    r.clasesQuitadas > 0 && { t: `−${r.clasesQuitadas} ${r.clasesQuitadas === 1 ? 'clase quitada' : 'clases quitadas'}`, f: '#fdecea', c: '#b71c1c' },
    r.cambiosSalon > 0 && { t: `${r.cambiosSalon} ${r.cambiosSalon === 1 ? 'cambio de salón' : 'cambios de salón'}`, f: '#fff4d6', c: '#8a5a00' },
    r.cursosCreados > 0 && { t: `${r.cursosCreados} ${r.cursosCreados === 1 ? 'curso creado' : 'cursos creados'}`, f: '#e8f0fe', c: '#1a4fb4' },
    r.cursosEliminados > 0 && { t: `${r.cursosEliminados} ${r.cursosEliminados === 1 ? 'curso eliminado' : 'cursos eliminados'}`, f: '#fdecea', c: '#b71c1c' },
  ].filter(Boolean) as { t: string; f: string; c: string }[];

  return (
    <details style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px 14px' }}>
      <summary style={{ cursor: 'pointer', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ color: '#2b2b2b' }}>{ETIQUETAS_TIPO[entrada.tipo] ?? entrada.tipo}</strong>
        <span style={{ color: '#777', fontSize: '0.85rem' }}>{formatearFecha(entrada.fecha)}</span>
        {chips.map((chip) => (
          <span key={chip.t} style={{ background: chip.f, color: chip.c, padding: '2px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>
            {chip.t}
          </span>
        ))}
      </summary>

      <div style={{ marginTop: '10px', fontSize: '0.88rem', display: 'grid', gap: '10px' }}>
        {(entrada.detalle?.archivo || entrada.detalle?.modo || entrada.detalle?.nota) && (
          <div style={{ color: '#666' }}>
            {entrada.detalle.archivo && <>Archivo: <strong>{entrada.detalle.archivo}</strong>. </>}
            {entrada.detalle.modo && <>Modo: {entrada.detalle.modo === 'reemplazar' ? 'reemplazar' : 'combinar'}. </>}
            {entrada.detalle.nota}
          </div>
        )}
        {entrada.cambios.length === 0 && <div style={{ color: '#777' }}>Sin cambios en las clases (solo se guardó una copia del horario).</div>}
        {entrada.cambios.map((c) => (
          <div key={c.courseId}>
            <strong style={{ color: '#2b2b2b' }}>
              {c.nameCourse} <span style={{ color: '#777', fontWeight: 400 }}>· {c.group}</span>
            </strong>
            {c.accion === 'creado' && <span style={{ color: '#1a4fb4', marginLeft: '8px' }}>(curso nuevo)</span>}
            {c.accion === 'eliminado' && <span style={{ color: '#b71c1c', marginLeft: '8px' }}>(curso eliminado)</span>}
            <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: '2px' }}>
              {c.agregadas.map((x, i) => <li key={`a${i}`} style={{ color: '#1b6e34' }}>+ {claseTexto(x)}</li>)}
              {c.quitadas.map((x, i) => <li key={`q${i}`} style={{ color: '#b71c1c' }}>− {claseTexto(x)}</li>)}
              {c.cambiosSalon.map((x, i) => (
                <li key={`s${i}`} style={{ color: '#8a5a00' }}>
                  Cambio de salón · {x.day} {x.iniTime}–{x.endTime}: {x.salonAnterior} → {x.classroom}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
