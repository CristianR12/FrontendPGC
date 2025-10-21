import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { AsistenciaTable } from '../components/AsistenciaTable';
import { useAsistencias } from '../hooks/useAsistencias';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export function AsistenciasPage() {
  const navigate = useNavigate();
  const { asistencias, loading, error, refetch, deleteAsistencia } = useAsistencias();
  const [filtroAsignatura, setFiltroAsignatura] = useState<string | null>(null);

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
      await deleteAsistencia(id);
      alert('Asistencia eliminada correctamente');
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
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <>
      <Header title="Gestión de Asistencias" showLogout={true} onLogout={handleLogout} />
      
      <div style={{ padding: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2>Listado de Asistencias ({asistenciasFiltradas.length})</h2>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn-secondary"
              onClick={() => navigate('/home')}
            >
              Volver al Dashboard
            </button>
            
            <button 
              className="btn-primary"
              onClick={() => navigate('/asistencias/nueva')}
            >
              Nueva Asistencia
            </button>
            
            <button 
              className="btn-success"
              onClick={() => navigate('/reportes')}
            >
              Generar Reportes
            </button>
          </div>
        </div>

        {/* Filtros */}
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

        <AsistenciaTable
          asistencias={asistenciasFiltradas}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      </div>
    </>
  );
}