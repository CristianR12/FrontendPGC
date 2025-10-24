// src/components/AsistenciaTable.tsx
import React from "react";
import type { Asistencia } from "../services/asistenciaService";

interface AsistenciaTableProps {
  asistencias: Asistencia[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

/**
 * Tabla de asistencias con acciones de editar y eliminar
 */
export const AsistenciaTable: React.FC<AsistenciaTableProps> = ({ 
  asistencias, 
  onDelete, 
  onEdit 
}) => {
  const isDarkMode = document.body.classList.contains('dark-mode');
  
  const formatFecha = (fecha: string | Date) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="overflow-x-auto mt-4">
      <table style={{
        minWidth: '100%',
        border: isDarkMode ? '1px solid #3d3d3d' : '1px solid #e0e0e0',
        borderRadius: '8px',
        background: isDarkMode ? '#2d2d2d' : 'white'
      }}>
        <thead style={{
          background: isDarkMode 
            ? 'linear-gradient(135deg, #1e1e1e, #2d2d2d)'
            : 'linear-gradient(135deg, #f5f5f5, #e0e0e0)',
          color: isDarkMode ? '#fff' : '#333'
        }}>
          <tr>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              color: isDarkMode ? '#fff' : '#333',
              borderBottom: isDarkMode ? '2px solid #3d3d3d' : '2px solid #ddd'
            }}>
              Estudiante
            </th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              color: isDarkMode ? '#fff' : '#333',
              borderBottom: isDarkMode ? '2px solid #3d3d3d' : '2px solid #ddd'
            }}>
              Asignatura
            </th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              color: isDarkMode ? '#fff' : '#333',
              borderBottom: isDarkMode ? '2px solid #3d3d3d' : '2px solid #ddd'
            }}>
              Fecha y Hora
            </th>
            <th style={{
              padding: '12px',
              textAlign: 'left',
              color: isDarkMode ? '#fff' : '#333',
              borderBottom: isDarkMode ? '2px solid #3d3d3d' : '2px solid #ddd'
            }}>
              Estado
            </th>
            <th style={{
              padding: '12px',
              textAlign: 'center',
              color: isDarkMode ? '#fff' : '#333',
              borderBottom: isDarkMode ? '2px solid #3d3d3d' : '2px solid #ddd'
            }}>
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {asistencias.length > 0 ? (
            asistencias.map((a) => (
              <tr 
                key={a.id} 
                style={{
                  borderTop: isDarkMode ? '1px solid #3d3d3d' : '1px solid #ddd',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDarkMode 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(0, 0, 0, 0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <td style={{
                  padding: '12px',
                  color: isDarkMode ? '#fff' : '#333'
                }}>
                  {a.estudiante}
                </td>
                <td style={{
                  padding: '12px',
                  color: isDarkMode ? '#aaa' : '#666'
                }}>
                  {a.asignatura || 'N/A'}
                </td>
                <td style={{
                  padding: '12px',
                  color: isDarkMode ? '#aaa' : '#666'
                }}>
                  {formatFecha(a.fechaYhora)}
                </td>
                <td style={{
                  padding: '12px',
                  fontWeight: 'bold',
                  color: a.estadoAsistencia === "Presente" 
                    ? "#4CAF50"
                    : a.estadoAsistencia === "Ausente"
                    ? "#f44336"
                    : "#FF9800"
                }}>
                  {a.estadoAsistencia}
                </td>
                <td style={{
                  padding: '12px',
                  textAlign: 'center',
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={() => onEdit(a.id)}
                    style={{ 
                      padding: '8px 16px',
                      backgroundColor: isDarkMode ? "#3d3d3d" : "#62626196",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.3s",
                      fontSize: "0.9rem"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? "#4d4d4d" : "#525252";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? "#3d3d3d" : "#62626196";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => onDelete(a.id)}
                    style={{ 
                      padding: '8px 16px',
                      backgroundColor: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.3s",
                      fontSize: "0.9rem"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#d32f2f";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#f44336";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td 
                colSpan={5} 
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: isDarkMode ? '#aaa' : '#999'
                }}
              >
                No hay registros de asistencia
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};