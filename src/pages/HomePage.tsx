// src/pages/HomePage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";
import { DashboardCard } from "../components/DashboardCard";
import { AsistenciaTable } from "../components/AsistenciaTable";
import { Toast } from "../components/Toast";
import asistenciaService from "../services/asistenciaService";
import type { Asistencia } from "../services/asistenciaService";
import { getAuth } from "firebase/auth";

export function HomePage() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [filtroAsignatura, setFiltroAsignatura] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [showNuevoForm, setShowNuevoForm] = useState(false);
  const [nuevoEstudiante, setNuevoEstudiante] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [nuevaAsignatura, setNuevaAsignatura] = useState("");
  const [saving, setSaving] = useState(false);

  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  // Detectar cambios en el modo oscuro
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.body.classList.contains('dark-mode'));
    };
    
    checkDarkMode();
    
    // Observer para detectar cambios en la clase del body
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });
  };

  const stats = {
    totalAsistencias: asistencias.length,
    presentes: asistencias.filter(a => a.estadoAsistencia === "Presente").length,
    ausentes: asistencias.filter(a => a.estadoAsistencia === "Ausente").length,
    conExcusa: asistencias.filter(a => a.estadoAsistencia === "Tiene Excusa").length,
    tasaAsistencia: asistencias.length > 0 
      ? ((asistencias.filter(a => a.estadoAsistencia === "Presente").length / asistencias.length) * 100).toFixed(1)
      : 0
  };

  const asistenciasFiltradas = filtroAsignatura
    ? asistencias.filter(a => a.asignatura === filtroAsignatura)
    : asistencias;

  useEffect(() => {
    cargarAsistencias();
  }, []);

  const cargarAsistencias = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await asistenciaService.getAll();
      setAsistencias(data);
    } catch (err: any) {
      const mensaje = err.message || "No se pudieron cargar las asistencias";
      setError(mensaje);
      showNotification(mensaje, 'error');
    } finally {
      setLoading(false);
    }
  };
    
  const handleCrearAsistencia = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nuevoEstudiante || !nuevoEstado) {
      showNotification('Por favor completa todos los campos requeridos', 'error');
      return;
    }

    setSaving(true);
    try {
      await asistenciaService.create({
        estudiante: nuevoEstudiante,
        estadoAsistencia: nuevoEstado,
        asignatura: nuevaAsignatura || undefined,
      });

      showNotification('✅ Asistencia registrada correctamente', 'success');
      setNuevoEstudiante("");
      setNuevoEstado("");
      setNuevaAsignatura("");
      setShowNuevoForm(false);
      await cargarAsistencias();
    } catch (err: any) {
      showNotification(err.message || 'Error al crear asistencia', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/asistencias/editar/${id}`);
  };

  const handleDelete = async (id: string) => {
    const asistencia = asistencias.find(a => a.id === id);
    
    if (!asistencia) {
      showNotification('Asistencia no encontrada', 'error');
      return;
    }

    const confirmacion = window.confirm(
      `¿Estás seguro de eliminar la asistencia de ${asistencia.estudiante}?`
    );

    if (!confirmacion) return;

    try {
      await asistenciaService.delete(id);
      showNotification('✅ Asistencia eliminada correctamente', 'success');
      await cargarAsistencias();
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar asistencia', 'error');
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

  if (loading) {
    return <LoadingSpinner message="Cargando sistema de asistencias..." />;
  }

  if (error && asistencias.length === 0) {
    return <ErrorMessage message={error} onRetry={cargarAsistencias} />;
  }
  
  return (
    <>
      {notification.show && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}
      
      <div style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* Sección de bienvenida */}
        <div style={{
          background: isDarkMode 
            ? "linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)"
            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "30px",
          borderRadius: "15px",
          marginBottom: "30px",
          boxShadow: isDarkMode 
            ? "0 4px 15px rgba(0,0,0,0.5)"
            : "0 4px 15px rgba(0,0,0,0.2)",
          border: isDarkMode ? "1px solid #3d3d3d" : "none"
        }}>
          <h2 style={{ 
            marginBottom: "10px", 
            fontSize: "2rem",
            textAlign: "center"
          }}>
            👋 Bienvenido, {auth.currentUser?.displayName || auth.currentUser?.email}
          </h2>
          <p style={{ textAlign: "center", fontSize: "1.1rem", opacity: 0.9 }}>
            Sistema de Control de Asistencias
          </p>
        </div>

        {/* Grid de Estadísticas */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
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
            title="Presentes"
            value={stats.presentes}
            icon="✅"
            color="#2196F3"
          />
          
          <DashboardCard
            title="Ausentes"
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

          <DashboardCard
            title="Tasa de Asistencia"
            value={`${stats.tasaAsistencia}%` as unknown as number}
            icon="📈"
            color="#9C27B0"
          />
        </div>

        {/* Acciones Rápidas */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "15px"
        }}>
          <h2 style={{ margin: 0, color: isDarkMode ? "#fff" : "#2b7a78" }}>
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
              onClick={() => navigate("/reportes")}
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
            >
              📄 Generar Reportes
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

        {/* Formulario Nueva Asistencia */}
        {showNuevoForm && (
          <div style={{
            background: isDarkMode ? "#2d2d2d" : "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: isDarkMode ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.1)",
            marginBottom: "30px",
            animation: "slideDown 0.3s ease-out",
            border: isDarkMode ? "1px solid #3d3d3d" : "none"
          }}>
            <h3 style={{ marginBottom: "20px", color: isDarkMode ? "#fff" : "#2b7a78" }}>
              ➕ Registrar Nueva Asistencia
            </h3>

            <form onSubmit={handleCrearAsistencia}>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "15px",
                marginBottom: "20px"
              }}>
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "5px",
                    fontWeight: "600",
                    color: isDarkMode ? "#fff" : "#555"
                  }}>
                    Nombre del Estudiante *
                  </label>
                  <input
                    type="text"
                    value={nuevoEstudiante}
                    onChange={(e) => setNuevoEstudiante(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    required
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "6px",
                      border: isDarkMode ? "2px solid #3d3d3d" : "2px solid #e0e0e0",
                      fontSize: "1rem",
                      background: isDarkMode ? "#2d2d2d" : "white",
                      color: isDarkMode ? "#fff" : "#333"
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "5px",
                    fontWeight: "600",
                    color: isDarkMode ? "#fff" : "#555"
                  }}>
                    Estado *
                  </label>
                  <select
                    value={nuevoEstado}
                    onChange={(e) => setNuevoEstado(e.target.value)}
                    required
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "6px",
                      border: isDarkMode ? "2px solid #3d3d3d" : "2px solid #e0e0e0",
                      fontSize: "1rem",
                      background: isDarkMode ? "#2d2d2d" : "white",
                      color: isDarkMode ? "#fff" : "#333"
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Presente">✅ Presente</option>
                    <option value="Ausente">❌ Ausente</option>
                    <option value="Tiene Excusa">📝 Tiene Excusa</option>
                  </select>
                </div>

                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "5px",
                    fontWeight: "600",
                    color: isDarkMode ? "#fff" : "#555"
                  }}>
                    Asignatura (Opcional)
                  </label>
                  <select
                    value={nuevaAsignatura}
                    onChange={(e) => setNuevaAsignatura(e.target.value)}
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "6px",
                      border: isDarkMode ? "2px solid #3d3d3d" : "2px solid #e0e0e0",
                      fontSize: "1rem",
                      background: isDarkMode ? "#2d2d2d" : "white",
                      color: isDarkMode ? "#fff" : "#333"
                    }}
                  >
                    <option value="">Sin asignar</option>
                    <option value="Matemáticas">📐 Matemáticas</option>
                    <option value="Física">⚛️ Física</option>
                    <option value="Programación">💻 Programación</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowNuevoForm(false);
                    setNuevoEstudiante("");
                    setNuevoEstado("");
                    setNuevaAsignatura("");
                  }}
                  disabled={saving}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#9e9e9e",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    fontWeight: "600"
                  }}
                >
                  {saving ? "Guardando..." : "💾 Guardar Asistencia"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filtros */}
        <div style={{
          background: isDarkMode ? "#2d2d2d" : "white",
          padding: "15px",
          borderRadius: "10px",
          marginBottom: "20px",
          boxShadow: isDarkMode ? "0 2px 8px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.08)",
          border: isDarkMode ? "1px solid #3d3d3d" : "none"
        }}>
          <div style={{ 
            display: "flex",
            gap: "15px",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <strong style={{ color: isDarkMode ? "#aaa" : "#555" }}>Filtrar por asignatura:</strong>
            
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "5px",
              cursor: "pointer",
              padding: "8px 15px",
              borderRadius: "20px",
              background: filtroAsignatura === null 
                ? (isDarkMode ? "#4db6ac" : "#e3f2fd")
                : "transparent",
              transition: "all 0.3s",
              color: isDarkMode ? "#fff" : "#333"
            }}>
              <input
                type="radio"
                name="filtro"
                checked={filtroAsignatura === null}
                onChange={() => setFiltroAsignatura(null)}
                style={{ accentColor: "#2196F3" }}
              />
              <span style={{ fontWeight: filtroAsignatura === null ? "600" : "400" }}>
                Todas ({asistencias.length})
              </span>
            </label>

            {["Matemáticas", "Física", "Programación"].map((asignatura) => {
              const count = asistencias.filter(a => a.asignatura === asignatura).length;
              return (
                <label 
                  key={asignatura}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "5px",
                    cursor: "pointer",
                    padding: "8px 15px",
                    borderRadius: "20px",
                    background: filtroAsignatura === asignatura 
                      ? (isDarkMode ? "#4db6ac" : "#e3f2fd")
                      : "transparent",
                    transition: "all 0.3s",
                    color: isDarkMode ? "#fff" : "#333"
                  }}
                >
                  <input
                    type="radio"
                    name="filtro"
                    value={asignatura}
                    checked={filtroAsignatura === asignatura}
                    onChange={(e) => setFiltroAsignatura(e.target.value)}
                    style={{ accentColor: "#2196F3" }}
                  />
                  <span style={{ fontWeight: filtroAsignatura === asignatura ? "600" : "400" }}>
                    {asignatura} ({count})
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Tabla de Asistencias */}
        {asistenciasFiltradas.length === 0 ? (
          <div style={{
            background: isDarkMode ? "#2d2d2d" : "white",
            padding: "60px 20px",
            borderRadius: "12px",
            textAlign: "center",
            boxShadow: isDarkMode ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.1)",
            border: isDarkMode ? "1px solid #3d3d3d" : "none"
          }}>
            <div style={{ fontSize: "4rem", marginBottom: "20px" }}>📭</div>
            <h3 style={{ color: isDarkMode ? "#fff" : "#666", marginBottom: "10px" }}>
              No hay asistencias registradas
            </h3>
            <p style={{ color: isDarkMode ? "#aaa" : "#999" }}>
              {filtroAsignatura 
                ? `No hay registros para ${filtroAsignatura}`
                : "Comienza registrando tu primera asistencia"
              }
            </p>
            {filtroAsignatura && (
              <button
                onClick={() => setFiltroAsignatura(null)}
                style={{
                  marginTop: "20px",
                  padding: "10px 20px",
                  backgroundColor: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Ver todas las asistencias
              </button>
            )}
          </div>
        ) : (
          <div style={{
            background: isDarkMode ? "#2d2d2d" : "white",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: isDarkMode ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.1)",
            border: isDarkMode ? "1px solid #3d3d3d" : "none"
          }}>
            <AsistenciaTable
              asistencias={asistenciasFiltradas}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </div>
        )}
      </div>

      {/* Estilos para animaciones */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}