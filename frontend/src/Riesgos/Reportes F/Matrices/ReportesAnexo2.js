/**
 * @fileoverview 
 * Módulo del sistema de Gestión de Riesgos.
 *
 * @module Riesgos/Reportes F/Matrices/ReportesAnexo2.js
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = (pdfFonts?.pdfMake?.vfs) ?? pdfFonts.vfs ?? pdfMake.vfs;

function isNo(v) {
    return String(v ?? '').trim().toLowerCase() === 'no';
}

/**
 * getMatrixCompletionStatusA2
 *
 * Calcula el estado de completitud de una matriz del Anexo 2
 * en función de las columnas "Aplica" y "Comentario".
 *
 * - Obtiene los encabezados y filas de la matriz (`columnas`/`filas` o `COLUMNAS`/`FILAS`).
 * - Identifica la columna "Aplica" como la penúltima y "Comentario" como la última.
 * - Recorre cada fila:
 *   - Considera que hay “actividad” si alguna de esas dos columnas tiene contenido.
 *   - Marca la fila como correcta si:
 *     - "Aplica" no está vacía, y
 *     - si "Aplica" = "No", no exige comentario;
 *       en caso contrario exige que "Comentario" no esté vacío.
 * - Devuelve:
 *   - `'empty'`   si ninguna fila tiene contenido relevante.
 *   - `'complete'` si todas las filas cumplen la regla.
 *   - `'partial'` si hay filas con datos pero alguna no cumple la regla.
 *
 * @param {Object} m                             Matriz a evaluar (estructura de Anexo 2).
 * @param {Object} [m.columnas]                  Definición de columnas (puede venir como `COLUMNAS`).
 * @param {string[]} [m.columnas.headers]        Encabezados de columnas.
 * @param {Array[]} [m.filas]                    Filas de la matriz (o `FILAS`).
 * @returns {'empty'|'complete'|'partial'}       Estado de completitud de la matriz.
 */
function getMatrixCompletionStatusA2(m) {
    const headers = (m?.columnas?.headers) || (m?.COLUMNAS?.HEADERS) || [];
    const filas = Array.isArray(m?.filas ?? m?.FILAS) ? (m?.filas ?? m?.FILAS) : [];
    const len = headers.length;
    if (len < 2) return 'empty';

    const idxAplica = Math.max(0, len - 2);
    const idxComentario = Math.max(0, len - 1);

    let touched = 0;
    let ok = 0;
    for (let r = 0; r < filas.length; r++) {
        const arr = Array.isArray(filas[r]) ? filas[r] : [];
        const padded = arr.length < len ? [...arr, ...Array(len - arr.length).fill(null)] : arr.slice(0, len);
        const va = padded[idxAplica];
        const vc = padded[idxComentario];

        const aplicaVacia = (va == null || String(va).trim() === '');
        const comentarioVacio = (vc == null || String(vc).trim() === '');

        if (!aplicaVacia || !comentarioVacio) touched++;

        const filaOK = !aplicaVacia && (isNo(va) ? true : !comentarioVacio);
        if (filaOK) ok++;
    }

    if (touched === 0) return 'empty';
    if (ok === filas.length) return 'complete';
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
            { text: 'Riesgos de fraude o corrupción', style: 'header', alignment: 'center' },
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
                margin: [0, 0]
            }
        ]
    };
}

function buildTablaA2(m, idx) {
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
            widths: headers.map((_, i) => (i === 0 ? 'auto' : 'auto')),
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

    const comentarioTabla = m?.comentario_tabla ?? m?.COMENTARIO_TABLA
        ?? ((m?.meta ?? m?.META)?.comentario_tabla);
    if (comentarioTabla && String(comentarioTabla).trim() !== '') {
        nodes.push({ text: 'Comentario de la tabla', style: 'obsTitle' });
        nodes.push({ text: String(comentarioTabla), style: 'obsText' });
    }

    return nodes;
}


/**
 * GenerarReporteAnexo2
 *
 * Generar el PDF del Anexo 2 (riesgos de fraude/corrupción) a partir de un conjunto de matrices.
 *
 * - Recibe la colección de matrices (cada una con columnas, filas y título).
 * - Aplica filtros opcionales:
 *   - `filter = 'indices'`: solo imprime las matrices cuyos índices (1-based) estén en `indices`.
 *   - `filter = 'complete'`: solo imprime matrices con estado `'complete'` según las reglas de "Aplica" / "Comentario".
 *   - `includeEmpty = false`: excluye matrices con estado `'empty'`.
 * - Construye el contenido del PDF.
 * - Configura `pageMargins`, `header` (con fecha/hora/paginación) y estilos.
 * - Invoca `pdfMake.createPdf(...).download(nombreArchivo)` para descargar el PDF.
 *
 * @param {Object} opts                                Parámetros de generación del reporte.
 * @param {Array<Object>} opts.matrices                Listado de matrices a imprimir (estructura Anexo 2).
 * @param {string|number} opts.periodo                 Período mostrado en el encabezado del reporte.
 * @param {string} [opts.logoBase64]                   Logo en base64 para el encabezado (opcional).
 * @param {string} [opts.unidad]                       Nombre de la unidad evaluada (opcional).
 * @param {string} [opts.nombreArchivo]                Nombre del archivo PDF a descargar.
 * @param {'all'|'complete'|'indices'} [opts.filter='all']
 *                                                    Criterio de filtrado de matrices:
 *                                                    - 'all': no filtra por estado.
 *                                                    - 'complete': solo matrices con estado `'complete'`.
 *                                                    - 'indices': usa `indices` para seleccionar.
 * @param {number[]} [opts.indices=[]]                 Índices (1-based) de matrices a incluir cuando `filter='indices'`.
 * @param {boolean} [opts.includeEmpty=true]           Indica si se incluyen matrices con estado `'empty'`.
 * @param {{nombre?:string, puesto?:string}} [opts.responsable]
 *                                                    Datos del responsable para el bloque de firmas.
 * @returns {void}
 */
