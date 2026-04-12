/**
 * @fileoverview 
 * Módulo del sistema de Gestión de Riesgos.
 *
 * @module Riesgos/Reportes F/Matrices/ReportesAnexo1.js
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = (pdfFonts?.pdfMake?.vfs) ?? pdfFonts.vfs ?? pdfMake.vfs;

/**
 * getMatrixCompletionStatus
 * 
 * Calcula el estado de completitud de una matriz del Anexo 1.
 *
 * - Usa los encabezados (`columnas.headers` o `COLUMNAS.HEADERS`) para determinar
 *   cuántas columnas son “editables” (todas excepto la primera).
 * - Recorre todas las filas y cuenta:
 *   - `totalEditable`: número total de celdas editables.
 *   - `filled`: cuántas de esas celdas tienen contenido no vacío.
 * - Regla de retorno:
 *   - `'empty'`   si no hay columnas editables o si todas las celdas editables están vacías.
 *   - `'complete'` si todas las celdas editables tienen contenido.
 *   - `'partial'` si hay celdas llenas pero no todas.
 *
 * @param {Object} m                             Matriz a evaluar.
 * @param {Object} [m.columnas]                  Definición de columnas (opcional).
 * @param {string[]} [m.columnas.headers]        Encabezados de columnas (puede venir como `COLUMNAS.HEADERS`).
 * @param {Array[]} [m.filas]                    Filas de la matriz (o `FILAS`).
 * @returns {'empty'|'complete'|'partial'}       Estado de completitud calculado.
 */
export function getMatrixCompletionStatus(m) {
    const headers = (m?.columnas?.headers) || (m?.COLUMNAS?.HEADERS) || [];
    const filas = Array.isArray(m?.filas ?? m?.FILAS) ? (m?.filas ?? m?.FILAS) : [];
    const len = headers.length;
    if (len <= 1) return 'empty';

    let totalEditable = 0;
    let filled = 0;

    for (let r = 0; r < filas.length; r++) {
        const arr = Array.isArray(filas[r]) ? filas[r] : [];
        const padded = arr.length < len ? [...arr, ...Array(len - arr.length).fill(null)] : arr.slice(0, len);
        for (let c = 1; c < len; c++) {
            totalEditable++;
            const v = padded[c];
            if (!(v === null || v === undefined || String(v).trim() === '')) filled++;
        }
    }

    if (totalEditable === 0) return 'empty';
    if (filled === 0) return 'empty';
    if (filled === totalEditable) return 'complete';
    return 'partial';
}

const safe = (v) => (v === null || v === undefined || String(v).trim() === '' ? '—' : String(v));

const styles = {
    header: { fontSize: 18, bold: true, margin: [0, 20, 0, 10] },
    sectionTitle: { fontSize: 12, bold: true, margin: [0, 10, 0, 6] },
    tableHeader: { bold: true, fontSize: 10, color: 'white', fillColor: '#2a3f54', alignment: 'center' },
    tableHeaderLeft: { bold: true, fontSize: 10, color: 'white', fillColor: '#2a3f54', alignment: 'left' },
    tableCell: { fontSize: 9, alignment: 'left' },
    italics: { italics: true, fontSize: 9 },
    obsTitle: { italics: true, bold: true, margin: [0, 2, 0, 2] },
    obsText: { fontSize: 9, margin: [0, 0, 0, 12] },
    tableFooter: { margin: [0, 30, 0, 10] },
    footerHeader: { bold: true, fontSize: 12, color: 'white', fillColor: '#2a3f54', margin: [3, 3, 3, 3] },

    // Firmas (títulos sin subrayar; línea va debajo)
    firmaLabel: { fontSize: 10, margin: [0, 2, 0, 2] }
};

const gridLayout = {
    hLineWidth: () => 0.8,
    vLineWidth: () => 0.8,
    hLineColor: () => 'black',
    vLineColor: () => 'black'
};

