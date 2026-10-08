// src/components/TextoLegal.tsx
// Muestra un documento legal. Lo marcado como [[PENDIENTE: ...]] se resalta para que se complete antes de publicar.
import type { ReactNode } from 'react';
import type { DocumentoLegal } from '../legal/contenido';
import { VERSION_LEGAL } from '../legal/contenido';

const PENDIENTE = /\[\[PENDIENTE:\s*(.*?)\]\]/g;

function conPendientes(texto: string, oscuro: boolean) {
  const partes: ReactNode[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(PENDIENTE)) {
    partes.push(texto.slice(ultimo, m.index));
    partes.push(
      <mark key={m.index} title="Falta completar este dato" style={{ background: oscuro ? '#5c4a00' : '#fff3b0', color: oscuro ? '#ffe082' : '#6b4f00', padding: '0 4px', borderRadius: '4px' }}>
        Pendiente: {m[1]}
      </mark>
    );
    ultimo = (m.index ?? 0) + m[0].length;
  }
  partes.push(texto.slice(ultimo));
  return partes;
}

export function TextoLegal({ documento, oscuro }: { documento: DocumentoLegal; oscuro: boolean }) {
  const tenue = oscuro ? '#aaa' : '#666';
  return (
    <article style={{ color: oscuro ? '#ddd' : '#333', lineHeight: 1.6, fontSize: '0.95rem' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: '1.6rem', color: oscuro ? '#fff' : '#2b2b2b' }}>{documento.titulo}</h1>
      <p style={{ margin: '0 0 20px', color: tenue }}>{documento.resumen}</p>
      {documento.secciones.map((s) => (
        <section key={s.titulo} style={{ marginBottom: '18px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--color-primary)' }}>{s.titulo}</h2>
          {s.parrafos?.map((p, i) => <p key={i} style={{ margin: '0 0 8px' }}>{conPendientes(p, oscuro)}</p>)}
          {s.lista && (
            <ul style={{ margin: '0 0 8px', paddingLeft: '22px' }}>
              {s.lista.map((item, i) => <li key={i} style={{ marginBottom: '3px' }}>{conPendientes(item, oscuro)}</li>)}
            </ul>
          )}
        </section>
      ))}
      <p style={{ margin: '24px 0 0', color: tenue, fontSize: '0.82rem' }}>Versión {VERSION_LEGAL}</p>
    </article>
  );
}
