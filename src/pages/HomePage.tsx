// src/pages/HomePage.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { 
  Plus, 
  RefreshCw, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  Clipboard,
  ListChecks,
  CheckCircle2,
  AlertCircle,
  PenTool,
  AreaChart
} from 'lucide-react';
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";
import { AsistenciaTable } from "../components/AsistenciaTable";
import { Toast } from "../components/Toast";
import { CalendarioHorariosEditable } from "../components/CalendarioHorariosEditable";
import asistenciaService from "../services/asistenciaService";
import horarioApiService from "../services/horarioApiService";
import type { Asistencia } from "../services/asistenciaService";
import type { Course } from "../services/horarioApiService";
import { getAuth } from "firebase/auth";
import { Header } from "../components/Header";
import { db } from '../firebaseConfig';
import { computeVistaRowsLocal } from "../utils/vistaInicioAsistencias";

export function HomePage() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [vistaInicioAsistencias, setVistaInicioAsistencias] = useState<Asistencia[]>([]);
  const [loadingVistaInicio, setLoadingVistaInicio] = useState(false);
  const [nombresEstudiantes, setNombresEstudiantes] = useState<Record<string, string>>({});
  const [filtroAsignatura, setFiltroAsignatura] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [showNuevoForm, setShowNuevoForm] = useState(false);
  const [nuevoEstudiante, setNuevoEstudiante] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [nuevaAsignatura, setNuevaAsignatura] = useState("");
  const [saving, setSaving] = useState(false);

  // Estados para el sistema de horarios
  const [userType, setUserType] = useState<'Estudiante' | 'Profesor' | null>(null);
  const [loadingUserType, setLoadingUserType] = useState(true);
  const [cursos, setCursos] = useState<Course[]>([]);
  const [, setLoadingHorario] = useState(true);
  const [nombrePersona, setNombrePersona] = useState<string>('');

  // Array de asignaturas únicas extraídas de las asistencias
  const [asignaturasDisponibles, setAsignaturasDisponibles] = useState<string[]>([]);

  const asistenciasRef = useRef<Asistencia[]>([]);
  const cursosRef = useRef<Course[]>([]);

  useEffect(() => {
    asistenciasRef.current = asistencias;
  }, [asistencias]);

  useEffect(() => {
    cursosRef.current = cursos;
  }, [cursos]);

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

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Cargar tipo de usuario y horario
  useEffect(() => {
    const cargarDatos = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoadingUserType(false);
        setLoadingHorario(false);
        return;
      }

      try {
        setLoadingUserType(true);
        setLoadingHorario(true);

        // 🔥 USAR QUERY EN LUGAR DE doc(db, 'person', uid)
        const personsRef = collection(db, 'person');
        const q = query(personsRef, where('profesorUID', '==', user.uid), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const personDoc = querySnapshot.docs[0];
          const data = personDoc.data();
          setUserType(data.type);
          setNombrePersona(data.namePerson || 'Usuario');

          console.log('✅ Usuario encontrado:', data.namePerson, '- Tipo:', data.type);

          // Cargar horario según tipo de usuario
          let cursosData: Course[];
          if (data.type === 'Profesor') {
            cursosData = await horarioApiService.getHorariosProfesor();
          } else {
            cursosData = await horarioApiService.getHorarioEstudiante();
          }
          setCursos(cursosData);
        } else {
          console.warn('⚠️ No se encontró documento en person para UID:', user.uid);
          showNotification('Usuario no registrado en el sistema', 'error');
        }
      } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        showNotification('Error al cargar información del usuario', 'error');
      } finally {
        setLoadingUserType(false);
        setLoadingHorario(false);
      }
    };

    cargarDatos();
  }, [auth.currentUser]);


  // Extraer asignaturas únicas cuando se cargan las asistencias
  useEffect(() => {
    const asignaturasUnicas = Array.from(
      new Set(asistencias.map(a => a.asignatura).filter(Boolean))
    ).sort();
    setAsignaturasDisponibles(asignaturasUnicas as string[]);
  }, [asistencias]);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });
  };

  const stats = {
    totalAsistencias: vistaInicioAsistencias.length,
    presentes: vistaInicioAsistencias.filter(a => a.estadoAsistencia === "Presente").length,
    ausentes: vistaInicioAsistencias.filter(a => a.estadoAsistencia === "Ausente").length,
    conExcusa: vistaInicioAsistencias.filter(a => a.estadoAsistencia === "Tiene Excusa").length,
    tasaAsistencia: vistaInicioAsistencias.length > 0
      ? ((vistaInicioAsistencias.filter(a => a.estadoAsistencia === "Presente").length / vistaInicioAsistencias.length) * 100).toFixed(1)
      : 0
  };

  useEffect(() => {
    cargarAsistencias();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!filtroAsignatura) {
        if (!cancelled) {
          setVistaInicioAsistencias([]);
          setLoadingVistaInicio(false);
        }
        return;
      }
      setLoadingVistaInicio(true);
      try {
        const rows = await asistenciaService.getVistaInicio(filtroAsignatura);
        if (cancelled) return;
        setVistaInicioAsistencias(rows);
        const cedulas = [...new Set(rows.map((a) => a.estudiante))];
        if (cedulas.length > 0) {
          const nombres = await asistenciaService.getNombresEstudiantes(cedulas);
          if (!cancelled) setNombresEstudiantes((prev) => ({ ...prev, ...nombres }));
        }
      } catch {
        if (!cancelled) {
          setVistaInicioAsistencias(
            computeVistaRowsLocal(asistenciasRef.current, cursosRef.current, filtroAsignatura)
          );
        }
      } finally {
        if (!cancelled) setLoadingVistaInicio(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtroAsignatura, asistencias]);

  const cargarAsistencias = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Obtener asistencias
      const data = await asistenciaService.getAll();
      setAsistencias(data);
      console.log('✅ Asistencias cargadas:', data.length);

      // 2. Extraer cédulas únicas
      const cedulasUnicas = [...new Set(data.map(a => a.estudiante))];
      console.log('📋 Cédulas únicas encontradas:', cedulasUnicas.length);

      // 3. Obtener nombres en batch (paralelo)
      if (cedulasUnicas.length > 0) {
        const nombres = await asistenciaService.getNombresEstudiantes(cedulasUnicas);
        setNombresEstudiantes(nombres);
        console.log('✅ Nombres cargados:', Object.keys(nombres).length);
      }

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

    if (!nuevaAsignatura) {
      showNotification('Por favor selecciona una asignatura', 'error');
      return;
    }

    setSaving(true);
    try {
      await asistenciaService.create({
        estudiante: nuevoEstudiante,
        estadoAsistencia: nuevoEstado,
        asignatura: nuevaAsignatura,
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
    const asistencia = asistencias.find(a => a.id === id) ?? vistaInicioAsistencias.find(a => a.id === id);

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

  const handleUpdateHorario = async () => {
    try {
      const user = auth.currentUser;
      if (user && userType) {
        let cursosData: Course[];
        if (userType === 'Profesor') {
          cursosData = await horarioApiService.getHorariosProfesor();
        } else {
          cursosData = await horarioApiService.getHorarioEstudiante();
        }
        setCursos(cursosData);
      }
    } catch (error) {
      console.error('Error al actualizar horario:', error);
      showNotification('Error al actualizar horario', 'error');
    }
  };

  if (loading || loadingUserType) {
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
      <Header title="Revisa como van tus asistencias" showLogout={false} />

      <div style={{ padding: "20px", maxWidth: "1600px", margin: "0 auto" }}>

        {/* Sección de bienvenida - CENTRADA SIN BOTONES */}
        <div style={{
          background: isDarkMode
            ? "linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)"
            : "linear-gradient(135deg, #667eea 0%, #16dd0fff 100%)",
          color: "white",
          padding: "30px",
          borderRadius: "15px",
          marginBottom: "30px",
          boxShadow: isDarkMode
            ? "0 4px 15px rgba(0,0,0,0.5)"
            : "0 4px 15px rgba(0,0,0,0.2)",
          border: isDarkMode ? "1px solid #3d3d3d" : "none",
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <h2 style={{
              marginBottom: "0px",
              fontSize: "2rem",
            }}>
              Bienvenido, {nombrePersona}
            </h2>
            <p style={{ fontSize: "1.1rem", opacity: 0.9, margin: 0 }}>
              Sistema de Control de Asistencias {userType && `• ${userType}`}
            </p>
          </div>
        </div>

        {/* CALENDARIO DE HORARIOS INTERACTIVO */}
        {userType && cursos.length > 0 && (
          <CalendarioHorariosEditable
            courses={cursos}
            isEditable={userType === 'Profesor'}
            isDarkMode={isDarkMode}
            onUpdate={handleUpdateHorario}
          />
        )}

        {filtroAsignatura ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "40px"
        }}>
          {/* Total de Registros */}
          <div style={{
            background: isDarkMode ? "#2d2d2d" : "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: isDarkMode ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.1)",
            border: isDarkMode ? "1px solid #3d3d3d" : "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            transition: "transform 0.3s",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div>
              <p style={{ margin: "0 0 10px 0", color: isDarkMode ? "#aaa" : "#666", fontSize: "0.9rem" }}>Total de Registros</p>
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#4CAF50" }}>{stats.totalAsistencias}</p>
            </div>
            <ListChecks size={40} color="#4CAF50" strokeWidth={1.5} />
          </div>

          {/* Presentes */}
          <div style={{
            background: isDarkMode ? "#2d2d2d" : "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: isDarkMode ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.1)",
            border: isDarkMode ? "1px solid #3d3d3d" : "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            transition: "transform 0.3s",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div>
              <p style={{ margin: "0 0 10px 0", color: isDarkMode ? "#aaa" : "#666", fontSize: "0.9rem" }}>Presentes</p>
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#2196F3" }}>{stats.presentes}</p>
            </div>
            <CheckCircle2 size={40} color="#2196F3" strokeWidth={1.5} />
          </div>

          {/* Ausentes */}
          <div style={{
            background: isDarkMode ? "#2d2d2d" : "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: isDarkMode ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.1)",
            border: isDarkMode ? "1px solid #3d3d3d" : "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            transition: "transform 0.3s",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div>
              <p style={{ margin: "0 0 10px 0", color: isDarkMode ? "#aaa" : "#666", fontSize: "0.9rem" }}>Ausentes</p>
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#f44336" }}>{stats.ausentes}</p>
            </div>
            <AlertCircle size={40} color="#f44336" strokeWidth={1.5} />
          </div>

          {/* Con Excusa */}
          <div style={{
            background: isDarkMode ? "#2d2d2d" : "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: isDarkMode ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.1)",
            border: isDarkMode ? "1px solid #3d3d3d" : "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            transition: "transform 0.3s",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div>
              <p style={{ margin: "0 0 10px 0", color: isDarkMode ? "#aaa" : "#666", fontSize: "0.9rem" }}>Con Excusa</p>
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#c178ce" }}>{stats.conExcusa}</p>
            </div>
            <PenTool size={40} color="#c178ce" strokeWidth={1.5} />
          </div>

          {/* Tasa de Asistencia */}
          <div style={{
            background: isDarkMode ? "#2d2d2d" : "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: isDarkMode ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.1)",
            border: isDarkMode ? "1px solid #3d3d3d" : "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            transition: "transform 0.3s",
            cursor: "pointer"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div>
              <p style={{ margin: "0 0 10px 0", color: isDarkMode ? "#aaa" : "#666", fontSize: "0.9rem" }}>Tasa de Asistencia</p>
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: "bold", color: "#9C27B0" }}>{stats.tasaAsistencia}%</p>
            </div>
            <AreaChart size={40} color="#9C27B0" strokeWidth={1.5} />
          </div>
        </div>
        ) : (
        <div style={{
          marginBottom: "40px",
          padding: "20px",
          borderRadius: "12px",
          background: isDarkMode ? "#2d2d2d" : "#f5f5f5",
          border: isDarkMode ? "1px solid #3d3d3d" : "1px solid #e0e0e0",
          color: isDarkMode ? "#ccc" : "#555",
          textAlign: "center",
        }}>
          Elige una asignatura abajo para ver las estadísticas y la tabla del día en curso o de la última sesión.
        </div>
        )}

        {/* Acciones Rápidas */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "15px"
        }}>
          <h2 style={{ margin: 0, color: isDarkMode ? "#fff" : "#2b7a78", display: "flex", alignItems: "center", gap: "10px" }}>
            <Clipboard size={24} /> Gestión de Asistencias ({filtroAsignatura ? vistaInicioAsistencias.length : "—"})
          </h2>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            

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
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <BarChart3 size={20} /> Generar Reportes
            </button>

            <button
              onClick={cargarAsistencias}
              disabled={loading}
              style={{
                padding: "12px 24px",
                fontSize: "1rem",
                backgroundColor: "#c178ce",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.3s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <RefreshCw size={20} /> Actualizar
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
            <h3 style={{ marginBottom: "20px", color: isDarkMode ? "#fff" : "#2b7a78", display: "flex", alignItems: "center", gap: "10px" }}>
              <Plus size={22} /> Registrar Nueva Asistencia
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
                    Cédula del Estudiante *
                  </label>
                  <input
                    type="text"
                    value={nuevoEstudiante}
                    onChange={(e) => setNuevoEstudiante(e.target.value)}
                    placeholder="Ej: 1234567890"
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
                    Asignatura *
                  </label>
                  <select
                    value={nuevaAsignatura}
                    onChange={(e) => setNuevaAsignatura(e.target.value)}
                    disabled={saving}
                    required
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
                    {asignaturasDisponibles.map((asignatura) => (
                      <option key={asignatura} value={asignatura}>
                        📚 {asignatura}
                      </option>
                    ))}
                  </select>
                  {asignaturasDisponibles.length === 0 && (
                    <small style={{ color: isDarkMode ? "#aaa" : "#999", display: "block", marginTop: "5px" }}>
                      No hay asignaturas disponibles. Las asignaturas se cargan desde los cursos en Firebase.
                    </small>
                  )}
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
                    opacity: saving ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <XCircle size={18} /> Cancelar
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
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <CheckCircle size={18} /> {saving ? "Guardando..." : "Guardar Asistencia"}
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
            <strong style={{ color: isDarkMode ? "#aaa" : "#555" }}>Ver resumen por asignatura:</strong>

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
                Sin selección
              </span>
            </label>

            {asignaturasDisponibles.map((asignatura) => {
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
                    {asignatura}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Tabla de Asistencias (vista Inicio: solo con asignatura elegida) */}
        {!filtroAsignatura ? (
          <div style={{
            background: isDarkMode ? "#2d2d2d" : "white",
            padding: "40px 20px",
            borderRadius: "12px",
            textAlign: "center",
            boxShadow: isDarkMode ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.1)",
            border: isDarkMode ? "1px solid #3d3d3d" : "none"
          }}>
            <h3 style={{ color: isDarkMode ? "#fff" : "#666", marginBottom: "10px" }}>
              Selecciona una asignatura
            </h3>
            <p style={{ color: isDarkMode ? "#aaa" : "#999", margin: 0 }}>
              Elige un curso arriba para ver la tabla de asistencias del día en ventana o de la última sesión.
            </p>
          </div>
        ) : loadingVistaInicio ? (
          <LoadingSpinner message="Cargando vista de asistencias..." />
        ) : vistaInicioAsistencias.length === 0 ? (
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
              Sin registros en esta vista
            </h3>
            <p style={{ color: isDarkMode ? "#aaa" : "#999", maxWidth: "480px", margin: "0 auto" }}>
              Sin registros para esta asignatura. Habla con un encargado para resolver este problema.
            </p>
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
              asistencias={vistaInicioAsistencias}
              nombresEstudiantes={nombresEstudiantes}
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