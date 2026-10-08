// src/utils/listaEstudiantesImport.ts
// Lectura de la "Lista de Alumnos por Grupo" de Academusoft (Excel, CSV o PDF).
// Todo ocurre en el navegador: el archivo nunca se envía a ningún servidor. Del archivo solo se
// usan identificación y nombre; el correo institucional se descarta a propósito (no se guarda).

import {
  TAMANO_MAX_BYTES,
  agruparLineas,
  cargarTextoPdf,
  normalizar,
  unirLinea,
} from './horarioImport';
import type { TextoPdf } from './horarioImport';

export interface FilaEstudianteArchivo {
  tipoDocumento: string;
  cedula: string;
  nombre: string;
  repitente?: string;
}

export interface ListaEstudiantes {
  /** Código de Academusoft del curso, ej: CAD612021520 */
  codigoCurso?: string;
  /** Nombre del curso, ej: SISTEMAS OPERATIVOS */
  materia?: string;
  /** Grupo, ej: 501 ISC UBT */
  grupo?: string;
  /** "Total Alumnos" que declara el reporte (sirve para verificar que se leyeron todos) */
  totalDeclarado?: number;
  estudiantes: FilaEstudianteArchivo[];
}

const RE_CURSO = /^([A-Za-z]{2,5}\d{5,}[A-Za-z0-9]*)\s*[-\s]\s*(.+)$/;
const RE_GRUPO = /^\d{2,4}\s+[A-Za-zÁÉÍÓÚÑ]{2,}(?:\s+[A-Za-zÁÉÍÓÚÑ]{2,})*$/;
const RE_TIPO_DOC = /^(CC|TI|CE|PA|PEP|PPT|RC|NIT|DNI)$/i;

const celdaTexto = (v: unknown): string => String(v ?? '').trim();

/** Una identificación puede venir como número (1234567890) o como texto ("1.234.567.890"). */
function celdaId(v: unknown): string {
  if (typeof v === 'number' && isFinite(v)) return String(Math.trunc(v));
  return celdaTexto(v).replace(/[.\s,]/g, '');
}

function separarCurso(texto: string): { codigoCurso?: string; materia: string } {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  const m = RE_CURSO.exec(limpio);
  return m ? { codigoCurso: m[1], materia: m[2].trim() } : { materia: limpio };
}

// ============================================================
// Excel / CSV
// ============================================================

/** Convierte la tabla de la hoja en la lista de alumnos. Exportada para pruebas. */
export function listaDeTabla(tabla: unknown[][]): ListaEstudiantes {
  const filaCon = (...claves: string[]) =>
    tabla.findIndex((fila) => {
      const celdas = (fila ?? []).map(normalizar);
      return claves.every((c) => celdas.some((x) => x.includes(c)));
    });

  const filaCabecera = filaCon('identificacion', 'nombre');
  if (filaCabecera < 0) {
    throw new Error(
      'No se encontraron las columnas "Identificación" y "Nombre". Debe ser la "Lista de Alumnos por Grupo" de Academusoft.'
    );
  }
  const cab = (tabla[filaCabecera] ?? []).map(normalizar);
  const col = (clave: string) => cab.findIndex((x) => x.includes(clave));
  const cId = col('identificacion');
  const cNombre = col('nombre');
  const cTipo = col('tipo');
  const cRepitente = col('repitente');

  const lista: ListaEstudiantes = { estudiantes: [] };

  // Datos del curso: la fila con "Materia" y "Grupo" y, debajo, sus valores
  const filaCurso = filaCon('materia', 'grupo');
  if (filaCurso >= 0 && filaCurso + 1 < tabla.length) {
    const encabezado = (tabla[filaCurso] ?? []).map(normalizar);
    const valores = tabla[filaCurso + 1] ?? [];
    const iMateria = encabezado.findIndex((x) => x.includes('materia'));
    const iGrupo = encabezado.findIndex((x) => x === 'grupo');
    const iTotal = encabezado.findIndex((x) => x.includes('total'));
    const materia = celdaTexto(valores[iMateria]);
    if (materia) Object.assign(lista, separarCurso(materia));
    if (iGrupo >= 0) lista.grupo = celdaTexto(valores[iGrupo]) || undefined;
    if (iTotal >= 0 && celdaTexto(valores[iTotal])) lista.totalDeclarado = Number(celdaTexto(valores[iTotal])) || undefined;
  }

  for (const fila of tabla.slice(filaCabecera + 1)) {
    if (!fila) continue;
    const nombre = celdaTexto(fila[cNombre]);
    if (!nombre) continue; // filas vacías o de pie de página
    lista.estudiantes.push({
      tipoDocumento: cTipo >= 0 ? celdaTexto(fila[cTipo]) : '',
      cedula: celdaId(fila[cId]),
      nombre,
      repitente: cRepitente >= 0 ? celdaTexto(fila[cRepitente]) : undefined,
    });
  }
  return lista;
}

function decodificarCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

async function leerExcelOCsv(buffer: ArrayBuffer, esCsv: boolean): Promise<ListaEstudiantes> {
  const XLSX = await import('xlsx');
  const libro = esCsv ? XLSX.read(decodificarCsv(buffer), { type: 'string' }) : XLSX.read(buffer, { type: 'array' });
  // el reporte trae 3 hojas y solo la primera tiene datos: se usa la primera que tenga contenido
  for (const nombre of libro.SheetNames) {
    const tabla = XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets[nombre], { header: 1, raw: true, defval: '' });
    if (tabla.length > 0) return listaDeTabla(tabla);
  }
  throw new Error('El archivo no tiene hojas con datos.');
}

