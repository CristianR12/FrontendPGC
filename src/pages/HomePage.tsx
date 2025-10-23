// src/pages/HomePage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { HeaderWithSidebar } from "../components/HeaderWithSidebar";
import { Header } from "../components/Header";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";
import { DashboardCard } from "../components/DashboardCard";
import asistenciaService from "../services/asistenciaService";

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

  // ============================================
  // NAVEGACIÓN
  // ============================================
  const handleNavigateStats = () => {
    console.log('📊 Navegando a estadísticas...');
    navigate("/estadisticas");
  };

  const handleNavigateAdvanced = () => {
    console.log('⚙️ Navegando a gestión avanzada...');
    navigate("/gestion-avanzada");
  };

  // ============================================
  // LOGOUT
  // ============================================
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

  // ============================================
  // RENDER ERROR
  // ============================================
  if (error && asistencias.length === 0) {
    return (
      <>
        <Header 
          title="Dashboard de Administración" 
          showLogout={true} 
          onLogout={handleLogout}
        />
        <ErrorMessage message={error} onRetry={cargarAsistencias} />
      </>
    );
  }
  
  
  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  return (
    <>
   
      {/* Notificaciones */}
      {notification.show && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      <Header 
        title="Sistema de Gestión de Asistencias" 
        showLogout={true} 
        onLogout={handleLogout}
      />
      
      <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
        <h2 style={{ marginBottom: "30px", textAlign: "center", fontSize: "1.8rem" }}>
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

        {/* Tasa de asistencia */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "30px",
          borderRadius: "12px",
          textAlign: "center",
          marginBottom: "40px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
        }}>
          <h2 style={{ margin: 0, color: "#2b7a78" }}>
            📚 Gestión de Asistencias ({asistenciasFiltradas.length})
          </h2>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowNuevoForm(!showNuevoForm)}
              style={{
                padding: "12px 24px",
                fontSize: "1rem",
                backgroundColor: showNuevoForm ? "#9e9e9e" : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            >
              {showNuevoForm ? "❌ Cancelar" : "➕ Nueva Asistencia"}
            </button>

            <button
              onClick={handleNavigateStats}
              style={{
                padding: "12px 24px",
                fontSize: "1rem",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1976D2";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#2196F3";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
              }}
            >
              📊 Estadísticas
            </button>

            <button
              onClick={handleNavigateAdvanced}
              style={{
                padding: "12px 24px",
                fontSize: "1rem",
                backgroundColor: "#9C27B0",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#7B1FA2";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#9C27B0";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
              }}
            >
              ⚙️ Gestión Avanzada
            </button>

            <button
              onClick={() => navigate("/reportes")}
              style={{
                padding: "12px 24px",
                fontSize: "1rem",
                backgroundColor: "#FF6B6B",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            >
              📄 Reportes
            </button>

            <button
              onClick={cargarAsistencias}
              disabled={loading}
              style={{
                padding: "12px 24px",
                fontSize: "1rem",
                backgroundColor: "#FF9800",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.3s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          gap: "20px",
          flexWrap: "wrap"
        }}>
          <button
            onClick={() => navigate("/asistencias")}
            style={{ 
              padding: "15px 30px", 
              fontSize: "1.1rem",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            📊 Ver Asistencias
          </button>
          
          <button
            onClick={() => navigate("/reportes")}
            style={{ 
              padding: "15px 30px", 
              fontSize: "1.1rem",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            📄 Generar Reportes
          </button>
        </div>
      </div>
    </>
  );
}