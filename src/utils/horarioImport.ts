// src/utils/horarioImport.ts
// Lectura de horarios desde archivos (PDF de Academusoft y Excel). Todo ocurre en el
// navegador: el archivo nunca se envía a ningún servidor, solo las filas ya leídas.

export interface FilaHorario {
  /** Código de Academusoft (ej: CAD612021520). Si viene, el curso nuevo usa ese código como id. */
  codigo?: string;
  curso: string;
  grupo: string;
  day: string;
  iniTime: string;
  endTime: string;
  classroom: string;
  vigenciaInicio?: string; // solo informativo (viene del PDF)
  vigenciaFin?: string;
}

/** Fragmento de texto de un PDF. `y` crece hacia abajo (como en pantalla). */
export interface TextoPdf {
  str: string;
  x: number;
  y: number;
  w: number;
}

/** Resultado de leer un archivo: las clases y, si el archivo lo trae, el período ("2026-2"). */
export interface ArchivoHorario {
  filas: FilaHorario[];
  periodo?: string;
}

export const TAMANO_MAX_BYTES = 5 * 1024 * 1024;

export const normalizar = (s: unknown): string =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

// ============================================================
// PDF de Academusoft ("Horario del Gestor del Conocimiento")
// ============================================================

const DIAS_PDF: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

const RE_CURSO = /^([A-Za-z]{2,5}\d{5,}[A-Za-z0-9]*)\s*-\s*(.+)$/;
const RE_HORA = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/;
const RE_SALON_G = /\b([A-Za-z]{1,3}-\d{2,4}[A-Za-z]?|NREF)\b/g;
const RE_FECHA_G = /\b(\d{2}-\d{2}-\d{4})\b/g;

export function agruparLineas(items: TextoPdf[], tolerancia = 2.5): TextoPdf[][] {
  const ordenados = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lineas: TextoPdf[][] = [];
  for (const it of ordenados) {
    const ultima = lineas[lineas.length - 1];
    if (ultima && Math.abs(ultima[0].y - it.y) <= tolerancia) ultima.push(it);
    else lineas.push([it]);
  }
  return lineas.map((l) => l.sort((a, b) => a.x - b.x));
}

export function unirLinea(linea: TextoPdf[]): string {
  let texto = '';
  let finAnterior = -Infinity;
  for (const it of linea) {
    const separacion = it.x - finAnterior;
    texto += (texto && separacion > 1.5 ? ' ' : '') + it.str;
    finAnterior = it.x + it.w;
  }
  return texto.replace(/\s+/g, ' ').trim();
}

function extraerPagina(items: TextoPdf[]): FilaHorario[] {
  const visibles = items.filter((i) => i.str.trim() !== '');

  // 1) Encabezado de la tabla: la fila que contiene los nombres de los días
  const candidatos = visibles.filter((i) => DIAS_PDF[normalizar(i.str)]);
  if (candidatos.length < 2) return [];
  const porY = new Map<number, TextoPdf[]>();
  for (const c of candidatos) {
    const clave = Math.round(c.y / 3);
    porY.set(clave, [...(porY.get(clave) ?? []), c]);
  }
  const grupoCab = [...porY.values()].sort((a, b) => b.length - a.length)[0];
  if (grupoCab.length < 2) return [];
  const columnas = grupoCab
    .map((c) => ({ dia: DIAS_PDF[normalizar(c.str)], cx: c.x + c.w / 2 }))
    .sort((a, b) => a.cx - b.cx);
  const yCabecera = grupoCab.reduce((s, c) => s + c.y, 0) / grupoCab.length;
  const paso = columnas[1].cx - columnas[0].cx;

  // índice de columna de un texto: -1 = columna izquierda ("Campo de aprendizaje")
  const columnaDe = (it: TextoPdf): number => {
    const cx = it.x + it.w / 2;
    if (cx < columnas[0].cx - paso / 2) return -1;
    let k = 0;
    while (k < columnas.length - 1 && cx > (columnas[k].cx + columnas[k + 1].cx) / 2) k++;
    return k;
  };

  // 2) Cuerpo de la tabla, por líneas. Las filas de curso ("CAD612021520 - NOMBRE") abren secciones.
  const cuerpo = visibles.filter((i) => i.y > yCabecera + 6);
  const lineas = agruparLineas(cuerpo);
  const textos = lineas.map(unirLinea);
  const inicios: { indice: number; codigo: string; nombre: string }[] = [];
  textos.forEach((t, i) => {
    const m = RE_CURSO.exec(t);
    if (m && !/grupo/i.test(t) && !RE_HORA.test(t)) inicios.push({ indice: i, codigo: m[1], nombre: m[2].trim() });
  });

  const filas: FilaHorario[] = [];
  inicios.forEach((seccion, n) => {
    const desde = seccion.indice + 1;
    const hasta = n + 1 < inicios.length ? inicios[n + 1].indice : lineas.length;
    const itemsSeccion = lineas.slice(desde, hasta).flat();

    const porColumna = new Map<number, TextoPdf[]>();
    for (const it of itemsSeccion) {
      const c = columnaDe(it);
      porColumna.set(c, [...(porColumna.get(c) ?? []), it]);
    }

    // grupo "por defecto": el que aparece en la columna izquierda
    const textoIzq = (porColumna.get(-1) ?? []).length
      ? agruparLineas(porColumna.get(-1)!).map(unirLinea).join(' ')
      : '';
    const mIzq = /grupo\s*:\s*(.+)$/i.exec(textoIzq);
    const grupoIzq = mIzq ? mIzq[1].trim() : '';

    columnas.forEach((col, idx) => {
      const lineasCol = agruparLineas(porColumna.get(idx) ?? []).map(unirLinea);
      if (lineasCol.length === 0) return;

      // un bloque por cada "Grupo :" (una celda puede traer varios grupos)
      const bloques: string[][] = [];
      for (const l of lineasCol) {
        if (/grupo\s*:/i.test(l) || bloques.length === 0) bloques.push([l]);
        else bloques[bloques.length - 1].push(l);
      }

      for (const bloque of bloques) {
        const texto = bloque.join(' ').replace(/\s+/g, ' ');
        const hm = RE_HORA.exec(texto);
        if (!hm) continue;
        const antes = texto.slice(0, hm.index);
        const etiqueta = /grupo\s*:\s*/i.exec(antes);
        const tras = etiqueta ? antes.slice(etiqueta.index + etiqueta[0].length) : antes;
        const salones = [...tras.matchAll(RE_SALON_G)];
        const salon = salones.length ? salones[salones.length - 1] : null;
        const grupo = (salon ? tras.slice(0, salon.index) : tras).trim() || grupoIzq;
        const fechas = [...texto.slice(hm.index).matchAll(RE_FECHA_G)].map((m) => m[1]);

        filas.push({
          codigo: seccion.codigo,
          curso: seccion.nombre,
          grupo,
          day: col.dia,
          iniTime: hm[1],
          endTime: hm[2],
          classroom: salon ? salon[1] : '',
          vigenciaInicio: fechas[0],
          vigenciaFin: fechas[1],
        });
      }
    });
  });

  return filas;
}

