// src/pages/ReportesPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Header } from '../components/Header';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import asistenciaService from "../services/asistenciaService";
import type { Asistencia } from "../services/asistenciaService";

/**
 * ReportesPage - Generación de reportes en diferentes formatos
 * Formatos disponibles: CSV, PDF, Excel
 */
export function ReportesPage() {
  const navigate = useNavigate();
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    cargarAsistencias();
  }, []);

  const cargarAsistencias = async () => {
    try {
      setLoading(true);
      const data = await asistenciaService.getAll();
      setAsistencias(data);
    } catch (err: any) {
      setError("Error al cargar datos para el reporte");
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

  const generarCSV = () => {
    setGenerando(true);
    try {
      const headers = ['ID', 'Estudiante', 'Asignatura', 'Fecha y Hora', 'Estado'];
      const rows = asistencias.map(a => [
        a.id,
        a.estudiante,
        a.asignatura || 'N/A',
        new Date(a.fechaYhora).toLocaleString('es-ES'),
        a.estadoAsistencia
      ]);

      let csv = headers.join(',') + '\n';
      rows.forEach(row => {
        csv += row.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asistencias_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert('✅ Reporte CSV generado correctamente');
    } catch (err) {
      alert('❌ Error al generar CSV');
    } finally {
      setGenerando(false);
    }
  };

  const generarPDF = () => {
    alert('🚧 Funcionalidad PDF en desarrollo. Se integrará con jsPDF.');
  };

  const generarExcel = () => {
    alert('🚧 Funcionalidad Excel en desarrollo. Se integrará con xlsx.');
  };

  if (loading) return <LoadingSpinner message="Cargando datos..." />;
  if (error) return <ErrorMessage message={error} onRetry={cargarAsistencias} />;

  return (
    <>
      <Header title="Generación de Reportes" showLogout={true} onLogout={handleLogout} />
      
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '30px', textAlign: 'center' }}>
          Exportar Asistencias
        </h2>

        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <p style={{ marginBottom: '20px', textAlign: 'center', color: '#666' }}>
            Total de registros: <strong>{asistencias.length}</strong>
          </p>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px' 
          }}>
            {/* Botón CSV */}
            <button
              onClick={generarCSV}
              disabled={generando}
              style={{
                padding: '20px',
                fontSize: '1.1rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📊</span>
              Exportar a CSV
            </button>

            {/* Botón PDF */}
            <button
              onClick={generarPDF}
              style={{
                padding: '20px',
                fontSize: '1.1rem',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📄</span>
              Exportar a PDF
            </button>

            {/* Botón Excel */}
            <button
              onClick={generarExcel}
              style={{
                padding: '20px',
                fontSize: '1.1rem',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📗</span>
              Exportar a Excel
            </button>
          </div>
        </div>

        <div style={{ 
          marginTop: '30px', 
          display: 'flex', 
          justifyContent: 'center',
          gap: '10px'
        }}>
          <button 
            onClick={() => navigate('/home')}
            style={{ padding: '12px 24px' }}
          >
            🏠 Dashboard
          </button>
          <button 
            onClick={() => navigate('/asistencias')}
            style={{ padding: '12px 24px' }}
          >
            📋 Ver Asistencias
          </button>
        </div>
      </div>
    </>
  );
}