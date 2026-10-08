// src/services/sesionService.ts
// Estado de registro de la sesión actual. Se consulta una sola vez por inicio de sesión y se
// comparte entre el guardián de rutas, el menú y la pantalla de registro.
import registroApiService from './registroApiService';
import type { RespuestaRegistro } from './registroApiService';

let cache: { uid: string; promesa: Promise<RespuestaRegistro> } | null = null;

export function obtenerEstadoSesion(uid: string, forzar = false): Promise<RespuestaRegistro> {
  if (!forzar && cache?.uid === uid) return cache.promesa;
  const promesa = registroApiService.registrar().catch((e) => {
    if (cache?.promesa === promesa) cache = null; // un error no se queda guardado: se reintenta
    throw e;
  });
  cache = { uid, promesa };
  return promesa;
}

/** Guarda el resultado de un registro hecho desde la pantalla de registro (con cédula y nombre). */
export function guardarEstadoSesion(uid: string, estado: RespuestaRegistro) {
  cache = { uid, promesa: Promise.resolve(estado) };
}

export function limpiarEstadoSesion() {
  cache = null;
}
