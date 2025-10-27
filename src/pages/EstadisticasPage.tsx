// src/pages/EstadisticasPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Header } from '../components/Header';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import asistenciaService from "../services/asistenciaService";
import type { Asistencia } from "../services/asistenciaService";

export function EstadisticasPage() {
  const navigate = useNavigate();
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [nombresEstudiantes, setNombresEstudiantes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  // Detectar modo oscuro
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.body.classList.contains('dark-mode'));
    };

    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ show: true, message, type });
  };

  useEffect(() => {
    cargarAsistencias();
  }, []);

  const cargarAsistencias = async () => {
    try {
      setLoading(true);
      const data = await asistenciaService.getAll();
      setAsistencias(data);

      const cedulasUnicas = [...new Set(data.map(a => a.estudiante))];
      if (cedulasUnicas.length > 0) {
        const nombres = await asistenciaService.getNombresEstudiantes(cedulasUnicas);
        setNombresEstudiantes(nombres);
      }
    } catch (err: any) {
      console.error('Error al cargar asistencias:', err);
      showNotification('Error al cargar asistencias', 'error');
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

  // ============================================
  // CÁLCULOS ESTADÍSTICOS
  // ============================================

  const estadisticasGenerales = {
    total: asistencias.length,
    presentes: asistencias.filter(a => a.estadoAsistencia === 'Presente').length,
    ausentes: asistencias.filter(a => a.estadoAsistencia === 'Ausente').length,
    conExcusa: asistencias.filter(a => a.estadoAsistencia === 'Tiene Excusa').length,
    tasaAsistencia: asistencias.length > 0 
      ? ((asistencias.filter(a => a.estadoAsistencia === 'Presente').length / asistencias.length) * 100).toFixed(1)
      : 0
  };

  // Asistencias por estudiante
  const asistenciasPorEstudiante = (() => {
    const mapa = new Map<string, { presente: number; ausente: number; excusa: number; total: number }>();
    
    asistencias.forEach(a => {
      const cedula = a.estudiante;
      if (!mapa.has(cedula)) {
        mapa.set(cedula, { presente: 0, ausente: 0, excusa: 0, total: 0 });
      }
      
      const stats = mapa.get(cedula)!;
      stats.total++;
      
      if (a.estadoAsistencia === 'Presente') stats.presente++;
      else if (a.estadoAsistencia === 'Ausente') stats.ausente++;
      else if (a.estadoAsistencia === 'Tiene Excusa') stats.excusa++;
    });
    
    return Array.from(mapa.entries())
      .map(([cedula, stats]) => ({
        cedula,
        nombre: nombresEstudiantes[cedula] || cedula,
        ...stats,
        porcentaje: ((stats.presente / stats.total) * 100).toFixed(1)
      }))
      .sort((a, b) => parseFloat(b.porcentaje) - parseFloat(a.porcentaje));
  })();

  // Asistencias por curso
  const asistenciasPorCurso = (() => {
    const mapa = new Map<string, { presente: number; ausente: number; excusa: number; total: number }>();
    
    asistencias.forEach(a => {
      const curso = a.asignatura || 'Sin asignatura';
      if (!mapa.has(curso)) {
        mapa.set(curso, { presente: 0, ausente: 0, excusa: 0, total: 0 });
      }
      
      const stats = mapa.get(curso)!;
      stats.total++;
      
      if (a.estadoAsistencia === 'Presente') stats.presente++;
      else if (a.estadoAsistencia === 'Ausente') stats.ausente++;
      else if (a.estadoAsistencia === 'Tiene Excusa') stats.excusa++;
    });
    
    return Array.from(mapa.entries())
      .map(([curso, stats]) => ({
        curso,
        ...stats,
        porcentaje: ((stats.presente / stats.total) * 100).toFixed(1)
      }))
      .sort((a, b) => parseInt(b.porcentaje) - parseInt(a.porcentaje));
  })();

  // Estudiantes con menor asistencia
  const estudiantesBajaAsistencia = asistenciasPorEstudiante
    .filter(e => parseFloat(e.porcentaje) < 80)
    .slice(0, 5);

  if (loading) return <LoadingSpinner message="Cargando estadísticas..." />;

  return (
    <>
      {notification.show && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      <Header title="Estadísticas de Asistencias" showLogout={true} onLogout={handleLogout} />

      <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '30px', color: '#2b7a78' }}>📊 Panel de Estadísticas</h2>

        {/* KPIs Principales */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '10px' }}>Total Registros</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
              {estadisticasGenerales.total}
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>de asistencias</div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '10px' }}>Tasa Asistencia</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
              {estadisticasGenerales.tasaAsistencia}%
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>promedio general</div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '10px' }}>Presentes</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
              {estadisticasGenerales.presentes}
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>registros</div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '10px' }}>Ausentes</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
              {estadisticasGenerales.ausentes}
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>registros</div>
          </div>
        </div>

        {/* Distribución de Estados */}
        <div style={{
          background: isDarkMode ? '#2d2d2d' : 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          border: isDarkMode ? '1px solid #3d3d3d' : 'none'
        }}>
          <h3 style={{ marginTop: 0, color: '#2b7a78' }}>Distribución de Estados</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{
              padding: '15px',
              background: isDarkMode ? '#333' : '#f0f7ff',
              borderRadius: '8px',
              borderLeft: '4px solid #4facfe'
            }}>
              <div style={{ fontSize: '0.9rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '5px' }}>Presentes</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4facfe' }}>
                {estadisticasGenerales.presentes}
              </div>
              <div style={{ fontSize: '0.85rem', color: isDarkMode ? '#999' : '#999' }}>
                ({((estadisticasGenerales.presentes / estadisticasGenerales.total) * 100).toFixed(1)}%)
              </div>
            </div>

            <div style={{
              padding: '15px',
              background: isDarkMode ? '#333' : '#ffebee',
              borderRadius: '8px',
              borderLeft: '4px solid #f5576c'
            }}>
              <div style={{ fontSize: '0.9rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '5px' }}>Ausentes</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f5576c' }}>
                {estadisticasGenerales.ausentes}
              </div>
              <div style={{ fontSize: '0.85rem', color: isDarkMode ? '#999' : '#999' }}>
                ({((estadisticasGenerales.ausentes / estadisticasGenerales.total) * 100).toFixed(1)}%)
              </div>
            </div>

            <div style={{
              padding: '15px',
              background: isDarkMode ? '#333' : '#fff3e0',
              borderRadius: '8px',
              borderLeft: '4px solid #ff9800'
            }}>
              <div style={{ fontSize: '0.9rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '5px' }}>Con Excusa</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ff9800' }}>
                {estadisticasGenerales.conExcusa}
              </div>
              <div style={{ fontSize: '0.85rem', color: isDarkMode ? '#999' : '#999' }}>
                ({((estadisticasGenerales.conExcusa / estadisticasGenerales.total) * 100).toFixed(1)}%)
              </div>
            </div>
          </div>
        </div>

        {/* Asistencia por Curso */}
        <div style={{
          background: isDarkMode ? '#2d2d2d' : 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          border: isDarkMode ? '1px solid #3d3d3d' : 'none',
          overflowX: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: '#2b7a78' }}>📚 Asistencia por Curso</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: isDarkMode ? '2px solid #3d3d3d' : '2px solid #e0e0e0' }}>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#2b7a78' }}>Curso</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#2b7a78' }}>Presentes</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#2b7a78' }}>Ausentes</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#2b7a78' }}>Con Excusa</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#2b7a78' }}>Tasa (%)</th>
              </tr>
            </thead>
            <tbody>
              {asistenciasPorCurso.map((curso, idx) => (
                <tr key={idx} style={{ borderBottom: isDarkMode ? '1px solid #3d3d3d' : '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px', color: isDarkMode ? '#fff' : '#333' }}>{curso.curso}</td>
                  <td style={{ textAlign: 'center', padding: '12px', color: '#4facfe', fontWeight: 'bold' }}>
                    {curso.presente}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px', color: '#f5576c', fontWeight: 'bold' }}>
                    {curso.ausente}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px', color: '#ff9800', fontWeight: 'bold' }}>
                    {curso.excusa}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px' }}>
                    <div style={{
                      background: parseFloat(curso.porcentaje) >= 80 ? '#e8f5e9' : '#ffebee',
                      color: parseFloat(curso.porcentaje) >= 80 ? '#4caf50' : '#f44336',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      display: 'inline-block'
                    }}>
                      {curso.porcentaje}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Estudiantes con Baja Asistencia */}
        {estudiantesBajaAsistencia.length > 0 && (
          <div style={{
            background: isDarkMode ? '#2d2d2d' : '#ffebee',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: isDarkMode ? '2px solid #f5576c' : '2px solid #f5576c',
            marginBottom: '30px'
          }}>
            <h3 style={{ marginTop: 0, color: '#c62828' }}>⚠️ Estudiantes con Baja Asistencia (&lt;80%)</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              {estudiantesBajaAsistencia.map((estudiante, idx) => (
                <div key={idx} style={{
                  background: isDarkMode ? '#333' : 'white',
                  padding: '15px',
                  borderRadius: '8px',
                  borderLeft: '4px solid #f5576c'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px', color: isDarkMode ? '#fff' : '#333' }}>
                    {estudiante.nombre}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '10px' }}>
                    Cédula: {estudiante.cedula}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: isDarkMode ? '#aaa' : '#666' }}>
                    <span>Presente: <strong>{estudiante.presente}</strong></span>
                    <span>Ausente: <strong>{estudiante.ausente}</strong></span>
                    <span>Excusa: <strong>{estudiante.excusa}</strong></span>
                  </div>
                  <div style={{
                    marginTop: '10px',
                    padding: '8px',
                    background: '#ffe0e0',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#c62828'
                  }}>
                    Asistencia: {estudiante.porcentaje}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón Regresar */}
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              padding: '12px 30px',
              backgroundColor: '#2b7a78',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#1f5954';
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#2b7a78';
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            🏠 Regresar al Inicio
          </button>
        </div>
      </div>
    </>
  );
}