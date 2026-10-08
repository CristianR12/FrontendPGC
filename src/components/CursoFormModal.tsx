// src/components/CursoFormModal.tsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import cursosApiService from '../services/cursosApiService';
import type { Course } from '../services/horarioApiService';

interface Props {
  /** Curso a editar; si no se envía, el formulario crea uno nuevo. */
  curso?: Course | null;
  onCerrar: () => void;
  /** Se llama tras guardar. En una creación recibe el curso nuevo. */
  onGuardado: (mensaje: string, nuevo?: Course) => void;
}

const estiloCampo: React.CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid #d0d0d0',
  borderRadius: '8px',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
};

const etiqueta: React.CSSProperties = { display: 'grid', gap: '4px', fontSize: '0.88rem', color: '#444', fontWeight: 600 };

export function CursoFormModal({ curso, onCerrar, onGuardado }: Props) {
  const editando = !!curso;
  const [nombre, setNombre] = useState(curso?.nameCourse ?? '');
  const [grupo, setGrupo] = useState(curso?.group ?? '');
  const [codigo, setCodigo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && !guardando && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [guardando, onCerrar]);

  const guardar = async () => {
    if (nombre.trim().length < 3) return setError('Escribe el nombre del curso (mínimo 3 caracteres).');
    if (!grupo.trim()) return setError('Escribe el grupo (ej: 501 ISC UBT).');
    if (codigo.trim() && !/^[A-Za-z0-9_-]{3,40}$/.test(codigo.trim())) {
      return setError('El código solo puede tener letras, números, guion y guion bajo (3 a 40 caracteres).');
    }
    setGuardando(true);
    setError(null);
    try {
      if (editando && curso) {
        await cursosApiService.editarCurso(curso.id, { nameCourse: nombre, group: grupo });
        onGuardado('Curso actualizado.');
      } else {
        const nuevo = await cursosApiService.crearCurso({ nameCourse: nombre, group: grupo, codigo: codigo.trim() || undefined });
        onGuardado('Curso creado. Ahora agrega sus estudiantes y su horario.', nuevo);
      }
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar el curso.');
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-curso"
      onClick={(e) => e.target === e.currentTarget && !guardando && onCerrar()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '22px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 id="titulo-curso" style={{ margin: 0, color: '#2b2b2b', fontSize: '1.3rem' }}>{editando ? 'Editar curso' : 'Nuevo curso'}</h2>
          <button onClick={onCerrar} disabled={guardando} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
            <X size={22} />
          </button>
        </div>

        {error && (
          <div role="alert" style={{ background: '#fdecea', color: '#b71c1c', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: '12px' }}>
          <label style={etiqueta}>
            Nombre del curso
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: LINEA DE PROFUNDIZACION III" style={estiloCampo} autoFocus />
          </label>
          <label style={etiqueta}>
            Grupo
            <input value={grupo} onChange={(e) => setGrupo(e.target.value)} placeholder="Ej: 901 IS UBT" style={estiloCampo} />
          </label>
          {!editando && (
            <label style={etiqueta}>
              Código de Academusoft (opcional)
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: CAD612021104" style={estiloCampo} />
              <span style={{ fontWeight: 400, color: '#777', fontSize: '0.8rem' }}>
                Si lo tienes, será el identificador del curso (como los demás). Si lo dejas vacío, el sistema genera uno.
              </span>
            </label>
          )}
        </div>

        {editando && (
          <p style={{ margin: '12px 0 0', color: '#777', fontSize: '0.82rem' }}>
            Cambiar el nombre o el grupo no borra asistencias ni estudiantes. Escríbelos igual que en Academusoft para que la importación de horarios y listas los reconozca.
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button onClick={onCerrar} disabled={guardando} style={{ padding: '10px 18px', border: 'none', borderRadius: '8px', background: '#9e9e9e', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} style={{ padding: '10px 18px', border: 'none', borderRadius: '8px', background: guardando ? '#c7c7c7' : 'var(--color-primary)', color: 'white', fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer' }}>
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear curso'}
          </button>
        </div>
      </div>
    </div>
  );
}
