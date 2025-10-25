// src/routes/AppRoutes.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

// ============================================
// IMPORTAR COMPONENTES DE PROTECCIÓN
// ============================================
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ProtectedRoute } from './ProtectedRoute';

// ============================================
// IMPORTAR PÁGINAS PÚBLICAS
// ============================================
import { LoginPage } from '../pages/Login';
import { NotFoundPage } from '../pages/NotFoundPage';

// ============================================
// IMPORTAR PÁGINAS PROTEGIDAS
// ============================================
import { HomePage } from '../pages/HomePage';
import { AsistenciasPage } from '../pages/assists';
import { EditarAsistenciaPage } from '../pages/EditAssistsPage';
import { ReportesPage } from '../pages/ReportesPage';

// ============================================
// ✨ IMPORTACIONES PARA HORARIOS
// ============================================
import { GestionHorariosFirebase } from '../pages/GestionHorariosFirebase';

/**
 * Componente de rutas principal
 * Gestiona la autenticación y redirecciona según el estado del usuario
 * 
 * RUTAS PÚBLICAS:
 * - /login → Página de login
 * - / → Redirige a /login o /home según autenticación
 * 
 * RUTAS PROTEGIDAS:
 * - /home → Dashboard principal con horarios editables
 * - /asistencias → Gestión de asistencias
 * - /asistencias/editar/:id → Editar asistencia específica
 * - /reportes → Generación de reportes
 * - /horario-completo → Ver horario semanal completo
 * - /gestion-horarios → Gestionar horarios (profesores)
 * - * → Página 404
 */
function AppRoutes() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Pantalla de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '2rem',
            marginBottom: '20px',
            animation: 'spin 1s linear infinite'
          }}>
            🔄
          </div>
          <p style={{ margin: 0, fontSize: '1.2rem', color: '#667eea', fontWeight: '600' }}>
            Cargando...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* ============================================ */}
          {/* RUTAS PÚBLICAS (Sin autenticación requerida) */}
          {/* ============================================ */}

          {/* Ruta raíz - redirige según autenticación */}
          <Route 
            path="/" 
            element={user ? <Navigate to="/home" /> : <Navigate to="/login" />} 
          />

          {/* Login */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/home" /> : <LoginPage />} 
          />

          {/* ============================================ */}
          {/* RUTAS PROTEGIDAS (Requieren autenticación) */}
          {/* ============================================ */}

          {/* Home / Dashboard Principal */}
          {/* 
            Contiene:
            - CalendarioHorariosEditable: Tabla de horarios editable
            - Estadísticas de asistencias
            - Formulario de registro de asistencias
            - Tabla de asistencias con CRUD
            
            ACTUALIZACIÓN: Ahora usa horarioApiService en lugar de firebaseHorarioService
          */}
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } 
          />

          {/* Gestión de Asistencias */}
          <Route 
            path="/asistencias" 
            element={
              <ProtectedRoute>
                <AsistenciasPage />
              </ProtectedRoute>
            } 
          />

          {/* Editar Asistencia por ID */}
          <Route 
            path="/asistencias/editar/:id" 
            element={
              <ProtectedRoute>
                <EditarAsistenciaPage />
              </ProtectedRoute>
            } 
          />

          {/* Reportes */}
          <Route 
            path="/reportes" 
            element={
              <ProtectedRoute>
                <ReportesPage />
              </ProtectedRoute>
            } 
          />

          {/* ============================================ */}
          {/* ✨ RUTAS DE HORARIOS (PROTEGIDAS) */}
          {/* ============================================ */}

          {/* Ver Horario Completo Semanal */}
          {/* 
            Accesible para:
            - Estudiantes: Ver su horario semanal
            - Profesores: Ver su horario completo
            
            Características:
            - Vista por días de la semana
            - Información de clases: horario, salón, grupo
            - Responsive y adaptable
          */}
         
          {/* Gestión de Horarios - SOLO PROFESORES */}
          {/* 
            Características:
            - Crear/Editar/Eliminar cursos
            - Agregar/Editar/Eliminar clases
            - Validación de conflictos de horario
            - Vista de lista de cursos
            - Vista de edición de horarios
            - Vista de horario completo
            
            Nota: La validación de si es profesor se hace en el componente
          */}
          <Route 
            path="/gestion-horarios" 
            element={
              <ProtectedRoute>
                <GestionHorariosFirebase />
              </ProtectedRoute>
            } 
          />

          {/* ============================================ */}
          {/* RUTA 404 - Página no encontrada */}
          {/* ============================================ */}
          <Route 
            path="*" 
            element={<NotFoundPage />} 
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default AppRoutes;