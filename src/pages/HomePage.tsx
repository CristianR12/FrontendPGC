// src/pages/HomePage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  RefreshCw, 
  BarChart3, 
  Clipboard,
  ListChecks,
  CheckCircle2,
  AlertCircle,
  PenTool,
  AreaChart,
  Inbox
} from 'lucide-react';
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CursoFormModal } from "../components/CursoFormModal";
import { ErrorMessage } from "../components/ErrorMessage";
import { AsistenciaTable } from "../components/AsistenciaTable";
import { Toast } from "../components/Toast";
import { CalendarioHorariosEditable } from "../components/CalendarioHorariosEditable";
import asistenciaService from "../services/asistenciaService";
import horarioApiService from "../services/horarioApiService";
import type { Asistencia, PaginaAsistencias } from "../services/asistenciaService";
import { EditarAsistenciaModal } from "../components/EditarAsistenciaModal";
import { GenerarReporteModal } from "../components/GenerarReporteModal";
import type { Course } from "../services/horarioApiService";
import { getAuth } from "firebase/auth";
import { Header } from "../components/Header";
import { obtenerEstadoSesion } from '../services/sesionService';
import { todayDateStringBogota } from "../utils/vistaInicioAsistencias";
import { FiltroAsistenciasInicio } from "../components/FiltroAsistenciasInicio";
import { FILTRO_VACIO, hayFiltroDeSesion, unidadSeleccionada } from "../utils/filtroInicio";
import type { FiltroInicio } from "../utils/filtroInicio";

