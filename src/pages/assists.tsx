// src/pages/assists.tsx
import { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { AsistenciaTable } from '../components/AsistenciaTable';
import { Toast } from '../components/Toast';
import asistenciaService from "../services/asistenciaService";
import type { Asistencia, PaginaTodas } from "../services/asistenciaService";
import { EditarAsistenciaModal } from "../components/EditarAsistenciaModal";
import { GenerarReporteModal } from "../components/GenerarReporteModal";
import horarioApiService from "../services/horarioApiService";
import type { Course } from "../services/horarioApiService";
import { etiquetaAsignatura } from "../utils/filtroInicio";
import { todayDateStringBogota } from "../utils/vistaInicioAsistencias";
import {
  ChartBarIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentCheckIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';

export function AsistenciasPage() {
  const [datos, setDatos] = useState<PaginaTodas | null>(null);
  const [reporteAbierto, setReporteAbierto] = useState(false);
  const [cursos, setCursos] = useState<Course[]>([]);
  const [asistenciaEditando, setAsistenciaEditando] = useState<Asistencia | null>(null);
  const [nombresEstudiantes, setNombresEstudiantes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [cargandoPagina, setCargandoPagina] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroAsignatura, setFiltroAsignatura] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [pagina, setPagina] = useState<{ clave: string; n: number }>({ clave: '', n: 1 });

  // Al cambiar cualquier filtro se vuelve a la primera página
  const claveFiltro = `${filtroAsignatura}|${filtroEstado}|${busquedaAplicada}`;
  const paginaActual = pagina.clave === claveFiltro ? pagina.n : 1;

  // Notificaciones
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });
  };

  // Cursos del docente: el reporte necesita saber en qué asignaturas, grupos y días hay clase
  useEffect(() => {
    horarioApiService.getHorariosProfesor().then(setCursos).catch(() => undefined);
  }, []);

  // La búsqueda espera a que termines de escribir para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => setBusquedaAplicada(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Una página a la vez: el servidor filtra, cuenta y envía solo esa sección
  useEffect(() => {
    let cancelado = false;
    setCargandoPagina(true);
    setError(null);
    asistenciaService.getTodas({ asignatura: filtroAsignatura, estado: filtroEstado, q: busquedaAplicada, page: paginaActual })
      .then((d) => {
        if (cancelado) return;
        setDatos(d);
        setNombresEstudiantes((prev) => ({ ...prev, ...d.nombres }));
      })
      .catch((err: any) => {
        if (cancelado) return;
        const mensaje = err.message || "No se pudieron cargar las asistencias";
        setError(mensaje);
        showNotification(mensaje, 'error');
      })
      .finally(() => {
        if (cancelado) return;
        setCargandoPagina(false);
        setLoading(false);
      });
    return () => { cancelado = true; };
  }, [claveFiltro, paginaActual, recarga]);

  const handleDelete = async (id: string) => {
    const asistencia = datos?.filas.find(a => a.id === id);

    if (!asistencia) {
      showNotification('Asistencia no encontrada', 'error');
      return;
    }

    const nombreEstudiante = nombresEstudiantes[asistencia.estudiante] || asistencia.estudiante;
    if (!window.confirm(`¿Eliminar asistencia de ${nombreEstudiante}?`)) return;

    try {
      await asistenciaService.delete(id);
      showNotification('Asistencia eliminada', 'success');
      setRecarga((n) => n + 1);
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar', 'error');
    }
  };

  const handleEdit = (id: string) => {
    const fila = datos?.filas.find((a) => a.id === id);
    if (fila) setAsistenciaEditando(fila);
  };

  // Todo viene ya filtrado y contado por el servidor
  const resumen = datos?.resumen ?? { total: 0, presentes: 0, ausentes: 0, conExcusa: 0 };
  const getCountAsignatura = (asignatura: string) => datos?.asignaturas.find(a => a.nombre === asignatura)?.total ?? 0;
  const getCountEstado = (estado: string) => datos?.estados[estado] ?? 0;
  const asignaturasUnicas = (datos?.asignaturas ?? []).map(a => a.nombre);

  if (loading) return <LoadingSpinner message="Cargando asistencias..." />;

  return (
    <>
      {notification.show && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      {reporteAbierto && (() => {
        // La asignatura que tengas filtrada ("CURSO" o "CURSO - Grupo X") llega elegida en el reporte
        const u = filtroAsignatura ? cursos.find((c) => etiquetaAsignatura(c) === filtroAsignatura) : undefined;
        return (
          <GenerarReporteModal
            cursos={cursos}
            inicial={{ curso: u?.nameCourse ?? null, unidadId: u?.id ?? null, fecha: null, hora: null }}
            hoy={todayDateStringBogota()}
            oscuro={document.body.classList.contains('dark-mode')}
            onCerrar={() => setReporteAbierto(false)}
            onMensaje={showNotification}
          />
        );
      })()}

      {asistenciaEditando && (
        <EditarAsistenciaModal
          asistencia={asistenciaEditando}
          nombre={nombresEstudiantes[asistenciaEditando.estudiante]}
          oscuro={document.body.classList.contains('dark-mode')}
          onCerrar={() => setAsistenciaEditando(null)}
          onGuardado={(mensaje) => {
            setAsistenciaEditando(null);
            showNotification(mensaje, 'success');
            setRecarga((n) => n + 1);
          }}
        />
      )}

      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header con acciones */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#2b7a78', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ChartBarIcon style={{ width: 28, height: 28 }} />
              Todas las asistencias
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              Histórico completo: {resumen.total} de {datos?.totalGeneral ?? 0} registros visibles con los filtros actuales
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setRecarga((n) => n + 1)}
              disabled={cargandoPagina}
              style={{
                padding: '10px 20px',
                backgroundColor: '#585858ff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: cargandoPagina ? 'not-allowed' : 'pointer',
                opacity: cargandoPagina ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ArrowPathIcon style={{ width: 18, height: 18 }} />
              Actualizar
            </button>
            <button
              onClick={() => setReporteAbierto(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <DocumentTextIcon style={{ width: 18, height: 18 }} />
              Generar reporte
            </button>
          </div>
        </div>

        {/* Panel de Filtros Avanzados */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '12px',
          marginBottom: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#2b7a78', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MagnifyingGlassIcon style={{ width: 24, height: 24 }} />
            Filtros y Búsqueda
          </h3>

          {/* Barra de búsqueda */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#555'
            }}>
              Buscar por nombre o cédula de estudiante:
            </label>
            <input
              type="text"
              placeholder="Escribe el nombre o cédula del estudiante..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '500px',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #e0e0e0',
                fontSize: '1rem'
              }}
            />
            {busqueda && (
              <p style={{ margin: '8px 0 0 0', color: '#999', fontSize: '0.9rem' }}>
                Se encontraron {resumen.total} resultado(s)
              </p>
            )}
          </div>

          {/* Filtros por asignatura - DINÁMICOS desde Firebase */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#555'
            }}>
              Filtrar por asignatura:
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setFiltroAsignatura(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filtroAsignatura === null ? '#667eea' : '#e0e0e0',
                  color: filtroAsignatura === null ? 'white' : '#666',
                  fontWeight: filtroAsignatura === null ? '600' : '400',
                  transition: 'all 0.3s'
                }}
              >
                Todas ({datos?.totalGeneral ?? 0})
              </button>

              {asignaturasUnicas.length > 0 ? (
                asignaturasUnicas.map(asignatura => {
                  const count = getCountAsignatura(asignatura);
                  return (
                    <button
                      key={asignatura}
                      onClick={() => setFiltroAsignatura(asignatura)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: filtroAsignatura === asignatura ? '#2196F3' : '#e0e0e0',
                        color: filtroAsignatura === asignatura ? 'white' : '#666',
                        fontWeight: filtroAsignatura === asignatura ? '600' : '400',
                        transition: 'all 0.3s'
                      }}
                    >
                      {asignatura} ({count})
                    </button>
                  );
                })
              ) : (
                <p style={{ color: '#999', fontStyle: 'italic' }}>
                  No hay asignaturas disponibles
                </p>
              )}
            </div>
          </div>

          {/* Filtros por estado */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#555'
            }}>
              Filtrar por estado:
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setFiltroEstado(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filtroEstado === null ? '#4CAF50' : '#e0e0e0',
                  color: filtroEstado === null ? 'white' : '#666',
                  fontWeight: filtroEstado === null ? '600' : '400',
                  transition: 'all 0.3s'
                }}
              >
                Todos ({datos?.totalGeneral ?? 0})
              </button>

              {['Presente', 'Ausente', 'Tiene Excusa'].map(estado => {
                const count = getCountEstado(estado);
                const Icon = estado === 'Presente' ? CheckCircleIcon : estado === 'Ausente' ? XCircleIcon : DocumentCheckIcon;
                return (
                  <button
                    key={estado}
                    onClick={() => setFiltroEstado(estado)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: filtroEstado === estado ? '#4CAF50' : '#e0e0e0',
                      color: filtroEstado === estado ? 'white' : '#666',
                      fontWeight: filtroEstado === estado ? '600' : '400',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Icon style={{ width: 18, height: 18 }} />
                    {estado} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botón limpiar filtros */}
          {(filtroAsignatura || filtroEstado || busqueda) && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={() => {
                  setFiltroAsignatura(null);
                  setFiltroEstado(null);
                  setBusqueda('');
                  setBusquedaAplicada('');
                setBusquedaAplicada('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
              >
                <TrashIcon style={{ width: 18, height: 18 }} />
                Limpiar todos los filtros
              </button>
            </div>
          )}
        </div>

        {/* Tabla o mensaje vacío */}
        {error && !datos ? (
          <ErrorMessage message={error} onRetry={() => setRecarga((n) => n + 1)} />
        ) : resumen.total === 0 ? (
          <div style={{
            background: 'white',
            padding: '60px 20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>
              <MagnifyingGlassIcon style={{ width: 80, height: 80, margin: '0 auto', color: '#999' }} />
            </div>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>
              No se encontraron resultados
            </h3>
            <p style={{ color: '#999', marginBottom: '20px' }}>
              {busqueda
                ? `No hay estudiantes que coincidan con "${busqueda}"`
                : 'No hay asistencias con los filtros seleccionados'
              }
            </p>
            <button
              onClick={() => {
                setFiltroAsignatura(null);
                setFiltroEstado(null);
                setBusqueda('');
                setBusquedaAplicada('');
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <AsistenciaTable
              asistencias={datos?.filas ?? []}
              nombresEstudiantes={nombresEstudiantes}
              onDelete={handleDelete}
              onEdit={handleEdit}
              paginacion={{
                pagina: datos?.page ?? 1,
                totalPaginas: datos?.totalPaginas ?? 1,
                total: resumen.total,
                cargando: cargandoPagina,
                onCambiar: (n) => setPagina({ clave: claveFiltro, n }),
              }}
            />
          </div>
        )}

        {/* Estadísticas rápidas */}
        {resumen.total > 0 && (
          <div style={{
            marginTop: '30px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px'
          }}>
            <div style={{
              background: 'white',
              padding: '15px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ marginBottom: '5px' }}>
                <SparklesIcon style={{ width: 32, height: 32, margin: '0 auto', color: '#2196F3' }} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196F3' }}>
                {resumen.total}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Total</div>
            </div>

            <div style={{
              background: 'white',
              padding: '15px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ marginBottom: '5px' }}>
                <CheckCircleIcon style={{ width: 32, height: 32, margin: '0 auto', color: '#4CAF50' }} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>
                {resumen.presentes}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Presentes</div>
            </div>

            <div style={{
              background: 'white',
              padding: '15px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ marginBottom: '5px' }}>
                <XCircleIcon style={{ width: 32, height: 32, margin: '0 auto', color: '#f44336' }} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f44336' }}>
                {resumen.ausentes}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Ausentes</div>
            </div>

            <div style={{
              background: 'white',
              padding: '15px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ marginBottom: '5px' }}>
                <DocumentCheckIcon style={{ width: 32, height: 32, margin: '0 auto', color: '#FF9800' }} />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF9800' }}>
                {resumen.conExcusa}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Con Excusa</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}