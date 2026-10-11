// src/pages/AdminAsistenciasPage.tsx
// Buscador de asistencias de TODO el sistema, para el panel de administración: filtra por curso, docente,
// fecha, estado o texto; trae estadísticas cortas y genera el mismo reporte en PDF/Excel que los demás roles.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileDown, CalendarClock, UserCheck, UserX, FileWarning } from 'lucide-react';
import adminAsistenciasApiService from '../services/adminAsistenciasApiService';
import type { BusquedaAsistenciaAdmin, EstadoAsistencia, FiltroDocente } from '../services/adminAsistenciasApiService';
import type { Course } from '../services/horarioApiService';
import { etiquetaAsignatura } from '../utils/filtroInicio';
import { todayDateStringBogota } from '../utils/vistaInicioAsistencias';
import { GenerarReporteModal } from '../components/GenerarReporteModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';

const ESTADOS: EstadoAsistencia[] = ['Presente', 'Ausente', 'Tiene Excusa'];

export function AdminAsistenciasPage() {
  const navigate = useNavigate();
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => {
    const revisar = () => setOscuro(document.body.classList.contains('dark-mode'));
    revisar();
    const obs = new MutationObserver(revisar);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const [cursos, setCursos] = useState<Course[]>([]);
  const [docentes, setDocentes] = useState<FiltroDocente[]>([]);
  const [curso, setCurso] = useState('');
  const [docente, setDocente] = useState('');
  const [fecha, setFecha] = useState('');
  const [estado, setEstado] = useState<EstadoAsistencia | ''>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [resultado, setResultado] = useState<BusquedaAsistenciaAdmin | null>(null);
  const [cargandoFiltros, setCargandoFiltros] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [reporteAbierto, setReporteAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'success' });

  const color = {
    texto: oscuro ? '#fff' : '#2b2b2b',
    tenue: oscuro ? '#aaa' : '#666',
    fondo: oscuro ? '#2d2d2d' : 'white',
    borde: oscuro ? '#3d3d3d' : '#e0e0e0',
    rejilla: oscuro ? '#3d3d3d' : '#eeeeee',
  };
  const tarjeta: React.CSSProperties = {
    background: color.fondo, borderRadius: '16px', padding: '20px', marginBottom: '20px',
    boxShadow: oscuro ? '0 2px 8px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.08)',
    border: oscuro ? `1px solid ${color.borde}` : 'none',
  };
  const campo: React.CSSProperties = {
    height: '40px', padding: '0 10px', borderRadius: '8px', border: `1px solid ${color.borde}`,
    background: oscuro ? '#1e1e1e' : 'white', color: color.texto, fontSize: '0.9rem', boxSizing: 'border-box',
  };
  const th: React.CSSProperties = { textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: color.tenue, background: oscuro ? '#1e1e1e' : '#fafafa', borderBottom: `1px solid ${color.rejilla}` };
  const td: React.CSSProperties = { padding: '8px', fontSize: '0.88rem', borderTop: `1px solid ${color.rejilla}`, color: color.texto };
  const boton = (fondo: string, text = 'white', deshabilitado = false): React.CSSProperties => ({
    height: '40px', padding: '0 16px', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.88rem',
    background: deshabilitado ? '#c7c7c7' : fondo, color: text, cursor: deshabilitado ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '6px', boxSizing: 'border-box', lineHeight: 1,
  });

  const mostrar = (message: string, type: 'success' | 'error' | 'info' = 'success') => setAviso({ show: true, message, type });

  useEffect(() => {
    adminAsistenciasApiService.filtros()
      .then((f) => { setCursos(f.cursos); setDocentes(f.docentes); })
      .catch((e: any) => setError(e.message || 'No se pudieron cargar los filtros.'))
      .finally(() => setCargandoFiltros(false));
  }, []);

  const buscar = useCallback((pagina: number) => {
    setCargando(true);
    adminAsistenciasApiService.buscar({
      curso: curso || undefined, docente: docente || undefined, fecha: fecha || undefined,
      estado: estado || undefined, q: q || undefined, page: pagina,
    })
      .then((r) => { setResultado(r); setPage(r.page); setError(null); })
      .catch((e: any) => setError(e.message || 'No se pudieron cargar las asistencias.'))
      .finally(() => setCargando(false));
  }, [curso, docente, fecha, estado, q]);

  useEffect(() => { buscar(1); }, [curso, docente, fecha, estado]);

  const limpiar = () => { setCurso(''); setDocente(''); setFecha(''); setEstado(''); setQ(''); };

  if (cargandoFiltros) return <LoadingSpinner message="Cargando buscador de asistencias..." />;

  // El curso filtrado (si hay uno) llega ya elegido en "Generar reporte"
  const unidadFiltrada = curso ? cursos.find((c) => c.id === curso) : undefined;

  const resumen = resultado?.resumen;
  const tarjetasResumen: { icono: React.ReactNode; titulo: string; valor: number; acento: string }[] = [
    { icono: <CalendarClock size={20} />, titulo: 'Total', valor: resumen?.total ?? 0, acento: 'var(--color-primary)' },
    { icono: <UserCheck size={20} />, titulo: 'Presentes', valor: resumen?.presentes ?? 0, acento: '#4CAF50' },
    { icono: <UserX size={20} />, titulo: 'Ausentes', valor: resumen?.ausentes ?? 0, acento: '#e53935' },
    { icono: <FileWarning size={20} />, titulo: 'Con excusa', valor: resumen?.conExcusa ?? 0, acento: '#FF9800' },
  ];

  return (
    <>
      {aviso.show && <Toast message={aviso.message} type={aviso.type} onClose={() => setAviso({ ...aviso, show: false })} />}
      {reporteAbierto && (
        <GenerarReporteModal
          cursos={cursos}
          inicial={{ curso: unidadFiltrada?.nameCourse ?? null, unidadId: unidadFiltrada?.id ?? null, fecha: fecha || null, hora: null }}
          hoy={todayDateStringBogota()}
          oscuro={oscuro}
          onCerrar={() => setReporteAbierto(false)}
          onMensaje={mostrar}
        />
      )}
      <div style={{ minHeight: 'calc(100vh - 70px)', padding: '20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={tarjeta}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Search size={32} color="var(--color-primary)" />
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.9rem', color: color.texto }}>Asistencias de todo el sistema</h1>
                  <p style={{ margin: '4px 0 0', color: color.tenue }}>Busca por curso, docente, fecha o estado, y genera el reporte en PDF o Excel.</p>
                </div>
              </div>
              <button onClick={() => navigate('/home')} style={boton('#9e9e9e')}>← Volver</button>
            </div>
          </div>

          {error && <div role="alert" style={{ ...tarjeta, color: '#b71c1c' }}>{error}</div>}

          <div style={tarjeta}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              <select aria-label="Curso" value={curso} onChange={(e) => setCurso(e.target.value)} style={campo}>
                <option value="">Todos los cursos</option>
                {cursos.map((c) => <option key={c.id} value={c.id}>{etiquetaAsignatura(c)}</option>)}
              </select>
              <select aria-label="Docente" value={docente} onChange={(e) => setDocente(e.target.value)} style={campo}>
                <option value="">Todos los docentes</option>
                {docentes.map((d) => <option key={d.cedula} value={d.cedula}>{d.nombre}</option>)}
              </select>
              <input aria-label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={campo} />
              <select aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoAsistencia | '')} style={campo}>
                <option value="">Todos los estados</option>
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                aria-label="Buscar por nombre o cédula"
                placeholder="Buscar por nombre o cédula…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') buscar(1); }}
                style={{ ...campo, flex: '1 1 240px' }}
              />
              <button onClick={() => buscar(1)} style={boton('var(--color-primary)')}><Search size={16} /> Buscar</button>
              <button onClick={limpiar} style={boton('#9e9e9e')}>Limpiar filtros</button>
              <button onClick={() => setReporteAbierto(true)} style={boton('#2e7d32')}>
                <FileDown size={16} /> Generar reporte
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {tarjetasResumen.map((t) => (
              <div key={t.titulo} style={{ ...tarjeta, margin: 0, borderLeft: `4px solid ${t.acento}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: t.acento }}>{t.icono}</span>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: color.texto }}>{t.valor}</div>
                  <div style={{ fontSize: '0.8rem', color: color.tenue }}>{t.titulo}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={tarjeta}>
            {cargando ? (
              <LoadingSpinner message="Buscando asistencias..." />
            ) : !resultado || resultado.filas.length === 0 ? (
              <p style={{ margin: 0, color: color.tenue }}>No hay asistencias que coincidan con estos filtros.</p>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                    <thead>
                      <tr>{['Fecha', 'Curso', 'Docente', 'Estudiante', 'Estado', 'Hora'].map((t) => <th key={t} style={th}>{t}</th>)}</tr>
                    </thead>
                    <tbody>
                      {resultado.filas.map((f, i) => (
                        <tr key={i}>
                          <td style={td}>{f.fechaDocId}</td>
                          <td style={td}>{f.asignatura}</td>
                          <td style={td}>{f.docente || '—'}</td>
                          <td style={td}>{resultado.nombres[f.estudiante] || f.estudiante} <span style={{ color: color.tenue }}>({f.estudiante})</span></td>
                          <td style={td}>{f.estadoAsistencia}</td>
                          <td style={td}>{f.horaRegistro || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ color: color.tenue, fontSize: '0.85rem' }}>
                    {resultado.totalGeneral} {resultado.totalGeneral === 1 ? 'registro' : 'registros'} · página {resultado.page} de {resultado.totalPaginas}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => buscar(page - 1)} disabled={page <= 1} style={boton('var(--color-primary)', 'white', page <= 1)}>Anterior</button>
                    <button onClick={() => buscar(page + 1)} disabled={page >= resultado.totalPaginas} style={boton('var(--color-primary)', 'white', page >= resultado.totalPaginas)}>Siguiente</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
