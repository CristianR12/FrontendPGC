// src/pages/HorarioCompleto.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowLeft, User, Edit3, X } from 'lucide-react';
import horarioApiService from '../services/horarioApiService';
import type { Course, ScheduleClass } from '../services/horarioApiService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CalendarioHorariosEditable } from '../components/CalendarioHorariosEditable';
import { Toast } from '../components/Toast';
import { auth } from '../firebaseConfig';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type Vista = 'calendario' | 'edicion';

export function HorarioCompleto() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  
  const [cursos, setCursos] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'Estudiante' | 'Profesor' | null>(null);
  const [userName, setUserName] = useState('');
  const [vista, setVista] = useState<Vista>('calendario');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  // Detectar modo oscuro
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.body.classList.contains('dark-mode'));
    };
    
    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (user) {
      cargarDatos();
    }
  }, [user]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // 🔥 USAR QUERY EN LUGAR DE doc(db, 'person', uid)
      const personsRef = collection(db, 'person');
      const q = query(personsRef, where('profesorUID', '==', user!.uid), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const personDoc = querySnapshot.docs[0];
        const data = personDoc.data();
        setUserType(data.type);
        setUserName(data.namePerson || user!.displayName || '');
        
        console.log('✅ Usuario encontrado:', data.namePerson, '- Tipo:', data.type);
        
        // Cargar horario según tipo - USANDO NUEVA API
        let cursosData: Course[];
        if (data.type === 'Profesor') {
          cursosData = await horarioApiService.getHorariosProfesor();
        } else {
          cursosData = await horarioApiService.getHorarioEstudiante();
        }
        setCursos(cursosData);
      } else {
        console.warn('⚠️ No se encontró documento en person para UID:', user!.uid);
        showNotification('Usuario no registrado en el sistema', 'error');
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      showNotification('Error al cargar horario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });
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
        showNotification('✅ Horario actualizado', 'success');
        setVista('calendario');
      }
    } catch (error) {
      console.error('Error al actualizar horario:', error);
      showNotification('Error al actualizar horario', 'error');
    }
  };

  const horarioPorDia = horarioApiService.organizarHorarioPorDias(cursos);

  if (loading) {
    return <LoadingSpinner message="Cargando horario completo..." />;
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

      <div style={{
        minHeight: '100vh',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{
            background: isDarkMode ? '#2d2d2d' : 'white',
            borderRadius: '20px',
            padding: '30px',
            marginBottom: '30px',
            boxShadow: isDarkMode 
              ? '0 10px 40px rgba(0,0,0,0.5)'
              : '0 10px 40px rgba(0,0,0,0.1)',
            border: isDarkMode ? '1px solid #3d3d3d' : 'none'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '15px',
                    borderRadius: '15px'
                  }}>
                    <Calendar size={32} color="white" />
                  </div>
                  <div>
                    <h1 style={{ 
                      margin: 0, 
                      fontSize: '2rem', 
                      color: isDarkMode ? '#fff' : '#2b2b2b' 
                    }}>
                      Mi Horario Semanal
                    </h1>
                    <p style={{ 
                      margin: '5px 0 0 0', 
                      color: isDarkMode ? '#aaa' : '#666', 
                      fontSize: '1rem' 
                    }}>
                      <User size={16} style={{ display: 'inline', marginRight: '5px' }} />
                      {userName} • {userType}
                    </p>
                  </div>
                </div>
                <div style={{
                  marginTop: '15px',
                  display: 'flex',
                  gap: '20px',
                  flexWrap: 'wrap',
                  fontSize: '0.95rem',
                  color: isDarkMode ? '#aaa' : '#666'
                }}>
                  <span>📚 {cursos.length} {cursos.length === 1 ? 'curso' : 'cursos'}</span>
                  <span>📅 {cursos.reduce((acc, c) => acc + (c.schedule?.length || 0), 0)} clases totales</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {/* Botón Editar (solo profesores) */}
                {userType === 'Profesor' && (
                  <button
                    onClick={() => setVista(vista === 'calendario' ? 'edicion' : 'calendario')}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: vista === 'edicion' ? '#FF9800' : '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (vista === 'edicion') {
                        e.currentTarget.style.background = '#F57C00';
                      } else {
                        e.currentTarget.style.background = '#5568d3';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (vista === 'edicion') {
                        e.currentTarget.style.background = '#FF9800';
                      } else {
                        e.currentTarget.style.background = '#667eea';
                      }
                    }}
                  >
                    <Edit3 size={20} />
                    {vista === 'edicion' ? 'Ver Calendario' : 'Editar Horario'}
                  </button>
                )}

                {/* Botón Volver */}
                <button
                  onClick={() => navigate('/home')}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: isDarkMode ? '#4db6ac' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <ArrowLeft size={20} />
                  Volver
                </button>
              </div>
            </div>
          </div>

          {/* VISTA: CALENDARIO */}
          {vista === 'calendario' && (
            <div style={{
              background: isDarkMode ? '#2d2d2d' : 'white',
              borderRadius: '20px',
              padding: '30px',
              boxShadow: isDarkMode 
                ? '0 10px 40px rgba(0,0,0,0.5)'
                : '0 10px 40px rgba(0,0,0,0.1)',
              border: isDarkMode ? '1px solid #3d3d3d' : 'none'
            }}>
              <h2 style={{
                marginTop: 0,
                marginBottom: '25px',
                color: isDarkMode ? '#fff' : '#2b2b2b'
              }}>
                📅 Vista Semanal
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                {DIAS_SEMANA.map((dia, diaIndex) => (
                  <div
                    key={dia}
                    style={{
                      background: isDarkMode ? '#1e1e1e' : '#fafafa',
                      borderRadius: '15px',
                      padding: '20px',
                      border: `2px solid ${isDarkMode ? '#3d3d3d' : '#e0e0e0'}`
                    }}
                  >
                    {/* Header del día */}
                    <div style={{
                      background: `linear-gradient(135deg, ${horarioApiService.generarColor(diaIndex)} 0%, ${horarioApiService.generarColor(diaIndex)}dd 100%)`,
                      color: 'white',
                      padding: '12px',
                      borderRadius: '10px',
                      marginBottom: '15px',
                      textAlign: 'center',
                      fontWeight: '700',
                      fontSize: '1.1rem'
                    }}>
                      {dia}
                    </div>

                    {/* Clases del día */}
                    {horarioPorDia[dia].length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {horarioPorDia[dia].map((clase: any, index: number) => {
                          const color = horarioApiService.generarColor(diaIndex);
                          
                          return (
                            <div
                              key={index}
                              style={{
                                background: isDarkMode ? '#2d2d2d' : 'white',
                                border: `2px solid ${color}40`,
                                borderLeft: `5px solid ${color}`,
                                borderRadius: '12px',
                                padding: '15px',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(5px)';
                                e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <div style={{
                                fontWeight: '700',
                                fontSize: '1rem',
                                color: isDarkMode ? '#fff' : '#2b2b2b',
                                marginBottom: '10px'
                              }}>
                                {clase.curso}
                              </div>

                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                fontSize: '0.9rem',
                                color: isDarkMode ? '#aaa' : '#666'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Clock size={14} color={color} />
                                  <span style={{ fontWeight: '600' }}>
                                    {clase.iniTime} - {clase.endTime}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <MapPin size={14} color={color} />
                                  <span>{clase.classroom}</span>
                                </div>

                                {clase.group && (
                                  <div style={{
                                    marginTop: '6px',
                                    padding: '4px 10px',
                                    background: `${color}20`,
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    color: color,
                                    fontWeight: '600',
                                    display: 'inline-block',
                                    width: 'fit-content'
                                  }}>
                                    Grupo: {clase.group}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{
                        background: isDarkMode ? '#2d2d2d' : 'white',
                        padding: '30px 20px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        color: isDarkMode ? '#666' : '#999',
                        border: `2px dashed ${isDarkMode ? '#3d3d3d' : '#ddd'}`
                      }}>
                        <Calendar size={32} color={isDarkMode ? '#3d3d3d' : '#ddd'} style={{ margin: '0 auto' }} />
                        <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem' }}>
                          Sin clases
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA: EDICIÓN */}
          {vista === 'edicion' && userType === 'Profesor' && (
            <CalendarioHorariosEditable
              courses={cursos}
              isEditable={true}
              isDarkMode={isDarkMode}
              onUpdate={handleUpdateHorario}
            />
          )}

          {/* Leyenda de cursos */}
          {cursos.length > 0 && vista === 'calendario' && (
            <div style={{
              background: isDarkMode ? '#2d2d2d' : 'white',
              borderRadius: '15px',
              padding: '25px',
              marginTop: '20px',
              boxShadow: isDarkMode 
                ? '0 4px 15px rgba(0,0,0,0.5)'
                : '0 4px 15px rgba(0,0,0,0.1)',
              border: isDarkMode ? '1px solid #3d3d3d' : 'none'
            }}>
              <h3 style={{ 
                marginTop: 0, 
                marginBottom: '15px', 
                color: isDarkMode ? '#fff' : '#2b2b2b' 
              }}>
                📚 Mis Cursos ({cursos.length})
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '12px'
              }}>
                {cursos.map((curso, index) => {
                  const color = horarioApiService.generarColor(index);
                  const totalClases = curso.schedule?.length || 0;

                  return (
                    <div
                      key={curso.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: `${color}10`,
                        borderRadius: '10px',
                        border: `2px solid ${color}30`
                      }}
                    >
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: color,
                          flexShrink: 0
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '0.95rem', 
                          color: isDarkMode ? '#fff' : '#2b2b2b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {curso.nameCourse}
                        </div>
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: isDarkMode ? '#aaa' : '#666' 
                        }}>
                          {totalClases} clases • Grupo {curso.group}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}