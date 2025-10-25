// src/pages/GestionHorariosFirebase.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import horarioApiService from '../services/horarioApiService';
import type { Course, ScheduleClass } from '../services/horarioApiService';
import type { ScheduleClass as ScheduleType } from '../services/horarioApiService';
import { Toast } from '../components/Toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Calendar, Plus, Trash2, Save, X } from 'lucide-react';
import { auth } from '../firebaseConfig';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORAS_DISPONIBLES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

type Vista = 'lista' | 'editar' | 'visualizar';

export function GestionHorariosFirebase() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  
  const [vista, setVista] = useState<Vista>('lista');
  const [cursos, setCursos] = useState<Course[]>([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  useEffect(() => {
    if (user) {
      cargarCursos();
    }
  }, [user]);

  const cargarCursos = async () => {
    try {
      setLoading(true);
      // USANDO NUEVA API
      const cursosData = await horarioApiService.getHorariosProfesor();
      setCursos(cursosData);
    } catch (error: any) {
      showNotification(error.message || 'Error al cargar cursos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });
  };

  const handleGuardarHorario = async (courseId: string, schedule: ScheduleType[]) => {
    try {
      setSaving(true);
      
      // Validar todas las clases
      for (const clase of schedule) {
        const validacion = horarioApiService.validarClase(clase);
        if (!validacion.valido) {
          showNotification(validacion.errores[0], 'error');
          setSaving(false);
          return;
        }
      }
      
      // USANDO NUEVA API
      await horarioApiService.actualizarScheduleCurso(courseId, schedule);
      await cargarCursos();
      showNotification('✅ Horario guardado correctamente', 'success');
      setVista('lista');
      setCursoSeleccionado(null);
    } catch (error: any) {
      showNotification(error.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSeleccionarCurso = (curso: Course) => {
    setCursoSeleccionado(curso);
    setVista('editar');
  };

  if (loading) {
    return <LoadingSpinner message="Cargando cursos..." />;
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
        minHeight: 'calc(100vh - 70px)',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Calendar size={32} color="#667eea" />
                <div>
                  <h1 style={{ margin: 0, fontSize: '2rem', color: '#2b2b2b' }}>
                    Gestión de Horarios
                  </h1>
                  <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '1rem' }}>
                    {cursos.length} {cursos.length === 1 ? 'curso' : 'cursos'} configurados
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => navigate('/home')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#9e9e9e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                ← Volver al Dashboard
              </button>
            </div>
          </div>

          {/* Contenido */}
          {vista === 'lista' && (
            <ListaCursos
              cursos={cursos}
              onSeleccionar={handleSeleccionarCurso}
              onVerHorarioCompleto={() => setVista('visualizar')}
            />
          )}

          {vista === 'editar' && cursoSeleccionado && (
            <EditarHorarioCurso
              curso={cursoSeleccionado}
              onGuardar={(schedule) => handleGuardarHorario(cursoSeleccionado.id, schedule)}
              onCancelar={() => {
                setVista('lista');
                setCursoSeleccionado(null);
              }}
              saving={saving}
            />
          )}

          {vista === 'visualizar' && (
            <VisualizarHorarioCompleto
              cursos={cursos}
              onVolver={() => setVista('lista')}
            />
          )}
        </div>
      </div>
    </>
  );
}

// Componente: Lista de Cursos
interface ListaCursosProps {
  cursos: Course[];
  onSeleccionar: (curso: Course) => void;
  onVerHorarioCompleto: () => void;
}

function ListaCursos({ cursos, onSeleccionar, onVerHorarioCompleto }: ListaCursosProps) {
  return (
    <div>
      {/* Botón para ver horario completo */}
      {cursos.length > 0 && (
        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <button
            onClick={onVerHorarioCompleto}
            style={{
              padding: '12px 24px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Calendar size={20} />
            Ver Horario Completo
          </button>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {cursos.map((curso, index) => {
          const color = horarioApiService.generarColor(index);
          const totalClases = curso.schedule?.length || 0;
          
          return (
            <div
              key={curso.id}
              style={{
                background: 'white',
                borderRadius: '15px',
                padding: '25px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                borderLeft: `5px solid ${color}`,
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '15px'
              }}>
                <div style={{
                  background: `${color}20`,
                  padding: '12px',
                  borderRadius: '10px'
                }}>
                  📚
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#2b2b2b' }}>
                    {curso.nameCourse}
                  </h3>
                  <p style={{ margin: '3px 0 0 0', color: '#888', fontSize: '0.9rem' }}>
                    Grupo: {curso.group}
                  </p>
                </div>
              </div>

              <div style={{
                background: '#f9f9f9',
                padding: '12px',
                borderRadius: '10px',
                marginBottom: '15px',
                fontSize: '0.9rem',
                color: '#666'
              }}>
                <div>📚 {totalClases} {totalClases === 1 ? 'clase' : 'clases'} programadas</div>
                <div style={{ marginTop: '5px' }}>
                  👥 {curso.estudianteID?.length || 0} estudiantes
                </div>
              </div>

              <button
                onClick={() => onSeleccionar(curso)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: color,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
                ✏️ Editar Horario
              </button>
            </div>
          );
        })}
      </div>

      {cursos.length === 0 && (
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '60px 40px',
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <Calendar size={64} color="#ddd" />
          <h2 style={{ marginTop: '20px', color: '#666' }}>
            No tienes cursos creados
          </h2>
          <p style={{ color: '#999', marginTop: '10px' }}>
            Los cursos deben ser creados desde el sistema principal
          </p>
        </div>
      )}
    </div>
  );
}

// Componente: Editar Horario de Curso
interface EditarHorarioCursoProps {
  curso: Course;
  onGuardar: (schedule: ScheduleType[]) => void;
  onCancelar: () => void;
  saving: boolean;
}

function EditarHorarioCurso({ curso, onGuardar, onCancelar, saving }: EditarHorarioCursoProps) {
  const [schedule, setSchedule] = useState<ScheduleType[]>(curso.schedule || []);
  const [nuevaClase, setNuevaClase] = useState<ScheduleType>({
    classroom: '',
    day: 'Lunes',
    iniTime: '08:00',
    endTime: '10:00'
  });

  const agregarClase = () => {
    if (!nuevaClase.classroom) {
      alert('Por favor ingresa el salón');
      return;
    }

    const validacion = horarioApiService.validarClase(nuevaClase);
    if (!validacion.valido) {
      alert(validacion.errores[0]);
      return;
    }

    setSchedule([...schedule, { ...nuevaClase }]);
    setNuevaClase({
      classroom: '',
      day: 'Lunes',
      iniTime: '08:00',
      endTime: '10:00'
    });
  };

  const eliminarClase = (index: number) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginTop: 0, color: '#2b2b2b' }}>
        Editar Horario: {curso.nameCourse}
      </h2>
      <p style={{ color: '#666', marginTop: '-10px' }}>
        Grupo: {curso.group}
      </p>

      {/* Formulario */}
      <div style={{
        background: '#f5f5f5',
        padding: '25px',
        borderRadius: '15px',
        marginBottom: '25px'
      }}>
        <h3 style={{ marginTop: 0, color: '#667eea' }}>Agregar Clase</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Día *
            </label>
            <select
              value={nuevaClase.day}
              onChange={(e) => setNuevaClase({ ...nuevaClase, day: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '2px solid #ddd',
                fontSize: '1rem'
              }}
            >
              {DIAS_SEMANA.map(dia => (
                <option key={dia} value={dia}>{dia}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Hora Inicio *
            </label>
            <select
              value={nuevaClase.iniTime}
              onChange={(e) => setNuevaClase({ ...nuevaClase, iniTime: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '2px solid #ddd',
                fontSize: '1rem'
              }}
            >
              {HORAS_DISPONIBLES.map(hora => (
                <option key={hora} value={hora}>{hora}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Hora Fin *
            </label>
            <select
              value={nuevaClase.endTime}
              onChange={(e) => setNuevaClase({ ...nuevaClase, endTime: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '2px solid #ddd',
                fontSize: '1rem'
              }}
            >
              {HORAS_DISPONIBLES.map(hora => (
                <option key={hora} value={hora}>{hora}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Salón *
            </label>
            <input
              type="text"
              value={nuevaClase.classroom}
              onChange={(e) => setNuevaClase({ ...nuevaClase, classroom: e.target.value })}
              placeholder="Ej: A-101"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '2px solid #ddd',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        <button
          onClick={agregarClase}
          style={{
            marginTop: '15px',
            padding: '12px 24px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={20} />
          Agregar Clase
        </button>
      </div>

      {/* Lista de clases */}
      {schedule.length > 0 && (
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#2b2b2b' }}>Clases Programadas ({schedule.length})</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {schedule.map((clase, index) => (
              <div
                key={index}
                style={{
                  background: '#f9f9f9',
                  padding: '15px',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '2px solid #e0e0e0'
                }}
              >
                <div>
                  <strong>{clase.day}</strong> • {clase.iniTime} - {clase.endTime} • Salón: {clase.classroom}
                </div>
                <button
                  onClick={() => eliminarClase(index)}
                  style={{
                    padding: '8px',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botones */}
      <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancelar}
          disabled={saving}
          style={{
            padding: '12px 30px',
            background: '#9e9e9e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            opacity: saving ? 0.5 : 1
          }}
        >
          Cancelar
        </button>
        <button
          onClick={() => onGuardar(schedule)}
          disabled={saving}
          style={{
            padding: '12px 30px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: saving ? 0.5 : 1
          }}
        >
          <Save size={20} />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}

// Componente: Visualizar Horario Completo
interface VisualizarHorarioCompletoProps {
  cursos: Course[];
  onVolver: () => void;
}

function VisualizarHorarioCompleto({ cursos, onVolver }: VisualizarHorarioCompletoProps) {
  const horarioPorDia = horarioApiService.organizarHorarioPorDias(cursos);

  return (
    <div style={{
      background: 'white',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px'
      }}>
        <h2 style={{ margin: 0, color: '#2b2b2b' }}>Horario Completo de la Semana</h2>
        <button
          onClick={onVolver}
          style={{
            padding: '10px 20px',
            background: '#9e9e9e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          ← Volver
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {DIAS_SEMANA.map(dia => (
          <div key={dia}>
            <h3 style={{
              color: '#667eea',
              borderBottom: '3px solid #667eea',
              paddingBottom: '10px',
              marginBottom: '15px'
            }}>
              {dia}
            </h3>
            
            {horarioPorDia[dia].length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {horarioPorDia[dia].map((clase: any, index: number) => {
                  const color = horarioApiService.generarColor(index);
                  return (
                    <div
                      key={index}
                      style={{
                        background: `${color}15`,
                        padding: '15px',
                        borderRadius: '10px',
                        border: `2px solid ${color}`
                      }}
                    >
                      <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#2b2b2b' }}>
                        {clase.curso}
                      </div>
                      <div style={{ color: '#666', marginTop: '5px' }}>
                        ⏰ {clase.iniTime} - {clase.endTime} • 📍 {clase.classroom}
                        {clase.group && ` • 👥 ${clase.group}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#999',
                background: '#f9f9f9',
                borderRadius: '10px',
                border: '2px dashed #ddd'
              }}>
                Sin clases programadas
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}