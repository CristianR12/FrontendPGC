// src/routes/ProtectedRoute.tsx
import type { ReactNode } from 'react';
import {useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * ProtectedRoute - HOC para proteger rutas
 * - Verifica si el usuario está autenticado
 * - Redirige a login si no lo está
 * - Muestra spinner mientras verifica
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Escuchar cambios en el estado de autenticación
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthenticated(!!user);
      setLoading(false);
    });

    // Limpiar listener al desmontar
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Verificando autenticación..." />;
  }

  if (!authenticated) {
    // Redirigir a login si no está autenticado
    return <Navigate to="/" replace />;
  }

  // Usuario autenticado, renderizar contenido
  return <>{children}</>;
}