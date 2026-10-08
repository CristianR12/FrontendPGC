// src/pages/MiHorarioPage.tsx
// Módulo "Mi horario": el horario semanal arriba y, debajo en la misma pantalla, el historial de cada semestre.
// Los cursos se gestionan desde el Inicio.
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History } from 'lucide-react';
import { GestionHorariosFirebase } from './GestionHorariosFirebase';
import { HistorialHorariosPage } from './HistorialHorariosPage';

export function MiHorarioPage() {
  // /gestion-horarios?seccion=historial baja directo al historial
  const [params] = useSearchParams();
  const irAlHistorial = params.get('seccion') === 'historial';

  useEffect(() => {
    if (irAlHistorial) document.getElementById('historial-horarios')?.scrollIntoView({ behavior: 'smooth' });
  }, [irAlHistorial]);

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <GestionHorariosFirebase />

      <section id="historial-horarios" style={{ marginTop: '48px', paddingTop: '32px', borderTop: '2px solid var(--border-color)' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={28} />
            Historial de horarios
          </h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>
            Cómo era tu horario en cada semestre y qué cambió entre uno y otro.
          </p>
        </div>
        <HistorialHorariosPage />
      </section>
    </div>
  );
}
