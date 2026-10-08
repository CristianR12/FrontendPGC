// src/utils/reporteAsistencia.ts
// Reportes de asistencia con el aspecto de los reportes de Academusoft: el PDF como "Lista de Alumnos por
// Grupo" (barra verde) y el Excel como la lista en .xls de la universidad (barra azul y filas amarillas).
// La construcción de la tabla es pura (se puede probar sin navegador); PDF y Excel se cargan al usarlos.
import { fechaLarga } from './filtroInicio';

export interface RegistroReporte {
  estado: string;
  hora: string;
  late: boolean;
}

/** Respuesta de GET /api/asistencias/reporte/ */
export interface DatosReporte {
  unidad: { id: string; courseId: string; nameCourse: string | null; group: string | null; docente: string; docenteId?: string };
  fechas: string[];
  estudiantes: { cedula: string; nombre: string }[];
  registros: Record<string, Record<string, RegistroReporte>>;
  hora: string | null;
  fueraDeFranja: number;
}

export type TipoReporte = 'sesion' | 'todas';

export interface TablaReporte {
  tipo: TipoReporte;
  titulo: string;
  materia: string;
  grupo: string;
  docente: string;
  docenteId: string;
  /** Semestre del reporte, como lo escribe Academusoft: "2 - 2026" */
  periodo: string;
  totalAlumnos: number;
  /** Qué abarca el reporte: "Sesión del lunes 2 de marzo de 2026, clase de 07:00 – 08:59" o "Todas las clases (12 sesiones)" */
  alcance: string;
  columnas: string[];
  filas: string[][];
  /** Cuántas columnas iniciales son fijas (identificación y nombre) */
  fijas: number;
  /** Cuántas columnas finales son totales (solo en "todas") */
  totales: number;
  leyenda: string | null;
  nombreArchivo: string;
}

/** Los reportes de Academusoft llevan la unidad regional; este sistema es el de la Seccional Ubaté. */
export const UNIDAD_REGIONAL = 'UNIDAD REGIONAL, SECCIONAL UBATÉ';

/** '2026-03-02' -> '1 - 2026' (enero a junio es el semestre 1, julio a diciembre el 2). */
export function periodoDe(iso: string): string {
  return `${Number(iso.slice(5, 7)) <= 6 ? 1 : 2} - ${iso.slice(0, 4)}`;
}

const SIGLAS: Record<string, string> = { Presente: 'P', Ausente: 'A', 'Tiene Excusa': 'E' };

export const fechaCorta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** "CAD612021520" se muestra delante del nombre cuando el id del curso es un código de Academusoft. */
export function materiaDe(courseId: string, nombre: string | null): string {
  const nombreCurso = nombre ?? 'Sin nombre';
  return /^[A-Za-z]{2,}\d{6,}$/.test(courseId) ? `${courseId}-${nombreCurso}` : nombreCurso;
}

const horaVisible = (h: string) => (/^\d{1,2}:\d{2}/.test(h) ? h.slice(0, 5) : '—');

const limpiarNombreArchivo = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

