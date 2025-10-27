// src/components/CalendarioHorariosEditable.tsx
import { useState, useEffect } from 'react';
import { Edit2, Save, Trash2, Plus, X, AlertCircle, CheckCircle } from 'lucide-react';
import horarioApiService from '../services/horarioApiService';
import type { Course, ScheduleClass } from '../services/horarioApiService';
import { Toast } from './Toast';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORAS_DISPONIBLES = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

interface CalendarioHorariosEditableProps {
  courses: Course[];
  isEditable: boolean;
  isDarkMode: boolean;
  onUpdate?: () => Promise<void>;
}

interface NotificationType {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface EditingState {
  courseId: string | null;
  classIndex: number | null;
  isEditing: boolean;
}

export function CalendarioHorariosEditable({
  courses,
  isEditable,
  isDarkMode,
  onUpdate
}: CalendarioHorariosEditableProps) {
  const [notification, setNotification] = useState<NotificationType>({
    show: false,
    message: '',
    type: 'info'
  });
  
  const [editingState, setEditingState] = useState<EditingState>({
    courseId: null,
    classIndex: null,
    isEditing: false
  });

  const [editFormData, setEditFormData] = useState<ScheduleClass>({
    classroom: '',
    day: 'Lunes',
    iniTime: '08:00',
    endTime: '09:00'
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({ show: true, message, type });
  };

  // Organizar horario por días
  const horarioPorDia = horarioApiService.organizarHorarioPorDias(courses);

  // Iniciar edición
  const iniciarEdicion = (courseId: string, classIndex: number, clase: ScheduleClass) => {
    setEditingState({
      courseId,
      classIndex,
      isEditing: true
    });
    setEditFormData({ ...clase });
  };

  // Cancelar edición
  const cancelarEdicion = () => {
    setEditingState({
      courseId: null,
      classIndex: null,
      isEditing: false
    });
    setEditFormData({
      classroom: '',
      day: 'Lunes',
      iniTime: '08:00',
      endTime: '09:00'
    });
  };

  // Guardar cambios de clase
  const guardarClase = async () => {
    if (!editingState.courseId || editingState.classIndex === null) {
      showNotification('Error: Información de clase incompleta', 'error');
      return;
    }

    try {
      // Validar clase
      const validacion = horarioApiService.validarClase(editFormData);
      if (!validacion.valido) {
        showNotification(validacion.errores[0], 'error');
        return;
      }

      setSaving(true);

      // Actualizar en el backend
      await horarioApiService.actualizarClase(
        editingState.courseId,
        editingState.classIndex,
        editFormData
      );

      showNotification('✅ Clase actualizada correctamente', 'success');
      cancelarEdicion();
      
      // Recargar datos
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error: any) {
      showNotification(error.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar clase
  const eliminarClase = async (courseId: string, classIndex: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta clase?')) {
      return;
    }

    try {
      setSaving(true);
      await horarioApiService.eliminarClase(courseId, classIndex);
      showNotification('✅ Clase eliminada correctamente', 'success');
      
      // Recargar datos
      if (onUpdate) {
        await onUpdate();
      }
    } catch (error: any) {
      showNotification(error.message || 'Error al eliminar', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Agregar nueva clase
  const [nuevaClase, setNuevaClase] = useState<ScheduleClass>({
    classroom: '',
    day: 'Lunes',
    iniTime: '08:00',
    endTime: '09:00'
  });

  const [courseIdNuevaClase, setCourseIdNuevaClase] = useState<string | null>(null);

  const agregarNuevaClase = async (courseId: string) => {
    if (!nuevaClase.classroom.trim()) {
      showNotification('Por favor ingresa el salón', 'error');
      return;
    }

    try {
      const validacion = horarioApiService.validarClase(nuevaClase);
      if (!validacion.valido) {
        showNotification(validacion.errores[0], 'error');
        return;
      }

      setSaving(true);
      await horarioApiService.agregarClase(courseId, nuevaClase);
      showNotification('✅ Clase agregada correctamente', 'success');
      setNuevaClase({
        classroom: '',
        day: 'Lunes',
        iniTime: '08:00',
        endTime: '09:00'
      });
      setCourseIdNuevaClase(null);

      if (onUpdate) {
        await onUpdate();
      }
    } catch (error: any) {
      showNotification(error.message || 'Error al agregar clase', 'error');
    } finally {
      setSaving(false);
    }
  };

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
        background: isDarkMode ? '#2d2d2d' : 'white',
        borderRadius: '20px',
        padding: '30px',
        marginBottom: '40px',
        boxShadow: isDarkMode
          ? '0 10px 40px rgba(0,0,0,0.5)'
          : '0 10px 40px rgba(0,0,0,0.1)',
        border: isDarkMode ? '1px solid #3d3d3d' : 'none'
      }}>
        <div style={{
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: `2px solid ${isDarkMode ? '#3d3d3d' : '#f0f0f0'}`
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.8rem',
            color: isDarkMode ? '#fff' : '#2b2b2b'
          }}>
            Horario Semanal
          </h2>
          <p style={{
            margin: '8px 0 0 0',
            color: isDarkMode ? '#aaa' : '#666',
            fontSize: '1rem'
          }}>
            {courses.length} cursos • {courses.reduce((acc, c) => acc + (c.schedule?.length || 0), 0)} clases
          </p>
        </div>

        {/* Grid de días */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {DIAS_SEMANA.map((dia, diaIndex) => {
            const clasesDelDia = horarioPorDia[dia] || [];
            const color = horarioApiService.generarColor(diaIndex);

            return (
              <div
                key={dia}
                style={{
                  background: isDarkMode ? '#1e1e1e' : '#f9f9f9',
                  borderRadius: '15px',
                  padding: '20px',
                  border: `2px solid ${color}40`
                }}
              >
                {/* Header del día */}
                <div style={{
                  background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {clasesDelDia.length > 0 ? (
                    clasesDelDia.map((clase: any, index: number) => {
                      // Encontrar el índice real en el curso
                      const cursoDelClase = courses.find(c => c.nameCourse === clase.curso);
                      const indexReal = cursoDelClase?.schedule?.findIndex(
                        s => s.day === clase.day &&
                          s.iniTime === clase.iniTime &&
                          s.endTime === clase.endTime &&
                          s.classroom === clase.classroom
                      ) ?? -1;

                      const isEditing = editingState.isEditing &&
                        editingState.courseId === cursoDelClase?.id &&
                        editingState.classIndex === indexReal;

                      return (
                        <div key={index}>
                          {isEditing ? (
                            // Formulario de edición
                            <div style={{
                              background: isDarkMode ? '#2d2d2d' : 'white',
                              padding: '15px',
                              borderRadius: '10px',
                              border: `2px solid ${color}`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    marginBottom: '3px',
                                    color: isDarkMode ? '#aaa' : '#555'
                                  }}>
                                    Día
                                  </label>
                                  <select
                                    value={editFormData.day}
                                    onChange={(e) => setEditFormData({ ...editFormData, day: e.target.value })}
                                    style={{
                                      width: '100%',
                                      padding: '6px',
                                      borderRadius: '6px',
                                      border: `1px solid ${color}`,
                                      background: isDarkMode ? '#1e1e1e' : 'white',
                                      color: isDarkMode ? '#fff' : '#333',
                                      fontSize: '0.9rem'
                                    }}
                                  >
                                    {DIAS_SEMANA.map(d => (
                                      <option key={d} value={d}>{d}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    marginBottom: '3px',
                                    color: isDarkMode ? '#aaa' : '#555'
                                  }}>
                                    Salón
                                  </label>
                                  <input
                                    type="text"
                                    value={editFormData.classroom}
                                    onChange={(e) => setEditFormData({ ...editFormData, classroom: e.target.value })}
                                    style={{
                                      width: '100%',
                                      padding: '6px',
                                      borderRadius: '6px',
                                      border: `1px solid ${color}`,
                                      background: isDarkMode ? '#1e1e1e' : 'white',
                                      color: isDarkMode ? '#fff' : '#333',
                                      fontSize: '0.9rem'
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    marginBottom: '3px',
                                    color: isDarkMode ? '#aaa' : '#555'
                                  }}>
                                    Inicio
                                  </label>
                                  <select
                                    value={editFormData.iniTime}
                                    onChange={(e) => setEditFormData({ ...editFormData, iniTime: e.target.value })}
                                    style={{
                                      width: '100%',
                                      padding: '6px',
                                      borderRadius: '6px',
                                      border: `1px solid ${color}`,
                                      background: isDarkMode ? '#1e1e1e' : 'white',
                                      color: isDarkMode ? '#fff' : '#333',
                                      fontSize: '0.9rem'
                                    }}
                                  >
                                    {HORAS_DISPONIBLES.map(h => (
                                      <option key={h} value={h}>{h}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    marginBottom: '3px',
                                    color: isDarkMode ? '#aaa' : '#555'
                                  }}>
                                    Fin
                                  </label>
                                  <select
                                    value={editFormData.endTime}
                                    onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                                    style={{
                                      width: '100%',
                                      padding: '6px',
                                      borderRadius: '6px',
                                      border: `1px solid ${color}`,
                                      background: isDarkMode ? '#1e1e1e' : 'white',
                                      color: isDarkMode ? '#fff' : '#333',
                                      fontSize: '0.9rem'
                                    }}
                                  >
                                    {HORAS_DISPONIBLES.map(h => (
                                      <option key={h} value={h}>{h}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={cancelarEdicion}
                                  disabled={saving}
                                  style={{
                                    padding: '6px 12px',
                                    background: '#9e9e9e',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    opacity: saving ? 0.5 : 1
                                  }}
                                >
                                  <X size={14} />
                                  Cancelar
                                </button>
                                <button
                                  onClick={guardarClase}
                                  disabled={saving}
                                  style={{
                                    padding: '6px 12px',
                                    background: color,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    opacity: saving ? 0.5 : 1
                                  }}
                                >
                                  <Save size={14} />
                                  {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Vista de clase
                            <div
                              style={{
                                background: `${color}15`,
                                border: `2px solid ${color}40`,
                                borderLeft: `5px solid ${color}`,
                                borderRadius: '10px',
                                padding: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(3px)';
                                e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontWeight: '700',
                                  fontSize: '0.95rem',
                                  color: isDarkMode ? '#fff' : '#2b2b2b',
                                  marginBottom: '4px'
                                }}>
                                  {clase.curso}
                                </div>
                                <div style={{
                                  fontSize: '0.85rem',
                                  color: isDarkMode ? '#aaa' : '#666'
                                }}>
                                  ⏰ {clase.iniTime} - {clase.endTime} • 📍 {clase.classroom}
                                </div>
                              </div>

                              {isEditable && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => iniciarEdicion(cursoDelClase?.id || '', indexReal, clase)}
                                    disabled={saving}
                                    style={{
                                      padding: '6px 10px',
                                      background: color,
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: saving ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.8rem',
                                      opacity: saving ? 0.5 : 1
                                    }}
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => eliminarClase(cursoDelClase?.id || '', indexReal)}
                                    disabled={saving}
                                    style={{
                                      padding: '6px 10px',
                                      background: '#f44336',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: saving ? 'not-allowed' : 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '0.8rem',
                                      opacity: saving ? 0.5 : 1
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{
                      background: isDarkMode ? '#2d2d2d' : 'white',
                      padding: '30px 15px',
                      borderRadius: '10px',
                      textAlign: 'center',
                      color: isDarkMode ? '#999' : '#bbb',
                      border: `2px dashed ${isDarkMode ? '#3d3d3d' : '#ddd'}`
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>
                        Sin clases
                      </p>
                    </div>
                  )}

                  {/* Agregar nueva clase */}
                  {isEditable && courseIdNuevaClase === null && (
                    <button
                      onClick={() => setCourseIdNuevaClase('global')}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: `${color}20`,
                        color: color,
                        border: `2px dashed ${color}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${color}30`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `${color}20`;
                      }}
                    >
                      <Plus size={16} />
                      Agregar clase
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lista de cursos */}
        {courses.length > 0 && (
          <div style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: `2px solid ${isDarkMode ? '#3d3d3d' : '#f0f0f0'}`
          }}>
            <h3 style={{
              marginTop: 0,
              color: isDarkMode ? '#fff' : '#2b2b2b',
              marginBottom: '15px'
            }}>
              Mis Cursos ({courses.length})
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {courses.map((curso, index) => {
                const color = horarioApiService.generarColor(index);
                const totalClases = curso.schedule?.length || 0;

                return (
                  <div
                    key={curso.id}
                    style={{
                      background: `${color}15`,
                      border: `2px solid ${color}40`,
                      borderLeft: `5px solid ${color}`,
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        color: isDarkMode ? '#fff' : '#2b2b2b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {curso.nameCourse}
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
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
    </>
  );
}