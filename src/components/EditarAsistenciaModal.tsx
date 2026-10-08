// src/components/EditarAsistenciaModal.tsx
// Edición de una asistencia como ventana flotante sobre la pantalla en la que estés (solo cambia el estado).
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import asistenciaService from '../services/asistenciaService';
import type { Asistencia } from '../services/asistenciaService';
import { formatearFechaHoraAsistencia } from '../utils/fechasAsistencia';

interface Props {
  asistencia: Asistencia;
  /** Nombre del estudiante si ya se conoce; si no, se muestra la cédula */
  nombre?: string;
  oscuro?: boolean;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}

const ESTADOS = ['Presente', 'Ausente', 'Tiene Excusa'];

export function EditarAsistenciaModal({ asistencia, nombre, oscuro = false, onCerrar, onGuardado }: Props) {
  const [estado, setEstado] = useState<string>(asistencia.estadoAsistencia);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && !guardando && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [guardando, onCerrar]);

  const fondo = oscuro ? '#2d2d2d' : 'white';
  const texto = oscuro ? '#fff' : '#2b2b2b';
  const tenue = oscuro ? '#aaa' : '#666';
  const borde = oscuro ? '#3d3d3d' : '#d0d0d0';
  const etiqueta: React.CSSProperties = { display: 'grid', gap: '6px', fontSize: '0.88rem', color: oscuro ? '#ddd' : '#444', fontWeight: 600 };
  const solo: React.CSSProperties = {
    padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borde}`, background: oscuro ? '#252525' : '#f3f3f6',
    color: tenue, fontWeight: 400, fontSize: '0.95rem',
  };

  const guardar = async () => {
    if (!estado) return setError('Elige un estado.');
    setGuardando(true);
    setError(null);
    try {
      await asistenciaService.update(asistencia.id, { estadoAsistencia: estado });
      onGuardado('Asistencia actualizada correctamente');
    } catch (e: any) {
      setError(e.message || 'No se pudo actualizar la asistencia.');
      setGuardando(false);
    }
  };

  const cedula = asistencia.estudiante;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-editar-asistencia"
      onClick={(e) => e.target === e.currentTarget && !guardando && onCerrar()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div style={{ background: fondo, color: texto, borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '22px', boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 id="titulo-editar-asistencia" style={{ margin: 0, fontSize: '1.3rem', color: texto }}>Editar asistencia</h2>
          <button onClick={onCerrar} disabled={guardando} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: tenue, padding: '4px', display: 'flex' }}>
            <X size={22} />
          </button>
        </div>

        {error && (
          <div role="alert" style={{ background: oscuro ? '#3a1f1f' : '#fdecea', color: oscuro ? '#ff8a80' : '#b71c1c', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={etiqueta}>
            Estudiante
            <div style={solo}>
              {nombre && nombre !== cedula ? <>{nombre} <span style={{ fontSize: '0.88em' }}>(CC: {cedula})</span></> : cedula}
            </div>
          </div>
          <div style={etiqueta}>
            Asignatura y fecha
            <div style={solo}>{asistencia.asignatura || 'N/A'} · {formatearFechaHoraAsistencia(asistencia)}</div>
          </div>
          <label style={etiqueta}>
            Estado de asistencia
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              disabled={guardando}
              autoFocus
              style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borde}`, fontSize: '0.95rem', background: oscuro ? '#1e1e1e' : 'white', color: texto, cursor: 'pointer' }}
            >
              {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button onClick={onCerrar} disabled={guardando} style={{ padding: '10px 18px', border: 'none', borderRadius: '8px', background: '#9e9e9e', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando || estado === asistencia.estadoAsistencia} style={{ padding: '10px 18px', border: 'none', borderRadius: '8px', background: '#4CAF50', color: 'white', fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Check size={16} /> {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
