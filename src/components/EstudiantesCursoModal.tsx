// src/components/EstudiantesCursoModal.tsx
import { useEffect, useRef, useState } from 'react';
import { X, Upload, Trash2, UserPlus, AlertTriangle, Search } from 'lucide-react';
import cursosApiService from '../services/cursosApiService';
import type { EstudianteCurso, PlanInscripcion, ItemPlanEstudiante } from '../services/cursosApiService';
import type { Course } from '../services/horarioApiService';
import { leerListaEstudiantes } from '../utils/listaEstudiantesImport';
import type { ListaEstudiantes } from '../utils/listaEstudiantesImport';
import { normalizar } from '../utils/horarioImport';

interface Props {
  curso: Course;
  onCerrar: () => void;
  /** Se llama cuando cambia la lista de estudiantes (para refrescar los conteos de la pantalla). */
  onCambio: (mensaje?: string) => void;
}

const estiloInput: React.CSSProperties = {
  height: '40px',
  margin: 0,
  padding: '0 10px',
  border: '1px solid #d0d0d0',
  borderRadius: '8px',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
};

const boton = (fondo: string, color = 'white', deshabilitado = false): React.CSSProperties => ({
  height: '40px',
  padding: '0 16px',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  whiteSpace: 'nowrap',
  backgroundColor: deshabilitado ? '#c7c7c7' : fondo,
  color,
  border: 'none',
  borderRadius: '8px',
  cursor: deshabilitado ? 'not-allowed' : 'pointer',
  fontSize: '0.9rem',
  fontWeight: 600,
});

const limpiarCedula = (v: string) => v.replace(/[.\s,]/g, '');

