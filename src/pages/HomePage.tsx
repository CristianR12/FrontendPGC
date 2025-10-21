// src/pages/HomePage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { Header } from "../components/Header";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";
import { DashboardCard } from "../components/DashboardCard";
import asistenciaService from "../services/asistenciaService";

/**
 * HomePage - Dashboard del administrador
 * Muestra estadísticas clave y accesos rápidos
 */
export function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalAsistencias: 0,
    presentes: 0,
    ausentes: 0,
    conExcusa: 0,
    tasaAsistencia: 0
  });

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      const asistencias = await asistenciaService.getAll();
      
      const presentes = asistencias.filter(a => a.estadoAsistencia === "Presente").length;
      const ausentes = asistencias.filter(a => a.estadoAsistencia === "Ausente").length;
      const conExcusa = asistencias.filter(a => a.estadoAsistencia === "Tiene Excusa").length;
      const total = asistencias.length;
      const tasa = total > 0 ? ((presentes / total) * 100).toFixed(1) : 0;

      setStats({
        totalAsistencias: total,
        presentes,
        ausentes,
        conExcusa,
        tasaAsistencia: Number(tasa)
      });
    } catch (err: any) {
      console.error("Error al cargar estadísticas:", err);
      setError("No se pudieron cargar las estadísticas");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  if (loading) return <LoadingSpinner message="Cargando dashboard..." />;
  if (error) return <ErrorMessage message={error} onRetry={cargarEstadisticas} />;

  return (
    <>
      <Header title="Dashboard de Administración" showLogout={true} onLogout={handleLogout} />
      
      <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ marginBottom: "30px", textAlign: "center" }}>
          Bienvenido, {auth.currentUser?.displayName || auth.currentUser?.email}
        </h2>

        {/* Grid de estadísticas */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
          gap: "20px",
          marginBottom: "40px"
        }}>
          <DashboardCard
            title="Total de Registros"
            value={stats.totalAsistencias}
            icon="📋"
            color="#4CAF50"
          />
          
          <DashboardCard
            title="Estudiantes Presentes"
            value={stats.presentes}
            icon="✅"
            color="#2196F3"
          />
          
          <DashboardCard
            title="Estudiantes Ausentes"
            value={stats.ausentes}
            icon="❌"
            color="#f44336"
          />
          
          <DashboardCard
            title="Con Excusa"
            value={stats.conExcusa}
            icon="📝"
            color="#FF9800"
          />
        </div>

        {/* Tasa de asistencia destacada */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "30px",
          borderRadius: "12px",
          textAlign: "center",
          marginBottom: "40px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
        }}>
          <h3 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>Tasa de Asistencia</h3>
          <p style={{ fontSize: "3rem", fontWeight: "bold", margin: "0" }}>
            {stats.tasaAsistencia}%
          </p>
        </div>

        {/* Botones de acción rápida */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          gap: "20px",
          flexWrap: "wrap"
        }}>
          <button
            className="btn-primary"
            onClick={() => navigate("/asistencias")}
            style={{ padding: "15px 30px", fontSize: "1.1rem" }}
          >
            📊 Ver Asistencias
          </button>
          
          <button
            className="btn-success"
            onClick={() => navigate("/reportes")}
            style={{ padding: "15px 30px", fontSize: "1.1rem" }}
          >
            📄 Generar Reportes
          </button>
          
          <button
            className="btn-secondary"
            onClick={() => navigate("/asistencias/nueva")}
            style={{ padding: "15px 30px", fontSize: "1.1rem" }}
          >
            ➕ Nueva Asistencia
          </button>
        </div>
      </div>
    </>
  );
}