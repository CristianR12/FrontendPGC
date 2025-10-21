// src/pages/AsistenciasPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Header } from '../components/Header';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { AsistenciaTable } from '../components/AsistenciaTable';
import asistenciaService from "../services/asistenciaService";
import type { Asistencia } from "../services/asistenciaService";

/**
 * AsistenciasPage - Listado y gestión de asistencias
 * Incluye:
 * - Filtros por asignatura
 * - Botones para editar y eliminar
 * - Navegación a reportes y nueva asistencia
 */
export function AsistenciasPage() {
  const navigate = useNavigate();
  
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroAsignatura, setFiltroAsignatura] = useState<string | null>(null);

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
      console.error("Error al cargar asistencias:", err);
      setError("No se pudieron cargar las asistencias");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta asistencia?')) return;

    try {
      await asistenciaService.delete(id);
      alert('Asistencia eliminada correctamente');
      cargarAsistencias(); // Recargar lista
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/asistencias/editar/${id}`);
  };

  // Filtrar asistencias por asignatura
  const asistenciasFiltradas = filtroAsignatura
    ? asistencias.filter(a => a.asignatura === filtroAsignatura)
    : asistencias;

  if (loading) return <LoadingSpinner message="Cargando asistencias..." />;
  if (error) return <ErrorMessage message={error} onRetry={cargarAsistencias} />;

  return (
    <>
      <Header title="Gestión de Asistencias" showLogout={true} onLogout={handleLogout} />
      
      <div style={{ padding: '40px' }}>
        {/* Cabecera con botones */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px' 
        }}>
          <h2>Listado de Asistencias ({asistenciasFiltradas.length})</h2>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn-secondary"
              onClick={() => navigate('/home')}
            >
              🏠 Dashboard
            </button>
            
            <button 
              className="btn-primary"
              onClick={() => navigate('/asistencias/nueva')}
            >
              ➕ Nueva Asistencia
            </button>
            
            <button 
              className="btn-success"
              onClick={() => navigate('/reportes')}
            >
              📄 Generar Reportes
            </button>
          </div>
        </div>

        {/* Filtros por asignatura */}
        <div className="radios" style={{ marginBottom: '20px' }}>
          <label>
            <input
              type="radio"
              name="asignaturaFiltro"
              checked={filtroAsignatura === null}
              onChange={() => setFiltroAsignatura(null)}
            />
            Todas
          </label>
          <label>
            <input
              type="radio"
              name="asignaturaFiltro"
              value="Matemáticas"
              checked={filtroAsignatura === 'Matemáticas'}
              onChange={(e) => setFiltroAsignatura(e.target.value)}
            />
            Matemáticas
          </label>
          <label>
            <input
              type="radio"
              name="asignaturaFiltro"
              value="Física"
              checked={filtroAsignatura === 'Física'}
              onChange={(e) => setFiltroAsignatura(e.target.value)}
            />
            Física
          </label>
          <label>
            <input
              type="radio"
              name="asignaturaFiltro"
              value="Programación"
              checked={filtroAsignatura === 'Programación'}
              onChange={(e) => setFiltroAsignatura(e.target.value)}
            />
            Programación
          </label>
        </div>

        {/* Tabla de asistencias */}
        <AsistenciaTable
          asistencias={asistenciasFiltradas}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      </div>
    </>
  );
}