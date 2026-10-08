// src/pages/EstadisticasPage.tsx
// Estadísticas de asistencia: resumen, gráficas y consejos para el docente (recordatorios, tardanzas, reconocimientos).
// Todo lo calcula el servidor; aquí solo se muestra.
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, BarChart3, Clock, RefreshCw, Trophy } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import estadisticasApiService from '../services/estadisticasApiService';
import type { Estadisticas, MapaCalor } from '../services/estadisticasApiService';
import { fechaCorta } from '../utils/reporteAsistencia';
import { fechaLarga } from '../utils/filtroInicio';
import { todayDateStringBogota } from '../utils/vistaInicioAsistencias';

const VERDE = '#4CAF50';
const ROJO = '#e53935';
const NARANJA = '#FF9800';
const AZUL = '#2196F3';

export function EstadisticasPage() {
  const [datos, setDatos] = useState<Estadisticas | null>(null);
  const [unidades, setUnidades] = useState<{ id: string; nombre: string }[]>([]);
  const [unidad, setUnidad] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [oscuro, setOscuro] = useState(false);
  const hoy = todayDateStringBogota();

  useEffect(() => {
    const revisar = () => setOscuro(document.body.classList.contains('dark-mode'));
    revisar();
    const obs = new MutationObserver(revisar);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);
    estadisticasApiService.obtener({ unidad, desde, hasta })
      .then((d) => {
        if (cancelado) return;
        setDatos(d);
        if (!unidad) setUnidades(d.unidades);
      })
      .catch((e) => { if (!cancelado) setError(e.message || 'No se pudieron cargar las estadísticas'); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [unidad, desde, hasta, recarga]);

  const color = {
    texto: oscuro ? '#fff' : '#2b2b2b',
    tenue: oscuro ? '#aaa' : '#666',
    fondo: oscuro ? '#2d2d2d' : 'white',
    borde: oscuro ? '#3d3d3d' : '#e0e0e0',
    rejilla: oscuro ? '#3d3d3d' : '#eeeeee',
  };
  const tarjeta: React.CSSProperties = {
    background: color.fondo, borderRadius: '12px', padding: '22px', boxShadow: oscuro ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 10px rgba(0,0,0,0.08)',
    border: oscuro ? '1px solid #3d3d3d' : 'none', minWidth: 0,
  };
  const tooltip = { contentStyle: { background: color.fondo, border: `1px solid ${color.borde}`, borderRadius: '8px', color: color.texto }, labelStyle: { color: color.texto } };
  const campo: React.CSSProperties = {
    height: '40px', padding: '0 10px', borderRadius: '8px', border: `1px solid ${oscuro ? '#3d3d3d' : '#d0d0d0'}`, boxSizing: 'border-box',
    background: oscuro ? '#1e1e1e' : 'white', color: color.texto, fontSize: '0.9rem', width: '100%',
  };
  const etiqueta: React.CSSProperties = { display: 'grid', gap: '6px', alignContent: 'start', fontSize: '0.78rem', fontWeight: 700, color: color.tenue };

  const distribucion = useMemo(() => datos ? [
    { nombre: 'Presentes', valor: datos.resumen.presentes, color: VERDE },
    { nombre: 'Ausentes', valor: datos.resumen.ausentes, color: ROJO },
    { nombre: 'Con excusa', valor: datos.resumen.excusas, color: NARANJA },
  ].filter((d) => d.valor > 0) : [], [datos]);

  if (cargando && !datos) return <LoadingSpinner message="Calculando estadísticas..." />;
  if (error && !datos) return <ErrorMessage message={error} onRetry={() => setRecarga((n) => n + 1)} />;
  if (!datos) return null;

  const { resumen } = datos;
  const sinDatos = resumen.total === 0;
  const kpis: { titulo: string; valor: string; detalle: string; color: string }[] = [
    { titulo: 'Asistencia', valor: resumen.tasa === null ? '—' : `${resumen.tasa}%`, detalle: `${resumen.sesiones} ${resumen.sesiones === 1 ? 'clase' : 'clases'} · ${resumen.estudiantes} estudiantes`, color: VERDE },
    { titulo: 'Registros', valor: String(resumen.total), detalle: 'en el período', color: AZUL },
    { titulo: 'Presentes', valor: String(resumen.presentes), detalle: 'asistieron', color: VERDE },
    { titulo: 'Ausentes', valor: String(resumen.ausentes), detalle: 'sin excusa', color: ROJO },
    { titulo: 'Con excusa', valor: String(resumen.excusas), detalle: 'justificadas', color: NARANJA },
    { titulo: 'Llegadas tarde', valor: String(resumen.tardes), detalle: 'de más de 15 min', color: '#9C27B0' },
  ];

  return (
    <>
      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart3 size={28} />
              Estadísticas
            </h2>
            <p style={{ margin: '5px 0 0 0', color: color.tenue }}>Cómo va la asistencia de tus cursos y qué puedes hacer al respecto</p>
          </div>
          <button
            onClick={() => setRecarga((n) => n + 1)}
            disabled={cargando}
            style={{ padding: '10px 20px', backgroundColor: '#585858', color: 'white', border: 'none', borderRadius: '6px', cursor: cargando ? 'not-allowed' : 'pointer', opacity: cargando ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={18} /> Actualizar
          </button>
        </div>

        {/* Filtros */}
        <div style={{ ...tarjeta, marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'start' }}>
          <label style={etiqueta}>
            Curso
            <select aria-label="Curso" value={unidad} onChange={(e) => setUnidad(e.target.value)} style={campo}>
              <option value="">Todos mis cursos</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </label>
          <label style={etiqueta}>
            Desde
            <input type="date" aria-label="Desde" value={desde} max={hasta || hoy} onChange={(e) => setDesde(e.target.value)} style={campo} />
          </label>
          <label style={etiqueta}>
            Hasta
            <input type="date" aria-label="Hasta" value={hasta} min={desde || undefined} max={hoy} onChange={(e) => setHasta(e.target.value)} style={campo} />
          </label>
          {(unidad || desde || hasta) && (
            <div style={etiqueta}>
              <span aria-hidden="true">&nbsp;</span>
              <button onClick={() => { setUnidad(''); setDesde(''); setHasta(''); }}
                style={{ height: '40px', padding: '0 14px', borderRadius: '8px', background: 'transparent', border: `1px solid ${VERDE}`, color: VERDE, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', width: '100%' }}>
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        <div style={{ position: 'relative', opacity: cargando ? 0.55 : 1, transition: 'opacity 0.2s' }}>
          {cargando && (
            <div role="status" style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '120px', pointerEvents: 'none' }}>
              <span aria-label="Cargando" className="girar-carga" style={{ width: '56px', height: '56px', borderRadius: '50%', boxSizing: 'border-box', border: `6px solid ${oscuro ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}`, borderTopColor: VERDE }} />
            </div>
          )}

          {/* Tarjetas de resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {kpis.map((k) => (
              <div key={k.titulo} style={{ ...tarjeta, padding: '18px', borderTop: `4px solid ${k.color}` }}>
                <div style={{ fontSize: '0.85rem', color: color.tenue, fontWeight: 600 }}>{k.titulo}</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: k.color, lineHeight: 1.2 }}>{k.valor}</div>
                <div style={{ fontSize: '0.78rem', color: color.tenue }}>{k.detalle}</div>
              </div>
            ))}
          </div>

          {sinDatos ? (
            <div style={{ ...tarjeta, textAlign: 'center', padding: '50px 20px', color: color.tenue }}>
              <h3 style={{ margin: '0 0 8px', color: color.texto }}>Todavía no hay asistencias para mostrar</h3>
              <p style={{ margin: 0 }}>Cuando se registren clases de este curso y período, aquí verás las gráficas y los consejos.</p>
            </div>
          ) : (
            <>
              {/* Gráficas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <Grafica titulo="Distribución de estados" tarjeta={tarjeta} color={color}>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={distribucion} dataKey="valor" nameKey="nombre" innerRadius={60} outerRadius={95} paddingAngle={2} stroke="none">
                        {distribucion.map((d) => <Cell key={d.nombre} fill={d.color} />)}
                      </Pie>
                      <Tooltip {...tooltip} />
                      <Legend wrapperStyle={{ color: color.tenue }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Grafica>

                <Grafica titulo="Tendencia de asistencia por clase" nota="% de presentes en cada clase" tarjeta={tarjeta} color={color}>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={datos.tendencia} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gTendencia" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={VERDE} stopOpacity={0.55} />
                          <stop offset="95%" stopColor={VERDE} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={color.rejilla} />
                      <XAxis dataKey="fecha" tickFormatter={fechaCorta} stroke={color.tenue} fontSize={12} />
                      <YAxis domain={[0, 100]} unit="%" stroke={color.tenue} fontSize={12} />
                      <Tooltip {...tooltip} labelFormatter={(f) => fechaLarga(String(f))} formatter={(v) => [`${v}%`, 'Asistencia']} />
                      <Area type="monotone" dataKey="tasa" stroke={VERDE} strokeWidth={2.5} fill="url(#gTendencia)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Grafica>

                <Grafica titulo="Asistencia por día de la semana" nota="¿Qué día se falta más?" tarjeta={tarjeta} color={color}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={datos.porDia} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={color.rejilla} />
                      <XAxis dataKey="dia" stroke={color.tenue} fontSize={12} />
                      <YAxis domain={[0, 100]} unit="%" stroke={color.tenue} fontSize={12} />
                      <Tooltip {...tooltip} formatter={(v) => [`${v}%`, 'Asistencia']} cursor={{ fill: oscuro ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} />
                      <Bar dataKey="tasa" radius={[6, 6, 0, 0]}>
                        {datos.porDia.map((d) => <Cell key={d.dia} fill={d.tasa >= 80 ? VERDE : d.tasa >= 60 ? NARANJA : ROJO} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Grafica>

                {datos.porCurso.length > 1 && (
                  <Grafica titulo="Comparación entre cursos" nota="% de asistencia de cada curso o grupo" tarjeta={tarjeta} color={color}>
                    <ResponsiveContainer width="100%" height={Math.max(220, datos.porCurso.length * 46)}>
                      <BarChart data={datos.porCurso} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={color.rejilla} horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} unit="%" stroke={color.tenue} fontSize={12} />
                        <YAxis type="category" dataKey="nombre" width={150} stroke={color.tenue} fontSize={11} />
                        <Tooltip {...tooltip} formatter={(v) => [`${v}%`, 'Asistencia']} cursor={{ fill: oscuro ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} />
                        <Bar dataKey="tasa" radius={[0, 6, 6, 0]}>
                          {datos.porCurso.map((c) => <Cell key={c.unidadId} fill={(c.tasa ?? 0) >= 80 ? VERDE : (c.tasa ?? 0) >= 60 ? NARANJA : ROJO} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Grafica>
                )}
              </div>

              {datos.mapa && datos.mapa.fechas.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <Grafica titulo="Mapa de asistencia por estudiante" nota="Cada fila es un estudiante y cada columna una clase. Los que más faltan, arriba." tarjeta={tarjeta} color={color}>
                    <MapaDeCalor mapa={datos.mapa} oscuro={oscuro} />
                  </Grafica>
                </div>
              )}
            </>
          )}

          {/* Consejos */}
          <h3 style={{ margin: '8px 0 6px', color: color.texto }}>Consejos para ti</h3>
          <p style={{ margin: '0 0 16px', color: color.tenue, fontSize: '0.88rem' }}>
            La campanita solo te avisa de los casos críticos (3 o más faltas en una misma semana). Aquí está el detalle completo.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            <PanelConsejos
              titulo="Recordatorios" icono={<AlertTriangle size={20} />} acento={ROJO} oscuro={oscuro} tarjeta={tarjeta} color={color}
              vacio="Nadie necesita un recordatorio ahora. ¡Buen trabajo!"
              items={datos.consejos.recordatorios.map((r) => ({ clave: `${r.unidadId}-${r.cedula}`, nombre: r.nombre, curso: r.curso, etiqueta: r.motivo, detalle: r.detalle, consejo: null }))}
            />
            <PanelConsejos
              titulo="Llegadas tarde" icono={<Clock size={20} />} acento={NARANJA} oscuro={oscuro} tarjeta={tarjeta} color={color}
              vacio="Nadie llega tarde de forma recurrente."
              items={datos.consejos.tardanzas.map((r) => ({ clave: `${r.unidadId}-${r.cedula}`, nombre: r.nombre, curso: r.curso, etiqueta: `${r.veces} veces`, detalle: r.detalle, consejo: r.consejo }))}
            />
            <PanelConsejos
              titulo="Reconocimientos" icono={<Trophy size={20} />} acento={VERDE} oscuro={oscuro} tarjeta={tarjeta} color={color}
              vacio="Aún no hay rachas para reconocer."
              items={datos.consejos.incentivos.map((r) => ({ clave: `${r.unidadId}-${r.cedula}`, nombre: r.nombre, curso: r.curso, etiqueta: r.insignia, detalle: r.detalle, consejo: null }))}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function Grafica({ titulo, nota, tarjeta, color, children }: { titulo: string; nota?: string; tarjeta: React.CSSProperties; color: { texto: string; tenue: string }; children: ReactNode }) {
  return (
    <div style={tarjeta}>
      <h3 style={{ margin: 0, color: color.texto, fontSize: '1.05rem' }}>{titulo}</h3>
      {nota && <p style={{ margin: '2px 0 10px', color: color.tenue, fontSize: '0.8rem' }}>{nota}</p>}
      {!nota && <div style={{ height: '10px' }} />}
      {children}
    </div>
  );
}

const COLOR_CELDA = { P: VERDE, A: ROJO, E: NARANJA, '-': '' } as const;
const TEXTO_CELDA = { P: 'Presente', A: 'Ausente', E: 'Con excusa', '-': 'Sin registro' } as const;

function MapaDeCalor({ mapa, oscuro }: { mapa: MapaCalor; oscuro: boolean }) {
  const vacio = oscuro ? '#3a3a3a' : '#e9e9e9';
  const tenue = oscuro ? '#aaa' : '#666';
  const [busqueda, setBusqueda] = useState('');
  const buscado = busqueda.trim().toLowerCase();
  const filas = buscado
    ? mapa.filas.filter((f) => f.nombre.toLowerCase().includes(buscado) || f.cedula.includes(buscado))
    : mapa.filas;
  const fechas = mapa.fechas;
  const FILA = 25; // alto de cada fila: se ven 10 y el resto se desplaza
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <input
          type="search"
          aria-label="Buscar estudiante"
          placeholder="Buscar estudiante por nombre o cédula…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ height: '38px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${oscuro ? '#3d3d3d' : '#d0d0d0'}`, background: oscuro ? '#1e1e1e' : 'white', color: oscuro ? '#fff' : '#333', fontSize: '0.88rem', width: 'min(360px, 100%)', boxSizing: 'border-box' }}
        />
        <span style={{ color: tenue, fontSize: '0.8rem', marginLeft: 'auto' }}>
          {filas.length} {filas.length === 1 ? 'estudiante' : 'estudiantes'}{filas.length > 10 ? ' · desplázate para ver el resto' : ''}
        </span>
      </div>
      {filas.length === 0 && <p style={{ margin: '8px 0', color: tenue, fontSize: '0.88rem' }}>Ningún estudiante coincide con la búsqueda.</p>}
      <div style={{ overflow: 'auto', maxHeight: `${28 + FILA * 10}px`, paddingBottom: '6px' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '6px 3px', fontSize: '0.72rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', color: tenue, fontWeight: 600, position: 'sticky', left: 0, top: 0, zIndex: 2, background: oscuro ? '#2d2d2d' : 'white', padding: '0 8px 4px 0', minWidth: '180px' }}>Estudiante</th>
              {fechas.map((f) => <th key={f} style={{ color: tenue, fontWeight: 500, padding: '0 0 4px', minWidth: '32px', position: 'sticky', top: 0, zIndex: 1, background: oscuro ? '#2d2d2d' : 'white' }}>{fechaCorta(f)}</th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.cedula}>
                <td title={`C.C. ${fila.cedula}`} style={{ position: 'sticky', left: 0, background: oscuro ? '#2d2d2d' : 'white', color: oscuro ? '#ddd' : '#333', padding: '0 8px 0 0', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {fila.nombre}
                </td>
                {fila.celdas.map((c, i) => (
                  <td key={i} title={`${fila.nombre} · ${fechaLarga(fechas[i])}: ${TEXTO_CELDA[c]}`}
                    style={{ width: '32px', height: '22px', borderRadius: '4px', background: COLOR_CELDA[c] || vacio, opacity: c === '-' ? 0.7 : 1 }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '0.78rem', color: tenue }}>
        {(['P', 'A', 'E', '-'] as const).map((c) => (
          <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLOR_CELDA[c] || vacio, display: 'inline-block' }} /> {TEXTO_CELDA[c]}
          </span>
        ))}
      </div>
    </div>
  );
}

interface ItemConsejo { clave: string; nombre: string; curso: string; etiqueta: string; detalle: string; consejo: string | null }

function PanelConsejos({ titulo, icono, acento, oscuro, tarjeta, color, vacio, items }: {
  titulo: string; icono: ReactNode; acento: string; oscuro: boolean; tarjeta: React.CSSProperties;
  color: { texto: string; tenue: string; borde: string }; vacio: string; items: ItemConsejo[];
}) {
  return (
    <div style={{ ...tarjeta, borderTop: `4px solid ${acento}` }}>
      <h3 style={{ margin: '0 0 14px', color: acento, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem' }}>
        {icono} {titulo} {items.length > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: color.tenue, fontWeight: 600 }}>{items.length}</span>}
      </h3>
      {items.length === 0 ? (
        <p style={{ margin: 0, color: color.tenue, fontSize: '0.9rem' }}>{vacio}</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px', maxHeight: '460px', overflowY: 'auto', paddingRight: '4px' }}>
          {items.map((it) => (
            <div key={it.clave} style={{ border: `1px solid ${color.borde}`, borderRadius: '10px', padding: '12px', background: oscuro ? '#252525' : '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                <strong style={{ color: color.texto, fontSize: '0.92rem' }}>{it.nombre}</strong>
                <span style={{ color: acento, fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{it.etiqueta}</span>
              </div>
              <div style={{ color: color.tenue, fontSize: '0.78rem' }}>{it.curso}</div>
              <p style={{ margin: '6px 0 0', color: oscuro ? '#ddd' : '#444', fontSize: '0.85rem' }}>{it.detalle}</p>
              {it.consejo && <p style={{ margin: '6px 0 0', color: color.tenue, fontSize: '0.82rem', fontStyle: 'italic' }}>{it.consejo}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
