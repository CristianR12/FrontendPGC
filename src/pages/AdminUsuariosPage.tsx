// src/pages/AdminUsuariosPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Trash2 } from 'lucide-react';
import registroApiService from '../services/registroApiService';
import type { Solicitud, DocenteAutorizado } from '../services/registroApiService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import legalApiService from '../services/legalApiService';
import type { ConstanciaAceptacion, SolicitudAdmin } from '../services/legalApiService';

const tarjeta: React.CSSProperties = { background: 'white', borderRadius: '20px', padding: '24px', marginBottom: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' };
const boton = (fondo: string, color = 'white', deshabilitado = false): React.CSSProperties => ({
  padding: '8px 16px', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.88rem',
  background: deshabilitado ? '#c7c7c7' : fondo, color, cursor: deshabilitado ? 'not-allowed' : 'pointer',
});
const th: React.CSSProperties = { textAlign: 'left', padding: '8px', fontSize: '0.8rem', color: '#555', background: 'var(--bg-secondary)' };
const td: React.CSSProperties = { padding: '8px', fontSize: '0.88rem', borderTop: '1px solid #f0f0f0' };

/** Separa "correo ; cédula ; nombre" (o con tabulaciones/comas) en filas. El servidor valida cada una. */
function filasDeTexto(texto: string): DocenteAutorizado[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linea) => {
      const partes = linea.split(/[\t;,]/).map((p) => p.trim());
      return { email: partes[0] ?? '', cedula: partes[1] ?? '', nombre: partes.slice(2).join(' ') };
    });
}

