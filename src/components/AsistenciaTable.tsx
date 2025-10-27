import React, { useState } from "react";
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Asistencia } from "../services/asistenciaService";

interface AsistenciaTableProps {
  asistencias: Asistencia[];
  nombresEstudiantes?: Record<string, string>; // ✅ NUEVO
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

/**
 * Tabla de asistencias con paginado compacto, acciones de editar y eliminar
 */
export const AsistenciaTable: React.FC<AsistenciaTableProps> = ({
  asistencias,
  nombresEstudiantes = {}, // ✅ NUEVO
  onDelete,
  onEdit
}) => {
  const isDarkMode = document.body.classList.contains('dark-mode');

  // ✅ PAGINADO
  const ITEMS_POR_PAGINA = 10;
  const [paginaActual, setPaginaActual] = useState(1);

  // Calcular índices
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const indiceFin = indiceInicio + ITEMS_POR_PAGINA;
  const asistenciasActuales = asistencias.slice(indiceInicio, indiceFin);
  const totalPaginas = Math.ceil(asistencias.length / ITEMS_POR_PAGINA);

  // ✅ MOSTRAR SOLO 3 PÁGINAS EN EL MEDIO
  const getPaginasVisibles = () => {
    const paginas = [];
    let inicio = Math.max(1, paginaActual - 1);
    let fin = Math.min(totalPaginas, paginaActual + 1);

    if (fin - inicio < 2) {
      if (inicio === 1) fin = Math.min(3, totalPaginas);
      else inicio = Math.max(1, fin - 2);
    }

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }

    return paginas;
  };

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
  const getNombreEstudiante = (cedula: string) => {
    const nombre = nombresEstudiantes[cedula];

    if (nombre && nombre !== cedula) {
      return (
        <>
          {nombre}
          <span style={{
            color: isDarkMode ? '#888' : '#999',
            fontSize: '0.85em',
            marginLeft: '6px'
          }}>
            (CC: {cedula})
          </span>
        </>
      );
    }

    return cedula;
  };
  return (
    <div>
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
            {asistenciasActuales.length > 0 ? (
              asistenciasActuales.map((a) => (
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
                    {getNombreEstudiante(a.estudiante)}
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
                        backgroundColor: isDarkMode ? "#667eea" : "#667eea",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "all 0.3s",
                        fontSize: "0.9rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode ? "#667eea" : "#667eea";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode ? "#7389eeff" : "#7389eeff";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      <Edit2 size={16} /> Editar
                    </button>
                    <button
                      onClick={() => onDelete(a.id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: "#555",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "all 0.3s",
                        fontSize: "0.9rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#555";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#818181ff";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      <Trash2 size={16} /> Eliminar
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

      {/* ✅ PAGINADO COMPACTO: Anterior | 1 2 3 ... | Siguiente */}
      {totalPaginas > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '20px',
          padding: '15px',
          background: isDarkMode ? '#2d2d2d' : '#f9f9f9',
          borderRadius: '8px',
          flexWrap: 'wrap'
        }}>
          {/* Botón Anterior */}
          <button
            onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
            disabled={paginaActual === 1}
            style={{
              padding: '8px 12px',
              backgroundColor: paginaActual === 1
                ? (isDarkMode ? '#555' : '#ccc')
                : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
              opacity: paginaActual === 1 ? 0.6 : 1,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <ChevronLeft size={16} /> Anterior
          </button>

          {/* Primera página */}
          {!getPaginasVisibles().includes(1) && (
            <>
              <button
                onClick={() => setPaginaActual(1)}
                style={{
                  padding: '6px 10px',
                  backgroundColor: isDarkMode ? '#3d3d3d' : '#e0e0e0',
                  color: isDarkMode ? '#fff' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                1
              </button>
              <span style={{ color: isDarkMode ? '#aaa' : '#666' }}>...</span>
            </>
          )}

          {/* Páginas visibles */}
          {getPaginasVisibles().map((pagina) => (
            <button
              key={pagina}
              onClick={() => setPaginaActual(pagina)}
              style={{
                padding: '6px 10px',
                backgroundColor: paginaActual === pagina ? '#333' : (isDarkMode ? '#3d3d3d' : '#e0e0e0'),
                color: paginaActual === pagina ? 'white' : (isDarkMode ? '#fff' : '#333'),
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: paginaActual === pagina ? 'bold' : 'normal',
                transition: 'all 0.2s',
                fontSize: '0.85rem'
              }}
            >
              {pagina}
            </button>
          ))}

          {/* Última página */}
          {!getPaginasVisibles().includes(totalPaginas) && (
            <>
              <span style={{ color: isDarkMode ? '#aaa' : '#666' }}>...</span>
              <button
                onClick={() => setPaginaActual(totalPaginas)}
                style={{
                  padding: '6px 10px',
                  backgroundColor: isDarkMode ? '#3d3d3d' : '#e0e0e0',
                  color: isDarkMode ? '#fff' : '#333',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                {totalPaginas}
              </button>
            </>
          )}

          {/* Botón Siguiente */}
          <button
            onClick={() => setPaginaActual(Math.min(totalPaginas, paginaActual + 1))}
            disabled={paginaActual === totalPaginas}
            style={{
              padding: '8px 12px',
              backgroundColor: paginaActual === totalPaginas
                ? (isDarkMode ? '#555' : '#ccc')
                : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
              opacity: paginaActual === totalPaginas ? 0.6 : 1,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Siguiente <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};