/** Extrae las clases de un PDF de Academusoft a partir del texto con coordenadas de cada página. */
export function extraerFilasDeTextoPdf(paginas: TextoPdf[][]): FilaHorario[] {
  return paginas.flatMap(extraerPagina);
}

/**
 * Período académico del reporte ("... SECCIONAL UBATÉ 2 - 2026" -> "2026-2").
 * Solo se busca por encima de la tabla, para no confundirlo con las fechas de vigencia.
 */
export function extraerPeriodoDeTextoPdf(paginas: TextoPdf[][]): string | undefined {
  for (const items of paginas) {
    const dias = items.filter((i) => DIAS_PDF[normalizar(i.str)]);
    if (dias.length < 2) continue;
    const yTabla = Math.min(...dias.map((d) => d.y));
    const encima = items.filter((i) => i.y < yTabla && i.str.trim() !== '');
    for (const linea of agruparLineas(encima)) {
      const m = /(?:^|\s)([12])\s*-\s*(20\d{2})(?:\s|$)/.exec(unirLinea(linea));
      if (m) return `${m[2]}-${m[1]}`;
    }
  }
  return undefined;
}

/** Lee un PDF y devuelve, por página, los textos con su posición (y hacia abajo). Reutilizado por las listas de alumnos. */
export async function cargarTextoPdf(buffer: ArrayBuffer): Promise<TextoPdf[][]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const paginas: TextoPdf[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pagina = await doc.getPage(n);
    const alto = pagina.getViewport({ scale: 1 }).height;
    const contenido = await pagina.getTextContent();
    paginas.push(
      contenido.items
        .filter((it): it is typeof it & { str: string; transform: number[]; width: number } => 'str' in it)
        .map((it) => ({ str: it.str, x: it.transform[4], y: alto - it.transform[5], w: it.width }))
    );
  }
  return paginas;
}

async function leerPdf(buffer: ArrayBuffer): Promise<ArchivoHorario> {
  const paginas = await cargarTextoPdf(buffer);
  const filas = extraerFilasDeTextoPdf(paginas);
  const periodo = extraerPeriodoDeTextoPdf(paginas);
  if (filas.length === 0) {
    throw new Error(
      'No se reconoció ningún horario en el PDF. Debe ser el reporte "Horario del Gestor del Conocimiento" de Academusoft (con texto, no una foto escaneada). Puedes usar la plantilla de Excel.'
    );
  }
  return { filas, periodo };
}

// ============================================================
// Excel (una fila por clase)
// ============================================================

