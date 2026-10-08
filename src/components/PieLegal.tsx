// src/components/PieLegal.tsx
// Pie de página con los enlaces legales. "Mis datos y privacidad" solo aparece con sesión iniciada.
import { Link } from 'react-router-dom';

export function PieLegal({ onMisDatos, oscuro = false }: { onMisDatos?: () => void; oscuro?: boolean }) {
  const enlace: React.CSSProperties = { color: oscuro ? '#aaa' : '#666', textDecoration: 'none', fontSize: '0.82rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 500 };
  return (
    <footer style={{ padding: '22px 20px 28px', textAlign: 'center', display: 'flex', gap: '8px 20px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid ${oscuro ? '#2d2d2d' : '#e6e6e6'}`, marginTop: '24px' }}>
      <span style={{ color: oscuro ? '#777' : '#999', fontSize: '0.82rem' }}>© {new Date().getFullYear()} Sistema de Asistencias · Universidad de Cundinamarca</span>
      <Link to="/terminos" style={enlace}>Términos y condiciones</Link>
      <Link to="/privacidad" style={enlace}>Política de datos personales</Link>
      {onMisDatos && <button onClick={onMisDatos} style={enlace}>Mis datos y privacidad</button>}
    </footer>
  );
}