export function EstudiantesCursoModal({ curso, onCerrar, onCambio }: Props) {
  const [vista, setVista] = useState<'lista' | 'importar'>('lista');
  const [estudiantes, setEstudiantes] = useState<EstudianteCurso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [cedulaNueva, setCedulaNueva] = useState('');
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      setEstudiantes(await cursosApiService.listarEstudiantes(curso.id));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar la lista.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [curso.id]);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || guardando) return;
      if (vista === 'importar') setVista('lista');
      else onCerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  });

  const agregarUno = async () => {
    const cedula = limpiarCedula(cedulaNueva);
    if (!/^\d{5,12}$/.test(cedula)) return setError('La identificación debe tener entre 5 y 12 dígitos.');
    if (nombreNuevo.trim().length < 3) return setError('Escribe el nombre completo.');
    setGuardando(true);
    setError(null);
    try {
      const { plan } = await cursosApiService.confirmarInscripcion(curso.id, [{ cedula, nombre: nombreNuevo }]);
      const e = plan.estudiantes[0];
      setAviso(e?.accion === 'crear' ? 'Estudiante registrado e inscrito.' : 'Estudiante inscrito.');
      setCedulaNueva('');
      setNombreNuevo('');
      await cargar();
      onCambio();
    } catch (err: any) {
      // "No hay cambios": ya estaba inscrito. Conflicto: la identificación es de un usuario que no es estudiante.
      setError(/no hay cambios/i.test(err.message) ? 'Ese estudiante ya está inscrito o su identificación pertenece a otro tipo de usuario.' : err.message);
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (e: EstudianteCurso) => {
    if (!window.confirm(`¿Quitar a ${e.nombre} del curso? Sus asistencias anteriores se conservan.`)) return;
    setGuardando(true);
    try {
      await cursosApiService.quitarEstudiante(curso.id, e.cedula);
      setAviso('Estudiante quitado del curso.');
      await cargar();
      onCambio();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const visibles = estudiantes.filter((e) => {
    const f = normalizar(filtro);
    return !f || normalizar(e.nombre).includes(f) || e.cedula.includes(limpiarCedula(filtro));
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-estudiantes"
      onClick={(e) => e.target === e.currentTarget && !guardando && onCerrar()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div>
            <h2 id="titulo-estudiantes" style={{ margin: 0, color: '#2b2b2b', fontSize: '1.3rem' }}>
              {vista === 'lista' ? 'Estudiantes' : 'Cargar lista de alumnos'}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '0.9rem' }}>{curso.nameCourse} · {curso.group}</p>
          </div>
          <button onClick={onCerrar} disabled={guardando} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '18px 24px', overflowY: 'auto', flex: 1 }}>
          {error && vista === 'lista' && (
            <div role="alert" style={{ background: '#fdecea', color: '#b71c1c', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</div>
          )}
          {aviso && vista === 'lista' && (
            <div role="status" style={{ background: '#e6f4ea', color: '#1b6e34', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>{aviso}</div>
          )}

          {vista === 'lista' ? (
            <>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
                <button onClick={() => { setError(null); setAviso(null); setVista('importar'); }} style={boton('var(--color-primary)')}>
                  <Upload size={16} /> Cargar lista (Excel / PDF)
                </button>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                  <input
                    aria-label="Buscar estudiante"
                    placeholder="Buscar por nombre o identificación"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    style={{ ...estiloInput, display: 'block', width: '100%', margin: 0, paddingLeft: '32px' }}
                  />
                </div>
              </div>

              <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '12px', marginBottom: '14px', background: 'var(--color-uni-suave)' }}>
                <strong style={{ fontSize: '0.9rem', color: '#2b2b2b', display: 'flex', alignItems: 'center', gap: '6px' }}><UserPlus size={16} /> Agregar un estudiante</strong>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <input aria-label="Identificación" placeholder="Identificación" inputMode="numeric" value={cedulaNueva} onChange={(e) => setCedulaNueva(e.target.value)} style={{ ...estiloInput, width: '160px' }} />
                  <input aria-label="Nombre completo" placeholder="Nombre completo" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} style={{ ...estiloInput, flex: 1, minWidth: '200px' }} />
                  <button onClick={agregarUno} disabled={guardando} style={boton('#2e7d32', 'white', guardando)}>Inscribir</button>
                </div>
              </div>

              <p style={{ margin: '0 0 8px', color: '#555', fontSize: '0.88rem' }}>
                {cargando ? 'Cargando…' : `${estudiantes.length} ${estudiantes.length === 1 ? 'estudiante inscrito' : 'estudiantes inscritos'}`}
                {filtro && !cargando ? ` · ${visibles.length} coinciden` : ''}
              </p>
              {!cargando && estudiantes.length === 0 && (
                <p style={{ color: '#777' }}>Este curso aún no tiene estudiantes. Carga la lista de Academusoft o agrégalos uno por uno.</p>
              )}
              {visibles.length > 0 && (
                <div style={{ border: '1px solid #eee', borderRadius: '10px', overflow: 'hidden' }}>
                  {visibles.map((e, i) => (
                    <div key={e.cedula} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: i % 2 ? '#fafafa' : 'white', borderTop: i ? '1px solid #f0f0f0' : undefined }}>
                      <span style={{ width: '120px', color: '#666', fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>{e.cedula}</span>
                      <span style={{ flex: 1, color: e.registrado ? '#2b2b2b' : '#b26a00' }}>{e.nombre}</span>
                      <button aria-label={`Quitar a ${e.nombre}`} onClick={() => quitar(e)} disabled={guardando} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <ImportarLista
              curso={curso}
              onVolver={() => setVista('lista')}
              onListo={async (mensaje) => {
                setVista('lista');
                setAviso(mensaje);
                await cargar();
                onCambio(mensaje);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Cargar la lista de Academusoft
// ============================================================

function ImportarLista({ curso, onVolver, onListo }: { curso: Course; onVolver: () => void; onListo: (mensaje: string) => void }) {
  const [lista, setLista] = useState<ListaEstudiantes | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [leyendo, setLeyendo] = useState(false);
  const [sincronizar, setSincronizar] = useState(false);
  const [confirmaCurso, setConfirmaCurso] = useState(false);
  const [plan, setPlan] = useState<PlanInscripcion | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const peticion = useRef(0);

  // Solo identificación y nombre salen del navegador; el correo institucional nunca se envía
  const filas = (lista?.estudiantes ?? []).map((e) => ({ cedula: e.cedula, nombre: e.nombre }));

  useEffect(() => {
    if (!lista) return;
    const id = ++peticion.current;
    setCalculando(true);
    const temporizador = setTimeout(async () => {
      try {
        const resultado = await cursosApiService.previsualizarInscripcion(curso.id, filas, { sincronizar });
        if (id !== peticion.current) return;
        setPlan(resultado);
        setError(null);
      } catch (e: any) {
        if (id !== peticion.current) return;
        setPlan(null);
        setError(e.message || 'No se pudo revisar la lista.');
      } finally {
        if (id === peticion.current) setCalculando(false);
      }
    }, 400);
    return () => clearTimeout(temporizador);
  }, [lista, sincronizar, curso.id]);

  const procesar = async (archivo: File) => {
    setLeyendo(true);
    setError(null);
    try {
      setLista(await leerListaEstudiantes(archivo));
      setNombreArchivo(archivo.name);
      setConfirmaCurso(false);
    } catch (e: any) {
      setError(e.message || 'No se pudo leer el archivo.');
    } finally {
      setLeyendo(false);
    }
  };

  // ¿La lista es de este curso? Se compara con lo que trae el reporte
  const difiereCurso = !!lista && (
    (!!lista.materia && normalizar(lista.materia) !== normalizar(curso.nameCourse)) ||
    (!!lista.grupo && normalizar(lista.grupo) !== normalizar(curso.group))
  );
  const difiereTotal = !!lista?.totalDeclarado && lista.totalDeclarado !== lista.estudiantes.length;

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const { resultado } = await cursosApiService.confirmarInscripcion(curso.id, filas, { sincronizar });
      const partes = [`${resultado.inscritos} inscritos`];
      if (resultado.creados) partes.push(`${resultado.creados} nuevos en el sistema`);
      if (resultado.quitados) partes.push(`${resultado.quitados} quitados`);
      onListo(`Lista cargada: ${partes.join(', ')}.`);
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar la lista.');
      setGuardando(false);
    }
  };

  const puedeGuardar = !!plan && !calculando && !guardando && plan.resumen.hayCambios && (!difiereCurso || confirmaCurso);
  const porCedula = new Map((plan?.estudiantes ?? []).map((e) => [e.cedula, e]));

  return (
    <>
      {error && <div role="alert" style={{ background: '#fdecea', color: '#b71c1c', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</div>}

      {!lista ? (
        <>
          <label
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastrando(false); const a = e.dataTransfer.files?.[0]; if (a) procesar(a); }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', border: `2px dashed ${arrastrando ? 'var(--color-primary)' : 'var(--border-color)'}`, borderRadius: '14px', padding: '36px 20px', cursor: 'pointer', background: arrastrando ? 'var(--color-uni-suave)' : 'var(--color-uni-suave)', textAlign: 'center' }}
          >
            <Upload size={38} color="var(--color-primary)" />
            <strong style={{ color: '#2b2b2b' }}>{leyendo ? 'Leyendo archivo…' : 'Arrastra la lista aquí o haz clic para elegirla'}</strong>
            <span style={{ color: '#666', fontSize: '0.85rem' }}>“Lista de Alumnos por Grupo” de Academusoft: Excel (.xls / .xlsx), CSV o PDF · máx. 5 MB</span>
            <span style={{ color: '#888', fontSize: '0.8rem' }}>
              El archivo se lee en tu navegador. Al sistema solo se envían identificación y nombre; el correo institucional no se usa ni se guarda.
            </span>
            <input type="file" accept=".pdf,.xls,.xlsx,.csv" disabled={leyendo} style={{ display: 'none' }}
              onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ''; if (a) procesar(a); }} />
          </label>
          <div style={{ marginTop: '14px' }}>
            <button onClick={onVolver} style={boton('#eeeeee', '#444')}>← Volver a la lista</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '0.9rem', color: '#333' }}>
            Archivo: <strong>{nombreArchivo}</strong>
            {lista.materia && <> · Lista de <strong>{lista.materia}</strong></>}
            {lista.grupo && <> · grupo <strong>{lista.grupo}</strong></>}
            {' · '}{lista.estudiantes.length} {lista.estudiantes.length === 1 ? 'alumno' : 'alumnos'}
          </div>

          {difiereCurso && (
            <div role="alert" style={{ background: '#fff8e1', border: '1px solid #ffe08a', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px', fontSize: '0.88rem', color: '#6b4e00' }}>
              <strong style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><AlertTriangle size={16} /> Esta lista parece de otro curso</strong>
              <p style={{ margin: '4px 0 6px' }}>
                El archivo es de «{lista.materia} · {lista.grupo}» y estás cargando en «{curso.nameCourse} · {curso.group}».
              </p>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={confirmaCurso} onChange={(e) => setConfirmaCurso(e.target.checked)} />
                Confirmo que es la lista de este curso
              </label>
            </div>
          )}
          {difiereTotal && (
            <div style={{ background: '#fff8e1', border: '1px solid #ffe08a', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '0.86rem', color: '#6b4e00' }}>
              El reporte declara {lista.totalDeclarado} alumnos, pero se leyeron {lista.estudiantes.length}. Revisa que no falte nadie.
            </div>
          )}

          <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.9rem', color: '#333', marginBottom: '12px' }}>
            <input type="checkbox" checked={sincronizar} onChange={(e) => setSincronizar(e.target.checked)} style={{ marginTop: '3px' }} />
            <span>Dejar el curso exactamente con esta lista: <strong>quitar</strong> a quienes estén inscritos y no aparezcan en el archivo (sus asistencias se conservan).</span>
          </label>

          <h3 style={{ margin: '0 0 8px', fontSize: '1.02rem', color: '#2b2b2b' }}>
            Vista previa {calculando && <span style={{ color: '#888', fontWeight: 400, fontSize: '0.85rem' }}>· calculando…</span>}
          </h3>

          {plan && (
            <>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {plan.resumen.porCrear > 0 && <Chip t={`${plan.resumen.porCrear} nuevos en el sistema`} f="#e8f0fe" c="#1a4fb4" />}
                {plan.resumen.porInscribir > 0 && <Chip t={`${plan.resumen.porInscribir} por inscribir`} f="#e6f4ea" c="#1b6e34" />}
                {plan.resumen.yaInscritos > 0 && <Chip t={`${plan.resumen.yaInscritos} ya inscritos`} f="#f1f1f1" c="#555" />}
                {plan.resumen.porQuitar > 0 && <Chip t={`${plan.resumen.porQuitar} por quitar`} f="#fdecea" c="#b71c1c" />}
                {plan.resumen.conflictos > 0 && <Chip t={`${plan.resumen.conflictos} con conflicto`} f="#fff4d6" c="#8a5a00" />}
                {plan.resumen.filasInvalidas > 0 && <Chip t={`${plan.resumen.filasInvalidas} filas con error`} f="#fdecea" c="#b71c1c" />}
              </div>

              {plan.filasInvalidas.length > 0 && (
                <div role="alert" style={{ background: '#fff8e1', border: '1px solid #ffe08a', borderRadius: '10px', padding: '10px 14px', marginBottom: '10px', fontSize: '0.86rem', color: '#6b4e00' }}>
                  <strong>Estas filas no se importarán:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
                    {plan.filasInvalidas.slice(0, 20).map((f) => (
                      <li key={f.fila}>{lista.estudiantes[f.fila - 1]?.nombre ?? `Fila ${f.fila}`}: {f.errores.join(' ')}</li>
                    ))}
                    {plan.filasInvalidas.length > 20 && <li>…y {plan.filasInvalidas.length - 20} más</li>}
                  </ul>
                </div>
              )}

              <div style={{ border: '1px solid #eee', borderRadius: '10px', overflow: 'hidden', maxHeight: '260px', overflowY: 'auto' }}>
                {lista.estudiantes.map((e, i) => {
                  const item: ItemPlanEstudiante | undefined = porCedula.get(e.cedula);
                  return (
                    <div key={`${e.cedula}-${i}`} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '6px 12px', background: i % 2 ? '#fafafa' : 'white', fontSize: '0.86rem' }}>
                      <span style={{ width: '110px', color: '#666' }}>{e.cedula || '—'}</span>
                      <span style={{ flex: 1 }}>{e.nombre}</span>
                      {item && <EtiquetaAccion item={item} />}
                    </div>
                  );
                })}
              </div>

              {plan.quitar.length > 0 && (
                <div style={{ marginTop: '10px', background: '#fdecea', borderRadius: '10px', padding: '10px 14px', fontSize: '0.86rem', color: '#7a1c1c' }}>
                  <strong>Se quitarán del curso:</strong> {plan.quitar.map((q) => q.nombre).join(', ')}
                </div>
              )}
            </>
          )}
        </>
      )}

      {lista && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button onClick={() => { setLista(null); setPlan(null); }} disabled={guardando} style={boton('#eeeeee', '#444', guardando)}>← Elegir otro archivo</button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onVolver} disabled={guardando} style={boton('#9e9e9e', 'white', guardando)}>Cancelar</button>
            <button onClick={guardar} disabled={!puedeGuardar} style={boton('var(--color-primary)', 'white', !puedeGuardar)}>{guardando ? 'Guardando…' : 'Guardar lista'}</button>
          </div>
        </div>
      )}
    </>
  );
}

function Chip({ t, f, c }: { t: string; f: string; c: string }) {
  return <span style={{ background: f, color: c, padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600 }}>{t}</span>;
}

function EtiquetaAccion({ item }: { item: ItemPlanEstudiante }) {
  const estilos = {
    crear: { t: 'Nuevo en el sistema', f: '#e8f0fe', c: '#1a4fb4' },
    inscribir: { t: 'Se inscribe', f: '#e6f4ea', c: '#1b6e34' },
    ya_inscrito: { t: 'Ya inscrito', f: '#f1f1f1', c: '#555' },
    conflicto: { t: 'No se modifica', f: '#fff4d6', c: '#8a5a00' },
  }[item.accion];
  return (
    <span title={item.motivo ?? undefined} style={{ background: estilos.f, color: estilos.c, padding: '2px 8px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {estilos.t}{item.motivo && item.accion !== 'conflicto' ? ' · nombre distinto' : ''}
    </span>
  );
}
