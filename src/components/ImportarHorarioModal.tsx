// src/components/ImportarHorarioModal.tsx
import { useEffect, useRef, useState } from 'react';
import { Upload, Download, Trash2, Plus, X, AlertTriangle, CheckCircle } from 'lucide-react';
import horarioApiService from '../services/horarioApiService';
import type { FilaImportar, ModoImportacion, PlanImportacion, CursoPlan } from '../services/horarioApiService';
import { leerArchivoHorario } from '../utils/horarioImport';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** Enero-junio = semestre 1, julio-diciembre = semestre 2 (igual que el backend). */
const periodoPorFecha = () => {
  const ahora = new Date();
  return { anio: ahora.getFullYear(), semestre: ahora.getMonth() < 6 ? '1' : '2' };
};

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  /** Se llama después de guardar, para recargar los cursos. */
  onImportado: (mensaje: string) => void;
}

type FilaEditable = FilaImportar & { key: number; vigencia?: string };

const estiloInput: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #d0d0d0',
  borderRadius: '6px',
  fontSize: '0.85rem',
  boxSizing: 'border-box',
};

const estiloBoton = (fondo: string, color = 'white', deshabilitado = false): React.CSSProperties => ({
  padding: '10px 18px',
  backgroundColor: deshabilitado ? '#c7c7c7' : fondo,
  color,
  border: 'none',
  borderRadius: '8px',
  cursor: deshabilitado ? 'not-allowed' : 'pointer',
  fontSize: '0.95rem',
  fontWeight: 600,
});

