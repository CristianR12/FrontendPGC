// ============================================
// src/pages/HomePage.tsx
// HOME COMPLETO: Estadísticas + CRUD de Asistencias
// ============================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { HeaderWithSidebar } from "../components/HeaderWithSidebar";
import { Header } from "../components/Header";
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
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [filtroAsignatura, setFiltroAsignatura] = useState<string | null>(null);
  
  // Estado para nuevo registro
  const [showNuevoForm, setShowNuevoForm] = useState(false);
  const [nuevoEstudiante, setNuevoEstudiante] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [nuevaAsignatura, setNuevaAsignatura] = useState("");
  const [saving, setSaving] = useState(false);

  // Notificaciones
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });
  };

  // Estadísticas calculadas
  const stats = {
    totalAsistencias: asistencias.length,
    presentes: asistencias.filter(a => a.estadoAsistencia === "Presente").length,
    ausentes: asistencias.filter(a => a.estadoAsistencia === "Ausente").length,
    conExcusa: asistencias.filter(a => a.estadoAsistencia === "Tiene Excusa").length,
    tasaAsistencia: asistencias.length > 0 
      ? ((asistencias.filter(a => a.estadoAsistencia === "Presente").length / asistencias.length) * 100).toFixed(1)
      : 0
  };

  // Asistencias filtradas
  const asistenciasFiltradas = filtroAsignatura
    ? asistencias.filter(a => a.asignatura === filtroAsignatura)
    : asistencias;

  useEffect(() => {
    console.log('🔄 HomePage montado, cargando asistencias...');
    cargarAsistencias();
  }, []);

  // ============================================
  // CARGAR ASISTENCIAS
  // ============================================
  const cargarAsistencias = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Llamando a asistenciaService.getAll()...');
      const data = await asistenciaService.getAll();
      
      console.log('✅ Asistencias cargadas:', data.length);
      setAsistencias(data);
      
    } catch (err: any) {
      console.error("❌ Error al cargar asistencias:", err);
      const mensaje = err.message || "No se pudieron cargar las asistencias";
      setError(mensaje);
      showNotification(mensaje, 'error');
    } finally {
      setLoading(false);
    }
  };
    
  // ============================================
  // CREAR NUEVA ASISTENCIA
  // ============================================
  const handleCrearAsistencia = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nuevoEstudiante || !nuevoEstado) {
      showNotification('Por favor completa todos los campos requeridos', 'error');
      return;
    }

    setSaving(true);
    try {
      console.log('🔄 Creando nueva asistencia...');
      
      await asistenciaService.create({
        estudiante: nuevoEstudiante,
        estadoAsistencia: nuevoEstado,
        asignatura: nuevaAsignatura || undefined,
      });

      showNotification('✅ Asistencia registrada correctamente', 'success');
      
      // Limpiar formulario
      setNuevoEstudiante("");
      setNuevoEstado("");
      setNuevaAsignatura("");
      setShowNuevoForm(false);
      
      // Recargar lista
      await cargarAsistencias();
      
    } catch (err: any) {
      console.error('❌ Error al crear asistencia:', err);
      showNotification(err.message || 'Error al crear asistencia', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // EDITAR ASISTENCIA
  // ============================================
  const handleEdit = (id: string) => {
    console.log('✏️ Editando asistencia ID:', id);
    navigate(`/asistencias/editar/${id}`);
  };

  // ============================================
  // ELIMINAR ASISTENCIA
  // ============================================
  const handleDelete = async (id: string) => {
    const asistencia = asistencias.find(a => a.id === id);
    
    if (!asistencia) {
      showNotification('Asistencia no encontrada', 'error');
      return;
    }

    const confirmacion = window.confirm(
      `¿Estás seguro de eliminar la asistencia de ${asistencia.estudiante}?\n\n` +
      `Estado: ${asistencia.estadoAsistencia}\n` +
      `Asignatura: ${asistencia.asignatura || 'N/A'}`
    );

    if (!confirmacion) return;

    try {
      console.log('🗑️ Eliminando asistencia ID:', id);
      await asistenciaService.delete(id);
      
      showNotification('✅ Asistencia eliminada correctamente', 'success');
      await cargarAsistencias();
      
    } catch (err: any) {
      console.error('❌ Error al eliminar:', err);
      showNotification(err.message || 'Error al eliminar asistencia', 'error');
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
      console.log('✅ Sesión cerrada');
      navigate("/");
    } catch (err) {
      console.error("❌ Error al cerrar sesión:", err);
    }
  };

  // ============================================
  // RENDER LOADING
  // ============================================
  if (loading) {
    return <LoadingSpinner message="Cargando sistema de asistencias..." />;
  }

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
      
      <div style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* ============================================
            SECCIÓN 1: BIENVENIDA Y ESTADÍSTICAS
            ============================================ */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "30px",
          borderRadius: "15px",
          marginBottom: "30px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
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

        {/* ============================================
            SECCIÓN 2: ACCIONES RÁPIDAS
            ============================================ */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "15px"
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

        {/* ============================================
            SECCIÓN 3: FORMULARIO NUEVA ASISTENCIA
            ============================================ */}
        {showNuevoForm && (
          <div style={{
            background: "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            marginBottom: "30px",
            animation: "slideDown 0.3s ease-out"
          }}>
            <h3 style={{ marginBottom: "20px", color: "#2b7a78" }}>
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
                    color: "#555"
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
                      border: "2px solid #e0e0e0",
                      fontSize: "1rem"
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "5px",
                    fontWeight: "600",
                    color: "#555"
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
                      border: "2px solid #e0e0e0",
                      fontSize: "1rem"
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
                    color: "#555"
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
                      border: "2px solid #e0e0e0",
                      fontSize: "1rem"
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

        {/* ============================================
            SECCIÓN 4: FILTROS
            ============================================ */}
        <div style={{
          background: "white",
          padding: "15px",
          borderRadius: "10px",
          marginBottom: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
        }}>
          <div style={{ 
            display: "flex",
            gap: "15px",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <strong style={{ color: "#555" }}>Filtrar por asignatura:</strong>
            
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "5px",
              cursor: "pointer",
              padding: "8px 15px",
              borderRadius: "20px",
              background: filtroAsignatura === null ? "#e3f2fd" : "transparent",
              transition: "all 0.3s"
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
                    background: filtroAsignatura === asignatura ? "#e3f2fd" : "transparent",
                    transition: "all 0.3s"
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

        {/* ============================================
            SECCIÓN 5: TABLA DE ASISTENCIAS
            ============================================ */}
        {asistenciasFiltradas.length === 0 ? (
          <div style={{
            background: "white",
            padding: "60px 20px",
            borderRadius: "12px",
            textAlign: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: "4rem", marginBottom: "20px" }}>📭</div>
            <h3 style={{ color: "#666", marginBottom: "10px" }}>
              No hay asistencias registradas
            </h3>
            <p style={{ color: "#999" }}>
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
            background: "white",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
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