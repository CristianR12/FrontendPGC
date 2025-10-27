// src/pages/ReportesPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Header } from '../components/Header';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { Toast } from '../components/Toast';
import asistenciaService from "../services/asistenciaService";
import type { Asistencia } from "../services/asistenciaService";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export function ReportesPage() {
  const navigate = useNavigate();
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [nombresEstudiantes, setNombresEstudiantes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
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
      const data = await asistenciaService.getAll();
      setAsistencias(data);

      const cedulasUnicas = [...new Set(data.map(a => a.estudiante))];
      if (cedulasUnicas.length > 0) {
        const nombres = await asistenciaService.getNombresEstudiantes(cedulasUnicas);
        setNombresEstudiantes(nombres);
      }
    } catch (err: any) {
      setError("Error al cargar datos para el reporte");
      showNotification("Error al cargar asistencias", 'error');
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

  const getNombreEstudiante = (cedula: string) => {
    return nombresEstudiantes[cedula] || cedula;
  };

  const formatearFecha = (fecha: any) => {
    try {
      return new Date(fecha).toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fecha || 'N/A';
    }
  };

  const generarCSV = () => {
    if (asistencias.length === 0) {
      showNotification('No hay datos para exportar', 'error');
      return;
    }

    setGenerando(true);
    try {
      const headers = ['Cédula', 'Nombre Estudiante', 'Asignatura', 'Fecha y Hora', 'Estado'];
      const rows = asistencias.map(a => [
        a.estudiante,
        getNombreEstudiante(a.estudiante),
        a.asignatura || 'N/A',
        formatearFecha(a.fechaYhora),
        a.estadoAsistencia
      ]);

      const BOM = '\uFEFF';
      let csv = BOM + headers.join(',') + '\n';
      rows.forEach(row => {
        const escapedRow = row.map(cell => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        });
        csv += escapedRow.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `asistencias_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showNotification('✅ Reporte CSV generado correctamente', 'success');
    } catch (err) {
      console.error('Error al generar CSV:', err);
      showNotification('❌ Error al generar CSV', 'error');
    } finally {
      setGenerando(false);
    }
  };

  const generarPDF = () => {
    if (asistencias.length === 0) {
      showNotification('No hay datos para exportar', 'error');
      return;
    }

    setGenerando(true);
    try {
      console.log('Iniciando generación de PDF...');

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginLeft = 8;
      const marginRight = 8;
      const usableWidth = pageWidth - marginLeft - marginRight;

      let yPosition = 12;

      console.log('PDF creado correctamente');

      // Título
      doc.setTextColor(0, 0, 0); // negro
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Reporte de Asistencias', marginLeft, yPosition);
      yPosition += 6;

      // Información general
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Fecha: ${new Date().toLocaleString('es-ES')} | Total: ${asistencias.length} registros`, marginLeft, yPosition);
      yPosition += 6;

      // Definir columnas con proporciones
      const columns = [
        { header: 'Cédula', width: usableWidth * 0.14, key: 'cedula' },
        { header: 'Nombre', width: usableWidth * 0.28, key: 'nombre' },
        { header: 'Asignatura', width: usableWidth * 0.28, key: 'asignatura' },
        { header: 'Fecha', width: usableWidth * 0.18, key: 'fecha' },
        { header: 'Estado', width: usableWidth * 0.12, key: 'estado' }
      ];

      // Función para calcular altura de texto con saltos de línea
      const getTextHeight = (text: string, maxWidth: number, fontSize: number): number => {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxWidth);
        return lines.length * (fontSize * 0.35); // Aproximado: cada línea tiene altura de 0.35 veces el fontSize
      };

      // Función para dibujar encabezados
      // Función para dibujar encabezados
      const drawHeaders = () => {
        const headerRowHeight = 8;

        // 🔹 Estilo visual mejorado
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);

        // Fondo verde azulado (similar al logo UDEC)
        doc.setFillColor(43, 122, 120); // fondo
        doc.setDrawColor(43, 122, 120); // borde
        doc.setLineWidth(0.3);

        // 🔹 Texto blanco para contraste
        doc.setTextColor(255, 255, 255);

        let xPos = marginLeft;

        columns.forEach((col) => {
          // Dibujar celda de fondo
          doc.rect(xPos, yPosition, col.width, headerRowHeight, 'FD');

          // Dibujar texto centrado
          doc.text(
            col.header,
            xPos + col.width / 2,
            yPosition + headerRowHeight / 2 + 2, // mejor centrado vertical
            { align: 'center', maxWidth: col.width - 2 }
          );

          xPos += col.width;
        });

        // 🔹 Asegurar que después de la cabecera el texto vuelva a negro
        doc.setTextColor(0, 0, 0);

        yPosition += headerRowHeight + 0.5;
      };


      // Función para dibujar una fila con ajuste dinámico de altura
      const drawRow = (rowData: string[], rowIndex: number) => {
        // Calcular altura necesaria para esta fila
        const fontSize = 7;
        let maxRowHeight = 4;

        rowData.forEach((data, colIndex) => {
          const col = columns[colIndex];
          const height = getTextHeight(String(data), col.width - 1, fontSize);
          maxRowHeight = Math.max(maxRowHeight, height);
        });

        const rowHeight = Math.max(maxRowHeight + 1, 5);

        // Fondo alternado
        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          let xPos = marginLeft;
          columns.forEach((col) => {
            doc.rect(xPos, yPosition, col.width, rowHeight, 'F');
            xPos += col.width;
          });
        }

        // Dibujar bordes
        doc.setDrawColor(200);
        doc.setLineWidth(0.2);
        let xPos = marginLeft;
        columns.forEach((col) => {
          doc.rect(xPos, yPosition, col.width, rowHeight);
          xPos += col.width;
        });

        // Texto de la fila
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(0, 0, 0);

        xPos = marginLeft;
        rowData.forEach((data, colIndex) => {
          const col = columns[colIndex];
          const text = String(data);
          const lines = doc.splitTextToSize(text, col.width - 1);
          const lineHeight = 2.8;
          const totalHeight = lines.length * lineHeight;
          const startY = yPosition + (rowHeight - totalHeight) / 2 + 2;

          lines.forEach((line: string, idx: number) => {
            doc.text(line, xPos + 0.5, startY + idx * lineHeight, { maxWidth: col.width - 1 });
          });

          xPos += col.width;
        });

        yPosition += rowHeight;
      };

      // Dibujar encabezados iniciales
      drawHeaders();

      // Dibujar filas de datos
      asistencias.forEach((asistencia, idx) => {
        // Verificar si necesita nueva página
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = 12;
          drawHeaders();
        }

        const rowData = [
          asistencia.estudiante,
          getNombreEstudiante(asistencia.estudiante),
          asistencia.asignatura || 'N/A',
          formatearFecha(asistencia.fechaYhora),
          asistencia.estadoAsistencia
        ];

        drawRow(rowData, idx);
      });

      // Pie de página
      try {
        const totalPages = (doc as any).internal.pages.length - 1;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(128, 128, 128);
        for (let i = 1; i <= totalPages; i++) {
          (doc as any).setPage(i);
          doc.text(
            `Página ${i} de ${totalPages}`,
            pageWidth / 2,
            pageHeight - 5,
            { align: 'center' }
          );
        }
      } catch (err) {
        console.warn('No se pudo agregar número de página:', err);
      }

      // Descargar PDF
      const filename = `asistencias_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      console.log('✅ PDF generado exitosamente:', filename);
      showNotification('✅ Reporte PDF generado correctamente', 'success');
    } catch (err: any) {
      console.error('❌ Error al generar PDF:', err);
      showNotification('❌ Error al generar PDF: ' + err.message, 'error');
    } finally {
      setGenerando(false);
    }
  };

  const generarExcel = () => {
    if (asistencias.length === 0) {
      showNotification('No hay datos para exportar', 'error');
      return;
    }

    setGenerando(true);
    try {
      const data = asistencias.map(a => ({
        'Cédula': a.estudiante,
        'Nombre Estudiante': getNombreEstudiante(a.estudiante),
        'Asignatura': a.asignatura || 'N/A',
        'Fecha y Hora': formatearFecha(a.fechaYhora),
        'Estado': a.estadoAsistencia
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const columnWidths = [15, 20, 18, 20, 15];
      ws['!cols'] = columnWidths.map(width => ({ wch: width }));

      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '2B7A78' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }

      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[address]) continue;
          ws[address].s = {
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            }
          };
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');

      const summary = [
        ['RESUMEN DE ASISTENCIAS'],
        [],
        ['Total de registros', asistencias.length],
        ['Presentes', asistencias.filter(a => a.estadoAsistencia === 'Presente').length],
        ['Ausentes', asistencias.filter(a => a.estadoAsistencia === 'Ausente').length],
        ['Con Excusa', asistencias.filter(a => a.estadoAsistencia === 'Tiene Excusa').length],
        [],
        ['Fecha de generación', new Date().toLocaleString('es-ES')]
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summary);
      wsSummary['!cols'] = [{ wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

      XLSX.writeFile(wb, `asistencias_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('✅ Reporte Excel generado correctamente', 'success');
    } catch (err) {
      console.error('Error al generar Excel:', err);
      showNotification('❌ Error al generar Excel', 'error');
    } finally {
      setGenerando(false);
    }
  };

  const estadisticas = {
    total: asistencias.length,
    presentes: asistencias.filter(a => a.estadoAsistencia === 'Presente').length,
    ausentes: asistencias.filter(a => a.estadoAsistencia === 'Ausente').length,
    conExcusa: asistencias.filter(a => a.estadoAsistencia === 'Tiene Excusa').length,
    asignaturas: [...new Set(asistencias.map(a => a.asignatura).filter(Boolean))].length,
    estudiantes: [...new Set(asistencias.map(a => a.estudiante))].length
  };

  if (loading) return <LoadingSpinner message="Cargando datos..." />;
  if (error) return <ErrorMessage message={error} onRetry={cargarAsistencias} />;

  return (
    <>
      {notification.show && (
        <Toast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      <Header title="Generación de Reportes" showLogout={true} onLogout={handleLogout} />

      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '30px', textAlign: 'center', color: '#2b7a78' }}>
          📊 Exportar Asistencias
        </h2>

        {/* Estadísticas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📋</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2196F3' }}>
              {estadisticas.total}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Total</div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>✅</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4CAF50' }}>
              {estadisticas.presentes}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Presentes</div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>❌</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f44336' }}>
              {estadisticas.ausentes}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Ausentes</div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📝</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#FF9800' }}>
              {estadisticas.conExcusa}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Con Excusa</div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👥</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#9C27B0' }}>
              {estadisticas.estudiantes}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Estudiantes</div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📚</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#00BCD4' }}>
              {estadisticas.asignaturas}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Asignaturas</div>
          </div>
        </div>

        {/* Panel de exportación */}
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <h3 style={{ marginBottom: '25px', color: '#2b7a78' }}>
            Selecciona el formato de exportación:
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            <button
              onClick={generarCSV}
              disabled={generando || asistencias.length === 0}
              style={{
                padding: '20px',
                fontSize: '1.1rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (generando || asistencias.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (generando || asistencias.length === 0) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontWeight: '600',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!(generando || asistencias.length === 0)) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#45a049';
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#4CAF50';
                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📊</span>
              Exportar a CSV (Valores Separados por Comas)
            </button>

            <button
              onClick={generarPDF}
              disabled={generando || asistencias.length === 0}
              style={{
                padding: '20px',
                fontSize: '1.1rem',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (generando || asistencias.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (generando || asistencias.length === 0) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontWeight: '600',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!(generando || asistencias.length === 0)) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#da190b';
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#f44336';
                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📄</span>
              Exportar a PDF (Documento Portable)
            </button>

            <button
              onClick={generarExcel}
              disabled={generando || asistencias.length === 0}
              style={{
                padding: '20px',
                fontSize: '1.1rem',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (generando || asistencias.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (generando || asistencias.length === 0) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontWeight: '600',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!(generando || asistencias.length === 0)) {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#0b7dda';
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#2196F3';
                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📗</span>
              Exportar a Excel (Hoja de Cálculo)
            </button>
          </div>
        </div>

        {/* Botones de navegación */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#9e9e9e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#757575';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#9e9e9e';
            }}
          >
            🏠 Dashboard
          </button>
          <button
            onClick={() => navigate('/asistencias')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#0b7dda';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#2196F3';
            }}
          >
            📋 Ver Asistencias
          </button>
        </div>
      </div>
    </>
  );
}