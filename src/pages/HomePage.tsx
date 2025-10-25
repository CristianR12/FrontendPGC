// src/pages/HomePage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { doc, getDoc } from 'firebase/firestore';
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";
import { DashboardCard } from "../components/DashboardCard";
import { AsistenciaTable } from "../components/AsistenciaTable";
import { Toast } from "../components/Toast";
import asistenciaService from "../services/asistenciaService";
import type { Asistencia } from "../services/asistenciaService";
import { getAuth } from "firebase/auth";
import { Header } from "../components/Header";
import { db } from '../firebaseConfig';
import firebaseHorarioService from '../services/firebaseHorarioService';
import type { Course } from '../services/firebaseHorarioService';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, User } from 'lucide-react';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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

  // Estados para el sistema de horarios
  const [userType, setUserType] = useState<'Estudiante' | 'Profesor' | null>(null);
  const [loadingUserType, setLoadingUserType] = useState(true);
  const [cursos, setCursos] = useState<Course[]>([]);
  const [loadingHorario, setLoadingHorario] = useState(true);
  const [diaSeleccionado, setDiaSeleccionado] = useState(obtenerDiaActual());

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
        
        const personDoc = await getDoc(doc(db, 'person', user.uid));
        
        if (personDoc.exists()) {
          const data = personDoc.data();
          setUserType(data.type);
          
          // Cargar horario según tipo de usuario
          let cursosData: Course[];
          if (data.type === 'Profesor') {
            cursosData = await firebaseHorarioService.getHorarioProfesor(user.uid);
          } else {
            cursosData = await firebaseHorarioService.getHorarioEstudiante(user.uid);
          }
          setCursos(cursosData);
        }
      } catch (error) {
        console.error('❌ Error al cargar datos:', error);
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

  // Obtener clases del día seleccionado
  const obtenerClasesDia = (dia: string) => {
    const horarioPorDia = firebaseHorarioService.organizarHorarioPorDias(cursos);
    return horarioPorDia[dia] || [];
  };

  const clasesDia = obtenerClasesDia(diaSeleccionado);
  const horaActual = new Date().getHours() * 60 + new Date().getMinutes();

  const esClaseActual = (iniTime: string, endTime: string) => {
    if (diaSeleccionado !== obtenerDiaActual()) return false;
    const [hIni, mIni] = iniTime.split(':').map(Number);
    const [hFin, mFin] = endTime.split(':').map(Number);
    const inicio = hIni * 60 + mIni;
    const fin = hFin * 60 + mFin;
    return horaActual >= inicio && horaActual <= fin;
  };

  const cambiarDia = (direccion: number) => {
    const indexActual = DIAS_SEMANA.indexOf(diaSeleccionado);
    const nuevoIndex = (indexActual + direccion + DIAS_SEMANA.length) % DIAS_SEMANA.length;
    setDiaSeleccionado(DIAS_SEMANA[nuevoIndex]);
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
        
        {/* Sección de bienvenida */}
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
          border: isDarkMode ? "1px solid #3d3d3d" : "none"
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <div>
              <h2 style={{ 
                marginBottom: "10px", 
                fontSize: "2rem",
              }}>
                👋 Bienvenido, {auth.currentUser?.displayName || auth.currentUser?.email}
              </h2>
              <p style={{ fontSize: "1.1rem", opacity: 0.9, margin: 0 }}>
                Sistema de Control de Asistencias {userType && `• ${userType}`}
              </p>
            </div>

            {/* Botones de navegación rápida */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/horario-completo')}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                📅 Ver Horario Completo
              </button>

              {userType === 'Profesor' && (
                <button
                  onClick={() => navigate('/gestion-horarios')}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  ⚙️ Gestionar Horarios
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* TABLA DE HORARIO INTERACTIVA - AL INICIO */}
        {/* ============================================ */}
        {userType && (
          <div style={{
            background: isDarkMode ? '#2d2d2d' : 'white',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '40px',
            boxShadow: isDarkMode 
              ? '0 10px 40px rgba(0,0,0,0.5)' 
              : '0 10px 40px rgba(0,0,0,0.1)',
            border: isDarkMode ? '1px solid #3d3d3d' : 'none'
          }}>
            {/* Header del Horario */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              flexWrap: 'wrap',
              gap: '15px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '15px',
                  borderRadius: '15px'
                }}>
                  <Calendar size={32} color="white" />
                </div>
                <div>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: '1.8rem', 
                    color: isDarkMode ? '#fff' : '#2b2b2b' 
                  }}>
                    Mi Horario de Clases
                  </h2>
                  <p style={{ 
                    margin: '5px 0 0 0', 
                    color: isDarkMode ? '#aaa' : '#666',
                    fontSize: '1rem'
                  }}>
                    {cursos.length} {cursos.length === 1 ? 'curso' : 'cursos'} • {clasesDia.length} {clasesDia.length === 1 ? 'clase' : 'clases'} hoy
                  </p>
                </div>
              </div>

              {/* Selector de día */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: isDarkMode ? '#1e1e1e' : '#f5f5f5',
                padding: '10px 15px',
                borderRadius: '12px'
              }}>
                <button
                  onClick={() => cambiarDia(-1)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDarkMode ? '#3d3d3d' : '#e0e0e0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <ChevronLeft size={24} color={isDarkMode ? '#fff' : '#666'} />
                </button>

                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: isDarkMode ? '#fff' : '#2b2b2b',
                  minWidth: '120px',
                  textAlign: 'center'
                }}>
                  {diaSeleccionado}
                </div>

                <button
                  onClick={() => cambiarDia(1)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDarkMode ? '#3d3d3d' : '#e0e0e0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <ChevronRight size={24} color={isDarkMode ? '#fff' : '#666'} />
                </button>
              </div>
            </div>

            {/* Tabla de Horario */}
            {loadingHorario ? (
              <div style={{ 
                padding: '60px', 
                textAlign: 'center',
                color: isDarkMode ? '#aaa' : '#666'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '15px' }}>⏳</div>
                <p>Cargando horario...</p>
              </div>
            ) : clasesDia.length === 0 ? (
              <div style={{
                padding: '60px',
                textAlign: 'center',
                background: isDarkMode ? '#1e1e1e' : '#f9f9f9',
                borderRadius: '15px',
                border: `2px dashed ${isDarkMode ? '#3d3d3d' : '#ddd'}`
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>📅</div>
                <h3 style={{ 
                  color: isDarkMode ? '#fff' : '#666',
                  marginBottom: '10px'
                }}>
                  No hay clases programadas
                </h3>
                <p style={{ color: isDarkMode ? '#aaa' : '#999' }}>
                  Disfruta tu día libre el {diaSeleccionado}
                </p>
                {userType === 'Profesor' && (
                  <button
                    onClick={() => navigate('/gestion-horarios')}
                    style={{
                      marginTop: '20px',
                      padding: '12px 24px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}
                  >
                    Gestionar Horarios
                  </button>
                )}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '15px'
              }}>
                {clasesDia.map((clase: any, index: number) => {
                  const esActual = esClaseActual(clase.iniTime, clase.endTime);
                  const color = firebaseHorarioService.generarColor(index);
                  
                  return (
                    <div
                      key={index}
                      style={{
                        background: esActual 
                          ? `linear-gradient(135deg, ${color}30 0%, ${color}15 100%)`
                          : isDarkMode ? '#1e1e1e' : '#f9f9f9',
                        border: `3px solid ${esActual ? color : (isDarkMode ? '#3d3d3d' : '#e0e0e0')}`,
                        borderRadius: '15px',
                        padding: '25px',
                        position: 'relative',
                        transition: 'all 0.3s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateX(5px)';
                        e.currentTarget.style.boxShadow = `0 8px 25px ${color}40`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Indicador de clase actual */}
                      {esActual && (
                        <div style={{
                          position: 'absolute',
                          top: '15px',
                          right: '15px',
                          background: color,
                          color: 'white',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          animation: 'pulse 2s infinite'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'white',
                            animation: 'blink 1s infinite'
                          }} />
                          EN CURSO
                        </div>
                      )}

                      {/* Barra de color lateral */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '6px',
                        background: color,
                        borderRadius: '15px 0 0 15px'
                      }} />

                      <div style={{ 
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto',
                        gap: '25px',
                        alignItems: 'center'
                      }}>
                        {/* Horario */}
                        <div style={{ textAlign: 'center', minWidth: '100px' }}>
                          <div style={{
                            fontSize: '1.8rem',
                            fontWeight: '700',
                            color: color,
                            marginBottom: '5px'
                          }}>
                            {clase.iniTime}
                          </div>
                          <div style={{
                            fontSize: '0.9rem',
                            color: isDarkMode ? '#aaa' : '#999'
                          }}>
                            {clase.endTime}
                          </div>
                        </div>

                        {/* Información del curso */}
                        <div>
                          <h3 style={{
                            margin: '0 0 10px 0',
                            fontSize: '1.4rem',
                            color: isDarkMode ? '#fff' : '#2b2b2b',
                            fontWeight: '700'
                          }}>
                            {clase.curso}
                          </h3>
                          
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '15px',
                            fontSize: '0.95rem',
                            color: isDarkMode ? '#aaa' : '#666'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin size={16} color={color} />
                              <span style={{ fontWeight: '600' }}>{clase.classroom}</span>
                            </div>
                            
                            {clase.group && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={16} color={color} />
                                <span>Grupo {clase.group}</span>
                              </div>
                            )}

                            <div style={{
                              background: `${color}20`,
                              padding: '4px 12px',
                              borderRadius: '8px',
                              color: color,
                              fontWeight: '600',
                              fontSize: '0.85rem'
                            }}>
                              {Math.floor((parseInt(clase.endTime.split(':')[0]) * 60 + parseInt(clase.endTime.split(':')[1]) - 
                                parseInt(clase.iniTime.split(':')[0]) * 60 - parseInt(clase.iniTime.split(':')[1])) / 60)}h 
                              {(parseInt(clase.endTime.split(':')[0]) * 60 + parseInt(clase.endTime.split(':')[1]) - 
                                parseInt(clase.iniTime.split(':')[0]) * 60 - parseInt(clase.iniTime.split(':')[1])) % 60 > 0 
                                ? ` ${(parseInt(clase.endTime.split(':')[0]) * 60 + parseInt(clase.endTime.split(':')[1]) - 
                                    parseInt(clase.iniTime.split(':')[0]) * 60 - parseInt(clase.iniTime.split(':')[1])) % 60}min` 
                                : ''}
                            </div>
                          </div>
                        </div>

                        {/* Icono */}
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '15px',
                          background: `${color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.8rem'
                        }}>
                          📚
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Días de la semana - navegación rápida */}
            <div style={{
              marginTop: '25px',
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              {DIAS_SEMANA.map(dia => {
                const clasesDelDia = obtenerClasesDia(dia);
                const esHoy = dia === obtenerDiaActual();
                const esSeleccionado = dia === diaSeleccionado;
                
                return (
                  <button
                    key={dia}
                    onClick={() => setDiaSeleccionado(dia)}
                    style={{
                      padding: '10px 20px',
                      background: esSeleccionado 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : isDarkMode ? '#1e1e1e' : '#f5f5f5',
                      color: esSeleccionado ? 'white' : (isDarkMode ? '#fff' : '#666'),
                      border: esHoy ? '2px solid #667eea' : 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: esSeleccionado ? '700' : '600',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!esSeleccionado) {
                        e.currentTarget.style.background = isDarkMode ? '#3d3d3d' : '#e0e0e0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!esSeleccionado) {
                        e.currentTarget.style.background = isDarkMode ? '#1e1e1e' : '#f5f5f5';
                      }
                    }}
                  >
                    {dia.substring(0, 3)}
                    {clasesDelDia.length > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: esSeleccionado ? 'white' : '#667eea'
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Grid de Estadísticas de Asistencias */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
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

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}

// Función auxiliar para obtener el día actual
function obtenerDiaActual(): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[new Date().getDay()];
}