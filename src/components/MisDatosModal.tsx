// src/components/MisDatosModal.tsx
// "Mis datos y privacidad": qué aceptaste, la autorización biométrica y las solicitudes sobre tus datos.
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import legalApiService from '../services/legalApiService';
import type { EstadoLegal, SolicitudDatos, TipoSolicitud } from '../services/legalApiService';

const TIPOS: { id: TipoSolicitud; texto: string }[] = [
  { id: 'consulta', texto: 'Consultar qué datos tienen sobre mí' },
  { id: 'rectificacion', texto: 'Corregir o actualizar mis datos' },
  { id: 'supresion', texto: 'Eliminar mis datos' },
  { id: 'revocatoria', texto: 'Revocar mi autorización' },
];

const NOMBRE_TIPO = Object.fromEntries(TIPOS.map((t) => [t.id, t.texto])) as Record<TipoSolicitud, string>;

const fechaCorta = (iso: string) => new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });

export function MisDatosModal({ oscuro = false, onCerrar }: { oscuro?: boolean; onCerrar: () => void }) {
  const [estado, setEstado] = useState<EstadoLegal | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudDatos[]>([]);
  const [tipo, setTipo] = useState<TipoSolicitud>('consulta');
  const [detalle, setDetalle] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const cargar = async () => {
    try {
      const [e, s] = await Promise.all([legalApiService.estado(), legalApiService.misSolicitudes()]);
      setEstado(e);
      setSolicitudes(s);
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar tu información.');
    }
  };
  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && !trabajando && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [trabajando, onCerrar]);

  const fondo = oscuro ? '#2d2d2d' : 'white';
  const texto = oscuro ? '#fff' : '#2b2b2b';
  const tenue = oscuro ? '#aaa' : '#666';
  const borde = oscuro ? '#3d3d3d' : '#d9d9d9';
  const campo: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${borde}`, background: oscuro ? '#1e1e1e' : 'white', color: texto, fontSize: '0.92rem', boxSizing: 'border-box' };
  const bloque: React.CSSProperties = { border: `1px solid ${borde}`, borderRadius: '12px', padding: '16px', marginBottom: '14px' };

  const cambiarBiometria = async (autoriza: boolean) => {
    setTrabajando(true);
    setError(null);
    setInfo(null);
    try {
      const a = await legalApiService.autorizarBiometria(autoriza);
      setEstado((e) => (e ? { ...e, aceptacion: a } : e));
      setInfo(autoriza ? 'Autorización biométrica otorgada.' : 'Autorización biométrica revocada. Tu asistencia se registrará manualmente.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTrabajando(false);
    }
  };

  const enviar = async () => {
    setTrabajando(true);
    setError(null);
    setInfo(null);
    try {
      await legalApiService.solicitar(tipo, detalle);
      setDetalle('');
      setInfo('Solicitud enviada. Te responderemos dentro de los plazos de ley.');
      setSolicitudes(await legalApiService.misSolicitudes());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTrabajando(false);
    }
  };

  const bio = !!estado?.aceptacion?.biometrico;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-mis-datos" onClick={(e) => e.target === e.currentTarget && !trabajando && onCerrar()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
      <div style={{ background: fondo, color: texto, borderRadius: '16px', width: '100%', maxWidth: '620px', margin: 'auto', padding: '24px', boxSizing: 'border-box', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 id="titulo-mis-datos" style={{ margin: 0, fontSize: '1.3rem' }}>Mis datos y privacidad</h2>
          <button onClick={onCerrar} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: tenue, padding: '4px', display: 'flex' }}><X size={22} /></button>
        </div>

        {error && <div role="alert" style={{ background: oscuro ? '#3a1f1f' : '#fdecea', color: oscuro ? '#ff8a80' : '#b71c1c', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</div>}
        {info && <div role="status" style={{ background: oscuro ? '#1f3a24' : '#e6f4ea', color: oscuro ? '#9be3a8' : '#1b6e34', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>{info}</div>}
        {!estado && !error && <p style={{ color: tenue }}>Cargando…</p>}

        {estado && (
          <>
            <div style={bloque}>
              <strong>Lo que aceptaste</strong>
              {estado.aceptacion ? (
                <p style={{ margin: '6px 0 0', color: tenue, fontSize: '0.88rem' }}>
                  Términos y tratamiento de datos, versión {estado.aceptacion.version}, el {fechaCorta(estado.aceptacion.fecha)}.
                </p>
              ) : <p style={{ margin: '6px 0 0', color: tenue, fontSize: '0.88rem' }}>Todavía no has aceptado.</p>}
              <p style={{ margin: '8px 0 0', fontSize: '0.88rem' }}>
                <a href="/terminos" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Términos y condiciones</a>
                {' · '}
                <a href="/privacidad" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Política de datos personales</a>
              </p>
            </div>

            {estado.aceptacion && (
              <div style={bloque}>
                <strong>Datos biométricos (rostro y voz)</strong>
                <p style={{ margin: '6px 0 10px', color: tenue, fontSize: '0.88rem' }}>
                  {bio ? 'Autorizaste su uso para verificar tu identidad. Puedes revocarlo cuando quieras.' : 'No los has autorizado: tu asistencia la registra tu docente manualmente.'}
                </p>
                <button onClick={() => cambiarBiometria(!bio)} disabled={trabajando}
                  style={{ padding: '9px 16px', border: 'none', borderRadius: '8px', background: bio ? '#e53935' : '#4CAF50', color: 'white', fontWeight: 600, cursor: trabajando ? 'not-allowed' : 'pointer' }}>
                  {bio ? 'Revocar autorización' : 'Autorizar'}
                </button>
              </div>
            )}

            <div style={bloque}>
              <strong>Ejercer mis derechos</strong>
              <p style={{ margin: '6px 0 10px', color: tenue, fontSize: '0.85rem' }}>Para corregir tu contacto y tus equipos usa "Editar perfil". Para lo demás, envía una solicitud.</p>
              <div style={{ display: 'grid', gap: '10px' }}>
                <select aria-label="Tipo de solicitud" value={tipo} onChange={(e) => setTipo(e.target.value as TipoSolicitud)} style={campo}>
                  {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.texto}</option>)}
                </select>
                <textarea aria-label="Detalle" value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={600} rows={3} placeholder="Cuéntanos qué necesitas…" style={{ ...campo, resize: 'vertical', fontFamily: 'inherit' }} />
                <button onClick={enviar} disabled={trabajando || detalle.trim().length < 10}
                  style={{ justifySelf: 'end', padding: '9px 18px', border: 'none', borderRadius: '8px', background: 'var(--color-primary)', color: 'white', fontWeight: 600, cursor: trabajando || detalle.trim().length < 10 ? 'not-allowed' : 'pointer' }}>
                  Enviar solicitud
                </button>
              </div>
              {solicitudes.length > 0 && (
                <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
                  {solicitudes.map((s) => (
                    <div key={s.id} style={{ borderTop: `1px solid ${borde}`, paddingTop: '8px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <strong>{NOMBRE_TIPO[s.tipo]}</strong>
                        <span style={{ color: s.estado === 'atendida' ? '#4CAF50' : '#FF9800', fontWeight: 700 }}>{s.estado === 'atendida' ? 'Atendida' : 'Pendiente'}</span>
                      </div>
                      <div style={{ color: tenue }}>{fechaCorta(s.fecha)} · {s.detalle}</div>
                      {s.respuesta && <div style={{ marginTop: '4px' }}>Respuesta: {s.respuesta}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