/** Convierte la respuesta del servidor en la tabla del reporte. */
export function construirReporte(datos: DatosReporte, fecha: string | null): TablaReporte {
  const { unidad, estudiantes, registros } = datos;
  const sesion = !!fecha && datos.fechas.length === 1;
  const base = {
    titulo: 'Reporte de Asistencia',
    materia: materiaDe(unidad.courseId, unidad.nameCourse),
    grupo: unidad.group ?? '',
    docente: unidad.docente,
    docenteId: unidad.docenteId ?? '',
    // Semestre de la sesión pedida o, en el reporte completo, de la última clase
    periodo: periodoDe(fecha ?? datos.fechas[datos.fechas.length - 1] ?? new Date().toISOString().slice(0, 10)),
    totalAlumnos: estudiantes.length,
  };
  const archivo = limpiarNombreArchivo(`asistencia_${unidad.nameCourse ?? 'curso'}_${unidad.group ?? ''}_${sesion ? fecha : 'todas'}`);

  if (sesion && fecha) {
    const franja = datos.hora ? `, clase de ${datos.hora.replace('-', ' – ')}` : '';
    return {
      ...base,
      tipo: 'sesion',
      alcance: `Sesión del ${fechaLarga(fecha)}${franja}`,
      columnas: ['Identificación', 'Nombre', 'Estado', 'Hora de registro', 'Observación'],
      filas: estudiantes.map((e) => {
        const r = registros[e.cedula]?.[fecha];
        return [e.cedula, e.nombre, r ? r.estado : 'Sin registro', r ? horaVisible(r.hora) : '—', r?.late ? 'Llegó tarde' : ''];
      }),
      fijas: 2,
      totales: 0,
      leyenda: null,
      nombreArchivo: archivo,
    };
  }

  const sesiones = datos.fechas.length;
  return {
    ...base,
    tipo: 'todas',
    alcance: `Todas las clases (${sesiones} ${sesiones === 1 ? 'sesión' : 'sesiones'})`,
    columnas: ['Identificación', 'Nombre', ...datos.fechas.map(fechaCorta), 'Presentes', 'Ausentes', 'Excusas', '% Asist.'],
    filas: estudiantes.map((e) => {
      const r = registros[e.cedula] ?? {};
      const celdas = datos.fechas.map((f) => (r[f] ? SIGLAS[r[f].estado] ?? '?' : '-'));
      const presentes = celdas.filter((c) => c === 'P').length;
      const ausentes = celdas.filter((c) => c === 'A').length;
      const excusas = celdas.filter((c) => c === 'E').length;
      const porcentaje = sesiones > 0 ? `${((presentes / sesiones) * 100).toFixed(0)}%` : '—';
      return [e.cedula, e.nombre, ...celdas, String(presentes), String(ausentes), String(excusas), porcentaje];
    }),
    fijas: 2,
    totales: 4,
    leyenda: 'P ::: Presente   A ::: Ausente   E ::: Tiene excusa   - ::: Sin registro',
    nombreArchivo: archivo,
  };
}

function fechaDelReporte(ahora = new Date()): string {
  const f = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    .formatToParts(ahora)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return `${f.day}-${f.month}-${f.year} ${f.hour}:${f.minute}:${f.second}`;
}

// ------------------------------------------------------------
// PDF (como el "Horario del Gestor del Conocimiento" de Academusoft: barras verdes, bloque de
// identificación del docente, abreviaturas y filas en gris claro)
// ------------------------------------------------------------
type Color = [number, number, number];
const VERDE_OSCURO: Color = [0, 72, 43];
const VERDE: Color = [0, 123, 62];
const VERDE_CLARO: Color = [224, 235, 227];
const GRIS_FILA: Color = [240, 240, 240];
const TINTA: Color = [10, 10, 60];
const FECHAS_POR_BLOQUE = 14;