const header = (currentPage, pageCount, formattedDate, formattedTime) => ({
    columns: [
        { text: '', width: '*' },
        {
            alignment: 'right',
            stack: [
                { text: `Página ${currentPage} de ${pageCount}`, fontSize: 10 },
                { text: formattedDate, fontSize: 10 },
                { text: formattedTime, fontSize: 10 }
            ],
            width: 'auto'
        }
    ],
    margin: [30, 10]
});

function buildResumen({ logoBase64, unidad, periodoSeleccionado }) {
    return {
        stack: [
            ...(logoBase64 ? [{ image: logoBase64, width: 50, alignment: 'left', margin: [0, 0, 0, 10] }] : []),
            { text: 'EVALUACIÓN DE LA EFICIENCIA DEL CONTROL INTERNO Y GOBERNANZA', style: 'header', alignment: 'center' },
            {
                table: {
                    widths: ['auto', '*'],
                    body: [
                        ...(unidad ? [[
                            { text: 'Unidad', style: 'tableHeaderLeft' },
                            { text: unidad, style: 'tableCell' }
                        ]] : []),
                        [{ text: 'Período', style: 'tableHeaderLeft' }, { text: String(periodoSeleccionado ?? '—'), style: 'tableCell' }],
                    ]
                },
                layout: gridLayout,
                margin: [0, 0,]
            }
        ]
    };
}
/**
 * buildTabla
 * 
 * Construye los nodos de contenido PDF (título + tabla + observaciones)
 * para una matriz del Anexo 1.
 *
 * @param {Object} m                     Matriz a renderizar.
 * @param {number} idx                  Índice de la matriz dentro del arreglo principal.
 * @returns {Array<Object>}             Arreglo de nodos pdfMake para insertar en `content`.
 */
function buildTabla(m, idx) {
    const titulo = m?.titulo ?? m?.TITULO ?? `Tabla #${m?.matriz ?? m?.MATRIZ ?? idx + 1}`;
    const headers = (m?.columnas?.headers) || (m?.COLUMNAS?.HEADERS) || [];
    const filas = Array.isArray(m?.filas ?? m?.FILAS) ? (m?.filas ?? m?.FILAS) : [];
    const len = headers.length;

    const body = [];
    const nodes = [];

    nodes.push({ text: titulo, style: 'sectionTitle', margin: [0, idx === 0 ? 0 : 6, 0, 6] });

    if (headers.length > 0) {
        body.push(headers.map((h, i) => ({ text: String(h), style: i === 0 ? 'tableHeaderLeft' : 'tableHeader' })));
    }

    filas.forEach((fila) => {
        const arr = Array.isArray(fila) ? fila : [];
        const padded = arr.length < len ? [...arr, ...Array(len - arr.length).fill(null)] : arr.slice(0, len);
        body.push(padded.map((celda) => ({ text: safe(celda), style: 'tableCell', noWrap: false })));
    });

    nodes.push({
        table: {
            headerRows: 1,
            widths: headers.map((_, i) => (i === 0 ? 180 : '*')),
            body
        },
        layout: {
            hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1.2 : 0.6,
            vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? 1.2 : 0.6,
            hLineColor: () => 'black',
            vLineColor: () => 'black'
        },
        margin: [0, 0, 0, 6]
    });

    const obs = m?.observaciones ?? m?.OBSERVACIONES;
    if (obs && String(obs).trim() !== '') {
        nodes.push({ text: 'Observaciones', style: 'obsTitle' });
        nodes.push({ text: String(obs), style: 'obsText' });
    }
    return nodes;
}

