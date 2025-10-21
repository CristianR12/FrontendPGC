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
      <table className="min-w-full border border-gray-300 rounded-lg">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            
            <th className="px-4 py-2 text-left">Estudiante</th>
            <th className="px-4 py-2 text-left">Asignatura</th>
            <th className="px-4 py-2 text-left">Fecha y Hora</th>
            <th className="px-4 py-2 text-left">Estado</th>
            <th className="px-4 py-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {asistencias.length > 0 ? (
            asistencias.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50 transition">
                
                <td className="px-4 py-2">{a.estudiante}</td>
                <td className="px-4 py-2">{a.asignatura || 'N/A'}</td>
                <td className="px-4 py-2">{formatFecha(a.fechaYhora)}</td>
                <td className={`px-4 py-2 font-semibold ${
                  a.estadoAsistencia === "Presente" 
                    ? "text-green-600" 
                    : a.estadoAsistencia === "Ausente"
                    ? "text-red-500"
                    : "text-orange-500"
                }`}>
                  {a.estadoAsistencia}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => onEdit(a.id)}
                    style={{ 
                      marginRight: "5px",
                      backgroundColor: "#62626196",
                      color: "white"
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => onDelete(a.id)}
                    style={{ 
                      backgroundColor: "#f44336",
                      color: "white"
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                No hay registros de asistencia
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};