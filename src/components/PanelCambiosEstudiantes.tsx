// src/components/PanelCambiosEstudiantes.tsx
// Contenido de la campana del administrador: qué cambió cada estudiante, cuándo, y qué había antes y después.
import type { CambioEstudiante } from '../services/registroApiService';

const ETIQUETAS: Record<string, string> = {
  telefono: 'Teléfono',
  emailPersonal: 'Correo personal',
  contactoEmergencia: 'Contacto de emergencia',
  equipos: 'Equipos',
  cuenta: 'Cuenta vinculada',
};

function texto(valor: unknown): string {
  if (Array.isArray(valor)) {
    return valor.length ? valor.map((e: any) => `${e.marca} (${e.serial})`).join(', ') : 'sin datos';
  }
  if (valor && typeof valor === 'object') {
    const c = valor as { nombre?: string; telefono?: string };
    return c.nombre || c.telefono ? `${c.nombre ?? ''} ${c.telefono ?? ''}`.trim() : 'sin datos';
  }
  return String(valor ?? '').trim() || 'sin datos';
}

export function formatearFechaCambio(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

interface Props {
  cambios: CambioEstudiante[] | null;
  error: string | null;
  oscuro: boolean;
  /** Fecha ISO a partir de la cual los cambios se consideran nuevos */
  vistosHasta: string;
}

export function PanelCambiosEstudiantes({ cambios, error, oscuro, vistosHasta }: Props) {
  const tenue = oscuro ? '#aaa' : '#777';
  if (error) return <div style={{ color: '#d32f2f' }}>{error}</div>;
  if (!cambios) return <div style={{ color: tenue }}>Cargando…</div>;
  if (cambios.length === 0) return <div>No hay cambios de estudiantes.</div>;

  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      <strong style={{ fontSize: '0.85rem', color: tenue }}>Cambios de estudiantes</strong>
      {cambios.map((c) => {
        const nuevo = c.fecha > vistosHasta;
        return (
          <div key={c.id} style={{ borderLeft: `3px solid ${nuevo ? 'var(--color-primary)' : 'transparent'}`, paddingLeft: '8px' }}>
            <div style={{ fontWeight: 700 }}>{c.nombre || c.cedula}</div>
            <div style={{ fontSize: '0.78rem', color: tenue }}>
              C.C. {c.cedula} · {formatearFechaCambio(c.fecha)}
            </div>
            {c.tipo === 'vinculacion' ? (
              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Vinculó su cuenta ({c.email}).</div>
            ) : (
              c.cambios.map((f, i) => (
                <div key={i} style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{ETIQUETAS[f.campo] ?? f.campo}:</span>{' '}
                  <span style={{ color: tenue }}>{texto(f.antes)}</span> → <span>{texto(f.despues)}</span>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
