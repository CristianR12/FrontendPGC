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
import { PantallaCarga } from '../components/PantallaCarga';
import { DocumentoLegalPage } from '../pages/DocumentoLegalPage';

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

// ============================================
// IMPORTACIONES PARA HORARIOS
// ============================================
import { MiHorarioPage } from '../pages/MiHorarioPage';
import { RegistroPage } from '../pages/RegistroPage';
import { AdminUsuariosPage } from '../pages/AdminUsuariosPage';
import { AdminAsistenciasPage } from '../pages/AdminAsistenciasPage';

// ============================================
// IMPORTACIONES PARA ESTADÍSTICAS Y ANÁLISIS
// ============================================
import { EstadisticasPage } from '../pages/EstadisticasPage';

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
 * - /asistencias/editar/:id → ya no existe: editar es una ventana flotante (redirige a /asistencias)
 * - /reportes → ya no existe: el reporte es una ventana flotante (redirige a /asistencias)
 * - /horario-completo → Ver horario semanal completo
 * - /gestion-horarios → Gestionar horarios (profesores)
 * - /estadisticas → Panel de estadísticas de asistencias
 * - /analisis → ya no existe: se unió a /estadisticas
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
    return <PantallaCarga message="Cargando..." />;
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
          <Route path="/asistencias/editar/:id" element={<Navigate to="/asistencias" replace />} />

          {/* Reportes: ahora es una ventana flotante en Inicio y en Todas las asistencias */}
          <Route path="/reportes" element={<Navigate to="/asistencias" replace />} />

          {/* ============================================ */}
          {/* RUTAS DE HORARIOS (PROTEGIDAS) */}
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
                <MiHorarioPage />
              </ProtectedRoute>
            } 
          />

          {/* Antiguas rutas: ahora son pestañas de "Mi horario" */}
          <Route path="/mis-cursos" element={<Navigate to="/home" replace />} />
          <Route path="/historial-horarios" element={<Navigate to="/gestion-horarios?seccion=historial" replace />} />

          {/* Registro: para quien inició sesión pero aún no es un docente activo (no lleva menú lateral) */}
          <Route path="/registro" element={<RegistroPage />} />
          {/* Textos legales: públicos, se pueden leer sin iniciar sesión */}
          <Route path="/terminos" element={<DocumentoLegalPage id="terminos" />} />
          <Route path="/privacidad" element={<DocumentoLegalPage id="privacidad" />} />

          {/* Administración de docentes (solo administradores; lo valida el servidor) */}
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute>
                <AdminUsuariosPage />
              </ProtectedRoute>
            }
          />

          {/* Buscador de asistencias de todo el sistema (solo administradores; lo valida el servidor) */}
          <Route
            path="/admin/asistencias"
            element={
              <ProtectedRoute>
                <AdminAsistenciasPage />
              </ProtectedRoute>
            }
          />

          {/* El perfil ahora es una ventana flotante en el header */}
          <Route path="/perfil" element={<Navigate to="/home" replace />} />


          {/* ============================================ */}
          {/* RUTAS DE ESTADÍSTICAS Y ANÁLISIS */}
          {/* ============================================ */}

          {/* Estadísticas de Asistencias */}
          {/* 
            Características:
            - KPIs principales (Total, Tasa, Presentes, Ausentes)
            - Distribución de estados
            - Asistencia por curso
            - Estudiantes con baja asistencia (<80%)
            - Visualizaciones en tiempo real
          */}
          <Route 
            path="/estadisticas" 
            element={
              <ProtectedRoute>
                <EstadisticasPage />
              </ProtectedRoute>
            } 
          />

          {/* Análisis Avanzado de Asistencias */}
          {/* 
            Características:
            - Filtros por fecha y curso
            - Tendencia de asistencia
            - Análisis por día de semana
            - Top 10 estudiantes
            - Desempeño por curso
            - KPIs filtrados
            
            Nota: Similar a Power BI, muy completo
          */}
          <Route path="/analisis" element={<Navigate to="/estadisticas" replace />} />

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