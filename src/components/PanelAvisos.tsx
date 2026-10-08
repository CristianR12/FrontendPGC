// src/components/PanelAvisos.tsx
// Avisos de la campanita: recordatorios, consejos e incentivos (estudiante) y casos críticos (docente).
import type { ReactElement } from 'react';
import { AlertTriangle, Clock, Lightbulb, Trophy } from 'lucide-react';
import type { AvisoCampana } from '../services/estadisticasApiService';

const ESTILO: Record<AvisoCampana['tipo'], { color: string; icono: ReactElement }> = {
  critica: { color: '#e53935', icono: <AlertTriangle size={18} /> },
  recordatorio: { color: '#FF9800', icono: <Clock size={18} /> },
  consejo: { color: '#2196F3', icono: <Lightbulb size={18} /> },
  incentivo: { color: '#4CAF50', icono: <Trophy size={18} /> },
};

interface Props {
  avisos: AvisoCampana[];
  vistos: Set<string>;
  oscuro: boolean;
  encabezado?: string;
}

export function PanelAvisos({ avisos, vistos, oscuro, encabezado }: Props) {
  const tenue = oscuro ? '#aaa' : '#777';
  if (avisos.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      {encabezado && <strong style={{ fontSize: '0.85rem', color: tenue }}>{encabezado}</strong>}
      {avisos.map((a) => {
        const e = ESTILO[a.tipo];
        const nuevo = !vistos.has(a.id);
        return (
          <div key={a.id} style={{ display: 'flex', gap: '10px', borderLeft: `3px solid ${nuevo ? e.color : 'transparent'}`, paddingLeft: '8px' }}>
            <span style={{ color: e.color, flexShrink: 0, marginTop: '2px' }}>{e.icono}</span>
            <div>
              <div style={{ fontWeight: 700 }}>{a.titulo}</div>
              <div style={{ fontSize: '0.84rem', color: tenue }}>{a.texto}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