export async function generarPdf(t: TablaReporte): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const horizontal = t.tipo === 'todas';
  const doc = new jsPDF(horizontal ? 'l' : 'p', 'mm', 'a4');
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const margen = 8;
  const util = ancho - margen * 2;
  let y = 10;

  const barra = (x: number, ancho: number, alturaBarra: number, color: Color, texto: string, estilo: 'bold' | 'normal', colorTexto: Color, alinear: 'center' | 'left' = 'center') => {
    doc.setFillColor(...color);
    doc.rect(x, y, ancho, alturaBarra, 'F');
    doc.setFont('helvetica', estilo);
    doc.setTextColor(...colorTexto);
    doc.text(texto, alinear === 'center' ? x + ancho / 2 : x + 1.5, y + alturaBarra / 2 + 1.1, { align: alinear, maxWidth: ancho - 3 });
  };

  /** Una fila de rótulos (barra verde) con su fila de valores debajo, repartida en columnas. */
  const bloque = (rotulos: string[], valores: string[], pesos: number[]) => {
    const total = pesos.reduce((a, b) => a + b, 0);
    let x = margen;
    pesos.forEach((p, i) => {
      const w = (util * p) / total;
      barra(x, w, 4.6, VERDE, rotulos[i], 'normal', [255, 255, 255]);
      x += w;
    });
    y += 4.6;
    x = margen;
    pesos.forEach((p, i) => {
      const w = (util * p) / total;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...TINTA);
      doc.text(valores[i] || '—', x + w / 2, y + 3.6, { align: 'center', maxWidth: w - 3 });
      x += w;
    });
    y += 6.2;
  };

  const encabezado = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...TINTA);
    doc.text(`Fecha del Reporte ${fechaDelReporte()}`, margen, y);
    doc.text('Académico - Sistema de Asistencias', ancho - margen, y, { align: 'right' });
    y += 2;
    doc.setFontSize(7.5);
    barra(margen, util, 5, VERDE_OSCURO, t.titulo, 'normal', [255, 255, 255]);
    y += 5.6;
    bloque(['Identificación', 'Tipo de Documento', 'Nombre'], [t.docenteId, 'CC', t.docente], [1, 1, 2]);
    bloque(['Unidad Regional', 'Período'], [UNIDAD_REGIONAL, t.periodo], [2, 1]);
    barra(margen, util, 4.6, VERDE, 'Asistencia - Campo de aprendizaje', 'normal', [255, 255, 255]);
    y += 4.6;
    barra(margen, util, 4.6, VERDE_CLARO, 'Abreviaturas', 'normal', TINTA);
    y += 4.6;
    barra(margen, util, 4.6, GRIS_FILA, t.leyenda ?? 'SR ::: Sin registro de asistencia en esa clase', 'normal', TINTA);
    y += 7;
  };

  const tabla = (columnas: string[], filas: string[][], anchos: number[], alineaIzq: Set<number>) => {
    const cabeza = () => {
      doc.setFillColor(...VERDE);
      doc.rect(margen, y, anchos.reduce((a, b) => a + b, 0), 5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      let x = margen;
      columnas.forEach((c, i) => {
        if (alineaIzq.has(i)) doc.text(c, x + 1, y + 3.4);
        else doc.text(c, x + anchos[i] / 2, y + 3.4, { align: 'center' });
        x += anchos[i];
      });
      y += 5;
    };
    cabeza();
    // Fila del curso, como en el reporte de la universidad: código y nombre en negrita, grupo y total debajo
    const ancho = anchos.reduce((a, b) => a + b, 0);
    doc.setFillColor(...VERDE_CLARO);
    doc.rect(margen, y, ancho, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TINTA);
    doc.text(t.materia, margen + ancho / 2, y + 3.4, { align: 'center', maxWidth: ancho - 4 });
    doc.setFont('helvetica', 'normal');
    doc.text(`Grupo : ${t.grupo} · Total alumnos: ${t.totalAlumnos} · ${t.alcance}`, margen + ancho / 2, y + 7.2, { align: 'center', maxWidth: ancho - 4 });
    y += 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...TINTA);
    filas.forEach((fila, idx) => {
      if (y + 4.5 > alto - 14) {
        doc.addPage();
        y = 12;
        cabeza();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...TINTA);
      }
      if (idx % 2 === 0) {
        doc.setFillColor(...GRIS_FILA);
        doc.rect(margen, y, anchos.reduce((a, b) => a + b, 0), 4.5, 'F');
      }
      let x = margen;
      fila.forEach((celda, i) => {
        const texto = doc.splitTextToSize(String(celda), anchos[i] - 2)[0] ?? '';
        if (alineaIzq.has(i)) doc.text(texto, x + 1, y + 3.2);
        else doc.text(texto, x + anchos[i] / 2, y + 3.2, { align: 'center' });
        x += anchos[i];
      });
      y += 4.5;
    });
    y += 3;
  };

  encabezado();

  if (t.tipo === 'sesion') {
    const anchos = [util * 0.16, util * 0.42, util * 0.16, util * 0.14, util * 0.12];
    tabla(t.columnas, t.filas, anchos, new Set([0, 1]));
  } else {
    // Muchas fechas no caben en una hoja: se reparten en bloques y los totales van en el último
    const nFechas = t.columnas.length - t.fijas - t.totales;
    const bloques = Math.max(1, Math.ceil(nFechas / FECHAS_POR_BLOQUE));
    for (let b = 0; b < bloques; b++) {
      const desde = t.fijas + b * FECHAS_POR_BLOQUE;
      const hasta = Math.min(t.fijas + nFechas, desde + FECHAS_POR_BLOQUE);
      const ultimo = b === bloques - 1;
      const idx = [0, 1, ...Array.from({ length: hasta - desde }, (_, i) => desde + i)];
      if (ultimo) idx.push(...Array.from({ length: t.totales }, (_, i) => t.fijas + nFechas + i));
      const anchos = idx.map((i) => (i === 0 ? 24 : i === 1 ? 62 : i >= t.fijas + nFechas ? 14 : 9));
      if (b > 0) {
        if (y + 30 > alto - 14) { doc.addPage(); y = 12; }
      }
      tabla(idx.map((i) => t.columnas[i]), t.filas.map((f) => idx.map((i) => f[i])), anchos, new Set([0, 1]));
    }
    if (t.leyenda) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(...TINTA);
      doc.text(t.leyenda, margen, y);
    }
  }

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Pág. ${p} de ${paginas}`, ancho - margen, alto - 6, { align: 'right' });
  }
  doc.save(`${t.nombreArchivo}.pdf`);
}

// ------------------------------------------------------------
// Excel (como la lista en .xls de la universidad: barra azul y filas amarillas)
// ------------------------------------------------------------
const AZUL_U = 'FF003366';
const AMARILLO_U = 'FFFFCC00';

export async function generarExcel(t: TablaReporte): Promise<void> {
  const ExcelJS = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Asistencia');
  const n = t.columnas.length;
  const borde = { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } };
  const relleno = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });

  hoja.columns = t.columnas.map((_, i) => ({
    width: i === 0 ? 16 : i === 1 ? 44 : t.tipo === 'sesion' ? 18 : i >= n - t.totales ? 11 : 7,
  }));

  // Fila 1: título
  hoja.mergeCells(1, 1, 1, n);
  const titulo = hoja.getCell(1, 1);
  titulo.value = t.titulo;
  titulo.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
  titulo.fill = relleno(AZUL_U);
  titulo.alignment = { horizontal: 'center', vertical: 'middle' };
  hoja.getRow(1).height = 22;

  // Filas 2 y 3: Materia | Grupo | Total alumnos | Docente
  const tramos = n >= 7
    ? [[1, 2], [3, 4], [5, 6], [7, n]]
    : [[1, 2], [3, 3], [4, 4], [5, n]];
  const rotulos = ['Materia', 'Grupo', 'Total Alumnos', 'Docente'];
  const valores = [t.materia, t.grupo, String(t.totalAlumnos), t.docente];
  tramos.forEach(([a, b], i) => {
    if (b > a) { hoja.mergeCells(2, a, 2, b); hoja.mergeCells(3, a, 3, b); }
    const r = hoja.getCell(2, a);
    r.value = rotulos[i];
    r.font = { bold: true };
    r.fill = relleno(AMARILLO_U);
    r.alignment = { horizontal: 'center' };
    const v = hoja.getCell(3, a);
    v.value = valores[i];
    v.alignment = { horizontal: 'center', wrapText: true };
  });
  for (let c = 1; c <= n; c++) {
    hoja.getCell(2, c).fill = relleno(AMARILLO_U);
    hoja.getCell(2, c).border = borde;
    hoja.getCell(3, c).border = borde;
  }

  // Fila 4: qué abarca el reporte
  hoja.mergeCells(4, 1, 4, n);
  const alcance = hoja.getCell(4, 1);
  alcance.value = `${t.alcance} · Generado el ${fechaDelReporte()}`;
  alcance.font = { italic: true, color: { argb: 'FF555555' } };

  // Fila 5: encabezados de la tabla
  const cab = hoja.getRow(5);
  t.columnas.forEach((c, i) => {
    const cell = cab.getCell(i + 1);
    cell.value = c;
    cell.font = { bold: true };
    cell.fill = relleno(AMARILLO_U);
    cell.border = borde;
    cell.alignment = { horizontal: i < t.fijas ? 'left' : 'center', vertical: 'middle' };
  });

  t.filas.forEach((fila, r) => {
    const row = hoja.getRow(6 + r);
    fila.forEach((valor, i) => {
      const cell = row.getCell(i + 1);
      const numerico = t.tipo === 'todas' && i >= n - t.totales && i < n - 1;
      cell.value = numerico ? Number(valor) : valor;
      cell.border = borde;
      cell.alignment = { horizontal: i < t.fijas ? 'left' : 'center' };
    });
  });

  if (t.leyenda) {
    const fila = 6 + t.filas.length + 1;
    hoja.mergeCells(fila, 1, fila, n);
    hoja.getCell(fila, 1).value = t.leyenda;
    hoja.getCell(fila, 1).font = { italic: true, color: { argb: 'FF555555' } };
  }
  hoja.views = [{ state: 'frozen', xSplit: t.fijas, ySplit: 5 }];

  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${t.nombreArchivo}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
