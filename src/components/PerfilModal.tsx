// src/components/PerfilModal.tsx
// Edición del perfil como ventana flotante: se abre sobre la pantalla en la que estés.
import { useEffect, useState } from 'react';
import { Plus, Trash2, UserCircle, X } from 'lucide-react';
import cursosApiService from '../services/cursosApiService';
import type { Equipo, Perfil } from '../services/cursosApiService';
import { Toast } from './Toast';

interface Props {
  onCerrar: () => void;
  oscuro?: boolean;
}

export function PerfilModal({ onCerrar, oscuro = false }: Props) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [sinPerfil, setSinPerfil] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState(false);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [programa, setPrograma] = useState('');
  const [facultad, setFacultad] = useState('');
  // Solo estudiantes
  const [emailPersonal, setEmailPersonal] = useState('');
  const [emergenciaNombre, setEmergenciaNombre] = useState('');
  const [emergenciaTelefono, setEmergenciaTelefono] = useState('');
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const esEstudiante = perfil?.tipo === 'Estudiante';

  const fondo = oscuro ? '#2d2d2d' : 'white';
  const texto = oscuro ? '#fff' : '#2b2b2b';
  const tenue = oscuro ? '#aaa' : '#666';
  const borde = oscuro ? '#3d3d3d' : '#d0d0d0';
  const etiqueta: React.CSSProperties = { display: 'grid', gap: '4px', fontSize: '0.88rem', color: oscuro ? '#ddd' : '#444', fontWeight: 600 };
  const campo: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: `1px solid ${borde}`, borderRadius: '8px', fontSize: '0.95rem',
    boxSizing: 'border-box', background: oscuro ? '#1e1e1e' : 'white', color: texto,
  };
  const soloLectura: React.CSSProperties = { ...campo, background: oscuro ? '#252525' : '#f3f3f6', color: tenue };

  const cargar = async () => {
    try {
      const p = await cursosApiService.obtenerPerfil();
      if (!p) {
        setSinPerfil(true);
        return;
      }
      setPerfil(p);
      setNombre(p.nombre);
      setTelefono(p.telefono);
      setPrograma(p.programa);
      setFacultad(p.facultad);
      setEmailPersonal(p.emailPersonal ?? '');
      setEmergenciaNombre(p.contactoEmergencia?.nombre ?? '');
      setEmergenciaTelefono(p.contactoEmergencia?.telefono ?? '');
      setEquipos(p.equipos ?? []);
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar tu perfil.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && !guardando && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [guardando, onCerrar]);

  const guardar = async () => {
    if (!esEstudiante && nombre.trim().length < 3) return setError('Escribe tu nombre (mínimo 3 caracteres).');
    if (telefono.trim() && !/^[0-9+()\- ]{7,20}$/.test(telefono.trim())) {
      return setError('El teléfono solo puede tener números, espacios, +, - y paréntesis (7 a 20 caracteres).');
    }
    setGuardando(true);
    setError(null);
    try {
      if (esEstudiante) {
        await cursosApiService.guardarPerfil({
          telefono, emailPersonal,
          contactoEmergencia: { nombre: emergenciaNombre, telefono: emergenciaTelefono },
          equipos,
        });
      } else {
        await cursosApiService.guardarPerfil({ nombre, telefono, programa, facultad, equipos });
      }
      setAviso(true);
      await cargar();
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar el perfil.');
    } finally {
      setGuardando(false);
    }
  };

  const editorEquipos = (
    <>
      <strong style={{ color: texto, marginTop: '4px' }}>Equipos portátiles</strong>
      {equipos.length === 0 && <span style={{ color: tenue, fontSize: '0.85rem' }}>No has registrado equipos.</span>}
      {equipos.map((eq, i) => (
        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <label style={{ ...etiqueta, flex: 1, minWidth: 0 }}>
            Marca
            <input value={eq.marca} onChange={(e) => setEquipos(equipos.map((x, j) => (j === i ? { ...x, marca: e.target.value } : x)))} placeholder="Ej: Lenovo" style={campo} />
          </label>
          <label style={{ ...etiqueta, flex: 1, minWidth: 0 }}>
            Serial
            <input value={eq.serial} onChange={(e) => setEquipos(equipos.map((x, j) => (j === i ? { ...x, serial: e.target.value } : x)))} placeholder="Ej: PF2ABC123" style={campo} />
          </label>
          <button type="button" aria-label={`Quitar equipo ${i + 1}`} title="Quitar equipo" onClick={() => setEquipos(equipos.filter((_, j) => j !== i))}
            style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '8px', background: 'transparent', color: tenue, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      {equipos.length < 5 && (
        <button type="button" onClick={() => setEquipos([...equipos, { marca: '', serial: '' }])}
          style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px dashed var(--color-primary)', borderRadius: '8px', background: 'transparent', color: 'var(--color-uni)', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Agregar equipo
        </button>
      )}
    </>
  );

  const acciones = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
      <button onClick={onCerrar} disabled={guardando} style={{ padding: '10px 18px', border: 'none', borderRadius: '8px', background: '#9e9e9e', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
        Cerrar
      </button>
      <button onClick={guardar} disabled={guardando} style={{ padding: '10px 18px', border: 'none', borderRadius: '8px', background: guardando ? '#c7c7c7' : 'var(--color-primary)', color: 'white', fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer' }}>
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  );

  return (
    <>
      {aviso && <Toast message="Perfil actualizado." type="success" onClose={() => setAviso(false)} />}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-perfil"
        onClick={(e) => e.target === e.currentTarget && !guardando && onCerrar()}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      >
        <div style={{ background: fondo, color: texto, borderRadius: '16px', width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto', padding: '22px', boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UserCircle size={32} color="var(--color-primary)" />
              <div>
                <h2 id="titulo-perfil" style={{ margin: 0, fontSize: '1.3rem', color: texto }}>Mi perfil</h2>
                <p style={{ margin: '2px 0 0', color: tenue, fontSize: '0.85rem' }}>Tu información personal en el sistema.</p>
              </div>
            </div>
            <button onClick={onCerrar} disabled={guardando} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: tenue, padding: '4px', display: 'flex' }}>
              <X size={22} />
            </button>
          </div>

          {error && (
            <div role="alert" style={{ background: oscuro ? '#3a1f1f' : '#fdecea', color: oscuro ? '#ff8a80' : '#b71c1c', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {cargando && <p style={{ color: tenue }}>Cargando tu perfil...</p>}

          {sinPerfil && (
            <p style={{ color: tenue }}>
              Tu cuenta inició sesión, pero no está vinculada a una persona del sistema. Pide que te registren como docente para poder crear cursos y horarios.
            </p>
          )}

          {perfil && esEstudiante && (
            <>
              <div style={{ display: 'grid', gap: '14px' }}>
                <label style={etiqueta}>
                  Nombre completo
                  <input value={perfil.nombre} readOnly style={soloLectura} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                  <label style={etiqueta}>
                    Cédula
                    <input value={perfil.cedula ?? ''} readOnly style={soloLectura} />
                  </label>
                  <label style={etiqueta}>
                    Cursos
                    <input value={String(perfil.totalCursos)} readOnly style={soloLectura} />
                  </label>
                </div>
                <label style={etiqueta}>
                  Correo de tu cuenta
                  <input value={perfil.email ?? ''} readOnly style={soloLectura} />
                  <span style={{ fontWeight: 400, color: tenue, fontSize: '0.8rem' }}>Tu nombre, cédula y correo no se editan aquí. Si hay un error, avisa a tu docente.</span>
                </label>

                <strong style={{ color: texto, marginTop: '4px' }}>Contacto</strong>
                <label style={etiqueta}>
                  Teléfono
                  <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 300 123 4567" inputMode="tel" style={campo} />
                </label>
                <label style={etiqueta}>
                  Correo personal
                  <input value={emailPersonal} onChange={(e) => setEmailPersonal(e.target.value)} placeholder="Ej: nombre@gmail.com" inputMode="email" style={campo} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
                  <label style={etiqueta}>
                    Contacto de emergencia
                    <input value={emergenciaNombre} onChange={(e) => setEmergenciaNombre(e.target.value)} placeholder="Nombre" style={campo} />
                  </label>
                  <label style={etiqueta}>
                    Teléfono de emergencia
                    <input value={emergenciaTelefono} onChange={(e) => setEmergenciaTelefono(e.target.value)} placeholder="Ej: 300 123 4567" inputMode="tel" style={campo} />
                  </label>
                </div>

                {editorEquipos}
                <span style={{ color: tenue, fontSize: '0.8rem' }}>Cada cambio que hagas queda registrado para el administrador.</span>
              </div>
              {acciones}
            </>
          )}

          {perfil && !esEstudiante && (
            <>
              <div style={{ display: 'grid', gap: '14px' }}>
                <label style={etiqueta}>
                  Nombre completo
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={campo} autoFocus />
                </label>
                <label style={etiqueta}>
                  Correo de tu cuenta
                  <input value={perfil.email ?? ''} readOnly style={soloLectura} />
                  <span style={{ fontWeight: 400, color: tenue, fontSize: '0.8rem' }}>Viene de tu cuenta de Google; no se edita aquí.</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                  <label style={etiqueta}>
                    Tipo de usuario
                    <input value={perfil.tipo} readOnly style={soloLectura} />
                  </label>
                  <label style={etiqueta}>
                    Cursos
                    <input value={String(perfil.totalCursos)} readOnly style={soloLectura} />
                  </label>
                </div>
                <label style={etiqueta}>
                  Teléfono
                  <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 300 123 4567" inputMode="tel" style={campo} />
                </label>
                <label style={etiqueta}>
                  Programa académico
                  <input value={programa} onChange={(e) => setPrograma(e.target.value)} placeholder="Ej: Ingeniería de Sistemas" style={campo} />
                </label>
                <label style={etiqueta}>
                  Facultad
                  <input value={facultad} onChange={(e) => setFacultad(e.target.value)} placeholder="Ej: Ingeniería" style={campo} />
                </label>
                {editorEquipos}
              </div>
              {acciones}
            </>
          )}
        </div>
      </div>
    </>
  );
}
