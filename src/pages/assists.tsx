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
      cargarAsistencias();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/asistencias/editar/${id}`);
  };

  const asistenciasFiltradas = filtroAsignatura
    ? asistencias.filter(a => a.asignatura === filtroAsignatura)
    : asistencias;

  if (loading) return <LoadingSpinner message="Cargando asistencias..." />;
  if (error) return <ErrorMessage message={error} onRetry={cargarAsistencias} />;

  return (
    <>
      <Header title="Gestión de Asistencias" showLogout={true} onLogout={handleLogout} />
      
      <div style={{ padding: '40px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <h2>Listado de Asistencias ({asistenciasFiltradas.length})</h2>
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigate('/home')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#9e9e9e',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🏠 Dashboard
            </button>
            
            <button 
              onClick={() => navigate('/reportes')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              📄 Reportes
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ 
          marginBottom: '20px',
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="radio"
              name="asignaturaFiltro"
              checked={filtroAsignatura === null}
              onChange={() => setFiltroAsignatura(null)}
            />
            Todas
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="radio"
              name="asignaturaFiltro"
              value="Matemáticas"
              checked={filtroAsignatura === 'Matemáticas'}
              onChange={(e) => setFiltroAsignatura(e.target.value)}
            />
            Matemáticas
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="radio"
              name="asignaturaFiltro"
              value="Física"
              checked={filtroAsignatura === 'Física'}
              onChange={(e) => setFiltroAsignatura(e.target.value)}
            />
            Física
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
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