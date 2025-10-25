// src/pages/HorarioCompleto.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowLeft, User } from 'lucide-react';
import firebaseHorarioService from '../services/firebaseHorarioService';
import type { Course } from '../services/firebaseHorarioService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { auth } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function HorarioCompleto() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  
  const [cursos, setCursos] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'Estudiante' | 'Profesor' | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (user) {
      cargarDatos();
    }
  }, [user]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Obtener tipo de usuario
      const personDoc = await getDoc(doc(db, 'person', user!.uid));
      if (personDoc.exists()) {
        const data = personDoc.data();
        setUserType(data.type);
        setUserName(data.namePerson || user!.displayName || '');
        
        // Cargar horario según tipo
        let cursosData: Course[];
        if (data.type === 'Profesor') {
          cursosData = await firebaseHorarioService.getHorarioProfesor(user!.uid);
        } else {
          cursosData = await firebaseHorarioService.getHorarioEstudiante(user!.uid);
        }
        setCursos(cursosData);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const horarioPorDia = firebaseHorarioService.organizarHorarioPorDias(cursos);

  if (loading) {
    return <LoadingSpinner message="Cargando horario completo..." />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
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
                <Calendar size={32} color="#667eea" />
                <div>
                  <h1 style={{ margin: 0, fontSize: '2rem', color: '#2b2b2b' }}>
                    Mi Horario Semanal
                  </h1>
                  <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '1rem' }}>
                    <User size={16} style={{ display: 'inline', marginRight: '5px' }} />
                    {userName} - {userType}
                  </p>
                </div>
              </div>
              <div style={{
                marginTop: '15px',
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap',
                fontSize: '0.95rem',
                color: '#666'
              }}>
                <span>📚 {cursos.length} {cursos.length === 1 ? 'curso' : 'cursos'}</span>
                <span>📅 {cursos.reduce((acc, c) => acc + (c.schedule?.length || 0), 0)} clases totales</span>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/home')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#667eea',
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
                e.currentTarget.style.background = '#5568d3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#667eea';
              }}
            >
              <ArrowLeft size={20} />
              Volver al Inicio
            </button>
          </div>
        </div>

        {/* Vista de calendario semanal */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '30px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          {/* Vista Grid (Desktop) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {DIAS_SEMANA.map((dia, diaIndex) => (
              <div
                key={dia}
                style={{
                  background: '#fafafa',
                  borderRadius: '15px',
                  padding: '20px',
                  border: '2px solid #e0e0e0'
                }}
              >
                {/* Header del día */}
                <div style={{
                  background: firebaseHorarioService.generarColor(diaIndex),
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
                      const color = firebaseHorarioService.generarColor(diaIndex);
                      
                      return (
                        <div
                          key={index}
                          style={{
                            background: 'white',
                            border: `2px solid ${color}30`,
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
                            color: '#2b2b2b',
                            marginBottom: '10px'
                          }}>
                            {clase.curso}
                          </div>

                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            fontSize: '0.9rem',
                            color: '#666'
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
                                background: `${color}15`,
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
                    background: 'white',
                    padding: '30px 20px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: '#999',
                    border: '2px dashed #ddd'
                  }}>
                    <Calendar size={32} color="#ddd" style={{ margin: '0 auto' }} />
                    <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem' }}>
                      Sin clases
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Leyenda de cursos */}
        {cursos.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '25px',
            marginTop: '20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#2b2b2b' }}>
              Mis Cursos
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '12px'
            }}>
              {cursos.map((curso, index) => {
                const color = firebaseHorarioService.generarColor(index);
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
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#2b2b2b' }}>
                        {curso.nameCourse}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        Grupo: {curso.group}
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
  );
}