/**
 * GenerarReporteAnexo1
 *
 * Genera el PDF del Anexo 1 a partir de la colección de matrices.
 *
 * - Recibe las matrices ya estructuradas (con columnas, filas, título, observaciones, etc.).
 * - Aplica filtros opcionales.
 * - Si luego de filtrar no queda ninguna matriz, muestra un `alert` informando que no hay datos.
 * - Construye el contenido del PDF.
 * - Descarga el archivo usando `pdfMake.createPdf(...).download(nombreArchivo)`.
 *
 * @param {Object}   params
 * @param {Array<Object>} params.matrices          Listado de matrices a imprimir.
 * @param {string|number} params.periodo           Período para el encabezado del reporte.
 * @param {string}   [params.logoBase64]           Logo en base64 que se muestra en el resumen (opcional).
 * @param {string}   [params.unidad]               Nombre de la unidad evaluada (opcional).
 * @param {string}   [params.nombreArchivo]        Nombre del archivo PDF a descargar.
 * @param {'all'|'complete'|'partial'|'indices'} [params.filter='all']  Criterio de filtrado.
 * @param {number[]} [params.indices=[]]           Índices 1-based de matrices a incluir cuando `filter='indices'`.
 * @param {boolean}  [params.includeEmpty=true]    Indica si se incluyen matrices vacías (`'empty'`).
 * @param {{nombre?:string, puesto?:string}} [params.responsable]
 *                                                Información para el bloque de firmas.
 * @returns {void}
 */
export function GenerarReporteAnexo1({
    matrices = [],
    periodo,
    logoBase64,
    unidad,
    nombreArchivo,
    filter = 'all',         
    indices = [],       
    includeEmpty = true,
    responsable          
}) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();

    // 1) Filtrado por índices si corresponde
    let mats = matrices.map((m, i) => ({ m, i })); 
    if (filter === 'indices' && indices.length > 0) {
        const set = new Set(indices.map(n => n - 1)); 
        mats = mats.filter(({ i }) => set.has(i));
    }

    // 2) Filtrado por estado (complete/partial) y vacías
    mats = mats.filter(({ m }) => {
        const status = getMatrixCompletionStatus(m);
        if (!includeEmpty && status === 'empty') return false;
        if (filter === 'complete') return status === 'complete';
        if (filter === 'partial') return status === 'partial';
        return true; 
    });

    if (mats.length === 0) {
        alert('No hay tablas que coincidan con el criterio de impresión.');
        return;
    }

    const content = [];
    content.push(buildResumen({ logoBase64, unidad, periodoSeleccionado: periodo }));

    mats.forEach(({ m, i }, k) => {
        const nodes = buildTabla(m, k);
        content.push(...nodes);
    });

    const resp = responsable || {};
    const signatureRow = (label, value) => ({
        stack: [
            { text: `${label}${value ? `: ${value}` : ':'}`, style: 'firmaLabel' },
            {
                table: {
                    widths: ['*'],
                    body: [[{ text: ' ', border: [false, true, false, false], margin: [0, 0, 0, 8] }]]
                },
                layout: {
                    hLineWidth: () => 0.8,
                    vLineWidth: () => 0,
                    hLineColor: () => 'black',
                    vLineColor: () => 'black'
                }
            }
        ],
        margin: [0, 2, 0, 0]
    });

    content.push({
        margin: [0, 6, 0, 6],
        stack: [
            signatureRow('Nombre de responsable', resp?.nombre || ''),
            signatureRow('Puesto de responsable', resp?.puesto || ''),
            signatureRow('Firma de responsable', ''),
            signatureRow('Sello', '')
        ]
    });

    const nombre = nombreArchivo || `Matrices_Anexo1_${periodo ?? '—'}.pdf`;

    pdfMake.createPdf({
        pageOrientation: 'portrait',
        pageMargins: [30, 70, 30, 30],
        header: (currentPage, pageCount) => header(currentPage, pageCount, formattedDate, formattedTime),
        styles,
        content
    }).download(nombre);
}

export function GenerarReporteMatricesDesdeUltimo(
    ultimo,
    periodoSeleccionado,
    logoBase64,
    unidad,
    nombreArchivo
) {
    if (!ultimo || !ultimo.RESPUESTA) {
        alert('No hay datos para el reporte.');
        return;
    }
    const matrices = Array.isArray(ultimo.RESPUESTA.matrices) ? ultimo.RESPUESTA.matrices : [];
    return GenerarReporteAnexo1({
        matrices,
        periodo: periodoSeleccionado,
        logoBase64,
        unidad,
        nombreArchivo,
        filter: 'all',
        indices: [],
        includeEmpty: true
    });
}
