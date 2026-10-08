// src/utils/useColumnas.ts
import { useEffect, useState } from 'react';

/** Columnas de una rejilla de tarjetas según el ancho de la ventana: 3 en escritorio, 2 en tablet y 1 en celular. */
export function useColumnas(): 1 | 2 | 3 {
  const [ancho, setAncho] = useState(window.innerWidth);
  useEffect(() => {
    const alRedimensionar = () => setAncho(window.innerWidth);
    window.addEventListener('resize', alRedimensionar);
    return () => window.removeEventListener('resize', alRedimensionar);
  }, []);
  return ancho < 640 ? 1 : ancho < 1000 ? 2 : 3;
}