const ALIAS_COLUMNAS: Record<'codigo' | 'curso' | 'grupo' | 'day' | 'iniTime' | 'endTime' | 'classroom' | 'horario', string[]> = {
  codigo: ['codigo', 'codigocurso', 'codigoacademusoft'],
  curso: ['curso', 'materia', 'asignatura', 'campodeaprendizaje', 'nombredelcurso', 'nombrecurso'],
  grupo: ['grupo'],
  day: ['dia', 'day', 'diasemana'],
  iniTime: ['horainicio', 'horainicial', 'inicio', 'desde', 'initime', 'horaini'],
  endTime: ['horafin', 'horafinal', 'fin', 'hasta', 'endtime', 'horafinalizacion'],
  classroom: ['salon', 'aula', 'sala', 'classroom', 'recursofisico'],
  horario: ['horario', 'hora', 'franja'],
};

type Campo = keyof typeof ALIAS_COLUMNAS;

const celdaTexto = (v: unknown): string => String(v ?? '').trim();

/** Excel guarda las horas como fracción del día (0.4166 = 10:00). */
function celdaHora(v: unknown): string {
  if (typeof v === 'number' && isFinite(v)) {
    const fraccion = v - Math.floor(v);
    const minutos = Math.round(fraccion * 24 * 60) % (24 * 60);
    return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
  }
  return celdaTexto(v);
}

/** Convierte una tabla (filas de celdas) en filas de horario. Exportada para pruebas. */
export function filasDeTabla(tabla: unknown[][]): FilaHorario[] {
  let filaCab = -1;
  let mapa: Partial<Record<Campo, number>> = {};
  for (let i = 0; i < Math.min(tabla.length, 15); i++) {
    const candidato: Partial<Record<Campo, number>> = {};
    (tabla[i] ?? []).forEach((celda, col) => {
      const n = normalizar(celda);
      if (!n) return;
      (Object.keys(ALIAS_COLUMNAS) as Campo[]).forEach((campo) => {
        if (candidato[campo] === undefined && ALIAS_COLUMNAS[campo].includes(n)) candidato[campo] = col;
      });
    });
    const tieneHoras = (candidato.iniTime !== undefined && candidato.endTime !== undefined) || candidato.horario !== undefined;
    if (candidato.day !== undefined && tieneHoras && candidato.curso !== undefined) {
      filaCab = i;
      mapa = candidato;
      break;
    }
  }
  if (filaCab < 0) {
    throw new Error(
      'No se encontraron las columnas del horario. Usa la plantilla: Curso, Grupo, Día, Hora inicio, Hora fin y Salón.'
    );
  }
  if (mapa.grupo === undefined) {
    throw new Error('Falta la columna "Grupo". Usa la plantilla de horario.');
  }

  const filas: FilaHorario[] = [];
  for (const fila of tabla.slice(filaCab + 1)) {
    if (!fila || fila.every((c) => celdaTexto(c) === '')) continue;
    const valor = (campo: Campo) => (mapa[campo] === undefined ? undefined : fila[mapa[campo]!]);

    let ini = celdaHora(valor('iniTime'));
    let fin = celdaHora(valor('endTime'));
    if ((!ini || !fin) && mapa.horario !== undefined) {
      const m = RE_HORA.exec(celdaTexto(valor('horario')));
      if (m) [ini, fin] = [m[1], m[2]];
    }
    filas.push({
      curso: celdaTexto(valor('curso')),
      grupo: celdaTexto(valor('grupo')),
      day: celdaTexto(valor('day')),
      iniTime: ini,
      endTime: fin,
      classroom: celdaTexto(valor('classroom')),
      codigo: celdaTexto(valor('codigo')) || undefined,
    });
  }
  return filas;
}

async function leerExcel(buffer: ArrayBuffer): Promise<FilaHorario[]> {
  const XLSX = await import('xlsx');
  const libro = XLSX.read(buffer, { type: 'array' });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  if (!hoja) throw new Error('El archivo no tiene hojas con datos.');
  const tabla = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: true, defval: '' });
  return filasDeTabla(tabla);
}

// ============================================================
// API pública
// ============================================================

export async function leerArchivoHorario(archivo: File): Promise<ArchivoHorario> {
  if (archivo.size > TAMANO_MAX_BYTES) throw new Error('El archivo supera 5 MB.');
  const nombre = archivo.name.toLowerCase();
  const buffer = await archivo.arrayBuffer();

  let resultado: ArchivoHorario;
  if (nombre.endsWith('.pdf')) resultado = await leerPdf(buffer);
  else if (nombre.endsWith('.xlsx') || nombre.endsWith('.xls')) resultado = { filas: await leerExcel(buffer) };
  else throw new Error('Formato no soportado. Sube un PDF de Academusoft o un Excel (.xlsx).');

  if (resultado.filas.length === 0) throw new Error('El archivo no tiene clases para importar.');
  if (resultado.filas.length > 500) throw new Error('El archivo tiene más de 500 clases.');
  return resultado;
}
