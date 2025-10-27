// src/pages/assists.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { AsistenciaTable } from '../components/AsistenciaTable';
import { Toast } from '../components/Toast';
import asistenciaService from "../services/asistenciaService";
import type { Asistencia } from "../services/asistenciaService";

export function AsistenciasPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [nombresEstudiantes, setNombresEstudiantes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroAsignatura, setFiltroAsignatura] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // Notificaciones
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });
  };

  useEffect(() => {
    cargarAsistencias();
  }, []);

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
      console.error("❌ Error al cargar asistencias:", err);
      const mensaje = err.message || "No se pudieron cargar las asistencias";
      setError(mensaje);
      showNotification(mensaje, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const asistencia = asistencias.find(a => a.id === id);

    if (!asistencia) {
      showNotification('Asistencia no encontrada', 'error');
      return;
    }

    if (!window.confirm(`¿Eliminar asistencia de ${asistencia.estudiante}?`)) return;

    try {
      await asistenciaService.delete(id);
      showNotification('✅ Asistencia eliminada', 'success');
      await cargarAsistencias();
    } catch (err: any) {
      showNotification(err.message || 'Error al eliminar', 'error');
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/asistencias/editar/${id}`);
  };

  // Aplicar todos los filtros
  const asistenciasFiltradas = asistencias.filter(a => {
    if (filtroAsignatura && a.asignatura !== filtroAsignatura) return false;
    if (filtroEstado && a.estadoAsistencia !== filtroEstado) return false;
    if (busqueda && !a.estudiante.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

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
            <h2 style={{ margin: 0, color: '#2b7a78' }}>
              📊 Gestión Avanzada de Asistencias
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              Mostrando {asistenciasFiltradas.length} de {asistencias.length} registros
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={cargarAsistencias}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              🔄 Actualizar
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
          <h3 style={{ marginBottom: '20px', color: '#2b7a78' }}>
            🔍 Filtros y Búsqueda
          </h3>

          {/* Barra de búsqueda */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#555'
            }}>
              Buscar por nombre de estudiante:
            </label>
            <input
              type="text"
              placeholder="Escribe el nombre del estudiante..."
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
          </div>

          {/* Filtros por asignatura */}
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
                  backgroundColor: filtroAsignatura === null ? '#2196F3' : '#e0e0e0',
                  color: filtroAsignatura === null ? 'white' : '#666',
                  fontWeight: filtroAsignatura === null ? '600' : '400',
                  transition: 'all 0.3s'
                }}
              >
                Todas ({asistencias.length})
              </button>

              {['Matemáticas', 'Física', 'Programación'].map(asignatura => {
                const count = asistencias.filter(a => a.asignatura === asignatura).length;
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
              })}
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
                Todos
              </button>

              {['Presente', 'Ausente', 'Tiene Excusa'].map(estado => {
                const count = asistencias.filter(a => a.estadoAsistencia === estado).length;
                const icon = estado === 'Presente' ? '✅' : estado === 'Ausente' ? '❌' : '📝';
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
                      transition: 'all 0.3s'
                    }}
                  >
                    {icon} {estado} ({count})
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
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🗑️ Limpiar todos los filtros
              </button>
            </div>
          )}
        </div>

        {/* Tabla o mensaje vacío */}
        {error && asistencias.length === 0 ? (
          <ErrorMessage message={error} onRetry={cargarAsistencias} />
        ) : asistenciasFiltradas.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '60px 20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔍</div>
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
              asistencias={asistenciasFiltradas}
              nombresEstudiantes={nombresEstudiantes}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </div>
        )}

        {/* Estadísticas rápidas */}
        {asistenciasFiltradas.length > 0 && (
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
              <div style={{ fontSize: '2rem', marginBottom: '5px' }}>📊</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196F3' }}>
                {asistenciasFiltradas.length}
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
              <div style={{ fontSize: '2rem', marginBottom: '5px' }}>✅</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>
                {asistenciasFiltradas.filter(a => a.estadoAsistencia === 'Presente').length}
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
              <div style={{ fontSize: '2rem', marginBottom: '5px' }}>❌</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f44336' }}>
                {asistenciasFiltradas.filter(a => a.estadoAsistencia === 'Ausente').length}
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
              <div style={{ fontSize: '2rem', marginBottom: '5px' }}>📝</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF9800' }}>
                {asistenciasFiltradas.filter(a => a.estadoAsistencia === 'Tiene Excusa').length}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>Con Excusa</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}