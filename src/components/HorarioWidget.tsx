// src/components/HorarioWidget.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Edit3, RefreshCw } from 'lucide-react';
import firebaseHorarioService from '../services/firebaseHorarioService';
import type { Course } from '../services/firebaseHorarioService';
import { auth } from '../firebaseConfig';

interface HorarioWidgetProps {
  userType: 'Estudiante' | 'Profesor';
  userId: string;
}

export function HorarioWidget({ userType, userId }: HorarioWidgetProps) {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaActual] = useState(obtenerDiaActual());

  useEffect(() => {
    cargarHorario();
  }, [userId, userType]);

  const cargarHorario = async () => {
    try {
      setLoading(true);
      let cursosData: Course[];
      
      if (userType === 'Profesor') {
        cursosData = await firebaseHorarioService.getHorarioProfesor(userId);
      } else {
        cursosData = await firebaseHorarioService.getHorarioEstudiante(userId);
      }
      
      setCursos(cursosData);
    } catch (error) {
      console.error('Error al cargar horario:', error);
    } finally {
      setLoading(false);
    }
  };

  const obtenerClasesHoy = () => {
    const horarioPorDia = firebaseHorarioService.organizarHorarioPorDias(cursos);
    return horarioPorDia[diaActual] || [];
  };

  const clasesHoy = obtenerClasesHoy();
  const horaActual = new Date().getHours() * 60 + new Date().getMinutes();

  const esClaseActual = (iniTime: string, endTime: string) => {
    const [hIni, mIni] = iniTime.split(':').map(Number);
    const [hFin, mFin] = endTime.split(':').map(Number);
    const inicio = hIni * 60 + mIni;
    const fin = hFin * 60 + mFin;
    return horaActual >= inicio && horaActual <= fin;
  };

  if (loading) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '15px',
        padding: '20px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} color="#667eea" className="spin" />
          <p style={{ marginTop: '10px', color: '#666' }}>Cargando horario...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '15px',
      padding: '25px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '2px solid #f0f0f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={24} color="#667eea" />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#2b2b2b' }}>
              Mi Horario
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.9rem', color: '#666' }}>
              {diaActual} - {clasesHoy.length} {clasesHoy.length === 1 ? 'clase' : 'clases'}
            </p>
          </div>
        </div>
        
        {userType === 'Profesor' && (
          <button
            onClick={() => navigate('/gestion-horarios')}
            style={{
              padding: '8px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#5568d3';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#667eea';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Edit3 size={16} />
            Gestionar
          </button>
        )}
      </div>

      {/* Contenido */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {clasesHoy.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#999'
          }}>
            <Calendar size={48} color="#ddd" />
            <p style={{ margin: '15px 0 0 0', fontSize: '1rem' }}>
              No tienes clases programadas hoy
            </p>
            {userType === 'Profesor' && (
              <button
                onClick={() => navigate('/gestion-horarios')}
                style={{
                  marginTop: '15px',
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Crear Horario
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {clasesHoy.map((clase, index) => {
              const esActual = esClaseActual(clase.iniTime, clase.endTime);
              const color = firebaseHorarioService.generarColor(index);
              
              return (
                <div
                  key={index}
                  style={{
                    background: esActual ? `${color}15` : '#f9f9f9',
                    border: `2px solid ${esActual ? color : '#e0e0e0'}`,
                    borderRadius: '12px',
                    padding: '15px',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {esActual && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: color,
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      animation: 'pulse 2s infinite'
                    }}>
                      En curso
                    </div>
                  )}
                  
                  <div style={{
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    color: '#2b2b2b',
                    marginBottom: '8px'
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
                      <Clock size={16} color={color} />
                      <span>{clase.iniTime} - {clase.endTime}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={16} color={color} />
                      <span>{clase.classroom}</span>
                    </div>
                    
                    {clase.group && (
                      <div style={{ 
                        marginTop: '4px',
                        fontSize: '0.85rem',
                        color: '#888'
                      }}>
                        Grupo: {clase.group}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer con resumen */}
      {cursos.length > 0 && (
        <div style={{
          marginTop: '20px',
          paddingTop: '15px',
          borderTop: '2px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          color: '#666'
        }}>
          <span>Total cursos: <strong>{cursos.length}</strong></span>
          <button
            onClick={() => navigate('/horario-completo')}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontWeight: '600',
              textDecoration: 'underline'
            }}
          >
            Ver horario completo →
          </button>
        </div>
      )}
    </div>
  );
}

// Función auxiliar
function obtenerDiaActual(): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[new Date().getDay()];
}

// CSS para animación
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);