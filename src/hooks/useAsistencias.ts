// src/hooks/useAsistencias.ts
import { useState, useEffect, useCallback } from "react";
import asistenciaService from "../services/asistenciaService";
import type { Asistencia } from "../services/asistenciaService";

/**
 * Hook personalizado para gestionar asistencias
 * Proporciona:
 * - Estado de carga
 * - Manejo de errores
 * - Función de recarga
 * - Función de eliminación
 */
export const useAsistencias = () => {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAsistencias = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await asistenciaService.getAll();
      setAsistencias(data);
    } catch (err: any) {
      console.error("Error al cargar asistencias:", err);
      setError(err.message || "Error al cargar asistencias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAsistencias();
  }, [fetchAsistencias]);

  const deleteAsistencia = async (id: string) => {
    await asistenciaService.delete(id);
    // Recargar lista después de eliminar
    await fetchAsistencias();
  };

  return { 
    asistencias, 
    loading, 
    error, 
    refetch: fetchAsistencias,
    deleteAsistencia
  };
};