// src/components/CalendarioHorariosEditable.tsx
import { useState } from 'react';
import { Edit2, Save, Trash2, Plus, X, Clock, MapPin, Inbox, Users, Pencil, Upload } from 'lucide-react';
import horarioApiService from '../services/horarioApiService';
import type { Course, ScheduleClass } from '../services/horarioApiService';
import { Toast } from './Toast';
import { AgregarClaseModal } from './AgregarClaseModal';
import { CursoFormModal } from './CursoFormModal';
import { EstudiantesCursoModal } from './EstudiantesCursoModal';
import { ImportarHorarioModal } from './ImportarHorarioModal';
import { useColumnas } from '../utils/useColumnas';

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
  const columnas = useColumnas();
  // Gestión de cursos desde las tarjetas "Mis Cursos": solo quien puede editar (el docente)
  const [formularioCurso, setFormularioCurso] = useState<{ abierto: boolean; curso: Course | null }>({ abierto: false, curso: null });
  const [cursoEstudiantes, setCursoEstudiantes] = useState<Course | null>(null);
  const [importarAbierto, setImportarAbierto] = useState(false);
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

      showNotification('Clase actualizada correctamente', 'success');
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
      showNotification('Clase eliminada correctamente', 'success');
      
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

  // Día de la columna donde se pulsó "Agregar clase" (null = formulario cerrado)
  const [diaNuevaClase, setDiaNuevaClase] = useState<string | null>(null);


  return (
    <>
      {formularioCurso.abierto && (
        <CursoFormModal
          curso={formularioCurso.curso}
          onCerrar={() => setFormularioCurso({ abierto: false, curso: null })}
          onGuardado={async (mensaje, nuevo) => {
            setFormularioCurso({ abierto: false, curso: null });
            showNotification(mensaje, 'success');
            if (onUpdate) await onUpdate();
            if (nuevo) setCursoEstudiantes(nuevo); // un curso nuevo nace vacío: se abre directo para inscribir
          }}
        />
      )}
      {cursoEstudiantes && (
        <EstudiantesCursoModal
          curso={cursoEstudiantes}
          onCerrar={() => setCursoEstudiantes(null)}
          onCambio={(mensaje) => {
            if (mensaje) showNotification(mensaje, 'success');
            if (onUpdate) onUpdate();
          }}
        />
      )}
      {diaNuevaClase !== null && (
        <AgregarClaseModal
          dia={diaNuevaClase}
          courses={courses}
          onCerrar={() => setDiaNuevaClase(null)}
          onGuardado={async (mensaje) => {
            setDiaNuevaClase(null);
            showNotification(mensaje, 'success');
            if (onUpdate) await onUpdate();
          }}
        />
      )}
      <ImportarHorarioModal
        abierto={importarAbierto}
        onCerrar={() => setImportarAbierto(false)}
        onImportado={async (mensaje) => {
          setImportarAbierto(false);
          showNotification(mensaje, 'success');
          if (onUpdate) await onUpdate();
        }}
      />
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
          gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`,
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
                  border: `2px solid ${color}40`,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '400px',
                  minWidth: 0
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
                  fontSize: '1.1rem',
                  flexShrink: 0
                }}>
                  {dia}
                </div>

                {/* Clases del día: si hay muchas, la lista se desplaza y la tarjeta no crece */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '4px' }}>
                  {clasesDelDia.length > 0 ? (
                    <>
                    {clasesDelDia.map((clase: any, index: number) => {
                      // Encontrar el índice real en el curso
                      const cursoDelClase = courses.find(c => c.id === clase.courseId);
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
                                  color: isDarkMode ? '#aaa' : '#666',
                                  display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'
                                }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> {clase.iniTime} - {clase.endTime}</span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> {clase.classroom}</span>
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
                    })}

                    {/* Relleno: el mismo recuadro de "Sin clases", para no dejar un hueco vacío bajo las clases */}
                    <EstadoVacioDia
                      oscuro={isDarkMode}
                      minAlto={110}
                      texto="No tienes más clases para este día"
                    />
                    </>
                  ) : (
                    <EstadoVacioDia oscuro={isDarkMode} texto="Sin clases" />
                  )}
                </div>

                {/* Agregar nueva clase: siempre al pie de la tarjeta */}
                  {isEditable && courses.length > 0 && (
                    <button
                      onClick={() => setDiaNuevaClase(dia)}
                      style={{
                        flexShrink: 0,
                        marginTop: '12px',
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
            );
          })}
        </div>

        {isEditable && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
            <button
              onClick={() => setImportarAbierto(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '40px',
                padding: '0 18px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                background: 'var(--color-uni-suave)',
                color: 'var(--color-primary)'
              }}
            >
              <Upload size={16} />
              Subir horario
            </button>
          </div>
        )}

        {/* Mis cursos (solo el docente): tarjetas del mismo tamaño, con botones y, siempre al final, "Nuevo curso". El estudiante solo ve su horario. */}
        {isEditable && courses.length > 0 && (
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
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
                      padding: '0 6px 0 14px',
                      height: '76px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      minWidth: 0
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
                      <div title={curso.nameCourse} style={{
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        color: isDarkMode ? '#fff' : '#2b2b2b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {curso.nameCourse}
                      </div>
                      <div title={`Grupo ${curso.group}`} style={{
                        fontSize: '0.8rem',
                        color: isDarkMode ? '#aaa' : '#666',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {totalClases} {totalClases === 1 ? 'clase' : 'clases'} • Grupo {curso.group}
                      </div>
                    </div>
                    {isEditable && (
                      <MenuCurso
                        curso={curso}
                        oscuro={isDarkMode}
                        onEstudiantes={setCursoEstudiantes}
                        onEditar={(c) => setFormularioCurso({ abierto: true, curso: c })}
                      />
                    )}
                  </div>
                );
              })}

              {isEditable && (
                <button
                  type="button"
                  onClick={() => setFormularioCurso({ abierto: true, curso: null })}
                  style={{
                    height: '76px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'transparent',
                    border: '2px dashed var(--color-primary)',
                    borderRadius: '10px',
                    color: 'var(--color-uni)',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={18} /> Nuevo curso
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** Recuadro punteado de un día: "Sin clases", o "No tienes más clases" bajo las que ya hay. */
function EstadoVacioDia({ texto, oscuro, minAlto }: { texto: string; oscuro: boolean; minAlto?: number }) {
  return (
    <div style={{
      background: oscuro ? '#2d2d2d' : 'white',
      padding: '15px',
      flex: minAlto ? `1 0 ${minAlto}px` : 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      borderRadius: '10px',
      textAlign: 'center',
      color: oscuro ? '#999' : '#bbb',
      border: `2px dashed ${oscuro ? '#3d3d3d' : '#ddd'}`
    }}>
      <Inbox size={32} strokeWidth={1.5} style={{ marginBottom: '8px' }} />
      <p style={{ margin: 0, fontSize: '0.9rem' }}>{texto}</p>
    </div>
  );
}

/** Botones de icono de una tarjeta de curso: Estudiantes y Editar. */
function MenuCurso({ curso, oscuro, onEstudiantes, onEditar }: {
  curso: Course;
  oscuro: boolean;
  onEstudiantes?: (curso: Course) => void;
  onEditar?: (curso: Course) => void;
}) {
  const esSubgrupo = !!curso.groupId;
  const boton = (apagado: boolean): React.CSSProperties => ({
    width: '32px', height: '32px', padding: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '8px',
    background: 'transparent', color: oscuro ? '#ddd' : '#555', opacity: apagado ? 0.4 : 1, cursor: apagado ? 'not-allowed' : 'pointer',
  });

  return (
    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
      {onEstudiantes && (
        <button type="button" title="Estudiantes" aria-label={`Estudiantes de ${curso.nameCourse}`} onClick={() => onEstudiantes(curso)} style={boton(false)}>
          <Users size={16} color="currentColor" />
        </button>
      )}
      {onEditar && (
        <button
          type="button"
          disabled={esSubgrupo}
          title={esSubgrupo ? 'El nombre de un subgrupo lo define el curso principal' : 'Editar nombre y grupo'}
          aria-label={`Editar ${curso.nameCourse}`}
          onClick={() => onEditar(curso)}
          style={boton(esSubgrupo)}
        >
          <Pencil size={16} />
        </button>
      )}
    </div>
  );
}