export function AdminUsuariosPage() {
  const navigate = useNavigate();
  const [pestana, setPestana] = useState<'solicitudes' | 'autorizados' | 'datos'>('solicitudes');
  const [legalAdmin, setLegalAdmin] = useState<{ aceptaciones: ConstanciaAceptacion[]; solicitudes: SolicitudAdmin[] } | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [autorizados, setAutorizados] = useState<DocenteAutorizado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'success' });

  const mostrar = (message: string, type: 'success' | 'error' | 'info' = 'success') => setAviso({ show: true, message, type });

  const cargar = async () => {
    try {
      const [s, a, l] = await Promise.all([registroApiService.listarSolicitudes(), registroApiService.listarAutorizados(), legalApiService.panelAdmin()]);
      setSolicitudes(s);
      setAutorizados(a);
      setLegalAdmin(l);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar la administración.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const resolver = async (s: Solicitud, accion: 'aprobar' | 'rechazar') => {
    let nota: string | undefined;
    if (accion === 'rechazar') {
      const respuesta = window.prompt(`Motivo del rechazo de ${s.nombre} (opcional):`, '');
      if (respuesta === null) return;
      nota = respuesta;
    } else if (!window.confirm(`¿Aprobar a ${s.nombre} (${s.email}) como docente con cédula ${s.cedula}?`)) {
      return;
    }
    setTrabajando(true);
    try {
      await registroApiService.resolverSolicitud(s.uid, accion, nota);
      mostrar(accion === 'aprobar' ? 'Docente aprobado.' : 'Solicitud rechazada.', accion === 'aprobar' ? 'success' : 'info');
      await cargar();
    } catch (e: any) {
      mostrar(e.message, 'error');
    } finally {
      setTrabajando(false);
    }
  };

  const agregar = async () => {
    const filas = filasDeTexto(texto);
    if (filas.length === 0) return mostrar('Escribe al menos un docente: correo; cédula; nombre.', 'error');
    setTrabajando(true);
    try {
      const n = await registroApiService.guardarAutorizados(filas);
      mostrar(`${n} ${n === 1 ? 'docente autorizado' : 'docentes autorizados'}.`);
      setTexto('');
      await cargar();
    } catch (e: any) {
      mostrar(e.message, 'error');
    } finally {
      setTrabajando(false);
    }
  };

  const quitar = async (d: DocenteAutorizado) => {
    if (!window.confirm(`¿Quitar la autorización de ${d.email}? Si ya se registró, su cuenta sigue activa.`)) return;
    setTrabajando(true);
    try {
      await registroApiService.quitarAutorizado(d.email);
      mostrar('Autorización quitada.', 'info');
      await cargar();
    } catch (e: any) {
      mostrar(e.message, 'error');
    } finally {
      setTrabajando(false);
    }
  };

  if (cargando) return <LoadingSpinner message="Cargando administración..." />;

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente');
  const datosPendientes = (legalAdmin?.solicitudes ?? []).filter((x) => x.estado === 'pendiente');

  const atender = async (id: string) => {
    const respuesta = (respuestas[id] ?? '').trim();
    if (respuesta.length < 3) return mostrar('Escribe la respuesta para el titular.', 'error');
    setTrabajando(true);
    try {
      await legalApiService.atender(id, respuesta);
      mostrar('Solicitud atendida.');
      setRespuestas((r) => ({ ...r, [id]: '' }));
      await cargar();
    } catch (e: any) {
      mostrar(e.message, 'error');
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <>
      {aviso.show && <Toast message={aviso.message} type={aviso.type} onClose={() => setAviso({ ...aviso, show: false })} />}

      <div style={{ minHeight: 'calc(100vh - 70px)', background: 'transparent', padding: '20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={tarjeta}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <ShieldCheck size={32} color="var(--color-primary)" />
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.9rem', color: '#2b2b2b' }}>Administración de docentes</h1>
                  <p style={{ margin: '4px 0 0', color: '#666' }}>Aprueba solicitudes y autoriza correos para que el registro sea automático.</p>
                </div>
              </div>
              <button onClick={() => navigate('/home')} style={boton('#9e9e9e')}>← Volver</button>
            </div>
          </div>

          {error && <div role="alert" style={{ ...tarjeta, color: '#b71c1c' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {([['solicitudes', `Solicitudes${pendientes.length ? ` (${pendientes.length})` : ''}`], ['autorizados', `Docentes autorizados (${autorizados.length})`], ['datos', `Datos personales${datosPendientes.length ? ` (${datosPendientes.length})` : ''}`]] as const).map(([clave, titulo]) => (
              <button
                key={clave}
                aria-pressed={pestana === clave}
                onClick={() => setPestana(clave)}
                style={{ padding: '10px 18px', borderRadius: '999px', border: '2px solid var(--color-primary)', background: pestana === clave ? 'var(--color-primary)' : 'transparent', color: pestana === clave ? 'white' : 'var(--color-primary)', fontWeight: 700, cursor: 'pointer' }}
              >
                {titulo}
              </button>
            ))}
          </div>

          {pestana === 'datos' && legalAdmin && (
            <>
              <div style={tarjeta}>
                <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#2b2b2b' }}>Solicitudes sobre datos personales</h2>
                <p style={{ margin: '0 0 14px', color: '#666', fontSize: '0.88rem' }}>Derechos del titular (Ley 1581): consultas en 10 días hábiles y reclamos en 15.</p>
                {legalAdmin.solicitudes.length === 0 ? (
                  <p style={{ margin: 0, color: '#666' }}>No hay solicitudes.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {legalAdmin.solicitudes.map((x) => (
                      <div key={x.id} style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <strong>{x.nombre} <span style={{ color: '#888', fontWeight: 400 }}>· {x.rol} · C.C. {x.cedula}</span></strong>
                          <span style={{ color: x.estado === 'pendiente' ? '#FF9800' : '#4CAF50', fontWeight: 700 }}>{x.estado === 'pendiente' ? 'Pendiente' : 'Atendida'}</span>
                        </div>
                        <div style={{ color: '#555', fontSize: '0.88rem', margin: '4px 0' }}>
                          <strong>{{ consulta: 'Consulta', rectificacion: 'Rectificación', supresion: 'Supresión', revocatoria: 'Revocatoria' }[x.tipo]}</strong> · {new Date(x.fecha).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        <div style={{ fontSize: '0.9rem' }}>{x.detalle}</div>
                        {x.estado === 'pendiente' ? (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                            <input aria-label="Respuesta" value={respuestas[x.id] ?? ''} onChange={(e) => setRespuestas((r) => ({ ...r, [x.id]: e.target.value }))} placeholder="Respuesta para el titular…" style={{ flex: '1 1 260px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d0d0d0' }} />
                            <button onClick={() => atender(x.id)} disabled={trabajando} style={boton('#4CAF50', 'white', trabajando)}>Marcar atendida</button>
                          </div>
                        ) : (
                          <div style={{ marginTop: '6px', color: '#555', fontSize: '0.88rem' }}>Respuesta: {x.respuesta}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={tarjeta}>
                <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#2b2b2b' }}>Constancias de aceptación</h2>
                <p style={{ margin: '0 0 14px', color: '#666', fontSize: '0.88rem' }}>Prueba de la autorización de cada persona: versión, fecha y decisión sobre biometría. Se muestran las 100 más recientes.</p>
                {legalAdmin.aceptaciones.length === 0 ? (
                  <p style={{ margin: 0, color: '#666' }}>Todavía nadie ha aceptado.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
                      <thead><tr>{['Fecha', 'Persona', 'Rol', 'Evento', 'Versión', 'Biometría'].map((t) => <th key={t} style={th}>{t}</th>)}</tr></thead>
                      <tbody>
                        {legalAdmin.aceptaciones.map((a, i) => (
                          <tr key={i}>
                            <td style={td}>{new Date(a.fecha).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td style={td}>{a.nombre} <span style={{ color: '#888' }}>({a.cedula})</span></td>
                            <td style={td}>{a.rol}</td>
                            <td style={td}>{{ aceptacion: 'Aceptó', biometrico_otorgado: 'Otorgó biometría', biometrico_revocado: 'Revocó biometría' }[a.evento]}</td>
                            <td style={td}>{a.version}</td>
                            <td style={td}>{a.biometrico ? 'Autorizada' : 'No autorizada'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {pestana === 'solicitudes' && (
            <div style={tarjeta}>
              {solicitudes.length === 0 ? (
                <p style={{ margin: 0, color: '#666' }}>No hay solicitudes. Las personas con un correo autorizado entran solas.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                    <thead>
                      <tr>{['Nombre', 'Correo', 'Cédula', 'Fecha', 'Estado', ''].map((t) => <th key={t} style={th}>{t}</th>)}</tr>
                    </thead>
                    <tbody>
                      {solicitudes.map((s) => (
                        <tr key={s.uid}>
                          <td style={td}>{s.nombre}</td>
                          <td style={td}>{s.email}</td>
                          <td style={td}>{s.cedula}</td>
                          <td style={td}>{s.fecha ? new Date(s.fecha).toLocaleDateString('es-CO') : ''}</td>
                          <td style={td}>
                            <span style={{ fontWeight: 600, color: s.estado === 'pendiente' ? '#8a5a00' : s.estado === 'aprobada' ? '#1b6e34' : '#b71c1c' }}>{s.estado}</span>
                            {s.nota ? <span style={{ color: '#777' }}> · {s.nota}</span> : null}
                          </td>
                          <td style={{ ...td, whiteSpace: 'nowrap' }}>
                            {s.estado === 'pendiente' && (
                              <>
                                <button onClick={() => resolver(s, 'aprobar')} disabled={trabajando} style={{ ...boton('#2e7d32', 'white', trabajando), marginRight: '6px' }}>Aprobar</button>
                                <button onClick={() => resolver(s, 'rechazar')} disabled={trabajando} style={boton('#fdecea', '#b71c1c', trabajando)}>Rechazar</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {pestana === 'autorizados' && (
            <>
              <div style={tarjeta}>
                <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#2b2b2b' }}>Autorizar docentes</h2>
                <p style={{ margin: '0 0 10px', color: '#666', fontSize: '0.88rem' }}>
                  Una línea por docente: <code>correo; cédula; nombre completo</code> (también sirve separar con tabulación o coma, así que puedes pegar filas desde Excel).
                  Cuando inicie sesión con ese correo verificado, su perfil se crea solo con esa cédula.
                </p>
                <textarea
                  aria-label="Docentes a autorizar"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={5}
                  placeholder={'ana.perez@ucundinamarca.edu.co; 1012345678; ANA MARIA PEREZ GOMEZ\nluis.ruiz@ucundinamarca.edu.co; 80123456; LUIS RUIZ'}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid #d0d0d0', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.9rem' }}
                />
                <div style={{ marginTop: '10px', textAlign: 'right' }}>
                  <button onClick={agregar} disabled={trabajando || !texto.trim()} style={boton('var(--color-primary)', 'white', trabajando || !texto.trim())}>
                    {trabajando ? 'Guardando…' : `Autorizar${texto.trim() ? ` (${filasDeTexto(texto).length})` : ''}`}
                  </button>
                </div>
              </div>

              <div style={tarjeta}>
                {autorizados.length === 0 ? (
                  <p style={{ margin: 0, color: '#666' }}>Aún no hay docentes autorizados.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                      <thead><tr>{['Correo', 'Cédula', 'Nombre', ''].map((t) => <th key={t} style={th}>{t}</th>)}</tr></thead>
                      <tbody>
                        {autorizados.map((d) => (
                          <tr key={d.email}>
                            <td style={td}>{d.email}</td>
                            <td style={td}>{d.cedula}</td>
                            <td style={td}>{d.nombre}</td>
                            <td style={td}>
                              <button aria-label={`Quitar a ${d.email}`} onClick={() => quitar(d)} disabled={trabajando} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b' }}>
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