// ============================================================
// PDF
// ============================================================

/** Extrae la lista de alumnos de un PDF de Academusoft a partir del texto con coordenadas. */
export function extraerListaDeTextoPdf(paginas: TextoPdf[][]): ListaEstudiantes {
  const lista: ListaEstudiantes = { estudiantes: [] };

  for (const items of paginas) {
    const visibles = items.filter((i) => i.str.trim() !== '');
    const lineas = agruparLineas(visibles);

    // Encabezado de la tabla: la línea que trae "Identificación" y "Nombre"
    const iCab = lineas.findIndex((l) => {
      const t = l.map((i) => normalizar(i.str));
      return t.some((x) => x.includes('identificacion')) && t.some((x) => x === 'nombre');
    });
    if (iCab < 0) continue;

    // Datos del curso, por encima de la tabla: "CAD612021520-SISTEMAS OPERATIVOS", "501 ISC UBT", "16"
    for (const linea of lineas.slice(0, iCab)) {
      for (const it of linea) {
        const t = it.str.replace(/\s+/g, ' ').trim();
        const mc = RE_CURSO.exec(t);
        if (mc && !lista.materia && /[A-Za-z]{2,5}\d{5,}/.test(t)) Object.assign(lista, separarCurso(t));
        else if (RE_GRUPO.test(t) && !lista.grupo) lista.grupo = t;
        else if (/^\d{1,3}$/.test(t) && lista.totalDeclarado === undefined && lista.materia) lista.totalDeclarado = Number(t);
      }
    }

    // Columnas por la posición de su encabezado. "Tipo de Documento" suele partirse en 2 líneas.
    const cabecera = lineas[iCab];
    const centro = (i: TextoPdf) => i.x + i.w / 2;
    const itemId = cabecera.find((i) => normalizar(i.str).includes('identificacion'));
    const itemNombre = cabecera.find((i) => normalizar(i.str) === 'nombre');
    const itemMail = cabecera.find((i) => normalizar(i.str).includes('mail'));
    const itemTipo = cabecera.find((i) => normalizar(i.str).includes('tipo'));
    if (!itemId || !itemNombre) continue;

    const cTipo = itemTipo ? centro(itemTipo) : centro(itemId) - 60;
    const cId = centro(itemId);
    const cNombre = centro(itemNombre);
    const cMail = itemMail ? centro(itemMail) : Infinity;
    const limTipoId = (cTipo + cId) / 2;
    const limIdNombre = (cId + cNombre) / 2;
    const limNombreMail = (cNombre + cMail) / 2;

    const columnaDe = (i: TextoPdf): 'tipo' | 'id' | 'nombre' | 'otro' => {
      const c = centro(i);
      if (c < limTipoId) return 'tipo';
      if (c < limIdNombre) return 'id';
      if (c < limNombreMail) return 'nombre';
      return 'otro';
    };

    for (const linea of lineas.slice(iCab + 1)) {
      const texto = unirLinea(linea);
      if (/^p[aá]g\.?\s/i.test(texto) || /^fecha del reporte/i.test(texto)) continue;
      if (linea.some((i) => normalizar(i.str).includes('documento'))) continue; // 2.ª línea del encabezado
      const partes: Record<string, string> = { tipo: '', id: '', nombre: '' };
      for (const it of linea) {
        const c = columnaDe(it);
        if (c !== 'otro') partes[c] = `${partes[c]} ${it.str}`.trim();
      }
      const tipo = partes.tipo.replace(/\s+/g, ' ');
      const nombre = partes.nombre.replace(/\s+/g, ' ');
      if (!nombre) continue;
      if (partes.tipo && !RE_TIPO_DOC.test(tipo)) continue; // no es una fila de alumno
      lista.estudiantes.push({ tipoDocumento: tipo, cedula: partes.id.replace(/[.\s,]/g, ''), nombre });
    }
  }
  return lista;
}

// ============================================================
// API pública
// ============================================================

export async function leerListaEstudiantes(archivo: File): Promise<ListaEstudiantes> {
  if (archivo.size > TAMANO_MAX_BYTES) throw new Error('El archivo supera 5 MB.');
  const nombre = archivo.name.toLowerCase();
  const buffer = await archivo.arrayBuffer();

  let lista: ListaEstudiantes;
  if (nombre.endsWith('.pdf')) {
    lista = extraerListaDeTextoPdf(await cargarTextoPdf(buffer));
    if (lista.estudiantes.length === 0) {
      throw new Error(
        'No se reconoció ninguna lista de alumnos en el PDF. Debe ser la "Lista de Alumnos por Grupo" de Academusoft (con texto, no una foto escaneada). Puedes usar el Excel del mismo reporte.'
      );
    }
  } else if (nombre.endsWith('.xlsx') || nombre.endsWith('.xls')) lista = await leerExcelOCsv(buffer, false);
  else if (nombre.endsWith('.csv')) lista = await leerExcelOCsv(buffer, true);
  else throw new Error('Formato no soportado. Sube el PDF, el Excel (.xls o .xlsx) o un CSV de la lista de alumnos.');

  if (lista.estudiantes.length === 0) throw new Error('El archivo no tiene estudiantes.');
  if (lista.estudiantes.length > 200) throw new Error('El archivo tiene más de 200 estudiantes: súbelo por partes.');
  return lista;
}
