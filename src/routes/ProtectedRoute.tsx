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

  return <>{children}</>;
}