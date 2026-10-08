// src/components/PantallaCarga.tsx
// Pantalla de carga del arranque: fondo predeterminado y, al centro, el logo del proyecto dando vueltas.
import logo from '../assets/imagenes/IA.png';

export function PantallaCarga({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' }}
    >
      <img src={logo} alt="" className="girar-logo" style={{ width: '88px', height: '88px', objectFit: 'contain' }} />
      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{message}</p>
    </div>
  );
}