export function ImportarHorarioModal({ abierto, onCerrar, onImportado }: Props) {
  const [paso, setPaso] = useState<'archivo' | 'revisar'>('archivo');
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [filas, setFilas] = useState<FilaEditable[]>([]);
  const [modo, setModo] = useState<ModoImportacion>('combinar');
  // Por defecto los cursos que no existan se crean: la vista previa los muestra antes de guardar
  const [crearFaltantes, setCrearFaltantes] = useState(true);
  const [archivarOtros, setArchivarOtros] = useState(false);
  const [anio, setAnio] = useState<number>(periodoPorFecha().anio);
  const [semestre, setSemestre] = useState<string>(periodoPorFecha().semestre);
  const [plan, setPlan] = useState<PlanImportacion | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const siguienteKey = useRef(1);
  const peticion = useRef(0);

  const reiniciar = () => {
    setPaso('archivo');
    setNombreArchivo('');
    setFilas([]);
    setModo('combinar');
    setCrearFaltantes(true);
    setArchivarOtros(false);
    setAnio(periodoPorFecha().anio);
    setSemestre(periodoPorFecha().semestre);
    setPlan(null);
    setError(null);
    setLeyendo(false);
    setCalculando(false);
    setGuardando(false);
  };

  const cerrar = () => {
    if (guardando) return;
    reiniciar();
    onCerrar();
  };

  const periodo = `${anio}-${semestre}`;
  const periodoValido = Number.isInteger(anio) && anio >= 2000 && anio <= 2099;

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && cerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  });

  // Vista previa: se recalcula (con un pequeño retraso) cada vez que cambian las filas o las opciones
  useEffect(() => {
    if (paso !== 'revisar') return;
    if (filas.length === 0) {
      setPlan(null);
      return;
    }
    const id = ++peticion.current;
    setCalculando(true);
    const temporizador = setTimeout(async () => {
      try {
        const resultado = await horarioApiService.previsualizarImportacion(
          filas.map(({ key, vigencia, ...f }) => f),
          { modo, crearFaltantes, archivarOtros, periodo, archivo: nombreArchivo }
        );
        if (id !== peticion.current) return; // llegó tarde: ya hay una petición más reciente
        setPlan(resultado);
        setError(null);
      } catch (e: any) {
        if (id !== peticion.current) return;
        setPlan(null);
        setError(e.message || 'No se pudo revisar el horario.');
      } finally {
        if (id === peticion.current) setCalculando(false);
      }
    }, 500);
    return () => clearTimeout(temporizador);
  }, [paso, filas, modo, crearFaltantes, archivarOtros]);

  if (!abierto) return null;

  const procesarArchivo = async (archivo: File) => {
    setLeyendo(true);
    setError(null);
    try {
      const { filas: leidas, periodo: periodoArchivo } = await leerArchivoHorario(archivo);
      const m = periodoArchivo ? /^(\d{4})-([12])$/.exec(periodoArchivo) : null;
      if (m) {
        setAnio(Number(m[1]));
        setSemestre(m[2]);
      }
      setFilas(
        leidas.map((f) => ({
          key: siguienteKey.current++,
          codigo: f.codigo,
          curso: f.curso,
          grupo: f.grupo,
          day: f.day,
          iniTime: f.iniTime,
          endTime: f.endTime,
          classroom: f.classroom,
          vigencia: f.vigenciaInicio && f.vigenciaFin ? `${f.vigenciaInicio} a ${f.vigenciaFin}` : undefined,
        }))
      );
      setNombreArchivo(archivo.name);
      setPaso('revisar');
    } catch (e: any) {
      setError(e.message || 'No se pudo leer el archivo.');
    } finally {
      setLeyendo(false);
    }
  };

  const cambiarFila = (key: number, campo: keyof FilaImportar, valor: string) =>
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, [campo]: valor } : f)));

  const quitarFila = (key: number) => setFilas((prev) => prev.filter((f) => f.key !== key));

  const agregarFila = () =>
    setFilas((prev) => [
      ...prev,
      { key: siguienteKey.current++, curso: '', grupo: '', day: 'Lunes', iniTime: '08:00', endTime: '09:59', classroom: '' },
    ]);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const { plan: aplicado, cursosCreados, subgruposCreados } = await horarioApiService.confirmarImportacion(
        filas.map(({ key, vigencia, ...f }) => f),
        { modo, crearFaltantes, archivarOtros, periodo, archivo: nombreArchivo }
      );
      const partes = [
        `${aplicado.resumen.clasesNuevas} ${aplicado.resumen.clasesNuevas === 1 ? 'clase nueva' : 'clases nuevas'}`,
        `${aplicado.resumen.cursosActualizados} ${aplicado.resumen.cursosActualizados === 1 ? 'curso actualizado' : 'cursos actualizados'}`,
      ];
      if (cursosCreados.length) partes.push(`${cursosCreados.length} ${cursosCreados.length === 1 ? 'curso creado' : 'cursos creados'}`);
      if (subgruposCreados.length) partes.push(`${subgruposCreados.length} ${subgruposCreados.length === 1 ? 'subgrupo creado' : 'subgrupos creados'}`);
      reiniciar();
      onImportado(
        `Horario importado: ${partes.join(', ')}.` +
          (cursosCreados.length || subgruposCreados.length ? ' Agrega los estudiantes de los grupos nuevos desde el Inicio (menú de tres puntos del curso, opción Estudiantes).' : '')
      );
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar el horario.');
      setGuardando(false);
    }
  };

  const filasConError = new Set((plan?.filasInvalidas ?? []).map((f) => f.fila - 1));
  const puedeGuardar =
    periodoValido && !!plan && !calculando && !guardando && plan.resumen.hayCambios && plan.conflictos.length === 0 && filas.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-importar"
      onClick={(e) => e.target === e.currentTarget && cerrar()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div style={{
        background: 'white', borderRadius: '16px', width: '100%', maxWidth: '1000px', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Encabezado */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 id="titulo-importar" style={{ margin: 0, color: '#2b2b2b', fontSize: '1.4rem' }}>Subir horario</h2>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '0.9rem' }}>
              {paso === 'archivo'
                ? 'Sube tu horario de Academusoft (PDF) o la plantilla en Excel.'
                : `Archivo: ${nombreArchivo}. Revisa y corrige antes de guardar.`}
            </p>
          </div>
          <button onClick={cerrar} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
            <X size={24} />
          </button>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div role="alert" style={{ background: '#fdecea', color: '#b71c1c', padding: '12px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {paso === 'archivo' && (
            <>
              <label
                onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setArrastrando(false);
                  const archivo = e.dataTransfer.files?.[0];
                  if (archivo) procesarArchivo(archivo);
                }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                  border: `2px dashed ${arrastrando ? 'var(--color-primary)' : 'var(--border-color)'}`, borderRadius: '14px',
                  padding: '40px 20px', cursor: 'pointer', background: arrastrando ? 'var(--color-uni-suave)' : 'var(--color-uni-suave)', textAlign: 'center',
                }}
              >
                <Upload size={40} color="var(--color-primary)" />
                <strong style={{ color: '#2b2b2b' }}>{leyendo ? 'Leyendo archivo…' : 'Arrastra tu archivo aquí o haz clic para elegirlo'}</strong>
                <span style={{ color: '#666', fontSize: '0.85rem' }}>PDF de Academusoft o Excel (.xlsx) · máx. 5 MB</span>
                <span style={{ color: '#888', fontSize: '0.8rem' }}>El archivo se lee en tu navegador; no se envía a ningún servidor.</span>
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  disabled={leyendo}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const archivo = e.target.files?.[0];
                    e.target.value = '';
                    if (archivo) procesarArchivo(archivo);
                  }}
                />
              </label>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#555', fontSize: '0.9rem' }}>¿No tienes el PDF? Usa la plantilla:</span>
                <a href="/plantilla_horario.xlsx" download="plantilla_horario.xlsx" style={{ ...estiloBoton('var(--color-uni-suave)', 'var(--color-primary)'), display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                  <Download size={16} /> Plantilla Excel
                </a>
              </div>
            </>
          )}

          {paso === 'revisar' && (
            <>
              {/* Clases leídas */}
              <h3 style={{ margin: '0 0 8px', color: '#2b2b2b', fontSize: '1.05rem' }}>Clases leídas ({filas.length})</h3>
              <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left', fontSize: '0.8rem', color: '#555' }}>
                      {['Curso', 'Grupo', 'Día', 'Inicio', 'Fin', 'Salón', ''].map((t) => (
                        <th key={t} style={{ padding: '8px' }}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, i) => (
                      <tr key={f.key} style={{ background: filasConError.has(i) ? '#fff4f4' : undefined, borderTop: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '4px 6px', width: '30%' }}>
                          <input aria-label="Curso" style={estiloInput} value={f.curso} onChange={(e) => cambiarFila(f.key, 'curso', e.target.value)} />
                        </td>
                        <td style={{ padding: '4px 6px', width: '15%' }}>
                          <input aria-label="Grupo" style={estiloInput} value={f.grupo} onChange={(e) => cambiarFila(f.key, 'grupo', e.target.value)} />
                        </td>
                        <td style={{ padding: '4px 6px', width: '12%' }}>
                          <select aria-label="Día" style={estiloInput} value={f.day} onChange={(e) => cambiarFila(f.key, 'day', e.target.value)}>
                            {!DIAS.includes(f.day) && <option value={f.day}>{f.day || '—'}</option>}
                            {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '4px 6px', width: '11%' }}>
                          <input aria-label="Hora de inicio" type="time" style={estiloInput} value={f.iniTime} onChange={(e) => cambiarFila(f.key, 'iniTime', e.target.value)} />
                        </td>
                        <td style={{ padding: '4px 6px', width: '11%' }}>
                          <input aria-label="Hora de fin" type="time" style={estiloInput} value={f.endTime} onChange={(e) => cambiarFila(f.key, 'endTime', e.target.value)} />
                        </td>
                        <td style={{ padding: '4px 6px', width: '12%' }}>
                          <input aria-label="Salón" style={estiloInput} value={f.classroom} placeholder="NREF" onChange={(e) => cambiarFila(f.key, 'classroom', e.target.value)} />
                        </td>
                        <td style={{ padding: '4px 6px', width: '4%' }}>
                          <button aria-label="Quitar fila" onClick={() => quitarFila(f.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <button onClick={agregarFila} style={{ ...estiloBoton('var(--color-uni-suave)', 'var(--color-primary)'), display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}>
                  <Plus size={16} /> Agregar fila
                </button>
                {filas.find((f) => f.vigencia) && (
                  <span style={{ color: '#777', fontSize: '0.8rem' }}>
                    Vigencia en el PDF: {filas.find((f) => f.vigencia)!.vigencia} (solo informativa, no se guarda)
                  </span>
                )}
              </div>

              {/* Opciones */}
              <h3 style={{ margin: '22px 0 8px', color: '#2b2b2b', fontSize: '1.05rem' }}>¿Cómo aplicarlo?</h3>
              <div style={{ display: 'grid', gap: '8px', fontSize: '0.92rem', color: '#333' }}>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="radio" name="modo" checked={modo === 'combinar'} onChange={() => setModo('combinar')} style={{ marginTop: '3px' }} />
                  <span><strong>Combinar</strong> (recomendado): agrega las clases nuevas, actualiza el salón si cambió y conserva lo que ya tienes y no está en el archivo.</span>
                </label>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="radio" name="modo" checked={modo === 'reemplazar'} onChange={() => setModo('reemplazar')} style={{ marginTop: '3px' }} />
                  <span><strong>Reemplazar</strong>: en los cursos que aparecen en el archivo, deja exactamente las clases del archivo y quita las demás.</span>
                </label>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', marginTop: '4px' }}>
                  <input type="checkbox" checked={crearFaltantes} onChange={(e) => setCrearFaltantes(e.target.checked)} style={{ marginTop: '3px' }} />
                  <span><strong>Crear los cursos que no existan</strong> (recomendado). Se crean sin estudiantes: después cárgales la lista desde el Inicio (tres puntos del curso, Estudiantes).</span>
                </label>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={archivarOtros} onChange={(e) => setArchivarOtros(e.target.checked)} style={{ marginTop: '3px' }} />
                  <span>
                    <strong>Archivar los cursos que no aparecen en el archivo</strong> (útil al cambiar de semestre): dejan de tener
                    horario, así que ya no se toma asistencia en ellos. Sus asistencias, estudiantes y su horario anterior
                    (en el historial) se conservan.
                  </span>
                </label>
              </div>

              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.92rem', color: '#333' }}>
                <strong>Período académico:</strong>
                <input
                  type="number"
                  aria-label="Año del período"
                  min={2000}
                  max={2099}
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value))}
                  style={{ ...estiloInput, width: '90px' }}
                />
                <select aria-label="Semestre" value={semestre} onChange={(e) => setSemestre(e.target.value)} style={{ ...estiloInput, width: '120px' }}>
                  <option value="1">Semestre 1</option>
                  <option value="2">Semestre 2</option>
                </select>
                <span style={{ color: '#777', fontSize: '0.8rem' }}>
                  {periodoValido ? `Se guardará en el historial como ${periodo}.` : 'Escribe un año válido (2000-2099).'}
                </span>
              </div>

              {/* Vista previa */}
              <h3 style={{ margin: '22px 0 8px', color: '#2b2b2b', fontSize: '1.05rem' }}>
                Vista previa {calculando && <span style={{ color: '#888', fontWeight: 400, fontSize: '0.85rem' }}>· calculando…</span>}
              </h3>
              {plan && <VistaPrevia plan={plan} />}
              {!plan && !calculando && !error && <p style={{ color: '#777' }}>Agrega al menos una clase para ver la vista previa.</p>}
            </>
          )}
        </div>

        {/* Pie */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            {paso === 'revisar' && (
              <button onClick={reiniciar} disabled={guardando} style={estiloBoton('#eeeeee', '#444', guardando)}>← Elegir otro archivo</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={cerrar} disabled={guardando} style={estiloBoton('#9e9e9e', 'white', guardando)}>Cancelar</button>
            {paso === 'revisar' && (
              <button onClick={guardar} disabled={!puedeGuardar} style={estiloBoton('var(--color-primary)', 'white', !puedeGuardar)}>
                {guardando ? 'Guardando…' : 'Guardar horario'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Vista previa del plan
// ============================================================

const etiquetaClase = (c: { day: string; iniTime: string; endTime: string; classroom: string }) =>
  `${c.day} ${c.iniTime}–${c.endTime} · ${c.classroom}`;

function Chip({ texto, fondo, color }: { texto: string; fondo: string; color: string }) {
  return (
    <span style={{ background: fondo, color, padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600 }}>{texto}</span>
  );
}

function VistaPrevia({ plan }: { plan: PlanImportacion }) {
  const r = plan.resumen;
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Chip texto={`${r.clasesNuevas} clases nuevas`} fondo="#e6f4ea" color="#1b6e34" />
        <Chip texto={`${r.cursosActualizados} cursos a actualizar`} fondo="#e8f0fe" color="#1a4fb4" />
        {r.cursosNuevos > 0 && <Chip texto={`${r.cursosNuevos} cursos a crear`} fondo="#e6f4ea" color="#1b6e34" />}
        {r.cursosOmitidos > 0 && <Chip texto={`${r.cursosOmitidos} cursos sin emparejar`} fondo="#f1f1f1" color="#555" />}
        {r.subgruposNuevos > 0 && <Chip texto={`${r.subgruposNuevos} ${r.subgruposNuevos === 1 ? 'subgrupo nuevo' : 'subgrupos nuevos'}`} fondo="#e6f4ea" color="#1b6e34" />}
        {r.cursosConvertidos > 0 && <Chip texto={`${r.cursosConvertidos} ${r.cursosConvertidos === 1 ? 'curso pasa' : 'cursos pasan'} a tener subgrupos`} fondo="#fff4d6" color="#8a5a00" />}
        {r.cursosArchivados > 0 && <Chip texto={`${r.cursosArchivados} cursos a archivar`} fondo="#fff4d6" color="#8a5a00" />}
        {r.filasInvalidas > 0 && <Chip texto={`${r.filasInvalidas} filas con error`} fondo="#fdecea" color="#b71c1c" />}
      </div>

      {plan.conversiones?.length > 0 && (
        <div style={{ background: '#fff8e1', border: '1px solid #ffe08a', borderRadius: '10px', padding: '12px 14px', fontSize: '0.88rem', color: '#6b4e00' }}>
          <strong style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <AlertTriangle size={16} /> Un grupo nuevo se agrega como subgrupo del mismo curso
          </strong>
          <p style={{ margin: '4px 0 6px' }}>
            Para eso, {plan.conversiones.length === 1 ? 'este curso, que hoy tiene un solo grupo, pasa' : 'estos cursos, que hoy tienen un solo grupo, pasan'} a ser
            {plan.conversiones.length === 1 ? ' un curso' : ' cursos'} con subgrupos:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {plan.conversiones.map((c) => (
              <li key={c.hacia}>
                «{c.nameCourse}»: su grupo <strong>{c.groupId}</strong> se convierte en un subgrupo (se copian sus {c.estudiantes} estudiantes,
                sus {c.clases} clases y sus asistencias).
              </li>
            ))}
          </ul>
          <p style={{ margin: '6px 0 0' }}>No se borra nada: las asistencias originales se conservan y el curso guarda un respaldo de lo que tenía.</p>
        </div>
      )}

      {plan.conflictos.length > 0 && (
        <div role="alert" style={{ background: '#fdecea', border: '1px solid #f5c2c0', borderRadius: '10px', padding: '12px 14px' }}>
          <strong style={{ color: '#b71c1c', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <AlertTriangle size={16} /> Hay cruces de horario. Corrígelos para poder guardar:
          </strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#7a1c1c', fontSize: '0.88rem' }}>
            {plan.conflictos.map((c, i) => (
              <li key={i}>
                {c.dia}: {c.a.curso} ({c.a.iniTime}–{c.a.endTime}) se cruza con {c.b.curso} ({c.b.iniTime}–{c.b.endTime})
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.advertencias?.length > 0 && (
        <div role="alert" style={{ background: '#fff8e1', border: '1px solid #ffe08a', borderRadius: '10px', padding: '12px 14px', fontSize: '0.88rem', color: '#6b4e00' }}>
          <strong style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <AlertTriangle size={16} /> {plan.advertencias.length === 1 ? 'Una clase queda sin salón' : `${plan.advertencias.length} clases quedan sin salón`}
          </strong>
          <p style={{ margin: '4px 0 6px' }}>
            Puedes guardarlas, pero el reconocimiento facial usa el salón para tomar la asistencia: asígnalo (columna “Salón” de arriba) o edítalo después.
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {plan.advertencias.map((a, i) => (
              <li key={i}>{a.curso} ({a.group}) · {a.day} {a.iniTime}–{a.endTime}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.filasInvalidas.length > 0 && (
        <div role="alert" style={{ background: '#fff8e1', border: '1px solid #ffe08a', borderRadius: '10px', padding: '12px 14px', fontSize: '0.88rem', color: '#6b4e00' }}>
          <strong>Filas con error (no se importarán hasta corregirlas):</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
            {plan.filasInvalidas.map((f) => (
              <li key={f.fila}>Fila {f.fila}: {f.errores.join(' ')}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.cursos.map((c, i) => (
        <TarjetaCurso key={`${c.nameCourse}-${c.group}-${i}`} curso={c} modo={plan.modo} />
      ))}

      {!r.hayCambios && plan.conflictos.length === 0 && plan.filasInvalidas.length === 0 && (
        <p style={{ color: '#555', display: 'flex', gap: '6px', alignItems: 'center', margin: 0 }}>
          <CheckCircle size={16} color="#2e7d32" /> No hay cambios: tu horario ya coincide con el archivo (o los cursos no se pudieron emparejar).
        </p>
      )}
    </div>
  );
}

function TarjetaCurso({ curso, modo }: { curso: CursoPlan; modo: ModoImportacion }) {
  const insignia =
    curso.accion === 'actualizar'
      ? { texto: 'Actualizar', fondo: '#e8f0fe', color: '#1a4fb4' }
      : curso.accion === 'crear'
        ? { texto: 'Crear curso', fondo: '#e6f4ea', color: '#1b6e34' }
        : curso.accion === 'archivar'
          ? { texto: 'Archivar', fondo: '#fff4d6', color: '#8a5a00' }
          : curso.accion === 'subgrupo'
            ? { texto: 'Subgrupo nuevo', fondo: '#e6f4ea', color: '#1b6e34' }
            : { texto: 'Sin emparejar', fondo: '#f1f1f1', color: '#555' };

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px', opacity: curso.accion === 'omitir' ? 0.85 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ color: '#2b2b2b' }}>
          {curso.nameCourse} <span style={{ color: '#777', fontWeight: 400 }}>· {curso.group}</span>
        </strong>
        <Chip texto={insignia.texto} fondo={insignia.fondo} color={insignia.color} />
      </div>

      {curso.aproximado && (
        <p style={{ margin: '6px 0 0', color: '#8a5a00', fontSize: '0.82rem' }}>
          El grupo se emparejó de forma aproximada con el de tu curso. Verifica que sea el correcto.
        </p>
      )}
      {curso.accion === 'archivar' && (
        <p style={{ margin: '6px 0 0', color: '#8a5a00', fontSize: '0.84rem' }}>
          Ya no aparece en tu horario, así que dejará de tomar asistencia. Se conservan sus asistencias, estudiantes y este horario en el historial.
        </p>
      )}
      {curso.accion === 'subgrupo' && (
        <p style={{ margin: '6px 0 0', color: '#1b6e34', fontSize: '0.84rem' }}>
          Nuevo subgrupo <strong>{curso.groupId}</strong> dentro de «{curso.nameCourse}», sin estudiantes (cárgalos después desde el Inicio).
        </p>
      )}
      {curso.accion === 'crear' && (
        <div style={{ margin: '6px 0 0', fontSize: '0.84rem', color: '#1b6e34' }}>
          Curso nuevo{curso.codigo ? <> con código <strong>{curso.codigo}</strong></> : ''}, sin estudiantes (cárgalos después desde el Inicio).
          {curso.similares.length > 0 && (
            <div style={{ marginTop: '4px', color: '#8a5a00' }}>
              Atención: ya tienes «{curso.similares.map((x) => `${x.nameCourse} · ${x.group}`).join(', ')}». Si es el mismo curso con el grupo mal escrito, corrígelo en la tabla de arriba para no duplicarlo.
            </div>
          )}
        </div>
      )}
      {curso.accion === 'omitir' && (
        <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#555' }}>
          {curso.motivo}
          {curso.similares.length > 0 && (
            <div style={{ marginTop: '4px' }}>
              ¿Será el mismo curso con otro grupo? Tienes: {curso.similares.map((s) => `${s.nameCourse} (${s.group})`).join(', ')}. Corrige el grupo arriba o marca “Crear los cursos que no existan”.
            </div>
          )}
        </div>
      )}

      <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', fontSize: '0.86rem', display: 'grid', gap: '3px' }}>
        {curso.nuevas.map((c, i) => (
          <li key={`n${i}`} style={{ color: '#1b6e34' }}>+ {etiquetaClase(c)}</li>
        ))}
        {curso.cambiosSalon.map((c, i) => (
          <li key={`c${i}`} style={{ color: '#8a5a00' }}>
            Cambio de salón · {c.day} {c.iniTime}–{c.endTime}: {c.salonAnterior} → {c.classroom}
          </li>
        ))}
        {curso.soloEnSistema.map((c, i) => (
          <li key={`s${i}`} style={{ color: modo === 'reemplazar' || curso.accion === 'archivar' ? '#b71c1c' : '#777' }}>
            {modo === 'reemplazar' || curso.accion === 'archivar' ? '− Se quitará: ' : '• Se conserva: '}
            {etiquetaClase(c)}
          </li>
        ))}
        {curso.iguales.length > 0 && (
          <li style={{ color: '#777' }}>
            = {curso.iguales.length} {curso.iguales.length === 1 ? 'clase ya existe' : 'clases ya existen'} sin cambios
          </li>
        )}
      </ul>
    </div>
  );
}
