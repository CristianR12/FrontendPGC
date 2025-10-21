// src/components/AsistenciaTable.tsx
import React from "react";
import { Asistencia } from "../hooks/useAsistencias";

interface AsistenciaTableProps {
  asistencias: Asistencia[];
}

export const AsistenciaTable: React.FC<AsistenciaTableProps> = ({ asistencias }) => {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full border border-gray-300 rounded-lg">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 text-left">ID</th>
            <th className="px-4 py-2 text-left">Nombre</th>
            <th className="px-4 py-2 text-left">Fecha</th>
            <th className="px-4 py-2 text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {asistencias.length > 0 ? (
            asistencias.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50 transition">
                <td className="px-4 py-2">{a.id}</td>
                <td className="px-4 py-2">{a.nombre}</td>
                <td className="px-4 py-2">{a.fecha}</td>
                <td
                  className={`px-4 py-2 font-semibold ${
                    a.estado === "Presente" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {a.estado}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                No hay registros de asistencia
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