export function GenerarReporteAnexo2({
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

    let mats = matrices.map((m, i) => ({ m, i }));

    if (filter === 'indices' && Array.isArray(indices) && indices.length > 0) {
        const set = new Set(indices.map(n => Number(n) - 1)); // a 0-based
        mats = mats.filter(({ i }) => set.has(i));
    }

    mats = mats.filter(({ m }) => {
        const status = getMatrixCompletionStatusA2(m);
        if (!includeEmpty && status === 'empty') return false;
        if (filter === 'complete') return status === 'complete';
        return true;
    });

    if (mats.length === 0) {
        alert('No hay tablas que coincidan con el criterio de impresión.');
        return;
    }

    const content = [];
    content.push(buildResumen({ logoBase64, unidad, periodoSeleccionado: periodo }));

    mats.forEach(({ m, i }, k) => {
        const nodes = buildTablaA2(m, k);
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

    const nombre = nombreArchivo || `RiesgosFraudeCorrupcion_${periodo ?? '—'}.pdf`;

    pdfMake.createPdf({
        pageOrientation: 'portrait',
        pageMargins: [30, 70, 30, 30],
        header: (currentPage, pageCount) => header(currentPage, pageCount, formattedDate, formattedTime),
        styles,
        content
    }).download(nombre);
}


/**
 * GenerarReporteAnexo2DesdeUltimo
 *
 * Función de compatibilidad que toma directamente un objeto `ultimo`
 * (por ejemplo, la última versión guardada en el historial) y dispara
 * la generación del reporte Anexo 2.
 *
 * - Valida que `ultimo` tenga estructura y contenga `RESPUESTA.matrices`.
 * - Extrae `matrices` de `ultimo.RESPUESTA.matrices`.
 * - Acepta:
 *   - Un `nombreArchivo` simple (string), o
 *   - Un objeto de opciones con los mismos flags de `GenerarReporteAnexo2`
 *     (`filter`, `indices`, `includeEmpty`, `nombreArchivo`, `responsable`, etc.).
 * - Llama internamente a `GenerarReporteAnexo2` propagando:
 *   - `matrices`, `periodoSel`, `logoBase64`, `unidad` y las opciones.
 *
 * @param {Object}  ultimo                        Objeto con la última respuesta persistida del Anexo 2.
 * @param {Object}  ultimo.RESPUESTA              Respuesta que contiene las matrices.
 * @param {Array}   ultimo.RESPUESTA.matrices     Arreglo de matrices a imprimir.
 * @param {string|number} periodoSel              Período seleccionado para el reporte.
 * @param {string} logoBase64                     Logo institucional en base64 (opcional).
 * @param {string} unidad                         Texto de la unidad evaluada (opcional).
 * @param {string|Object} [nombreArchivoOrOptions]
 *                                               - Si es `string`: se usa como `nombreArchivo`.
 *                                               - Si es `Object`: se interpretan sus propiedades como opciones:
 *                                                 `{ nombreArchivo, filter, indices, includeEmpty, responsable }`.
 * @returns {void}
 */
export function GenerarReporteAnexo2DesdeUltimo(
    ultimo,
    periodoSel,
    logoBase64,
    unidad,
    nombreArchivoOrOptions
) {
    if (!ultimo || !ultimo.RESPUESTA) {
        alert('No hay datos para el reporte.');
        return;
    }

    const matrices = Array.isArray(ultimo.RESPUESTA.matrices) ? ultimo.RESPUESTA.matrices : [];

    // Detección de opciones
    let opts = {};
    if (typeof nombreArchivoOrOptions === 'string') {
        opts.nombreArchivo = nombreArchivoOrOptions;
    } else if (nombreArchivoOrOptions && typeof nombreArchivoOrOptions === 'object') {
        opts = { ...nombreArchivoOrOptions };
    }

    return GenerarReporteAnexo2({
        matrices,
        periodo: periodoSel,
        logoBase64,
        unidad,
        nombreArchivo: opts?.nombreArchivo,
        filter: opts?.filter ?? 'all',     
        indices: Array.isArray(opts?.indices) ? opts.indices : [],
        includeEmpty: opts?.includeEmpty ?? true,
        responsable: opts?.responsable    
    });
}
