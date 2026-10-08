// src/components/AgregarClaseModal.tsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import horarioApiService from '../services/horarioApiService';
import type { Course } from '../services/horarioApiService';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface Props {
  /** Día preseleccionado (el de la columna donde se pulsó "Agregar clase"). */
  dia: string;
  courses: Course[];
  onCerrar: () => void;
  /** Se llama tras guardar con éxito (el calendario recarga los cursos). */
  onGuardado: (mensaje: string) => void;
}

const estiloCampo: React.CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid #d0d0d0',
  borderRadius: '8px',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
};

export function AgregarClaseModal({ dia, courses, onCerrar, onGuardado }: Props) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [day, setDay] = useState(dia);
  const [iniTime, setIniTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:59');
  const [classroom, setClassroom] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && !guardando && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [guardando, onCerrar]);

  const guardar = async () => {
    const clase = { classroom: classroom.trim(), day, iniTime, endTime };
    const validacion = horarioApiService.validarClase(clase);
    if (!courseId) {
      setError('Elige el curso.');
      return;
    }
    if (!validacion.valido) {
      setError(validacion.errores[0]);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await horarioApiService.agregarClase(courseId, clase);
      const curso = courses.find((c) => c.id === courseId);
      onGuardado(`Clase agregada: ${curso?.nameCourse ?? ''} · ${day} ${iniTime}–${endTime}`);
    } catch (e: any) {
      setError(e.message || 'No se pudo agregar la clase.');
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-agregar-clase"
      onClick={(e) => e.target === e.currentTarget && !guardando && onCerrar()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '22px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 id="titulo-agregar-clase" style={{ margin: 0, color: '#2b2b2b', fontSize: '1.3rem' }}>Agregar clase</h2>
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
          <label style={{ display: 'grid', gap: '4px', fontSize: '0.88rem', color: '#444', fontWeight: 600 }}>
            Curso
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} style={estiloCampo}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.nameCourse} · {c.group}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: '4px', fontSize: '0.88rem', color: '#444', fontWeight: 600 }}>
            Día
            <select value={day} onChange={(e) => setDay(e.target.value)} style={estiloCampo}>
              {DIAS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '4px', fontSize: '0.88rem', color: '#444', fontWeight: 600 }}>
              Hora de inicio
              <input type="time" value={iniTime} onChange={(e) => setIniTime(e.target.value)} style={estiloCampo} />
            </label>
            <label style={{ display: 'grid', gap: '4px', fontSize: '0.88rem', color: '#444', fontWeight: 600 }}>
              Hora de fin
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={estiloCampo} />
            </label>
          </div>

          <label style={{ display: 'grid', gap: '4px', fontSize: '0.88rem', color: '#444', fontWeight: 600 }}>
            Salón
            <input value={classroom} onChange={(e) => setClassroom(e.target.value)} placeholder="Ej: C-105" style={estiloCampo} />
            <span style={{ fontWeight: 400, color: '#777', fontSize: '0.8rem' }}>
              El reconocimiento facial usa el salón para tomar la asistencia en esa clase.
            </span>
          </label>
        </div>

        <p style={{ margin: '14px 0 0', color: '#777', fontSize: '0.82rem' }}>
          La clase se guarda en la base de datos: desde ese día y hora se podrá tomar asistencia. Quedará registrada en tu historial.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button onClick={onCerrar} disabled={guardando} style={{ padding: '10px 18px', border: 'none', borderRadius: '8px', background: '#9e9e9e', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={guardando} style={{ padding: '10px 18px', border: 'none', borderRadius: '8px', background: guardando ? '#c7c7c7' : 'var(--color-primary)', color: 'white', fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer' }}>
            {guardando ? 'Guardando…' : 'Guardar clase'}
          </button>
        </div>
      </div>
    </div>
  );
}
