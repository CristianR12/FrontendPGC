import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LoginPage } from "../pages/Login";
import { HomePage } from "../pages/HomePage";
import { AsistenciasPage } from "../pages/assists";
import { EditarAsistenciaPage } from "../pages/EditAssistsPage";
import { ReportesPage } from "../pages/ReportesPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ProtectedRoute } from "./ProtectedRoute";

/**
 * Configuración central de rutas
 * - Ruta pública: / (Login)
 * - Rutas protegidas: Requieren autenticación
 */
const AppRoutes = () => {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Ruta pública - Login */}
          <Route path="/" element={<LoginPage />} />
          
          {/* Rutas protegidas */}
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/asistencias" 
            element={
              <ProtectedRoute>
                <AsistenciasPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/asistencias/editar/:id" 
            element={
              <ProtectedRoute>
                <EditarAsistenciaPage />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/reportes" 
            element={
              <ProtectedRoute>
                <ReportesPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Ruta 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

export default AppRoutes;