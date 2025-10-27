// src/pages/EditarAsistenciaPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import asistenciaService from "../services/asistenciaService";
import type { Asistencia } from "../services/asistenciaService";
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export function EditarAsistenciaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [asistencia, setAsistencia] = useState<Asistencia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [estudianteNombre, setEstudianteNombre] = useState('');
  const [estudianteCedula, setEstudianteCedula] = useState('');
  const [estadoAsistencia, setEstadoAsistencia] = useState('');
  const [loadingNombre, setLoadingNombre] = useState(false);

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
      
      // Guarda la cédula (que viene en el campo estudiante)
      const cedula = data.estudiante;
      setEstudianteCedula(cedula);
      setEstadoAsistencia(data.estadoAsistencia);
      
      // ✅ AHORA busca el nombre SOLO cuando se carga la página de edición
      setLoadingNombre(true);
      const nombre = await asistenciaService.getNombreEstudiante(cedula);
      setEstudianteNombre(nombre);
      setLoadingNombre(false);
      
    } catch (err: any) {
      setError(err.message || 'Error al cargar asistencia');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;

    setSaving(true);
    try {
      await asistenciaService.update(id, {
        estadoAsistencia
      });
      
      alert('✅ Asistencia actualizada correctamente');
      navigate('/asistencias');
    } catch (err: any) {
      alert('❌ Error al actualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Cargando asistencia..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!asistencia) return <ErrorMessage message="Asistencia no encontrada" />;

  return (
    <>
      <Header title="Editar Asistencia" showLogout={true} onLogout={handleLogout} />
      
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '30px', textAlign: 'center' }}>
            Modificar Registro
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontWeight: 'bold'
              }}>
                Estudiante:
              </label>
              <div style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                fontSize: '1rem',
                backgroundColor: '#f5f5f5',
                color: '#333'
              }}>
                {loadingNombre ? (
                  <span style={{ color: '#666' }}>🔍 Buscando nombre...</span>
                ) : (
                  <>
                    {estudianteNombre}
                    {estudianteNombre !== estudianteCedula && (
                      <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '8px' }}>
                        (CC: {estudianteCedula})
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontWeight: 'bold'
              }}>
                Estado de Asistencia:
              </label>
              <select
                value={estadoAsistencia}
                onChange={(e) => setEstadoAsistencia(e.target.value)}
                required
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  fontSize: '1rem'
                }}
              >
                <option value="">Seleccionar...</option>
                <option value="Presente">Presente</option>
                <option value="Ausente">Ausente</option>
                <option value="Tiene Excusa">Tiene Excusa</option>
              </select>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                type="button"
                onClick={() => navigate('/asistencias')}
                disabled={saving}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#9e9e9e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1
                }}
              >
                Cancelar
              </button>
              
              <button 
                type="submit" 
                disabled={saving}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1
                }}
              >
                {saving ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}