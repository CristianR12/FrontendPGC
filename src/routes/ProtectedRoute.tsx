// src/routes/ProtectedRoute.tsx
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { PantallaCarga } from '../components/PantallaCarga';
import { AceptacionLegal } from '../components/AceptacionLegal';
import legalApiService from '../services/legalApiService';
import type { EstadoLegal } from '../services/legalApiService';
import { HeaderWithSidebar } from '../components/HeaderWithSidebar';
import { limpiarEstadoSesion, obtenerEstadoSesion } from '../services/sesionService';
import type { RespuestaRegistro } from '../services/registroApiService';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Protege las rutas: exige sesión iniciada y una cuenta ACTIVA (docente o estudiante vinculado). Quien inició sesión
 * pero aún no está registrado va a /registro. Los administradores pueden entrar a /admin aunque no
 * sean docentes. El servidor valida todo otra vez: esto solo evita mostrar pantallas que no funcionarían.
 * Añade el HeaderWithSidebar a todas las páginas autenticadas.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [legal, setLegal] = useState<EstadoLegal | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [estado, setEstado] = useState<RespuestaRegistro | null>(null);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthenticated(!!user);
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const e = await obtenerEstadoSesion(user.uid);
        setEstado(e);
        // Docentes y estudiantes deben haber aceptado la versión vigente de los términos y de la política de datos
        if (e.estado === 'activo' && e.rol) setLegal(await legalApiService.estado());
        setErrorEstado(null);
      } catch (e: any) {
        setErrorEstado(e.message || 'No se pudo verificar tu cuenta.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [intento]);

  if (loading) {
    return <PantallaCarga message="Cargando..." />;
  }

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  if (errorEstado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div role="alert" style={{ background: 'white', borderRadius: '16px', padding: '28px', maxWidth: '460px', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0, color: '#2b2b2b' }}>No pudimos verificar tu cuenta</h2>
          <p style={{ color: '#555' }}>{errorEstado}</p>
          <button onClick={() => { setLoading(true); setIntento((n) => n + 1); }} style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', background: '#667eea', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const activo = estado?.estado === 'activo';
  const adminEnRutaAdmin = !!estado?.esAdmin && location.pathname.startsWith('/admin');
  if (!activo && !adminEnRutaAdmin) {
    return <Navigate to="/registro" replace />;
  }

  // Sin aceptar la versión vigente de términos y datos personales no se entra al sistema
  if (legal && legal.aplica && !legal.vigente) {
    return (
      <AceptacionLegal
        oscuro={document.body.classList.contains('dark-mode')}
        actualizacion={!!legal.aceptacion}
        onAceptado={setLegal}
        onRechazar={async () => { limpiarEstadoSesion(); await signOut(auth); navigate('/'); }}
      />
    );
  }

  // El estudiante solo tiene su Inicio; las demás pantallas son del docente
  if (estado?.rol === 'Estudiante' && location.pathname !== '/home') {
    return <Navigate to="/home" replace />;
  }

  // Envolver todo el contenido con HeaderWithSidebar
  return (
    <HeaderWithSidebar>
      {children}
    </HeaderWithSidebar>
  );
}
