// src/hooks/useCierreInactividad.ts
// Cierra la sesión sola si nadie toca nada durante MINUTOS_INACTIVIDAD. El SDK de Firebase renueva el
// token en segundo plano aunque la persona esté ausente, así que sin esto la sesión nunca expiraría
// por sí sola (riesgo en equipos compartidos, como los de las salas de la Universidad).
import { useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const MINUTOS_INACTIVIDAD = 15;
const EVENTOS_DE_ACTIVIDAD = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;

export function useCierreInactividad() {
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cerrarPorInactividad = async () => {
      try { localStorage.setItem('motivo_cierre_sesion', 'Cerramos tu sesión por inactividad.'); } catch { /* ignorar */ }
      try { await signOut(auth); } catch { /* ignorar */ }
      window.location.href = '/';
    };

    const reiniciar = () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(cerrarPorInactividad, MINUTOS_INACTIVIDAD * 60 * 1000);
    };

    EVENTOS_DE_ACTIVIDAD.forEach((evento) => window.addEventListener(evento, reiniciar));
    reiniciar();

    return () => {
      EVENTOS_DE_ACTIVIDAD.forEach((evento) => window.removeEventListener(evento, reiniciar));
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);
}
