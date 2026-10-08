// src/pages/RegistroPage.tsx
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, sendEmailVerification, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { LoadingSpinner } from '../components/LoadingSpinner';
import registroApiService from '../services/registroApiService';
import type { RespuestaRegistro } from '../services/registroApiService';
import { guardarEstadoSesion, limpiarEstadoSesion, obtenerEstadoSesion } from '../services/sesionService';

const campo: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #d0d0d0', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' };
const etiqueta: React.CSSProperties = { display: 'grid', gap: '4px', fontSize: '0.88rem', color: '#444', fontWeight: 600, textAlign: 'left' };
const boton = (fondo: string, color = 'white', deshabilitado = false): React.CSSProperties => ({
  padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem',
  background: deshabilitado ? '#c7c7c7' : fondo, color, cursor: deshabilitado ? 'not-allowed' : 'pointer',
});

/**
 * Pantalla para quien inició sesión pero todavía no es un docente activo del sistema:
 * verificar el correo, pedir acceso, esperar aprobación, etc. El servidor decide el estado.
 */
export function RegistroPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [respuesta, setRespuesta] = useState<RespuestaRegistro | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [soyEstudiante, setSoyEstudiante] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUsuario(u);
      setNombre((n) => n || u?.displayName || '');
      setVerificandoSesion(false);
    });
  }, []);

  const consultar = async (u: User, forzar = false) => {
    setCargando(true);
    setError(null);
    try {
      setRespuesta(await obtenerEstadoSesion(u.uid, forzar));
    } catch (e: any) {
      setError(e.message || 'No se pudo verificar tu cuenta.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (usuario) consultar(usuario);
  }, [usuario?.uid]);

  const cerrarSesion = async () => {
    limpiarEstadoSesion();
    await signOut(auth);
    navigate('/');
  };

  const reenviarCorreo = async () => {
    if (!usuario) return;
    setTrabajando(true);
    setError(null);
    try {
      await sendEmailVerification(usuario);
      setInfo(`Te enviamos un correo a ${usuario.email}. Revisa también la carpeta de spam.`);
    } catch (e: any) {
      setError(e?.code === 'auth/too-many-requests' ? 'Demasiados intentos. Espera unos minutos y vuelve a intentar.' : 'No se pudo enviar el correo.');
    } finally {
      setTrabajando(false);
    }
  };

  /** Después de verificar el correo, el token que ya tenemos sigue diciendo "no verificado": hay que renovarlo. */
  const yaVerifique = async () => {
    if (!usuario) return;
    setTrabajando(true);
    setError(null);
    setInfo(null);
    try {
      await usuario.reload();
      await usuario.getIdToken(true);
      await consultar(usuario, true);
    } catch {
      setError('No se pudo actualizar tu cuenta. Intenta de nuevo.');
    } finally {
      setTrabajando(false);
    }
  };

  const solicitar = async () => {
    if (!usuario) return;
    setTrabajando(true);
    setError(null);
    try {
      const r = await registroApiService.registrar({ cedula, nombre });
      guardarEstadoSesion(usuario.uid, r);
      setRespuesta(r);
    } catch (e: any) {
      setError(e.message || 'No se pudo enviar la solicitud.');
    } finally {
      setTrabajando(false);
    }
  };

  const vincular = async () => {
    if (!usuario) return;
    setTrabajando(true);
    setError(null);
    try {
      const r = await registroApiService.vincularEstudiante(cedula);
      guardarEstadoSesion(usuario.uid, r);
      setRespuesta(r);
    } catch (e: any) {
      setError(e.message || 'No se pudo vincular tu cuenta.');
    } finally {
      setTrabajando(false);
    }
  };

  if (verificandoSesion) return <LoadingSpinner message="Verificando sesión..." />;
  if (!usuario) return <Navigate to="/" replace />;
  if (respuesta?.estado === 'activo') return <Navigate to="/home" replace />;

  const estado = respuesta?.estado;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'transparent' }}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: '1.6rem', color: '#2b2b2b' }}>Acceso al sistema</h1>
        <p style={{ margin: '0 0 20px', color: '#777', fontSize: '0.9rem' }}>Sesión iniciada como <strong>{usuario.email}</strong></p>

        {error && <div role="alert" style={{ background: '#fdecea', color: '#b71c1c', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.9rem' }}>{error}</div>}
        {info && <div role="status" style={{ background: '#e6f4ea', color: '#1b6e34', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.9rem' }}>{info}</div>}

        {cargando && !respuesta && <p style={{ color: '#666' }}>Verificando tu cuenta…</p>}

        {estado === 'no_verificado' && (
          <>
            <p style={{ color: '#444', margin: '0 0 22px', lineHeight: 1.5 }}>{respuesta?.mensaje}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={yaVerifique} disabled={trabajando} style={boton('var(--color-primary)', 'white', trabajando)}>Ya verifiqué mi correo</button>
              <button onClick={reenviarCorreo} disabled={trabajando} style={boton('var(--color-uni-suave)', 'var(--color-primary)', trabajando)}>Reenviar correo</button>
            </div>
          </>
        )}

        {(estado === 'requiere_datos' || estado === 'cedula_no_encontrada' || estado === 'estudiante_inactivo') && (
          <>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
              <button onClick={() => { setSoyEstudiante(true); setError(null); }} style={boton(soyEstudiante ? 'var(--color-primary)' : 'var(--color-uni-suave)', soyEstudiante ? 'white' : 'var(--color-primary)')}>Soy estudiante</button>
              <button onClick={() => { setSoyEstudiante(false); setError(null); }} style={boton(!soyEstudiante ? 'var(--color-primary)' : 'var(--color-uni-suave)', !soyEstudiante ? 'white' : 'var(--color-primary)')}>Soy docente</button>
            </div>

            {soyEstudiante ? (
              <>
                <p style={{ color: '#444', margin: '0 0 16px', lineHeight: 1.5 }}>
                  {estado === 'requiere_datos'
                    ? 'Escribe tu cédula para vincular tu cuenta. Debes estar inscrito en al menos un curso.'
                    : respuesta?.mensaje}
                </p>
                <label style={{ ...etiqueta, marginBottom: '16px' }}>
                  Cédula
                  <input value={cedula} onChange={(e) => setCedula(e.target.value)} inputMode="numeric" placeholder="Solo números" style={campo} />
                </label>
                <button onClick={vincular} disabled={trabajando || !cedula.trim()} style={boton('var(--color-primary)', 'white', trabajando || !cedula.trim())}>
                  {trabajando ? 'Vinculando…' : 'Vincular mi cuenta'}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: '#444', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Tu correo todavía no está autorizado. Envía tus datos y un administrador revisará tu solicitud.
                </p>
                <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                  <label style={etiqueta}>
                    Cédula
                    <input value={cedula} onChange={(e) => setCedula(e.target.value)} inputMode="numeric" placeholder="Solo números" style={campo} />
                  </label>
                  <label style={etiqueta}>
                    Nombre completo
                    <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Como aparece en Academusoft" style={campo} />
                  </label>
                </div>
                <button onClick={solicitar} disabled={trabajando || !cedula.trim() || nombre.trim().length < 3} style={boton('var(--color-primary)', 'white', trabajando || !cedula.trim() || nombre.trim().length < 3)}>
                  {trabajando ? 'Enviando…' : 'Solicitar acceso'}
                </button>
              </>
            )}
          </>
        )}

        {estado === 'pendiente' && (
          <>
            <p style={{ color: '#444', margin: '0 0 22px', lineHeight: 1.5 }}>{respuesta?.mensaje}</p>
            <p style={{ color: '#777', fontSize: '0.88rem' }}>Cuando te aprueben podrás entrar. Puedes cerrar esta ventana y volver más tarde.</p>
            <button onClick={() => usuario && consultar(usuario, true)} disabled={cargando} style={boton('var(--color-primary)', 'white', cargando)}>
              {cargando ? 'Revisando…' : 'Revisar de nuevo'}
            </button>
          </>
        )}

        {(estado === 'rechazada' || estado === 'cedula_en_uso' || estado === 'dominio_no_permitido' || estado === 'sin_correo' || estado === 'cuenta_docente') && (
          <p style={{ color: '#444', margin: '0 0 22px', lineHeight: 1.5 }}>{respuesta?.mensaje}</p>
        )}

        {error && !respuesta && (
          <button onClick={() => usuario && consultar(usuario, true)} style={boton('var(--color-primary)')}>Reintentar</button>
        )}

        <div style={{ marginTop: '22px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {respuesta?.esAdmin && (
            <button onClick={() => navigate('/admin/usuarios')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}>
              Ir a administración
            </button>
          )}
          <button onClick={cerrarSesion} style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer' }}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}