export function HomePage() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [formularioCurso, setFormularioCurso] = useState(false);
  const [reporteAbierto, setReporteAbierto] = useState(false);
  const [asistenciaEditando, setAsistenciaEditando] = useState<Asistencia | null>(null);
  const [datos, setDatos] = useState<PaginaAsistencias | null>(null);
  const [cargandoPagina, setCargandoPagina] = useState(false);
  const [errorPagina, setErrorPagina] = useState<string | null>(null);
  const [fechasAsistencia, setFechasAsistencia] = useState<Set<string>>(new Set());
  const [recarga, setRecarga] = useState(0);
  const [pagina, setPagina] = useState<{ clave: string; n: number }>({ clave: '', n: 1 });
  const [nombresEstudiantes, setNombresEstudiantes] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<FiltroInicio>(FILTRO_VACIO);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Estados para el sistema de horarios
  const [userType, setUserType] = useState<'Estudiante' | 'Profesor' | null>(null);
  const [loadingUserType, setLoadingUserType] = useState(true);
  const [cursos, setCursos] = useState<Course[]>([]);
  // Gestión de cursos desde las tarjetas "Mis Cursos" del calendario

  // Filtro del Inicio: curso o grupo elegido y, si se pidió, una sesión por día o fecha
  const unidadFiltro = unidadSeleccionada(cursos, filtro);
  const modoFiltrado = !!unidadFiltro && hayFiltroDeSesion(filtro);
  const hoy = todayDateStringBogota();
  const unidadId = unidadFiltro?.id ?? null;
  // Al cambiar cualquier filtro se vuelve a la primera página
  const claveFiltro = `${unidadId}|${filtro.dia}|${filtro.fecha}|${filtro.hora}`;
  const paginaActual = pagina.clave === claveFiltro ? pagina.n : 1;
  const filasVista = datos?.filas ?? [];
  const [loadingHorario, setLoadingHorario] = useState(true);
  const [nombrePersona, setNombrePersona] = useState<string>('');

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

        // El rol y el nombre los decide el servidor (no se leen de Firestore desde el navegador)
        const sesion = await obtenerEstadoSesion(user.uid);
        if (sesion.estado === 'activo' && sesion.rol) {
          setUserType(sesion.rol);
          setNombrePersona(sesion.nombre || 'Usuario');

          let cursosData: Course[];
          if (sesion.rol === 'Profesor') {
            cursosData = await horarioApiService.getHorariosProfesor();
          } else {
            cursosData = await horarioApiService.getHorarioEstudiante();
          }
          setCursos(cursosData);
        } else {
          showNotification('Usuario no registrado en el sistema', 'error');
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
        showNotification('Error al cargar información del usuario', 'error');
      } finally {
        setLoadingUserType(false);
        setLoadingHorario(false);
      }
    };

    cargarDatos();
  }, [auth.currentUser]);


  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });
  };

  // El resumen es de TODA la sesión, no solo de la página que se ve
  const resumen = datos?.resumen ?? { total: 0, presentes: 0, ausentes: 0, conExcusa: 0 };
  const stats = {
    totalAsistencias: resumen.total,
    presentes: resumen.presentes,
    ausentes: resumen.ausentes,
    conExcusa: resumen.conExcusa,
    tasaAsistencia: resumen.total > 0 ? ((resumen.presentes / resumen.total) * 100).toFixed(1) : 0
  };

  // Una página de la sesión elegida: el servidor solo envía esa sección, no todo el historial
  useEffect(() => {
    if (!unidadId) {
      setDatos(null);
      setErrorPagina(null);
      setCargandoPagina(false);
      return;
    }
    let cancelado = false;
    setCargandoPagina(true);
    setErrorPagina(null);
    asistenciaService.getPagina({ unidad: unidadId, fecha: filtro.fecha, dia: filtro.dia, hora: filtro.hora, page: paginaActual })
      .then((d) => {
        if (cancelado) return;
        setDatos(d);
        setNombresEstudiantes((prev) => ({ ...prev, ...d.nombres }));
      })
      .catch((e) => {
        if (cancelado) return;
        setDatos(null);
        setErrorPagina(e.message || 'No se pudieron cargar las asistencias');
      })
      .finally(() => {
        if (!cancelado) setCargandoPagina(false);
      });
    return () => { cancelado = true; };
  }, [claveFiltro, paginaActual, recarga]);

  // Fechas con asistencias de la unidad elegida (se marcan en el calendario del filtro)
  useEffect(() => {
    if (!unidadId) {
      setFechasAsistencia(new Set());
      return;
    }
    let cancelado = false;
    asistenciaService.getFechas(unidadId)
      .then((f) => { if (!cancelado) setFechasAsistencia(new Set(f)); })
      .catch(() => undefined);
    return () => { cancelado = true; };
  }, [unidadId, recarga]);

  const handleEdit = (id: string) => {
    const fila = filasVista.find((a) => a.id === id);
    if (fila) setAsistenciaEditando(fila);
  };

  const handleDelete = async (id: string) => {
    const asistencia = filasVista.find(a => a.id === id);

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
      showNotification('Asistencia eliminada correctamente', 'success');
      setRecarga((n) => n + 1);
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

  if (loadingUserType) {
    return <LoadingSpinner message="Cargando sistema de asistencias..." />;
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

      {reporteAbierto && (
        <GenerarReporteModal
          cursos={cursos}
          inicial={{
            curso: filtro.curso,
            unidadId: unidadFiltro?.id ?? filtro.unidadId,
            // Con día o fecha filtrados, el reporte parte de la sesión que estás viendo
            fecha: modoFiltrado ? (datos?.fecha ?? filtro.fecha) : null,
            hora: modoFiltrado ? filtro.hora : null,
          }}
          hoy={hoy}
          oscuro={isDarkMode}
          onCerrar={() => setReporteAbierto(false)}
          onMensaje={showNotification}
        />
      )}

      {asistenciaEditando && (
        <EditarAsistenciaModal
          asistencia={asistenciaEditando}
          nombre={nombresEstudiantes[asistenciaEditando.estudiante]}
          oscuro={isDarkMode}
          onCerrar={() => setAsistenciaEditando(null)}
          onGuardado={(mensaje) => {
            setAsistenciaEditando(null);
            showNotification(mensaje, 'success');
            setRecarga((n) => n + 1);
          }}
        />
      )}

      {formularioCurso && (
        <CursoFormModal
          curso={null}
          onCerrar={() => setFormularioCurso(false)}
          onGuardado={async (mensaje) => {
            setFormularioCurso(false);
            showNotification(mensaje, 'success');
            await handleUpdateHorario();
          }}
        />
      )}

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

        {userType === 'Profesor' && !loadingHorario && cursos.length === 0 && (
          <div style={{
            background: isDarkMode ? '#2a2a3c' : 'white',
            color: isDarkMode ? '#eee' : '#2b2b2b',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <strong style={{ fontSize: '1.1rem' }}>Aún no tienes un horario cargado</strong>
              <p style={{ margin: '4px 0 0', opacity: 0.8 }}>
                Súbelo desde tu PDF de Academusoft o un Excel, o agrégalo manualmente.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setFormularioCurso(true)}
                style={{ ...{
                height: '42px',
                padding: '0 22px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }, background: 'var(--color-primary)', color: 'white' }}
              >
                Crear curso
              </button>
              <button
                onClick={() => navigate('/gestion-horarios')}
                style={{ ...{
                height: '42px',
                padding: '0 22px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }, background: 'var(--color-uni-suave)', color: 'var(--color-primary)' }}
              >
                Subir mi horario
              </button>
            </div>
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
            <Clipboard size={24} /> Gestión de Asistencias ({unidadId && datos ? datos.resumen.total : "—"})
          </h2>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            

            {userType === 'Profesor' && (
            <button
              onClick={() => setReporteAbierto(true)}
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
            )}

            <button
              onClick={() => setRecarga((n) => n + 1)}
              disabled={cargandoPagina}
              style={{
                padding: "12px 24px",
                fontSize: "1rem",
                backgroundColor: "#c178ce",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: cargandoPagina ? "not-allowed" : "pointer",
                opacity: cargandoPagina ? 0.6 : 1,
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

        {/* Filtro: curso, grupo, día, fecha y hora (solo lo que tuvo clase) */}
        <FiltroAsistenciasInicio
          cursos={cursos}
          fechasConAsistencia={fechasAsistencia}
          filtro={filtro}
          onChange={setFiltro}
          oscuro={isDarkMode}
          hoy={hoy}
          fechaSesion={datos?.fecha ?? null}
          fueraDeFranja={datos?.fueraDeFranja ?? 0}
        />

        {/* Resumen de lo que muestra la tabla: cambia con el curso, el grupo, el día, la fecha y la hora */}
        {unidadId && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "20px"
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
        )}

        {/* Tabla de Asistencias (vista Inicio: solo con asignatura elegida) */}
        {!unidadId ? (
          <div style={{
            background: isDarkMode ? "#2d2d2d" : "white",
            padding: "40px 20px",
            borderRadius: "12px",
            textAlign: "center",
            boxShadow: isDarkMode ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.1)",
            border: isDarkMode ? "1px solid #3d3d3d" : "none"
          }}>
            <h3 style={{ color: isDarkMode ? "#fff" : "#666", marginBottom: "10px" }}>
              Selecciona un curso
            </h3>
            <p style={{ color: isDarkMode ? "#aaa" : "#999", margin: 0 }}>
              Elige un curso arriba para ver la tabla de asistencias de la sesión en curso o de la última sesión.
            </p>
          </div>
        ) : errorPagina ? (
          <ErrorMessage message={errorPagina} onRetry={() => setRecarga((n) => n + 1)} />
        ) : !datos ? (
          <LoadingSpinner message="Cargando asistencias..." />
        ) : filasVista.length === 0 && !cargandoPagina ? (
          <div style={{
            background: isDarkMode ? "#2d2d2d" : "white",
            padding: "60px 20px",
            borderRadius: "12px",
            textAlign: "center",
            boxShadow: isDarkMode ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.1)",
            border: isDarkMode ? "1px solid #3d3d3d" : "none"
          }}>
            <Inbox size={64} strokeWidth={1.5} style={{ marginBottom: "20px", opacity: 0.6 }} />
            <h3 style={{ color: isDarkMode ? "#fff" : "#666", marginBottom: "10px" }}>
              Sin registros en esta vista
            </h3>
            <p style={{ color: isDarkMode ? "#aaa" : "#999", maxWidth: "480px", margin: "0 auto" }}>
              {modoFiltrado ? 'No hay asistencias registradas para esa sesión.' : 'Sin registros para esta asignatura. Habla con un encargado para resolver este problema.'}
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
              asistencias={filasVista}
              nombresEstudiantes={nombresEstudiantes}
              onDelete={handleDelete}
              onEdit={handleEdit}
              soloLectura={userType === 'Estudiante'}
              paginacion={{
                pagina: datos.page,
                totalPaginas: datos.totalPaginas,
                total: datos.resumen.total,
                cargando: cargandoPagina,
                onCambiar: (n) => setPagina({ clave: claveFiltro, n }),
              }}
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