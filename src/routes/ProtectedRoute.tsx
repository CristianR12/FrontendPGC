// src/routes/ProtectedRoute.tsx
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { HeaderWithSidebar } from '../components/HeaderWithSidebar';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Componente que protege rutas y añade automáticamente el HeaderWithSidebar
 * a todas las páginas autenticadas
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthenticated(!!user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Verificando autenticación..." />;
  }

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  // Envolver todo el contenido con HeaderWithSidebar
  return (
    <HeaderWithSidebar>
      {children}
    </HeaderWithSidebar>
  );
}