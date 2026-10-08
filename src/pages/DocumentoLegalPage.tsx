// src/pages/DocumentoLegalPage.tsx
// /terminos y /privacidad: públicos, se pueden leer antes de iniciar sesión.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DOCUMENTOS } from '../legal/contenido';
import type { DocumentoLegal } from '../legal/contenido';
import { TextoLegal } from '../components/TextoLegal';
import { PieLegal } from '../components/PieLegal';

export function DocumentoLegalPage({ id }: { id: DocumentoLegal['id'] }) {
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => {
    const revisar = () => setOscuro(document.body.classList.contains('dark-mode'));
    revisar();
    const obs = new MutationObserver(revisar);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  const otro = id === 'terminos' ? { ruta: '/privacidad', texto: 'Política de datos personales' } : { ruta: '/terminos', texto: 'Términos y condiciones' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: '30px 20px', width: '100%', maxWidth: '860px', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', fontSize: '0.9rem' }}>
          <button onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = '/'))} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}>← Volver</button>
          <Link to={otro.ruta} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>{otro.texto} →</Link>
        </div>
        <div style={{ background: oscuro ? '#2d2d2d' : 'white', borderRadius: '16px', padding: '28px', boxShadow: oscuro ? 'none' : '0 4px 20px rgba(0,0,0,0.08)', border: oscuro ? '1px solid #3d3d3d' : 'none' }}>
          <TextoLegal documento={DOCUMENTOS[id]} oscuro={oscuro} />
        </div>
      </div>
      <PieLegal oscuro={oscuro} />
    </div>
  );
}
