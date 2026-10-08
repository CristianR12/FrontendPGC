// src/components/AceptacionLegal.tsx
// Pantalla que aparece tras iniciar sesión, la primera vez y cada vez que cambian los textos legales.
// Términos y datos personales son obligatorios para usar el sistema; la biometría es opcional y va aparte.
import { useState } from 'react';
import legalApiService from '../services/legalApiService';
import type { EstadoLegal } from '../services/legalApiService';

interface Props {
  oscuro?: boolean;
  /** Primera vez (false) o actualización de textos (true) */
  actualizacion?: boolean;
  onAceptado: (estado: EstadoLegal) => void;
  onRechazar: () => void;
}

export function AceptacionLegal({ oscuro = false, actualizacion = false, onAceptado, onRechazar }: Props) {
  const [terminos, setTerminos] = useState(false);
  const [datos, setDatos] = useState(false);
  const [biometrico, setBiometrico] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fondo = oscuro ? '#2d2d2d' : 'white';
  const texto = oscuro ? '#eee' : '#2b2b2b';
  const tenue = oscuro ? '#aaa' : '#666';
  const enlace: React.CSSProperties = { color: 'var(--color-primary)', fontWeight: 600 };
  const fila: React.CSSProperties = { display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.92rem', lineHeight: 1.45 };
  const caja: React.CSSProperties = { width: '18px', height: '18px', marginTop: '2px', flexShrink: 0, accentColor: '#4CAF50' };

  const aceptar = async () => {
    setGuardando(true);
    setError(null);
    try {
      onAceptado(await legalApiService.aceptar(biometrico));
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar tu aceptación.');
      setGuardando(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div role="dialog" aria-labelledby="titulo-aceptacion" style={{ background: fondo, color: texto, borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '620px', boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: oscuro ? '1px solid #3d3d3d' : 'none' }}>
        <h1 id="titulo-aceptacion" style={{ margin: '0 0 6px', fontSize: '1.5rem' }}>{actualizacion ? 'Actualizamos nuestros términos' : 'Antes de continuar'}</h1>
        <p style={{ margin: '0 0 16px', color: tenue, fontSize: '0.92rem' }}>
          {actualizacion
            ? 'Cambiaron los términos o la política de datos. Revísalos y acéptalos para seguir usando el sistema.'
            : 'Este sistema registra tu asistencia y trata datos personales. Léelo con calma: es tu información.'}
        </p>

        <ul style={{ margin: '0 0 18px', paddingLeft: '20px', color: tenue, fontSize: '0.88rem', lineHeight: 1.5 }}>
          <li>Guardamos tu identificación, tus cursos y tu asistencia, y los datos de contacto y equipos que registres.</li>
          <li>Los usamos para el control de asistencia, los reportes y los avisos académicos, y nada más.</li>
          <li>Puedes conocer, corregir o pedir la eliminación de tus datos cuando quieras desde el pie de página.</li>
          <li>El reconocimiento facial es opcional: si no lo autorizas, tu docente registra tu asistencia a mano.</li>
        </ul>

        {error && <div role="alert" style={{ background: oscuro ? '#3a1f1f' : '#fdecea', color: oscuro ? '#ff8a80' : '#b71c1c', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</div>}

        <div style={{ display: 'grid', gap: '14px', marginBottom: '22px' }}>
          <label style={fila}>
            <input type="checkbox" checked={terminos} onChange={(e) => setTerminos(e.target.checked)} style={caja} />
            <span>He leído y acepto los <a href="/terminos" target="_blank" rel="noreferrer" style={enlace}>términos y condiciones de uso</a>. <strong>(obligatorio)</strong></span>
          </label>
          <label style={fila}>
            <input type="checkbox" checked={datos} onChange={(e) => setDatos(e.target.checked)} style={caja} />
            <span>Autorizo el tratamiento de mis datos personales según la <a href="/privacidad" target="_blank" rel="noreferrer" style={enlace}>política de tratamiento de datos</a>. <strong>(obligatorio)</strong></span>
          </label>
          <label style={{ ...fila, paddingTop: '12px', borderTop: `1px solid ${oscuro ? '#3d3d3d' : '#e6e6e6'}` }}>
            <input type="checkbox" checked={biometrico} onChange={(e) => setBiometrico(e.target.checked)} style={caja} />
            <span>
              Autorizo el tratamiento de mis <strong>datos biométricos</strong> (rostro y, de forma complementaria, voz) para verificar mi identidad y registrar mi asistencia. <strong>(opcional)</strong>
              <span style={{ display: 'block', color: tenue, fontSize: '0.82rem' }}>No es obligatorio y puedes cambiarlo cuando quieras. Si no lo autorizas, tu asistencia se registra manualmente.</span>
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onRechazar} disabled={guardando} style={{ padding: '11px 18px', border: `1px solid ${oscuro ? '#555' : '#ccc'}`, borderRadius: '8px', background: 'transparent', color: tenue, fontWeight: 600, cursor: 'pointer' }}>
            No acepto, cerrar sesión
          </button>
          <button onClick={aceptar} disabled={guardando || !terminos || !datos} style={{ padding: '11px 20px', border: 'none', borderRadius: '8px', background: '#4CAF50', color: 'white', fontWeight: 700, cursor: !terminos || !datos || guardando ? 'not-allowed' : 'pointer' }}>
            {guardando ? 'Guardando…' : 'Aceptar y continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
