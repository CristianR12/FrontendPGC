// src/pages/AnalisisPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Header } from '../components/Header';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast } from '../components/Toast';
import asistenciaService from "../services/asistenciaService";
import type { Asistencia } from "../services/asistenciaService";
import {
  ChartBarIcon,
  CalendarIcon,
  AcademicCapIcon,
  TrophyIcon,
  HomeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';

export function AnalisisPage() {
  const navigate = useNavigate();
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [nombresEstudiantes, setNombresEstudiantes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [cursosUnicos, setCursosUnicos] = useState<string[]>([]);
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

      const cursos = [...new Set(data.map(a => a.asignatura).filter(Boolean))].sort();
      setCursosUnicos(cursos as string[]);

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

  // Filtrar datos
  const asistenciasFiltradas = asistencias.filter(a => {
    if (filtroFecha && !a.fechaYhora?.toString().startsWith(filtroFecha)) return false;
    if (filtroCurso && a.asignatura !== filtroCurso) return false;
    return true;
  });

  // ============================================
  // ANÁLISIS AVANZADOS
  // ============================================

  // Tendencia de asistencia por día
  const tendenciaAsistencia = (() => {
    const mapa = new Map<string, { presente: number; total: number }>();
    
    asistenciasFiltradas.forEach(a => {
      const fecha = a.fechaYhora?.toString().split('T')[0] || 'Sin fecha';
      if (!mapa.has(fecha)) {
        mapa.set(fecha, { presente: 0, total: 0 });
      }
      
      const stats = mapa.get(fecha)!;
      stats.total++;
      if (a.estadoAsistencia === 'Presente') stats.presente++;
    });
    
    return Array.from(mapa.entries())
      .map(([fecha, stats]) => ({
        fecha,
        porcentaje: stats.total > 0 ? ((stats.presente / stats.total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  })();

  // Ranking de estudiantes
  const rankingEstudiantes = (() => {
    const mapa = new Map<string, { presente: number; total: number }>();
    
    asistenciasFiltradas.forEach(a => {
      if (!mapa.has(a.estudiante)) {
        mapa.set(a.estudiante, { presente: 0, total: 0 });
      }
      
      const stats = mapa.get(a.estudiante)!;
      stats.total++;
      if (a.estadoAsistencia === 'Presente') stats.presente++;
    });
    
    return Array.from(mapa.entries())
      .map(([cedula, stats]) => ({
        cedula,
        nombre: nombresEstudiantes[cedula] || cedula,
        presente: stats.presente,
        total: stats.total,
        porcentaje: stats.total > 0 ? ((stats.presente / stats.total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => parseFloat(b.porcentaje) - parseFloat(a.porcentaje));
  })();

  // Análisis por día de semana
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const analisisPorDiaSemana = (() => {
    const mapa = new Map<number, { presente: number; total: number }>();
    
    asistenciasFiltradas.forEach(a => {
      try {
        const fecha = new Date(a.fechaYhora);
        const diaSemana = fecha.getDay();
        
        if (!mapa.has(diaSemana)) {
          mapa.set(diaSemana, { presente: 0, total: 0 });
        }
        
        const stats = mapa.get(diaSemana)!;
        stats.total++;
        if (a.estadoAsistencia === 'Presente') stats.presente++;
      } catch (e) {
        // Ignorar errores de parseo
      }
    });
    
    return diasSemana.map((dia, idx) => {
      const stats = mapa.get(idx) || { presente: 0, total: 0 };
      return {
        dia,
        presente: stats.presente,
        total: stats.total,
        porcentaje: stats.total > 0 ? ((stats.presente / stats.total) * 100).toFixed(1) : '0'
      };
    }).filter(d => d.total > 0);
  })();

  // Estadísticas por curso
  const estadisticasPorCurso = (() => {
    const mapa = new Map<string, { presente: number; ausente: number; excusa: number; total: number }>();
    
    asistenciasFiltradas.forEach(a => {
      const curso = a.asignatura || 'Sin asignatura';
      if (!mapa.has(curso)) {
        mapa.set(curso, { presente: 0, ausente: 0, excusa: 0, total: 0 });
      }
      
      const stats = mapa.get(curso)!;
      stats.total++;
      
      if (a.estadoAsistencia === 'Presente') stats.presente++;
      else if (a.estadoAsistencia === 'Ausente') stats.ausente++;
      else stats.excusa++;
    });
    
    return Array.from(mapa.entries())
      .map(([curso, stats]) => ({
        curso,
        ...stats,
        porcentaje: stats.total > 0 ? ((stats.presente / stats.total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => parseFloat(b.porcentaje) - parseFloat(a.porcentaje));
  })();

  // ✅ Estudiantes con retraso
  const estudiantesConRetraso = (() => {
    const mapa = new Map<string, { presente: number; conRetraso: number; total: number }>();
    
    asistenciasFiltradas.forEach(a => {
      if (!mapa.has(a.estudiante)) {
        mapa.set(a.estudiante, { presente: 0, conRetraso: 0, total: 0 });
      }
      
      const stats = mapa.get(a.estudiante)!;
      stats.total++;
      if (a.estadoAsistencia === 'Presente') {
        stats.presente++;
        if (a.late) stats.conRetraso++;
      }
    });
    
    return Array.from(mapa.entries())
      .map(([cedula, stats]) => ({
        cedula,
        nombre: nombresEstudiantes[cedula] || cedula,
        ...stats,
        porcentajeRetraso: stats.presente > 0 ? ((stats.conRetraso / stats.presente) * 100).toFixed(1) : '0'
      }))
      .filter(e => e.conRetraso > 0)
      .sort((a, b) => parseFloat(b.porcentajeRetraso) - parseFloat(a.porcentajeRetraso));
  })();

  // Tasas generales
  const tasasGenerales = (() => {
    const total = asistenciasFiltradas.length;
    if (total === 0) return { presentes: '0', ausentes: '0', excusas: '0' };
    
    const presentes = asistenciasFiltradas.filter(a => a.estadoAsistencia === 'Presente').length;
    const ausentes = asistenciasFiltradas.filter(a => a.estadoAsistencia === 'Ausente').length;
    const excusas = asistenciasFiltradas.filter(a => a.estadoAsistencia === 'Tiene Excusa').length;
    
    return {
      presentes: ((presentes / total) * 100).toFixed(1),
      ausentes: ((ausentes / total) * 100).toFixed(1),
      excusas: ((excusas / total) * 100).toFixed(1)
    };
  })();

  if (loading) return <LoadingSpinner message="Cargando análisis..." />;

  return (
    <>
      {notification.show && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      <Header title="Análisis Avanzado" showLogout={true} onLogout={handleLogout} />

      <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '25px', color: '#2b7a78', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ChartBarIcon style={{ width: '32px', height: '32px' }} />
          Análisis Avanzado de Asistencias
        </h2>

        {/* Filtros */}
        <div style={{
          background: isDarkMode ? '#2d2d2d' : 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          border: isDarkMode ? '1px solid #3d3d3d' : 'none'
        }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginBottom: '8px', color: isDarkMode ? '#fff' : '#333' }}>
              <CalendarIcon style={{ width: '18px', height: '18px' }} />
              Filtrar por Fecha
            </label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: isDarkMode ? '2px solid #3d3d3d' : '2px solid #e0e0e0',
                fontSize: '1rem',
                boxSizing: 'border-box',
                background: isDarkMode ? '#3d3d3d' : 'white',
                color: isDarkMode ? '#fff' : '#333'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginBottom: '8px', color: isDarkMode ? '#fff' : '#333' }}>
              <AcademicCapIcon style={{ width: '18px', height: '18px' }} />
              Filtrar por Curso
            </label>
            <select
              value={filtroCurso}
              onChange={(e) => setFiltroCurso(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: isDarkMode ? '2px solid #3d3d3d' : '2px solid #e0e0e0',
                fontSize: '1rem',
                boxSizing: 'border-box',
                background: isDarkMode ? '#3d3d3d' : 'white',
                color: isDarkMode ? '#fff' : '#333'
              }}
            >
              <option value="">-- Todos los cursos --</option>
              {cursosUnicos.map(curso => (
                <option key={curso} value={curso}>{curso}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: 'transparent', userSelect: 'none' }}>
              -
            </label>
            <button
              onClick={() => {
                setFiltroFecha('');
                setFiltroCurso('');
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: '#2b7a78',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.3s',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = '#1f5954';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = '#2b7a78';
              }}
            >
              <ArrowPathIcon style={{ width: '18px', height: '23px' }} />
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Presentes</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{tasasGenerales.presentes}%</div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Ausentes</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{tasasGenerales.ausentes}%</div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Con Excusa</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{tasasGenerales.excusas}%</div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Registros</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{asistenciasFiltradas.length}</div>
          </div>
        </div>

        {/* Tendencia */}
        <div style={{
          background: isDarkMode ? '#2d2d2d' : 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          border: isDarkMode ? '1px solid #3d3d3d' : 'none',
          overflowX: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: '#2b7a78', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ChartBarIcon style={{ width: '24px', height: '24px' }} />
            Tendencia de Asistencia
          </h3>
          
          <div style={{ display: 'flex', gap: '10px', minWidth: '100%' }}>
            {tendenciaAsistencia.map((item, idx) => (
              <div key={idx} style={{
                flex: '0 0 auto',
                textAlign: 'center',
                padding: '15px',
                background: isDarkMode ? '#333' : '#f5f5f5',
                borderRadius: '8px',
                minWidth: '120px'
              }}>
                <div style={{ fontSize: '0.85rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '8px' }}>
                  {new Date(item.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  color: parseFloat(item.porcentaje) >= 80 ? '#4caf50' : '#f44336',
                  marginBottom: '5px'
                }}>
                  {item.porcentaje}%
                </div>
                <div style={{ 
                  height: '4px', 
                  background: isDarkMode ? '#555' : '#e0e0e0',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${parseFloat(item.porcentaje)}%`,
                    background: parseFloat(item.porcentaje) >= 80 ? '#4caf50' : '#f44336'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Análisis por día de semana */}
        {analisisPorDiaSemana.length > 0 && (
          <div style={{
            background: isDarkMode ? '#2d2d2d' : 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginBottom: '30px',
            border: isDarkMode ? '1px solid #3d3d3d' : 'none'
          }}>
            <h3 style={{ marginTop: 0, color: '#2b7a78', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarIcon style={{ width: '24px', height: '24px' }} />
              Análisis por Día de Semana
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
              {analisisPorDiaSemana.map((item, idx) => (
                <div key={idx} style={{
                  padding: '15px',
                  background: isDarkMode ? '#333' : '#f0f7ff',
                  borderRadius: '8px',
                  borderLeft: '4px solid #2196F3'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#2b7a78' }}>
                    {item.dia}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '5px' }}>
                    Presentes: {item.presente} / {item.total}
                  </div>
                  <div style={{
                    padding: '8px',
                    background: '#e3f2fd',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1976d2'
                  }}>
                    {item.porcentaje}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✅ ESTUDIANTES CON RETRASO */}
        {estudiantesConRetraso.length > 0 && (
          <div style={{
            background: isDarkMode ? '#2d2d2d' : 'white',
            padding: '25px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            marginBottom: '30px',
            border: isDarkMode ? '1px solid #3d3d3d' : 'none',
            borderLeft: '5px solid #FFD700'
          }}>
            <h3 style={{ marginTop: 0, color: '#FF8C00', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg style={{ width: '24px', height: '24px' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
              Estudiantes que Llegan Tarde
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              {estudiantesConRetraso.map((estudiante, idx) => (
                <div key={idx} style={{
                  background: isDarkMode ? '#333' : '#fff8e1',
                  padding: '15px',
                  borderRadius: '8px',
                  borderLeft: '4px solid #FFD700'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px', color: isDarkMode ? '#fff' : '#333' }}>
                    {estudiante.nombre}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '10px' }}>
                    Cédula: {estudiante.cedula}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '10px' }}>
                    <span>Presentes: <strong>{estudiante.presente}</strong></span>
                    <span>Con Retraso: <strong>{estudiante.conRetraso}</strong></span>
                  </div>
                  <div style={{
                    padding: '8px',
                    background: '#FFE082',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#FF8C00',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}>
                    <svg style={{ width: '16px', height: '16px' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    Retrasos: {estudiante.porcentajeRetraso}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 10 Estudiantes */}
        <div style={{
          background: isDarkMode ? '#2d2d2d' : 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          border: isDarkMode ? '1px solid #3d3d3d' : 'none',
          overflowX: 'auto'
        }}>
          <h3 style={{ marginTop: 0, color: '#2b7a78', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrophyIcon style={{ width: '24px', height: '24px' }} />
            Top 10 Estudiantes
          </h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: isDarkMode ? '2px solid #3d3d3d' : '2px solid #e0e0e0' }}>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#2b7a78' }}>#</th>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#2b7a78' }}>Estudiante</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#2b7a78' }}>Presente</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#2b7a78' }}>Total</th>
                <th style={{ textAlign: 'center', padding: '12px', fontWeight: 'bold', color: isDarkMode ? '#fff' : '#2b7a78' }}>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {rankingEstudiantes.slice(0, 10).map((estudiante, idx) => (
                <tr key={idx} style={{ borderBottom: isDarkMode ? '1px solid #3d3d3d' : '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#2b7a78' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '12px', color: isDarkMode ? '#fff' : '#333' }}>
                    <div style={{ fontWeight: '600' }}>{estudiante.nombre}</div>
                    <div style={{ fontSize: '0.85rem', color: isDarkMode ? '#aaa' : '#999' }}>{estudiante.cedula}</div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px', color: '#4facfe', fontWeight: 'bold' }}>
                    {estudiante.presente}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px', color: isDarkMode ? '#aaa' : '#666' }}>
                    {estudiante.total}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px' }}>
                    <div style={{
                      background: parseFloat(estudiante.porcentaje) >= 80 ? '#e8f5e9' : '#ffebee',
                      color: parseFloat(estudiante.porcentaje) >= 80 ? '#4caf50' : '#f44336',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      display: 'inline-block'
                    }}>
                      {estudiante.porcentaje}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Desempeño por Curso */}
        <div style={{
          background: isDarkMode ? '#2d2d2d' : 'white',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          border: isDarkMode ? '1px solid #3d3d3d' : 'none'
        }}>
          <h3 style={{ marginTop: 0, color: '#2b7a78', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ChartBarIcon style={{ width: '24px', height: '24px' }} />
            Desempeño por Curso
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {estadisticasPorCurso.map((curso, idx) => (
              <div key={idx} style={{
                padding: '15px',
                background: isDarkMode ? '#333' : '#f9f9f9',
                borderRadius: '8px',
                border: isDarkMode ? '1px solid #555' : '1px solid #e0e0e0'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#2b7a78', fontSize: '0.95rem' }}>
                  {curso.curso}
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.85rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '3px' }}>Presentes</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      flex: 1,
                      height: '8px',
                      background: isDarkMode ? '#555' : '#e0e0e0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(curso.presente / curso.total) * 100}%`,
                        background: '#4facfe'
                      }} />
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#4facfe', minWidth: '40px' }}>
                      {curso.presente}/{curso.total}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.85rem', color: isDarkMode ? '#aaa' : '#666', marginBottom: '3px' }}>Ausentes</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      flex: 1,
                      height: '8px',
                      background: isDarkMode ? '#555' : '#e0e0e0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(curso.ausente / curso.total) * 100}%`,
                        background: '#f5576c'
                      }} />
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#f5576c', minWidth: '40px' }}>
                      {curso.ausente}
                    </span>
                  </div>
                </div>

                <div style={{
                  padding: '8px 12px',
                  background: parseFloat(curso.porcentaje) >= 80 ? '#e8f5e9' : '#ffebee',
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: parseFloat(curso.porcentaje) >= 80 ? '#4caf50' : '#f44336'
                }}>
                  Tasa: {curso.porcentaje}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botón Regresar */}
        <div style={{ textAlign: 'center', marginTop: '30px', marginBottom: '30px' }}>
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
              transition: 'all 0.3s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
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
              <HomeIcon style={{ width: '20px', height: '20px' }} />
              Regresar al Inicio
            </button>
          </div>
        </div>
      </>
    );
  }