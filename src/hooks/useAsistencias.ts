// src/hooks/useAsistencias.ts
import { useState, useEffect } from "react";

export interface Asistencia {
  id: number;
  nombre: string;
  fecha: string;
  estado: "Presente" | "Ausente";
}

export const useAsistencias = () => {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAsistencias = async () => {
      try {
        // Simulación de datos (puedes reemplazarlo por tu API)
        await new Promise((r) => setTimeout(r, 800)); // simula carga
        const data: Asistencia[] = [
          { id: 1, nombre: "Juan Pérez", fecha: "2025-10-20", estado: "Presente" },
          { id: 2, nombre: "María Gómez", fecha: "2025-10-20", estado: "Ausente" },
          { id: 3, nombre: "Carlos Ruiz", fecha: "2025-10-20", estado: "Presente" },
        ];
        setAsistencias(data);
      } catch (err) {
        setError("Error al cargar asistencias");
      } finally {
        setLoading(false);
      }
    };

    fetchAsistencias();
  }, []);

  return { asistencias, loading, error };
};
