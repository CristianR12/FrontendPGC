import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import asistenciaService from '../services/asistenciaService';
import { Asistencia } from '../types/asistencia.types';

export function EditarAsistenciaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [asistencia, setAsistencia] = useState<Asistencia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Formulario
  const [estudiante, setEstudiante] = useState('');
  const [estadoAsistencia, setEstadoAsistencia] = useState('');
  const [asignatura, setAsignatura] = useState('');

  useEffect(() => {
    cargarAsistencia();
  }, [id]);

  const cargarAsistencia = async () => {
    if (!id) {
      setError('ID de asistencia no proporcionado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await asistenciaService.getById(id);
      setAsistencia(data);
      
      // Llenar formulario
      setEstudiante(data.estudiante);
      setEstadoAsistencia(data.estadoAsistencia);
      setAsignatura(data.asignatura || '');
    } catch (err: any) {
      setError(err.message || 'Error al cargar asistencia');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;

    setSaving(true);
    try {
      await asistenciaService.update(id, {
        estudiante,
        estadoAsistencia,
        asignatura: asignatura || undefined
      });
      
      alert('Asistencia actualizada correctamente');
      navigate('/asistencias');
    } catch (err: any) {
      alert('Error al actualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Cargando asistencia..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!asistencia) return <ErrorMessage message="Asistencia no encontrada" />;

  return (
    <>
      <Header title="Editar Asistencia" />
      
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label>Nombre del Estudiante:</label>
            <input
              type="text"
              value={estudiante}
              onChange={(e) => setEstudiante(e.target.value)}
              required
              disabled={saving}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label>Estado de Asistencia:</label>
            <select
              value={estadoAsistencia}
              onChange={(e) => setEstadoAsistencia(e.target.value)}
              required
              disabled={saving}
            >
              <option value="">Seleccionar...</option>
              <option value="Presente">Presente</option>
              <option value="Ausente">Ausente</option>
              <option value="Tiene Excusa">Tiene Excusa</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label>Asignatura:</label>
            <select
              value={asignatura}
              onChange={(e) => setAsignatura(e.target.value)}
              disabled={saving}
            >
              <option value="">Seleccionar...</option>
              <option value="Matemáticas">Matemáticas</option>
              <option value="Física">Física</option>
              <option value="Programación">Programación</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate('/asistencias')}
              disabled={saving}
            >
              Cancelar
            </button>
            
            <button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}