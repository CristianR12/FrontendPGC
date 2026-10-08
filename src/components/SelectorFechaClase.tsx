// src/components/SelectorFechaClase.tsx
// Calendario desplegable donde solo se pueden elegir los días en que hay clase.
import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { fechaLarga, nombreMes } from '../utils/filtroInicio';

interface Props {
  valor: string | null;
  onChange: (iso: string | null) => void;
  /** ¿Se puede elegir este día? (hay clase ese día de la semana y no es futuro) */
  habilitada: (iso: string) => boolean;
  /** ¿Ese día tiene asistencias registradas? (se marca con un punto) */
  marcada: (iso: string) => boolean;
  /** Hoy, AAAA-MM-DD */
  hoy: string;
  oscuro: boolean;
  deshabilitado?: boolean;
  textoVacio?: string;
}

const SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const dos = (n: number) => String(n).padStart(2, '0');
const aIso = (a: number, m: number, d: number) => `${a}-${dos(m + 1)}-${dos(d)}`;

/** Mes (año, mes 0-11) que se muestra al abrir: el de la fecha elegida o el de la última fecha elegible. */
function mesInicial(valor: string | null, habilitada: (iso: string) => boolean, hoy: string): { a: number; m: number } {
  if (valor) {
    const [a, m] = valor.split('-').map(Number);
    return { a, m: m - 1 };
  }
  const base = new Date(`${hoy}T12:00:00Z`);
  for (let i = 0; i < 180; i++) {
    const d = new Date(base.getTime() - i * 86400000);
    const iso = aIso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    if (habilitada(iso)) return { a: d.getUTCFullYear(), m: d.getUTCMonth() };
  }
  return { a: base.getUTCFullYear(), m: base.getUTCMonth() };
}

export function SelectorFechaClase({ valor, onChange, habilitada, marcada, hoy, oscuro, deshabilitado, textoVacio = 'Elegir fecha' }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState(() => mesInicial(valor, habilitada, hoy));

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto]);

  const abrir = () => {
    if (deshabilitado) return;
    setMes(mesInicial(valor, habilitada, hoy));
    setAbierto(true);
  };

  const [hoyA, hoyM] = hoy.split('-').map(Number).map((n, i) => (i === 1 ? n - 1 : n));
  const esteMes = mes.a * 12 + mes.m;
  const mesHoy = hoyA * 12 + hoyM;
  const puedeAvanzar = esteMes < mesHoy;
  const puedeRetroceder = esteMes > mesHoy - 24;
  const mover = (delta: number) => {
    const total = mes.a * 12 + mes.m + delta;
    setMes({ a: Math.floor(total / 12), m: total % 12 });
  };

  const primerDia = new Date(Date.UTC(mes.a, mes.m, 1)).getUTCDay(); // 0 = domingo
  const hueco = (primerDia + 6) % 7; // la semana empieza el lunes
  const diasDelMes = new Date(Date.UTC(mes.a, mes.m + 1, 0)).getUTCDate();
  const celdas: (number | null)[] = [...Array(hueco).fill(null), ...Array.from({ length: diasDelMes }, (_, i) => i + 1)];

  const fondo = oscuro ? '#2d2d2d' : 'white';
  const texto = oscuro ? '#fff' : '#333';
  const tenue = oscuro ? '#888' : '#999';
  const borde = oscuro ? '#3d3d3d' : '#d0d0d0';

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={abrir}
        disabled={deshabilitado}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        style={{
          width: '100%', height: '40px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '8px', boxSizing: 'border-box',
          border: `1px solid ${borde}`, borderRadius: '8px', background: oscuro ? '#1e1e1e' : 'white', color: valor ? texto : tenue,
          cursor: deshabilitado ? 'not-allowed' : 'pointer', opacity: deshabilitado ? 0.55 : 1, fontSize: '0.9rem', textAlign: 'left',
        }}
      >
        <CalendarDays size={16} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {valor ? valor.split('-').reverse().join('/') : textoVacio}
        </span>
      </button>

      {abierto && (
        <>
          {/* Capa transparente: un clic fuera cierra el calendario */}
          <div onClick={() => setAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
          <div
            role="dialog"
            aria-label="Elegir fecha de clase"
            style={{
              position: 'absolute', top: '46px', left: 0, zIndex: 1001, width: '100%', minWidth: '272px', maxWidth: 'calc(100vw - 32px)', boxSizing: 'border-box', padding: '12px',
              borderRadius: '12px', background: fondo, color: texto, border: `1px solid ${borde}`, boxShadow: '0 8px 28px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <button type="button" aria-label="Mes anterior" onClick={() => mover(-1)} disabled={!puedeRetroceder}
                style={{ background: 'none', border: 'none', padding: '4px', color: texto, cursor: puedeRetroceder ? 'pointer' : 'not-allowed', opacity: puedeRetroceder ? 1 : 0.3, display: 'flex' }}>
                <ChevronLeft size={20} />
              </button>
              <strong style={{ textTransform: 'capitalize' }}>{nombreMes(mes.m)} {mes.a}</strong>
              <button type="button" aria-label="Mes siguiente" onClick={() => mover(1)} disabled={!puedeAvanzar}
                style={{ background: 'none', border: 'none', padding: '4px', color: texto, cursor: puedeAvanzar ? 'pointer' : 'not-allowed', opacity: puedeAvanzar ? 1 : 0.3, display: 'flex' }}>
                <ChevronRight size={20} />
              </button>
            </div>

            <div role="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px' }}>
              {SEMANA.map((d, i) => (
                <div key={i} style={{ textAlign: 'center', fontSize: '0.75rem', color: tenue, fontWeight: 700, padding: '4px 0' }}>{d}</div>
              ))}
              {celdas.map((d, i) => {
                if (d === null) return <div key={`v${i}`} />;
                const iso = aIso(mes.a, mes.m, d);
                const activa = habilitada(iso);
                const elegida = iso === valor;
                const conAsistencia = marcada(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={!activa}
                    onClick={() => { onChange(iso); setAbierto(false); }}
                    aria-label={`${fechaLarga(iso)}${activa ? ', hay clase' : ', sin clase'}${conAsistencia ? ', con asistencias' : ''}`}
                    aria-pressed={elegida}
                    style={{
                      height: '34px', width: '100%', minWidth: 0, padding: 0, borderRadius: '8px', position: 'relative', fontSize: '0.85rem',
                      fontWeight: activa ? 700 : 400,
                      border: elegida ? '1px solid var(--color-primary)' : activa ? '1px solid var(--color-primary)' : '1px solid transparent',
                      background: elegida ? 'var(--color-primary)' : 'transparent',
                      color: elegida ? 'white' : activa ? 'var(--color-uni)' : tenue,
                      opacity: activa ? 1 : 0.35,
                      cursor: activa ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {d}
                    {conAsistencia && (
                      <span aria-hidden style={{
                        position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)',
                        width: '5px', height: '5px', borderRadius: '50%', background: elegida ? 'white' : 'var(--color-primary)',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '10px', fontSize: '0.75rem', color: tenue }}>
              <span>Solo se pueden elegir los días con clase. El punto indica que hay asistencias.</span>
              {valor && (
                <button type="button" onClick={() => { onChange(null); setAbierto(false); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-uni)', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Quitar
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
