/**
 * @fileoverview 
 * Reporte institucional de la Primera Matriz:
 * generación de PDF para la evaluación de la eficiencia del control interno y gobernanza.
 *
 * - Renderiza matrices tipo Anexo 1 (Primera Matriz) en formato tabular.
 * - Permite filtrar qué tablas imprimir según su estado de completitud.
 * - Incluye encabezado institucional, período y bloque de firma del responsable.
 *
 * @module Riesgos/Reportes F/Institucionales/ReportePrimeraMatrizInst.js
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = (pdfFonts?.pdfMake?.vfs) ?? pdfFonts.vfs ?? pdfMake.vfs;

/**
 * getMatrixCompletionStatus
 * 
 * Calcula el estado de completitud de una matriz de la Primera Matriz
 * tomando todas las columnas editables (desde la columna 1 en adelante).
 *
 * - Considera la columna 0 como encabezado fijo (no editable).
 * - Cuenta cuántas celdas editables existen y cuántas están llenas.
 * - Determina si la matriz está:
 *   - `empty`    → sin datos relevantes o todas las editables vacías.
 *   - `complete` → todas las celdas editables llenas.
 *   - `partial`  → mezcla de celdas llenas y vacías.
 *
 * @param {Object} m                      Matriz a evaluar.
 * @returns {'complete'|'partial'|'empty'} Estado calculado para la matriz.
 */
function getMatrixCompletionStatus(m) {
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

/**
 * ReportePrimeraMatrizInst
 * 
 * Genera el PDF institucional de la Primera Matriz
 * (evaluación de la eficiencia del control interno y gobernanza).
 *
 * - Construye un encabezado con logo, institución/unidad y período seleccionado.
 * - Aplica filtros sobre las matrices.
 * - Renderiza cada matriz como tabla pdfMake con anchos dinámicos.
 * - Agrega un bloque de firmas al final con nombre y puesto del responsable.
 *
 * @param {Object}   params
 * @param {Array<Object>} params.matrices          Arreglo de matrices a imprimir.
 * @param {string|number} [params.periodoSeleccionado='']  Período a mostrar en el encabezado.
 * @param {string}   [params.logoBase64]          Logo institucional en base64 (opcional).
 * @param {string}   [params.unidad='']           Nombre de la unidad o institución.
 * @param {string}   [params.nombreArchivo='']    Nombre del archivo PDF a descargar.
 * @param {string}   [params.tipo='']             Etiqueta para la unidad (ej. "Institución").
 * @param {'all'|'complete'|'partial'|'indices'} [params.filter='all'] Criterio de filtrado.
 * @param {number[]} [params.indices=[]]          Índices 1-based de matrices a incluir cuando `filter='indices'`.
 * @param {boolean}  [params.includeEmpty=true]   Incluir o no matrices vacías.
 * @param {{nombre?:string, puesto?:string}} [params.responsable={}] Datos del responsable para el bloque de firma.
 * @returns {void}                                Descarga el PDF generado en el navegador.
 */
export function ReportePrimeraMatrizInst({
    matrices = [],
    periodoSeleccionado = '',
    logoBase64,
    unidad = '',
    nombreArchivo = '',
    tipo = '',
    filter = 'all',      
    indices = [],      
    includeEmpty = true,
    responsable = {}    
}) {
    const safe = (v) =>
        v === null || v === undefined || String(v).trim() === '' ? '—' : String(v);

    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();

    const styles = {
        header: { fontSize: 18, bold: true, margin: [0, 20, 0, 10] },
        sectionTitle: { fontSize: 12, bold: true, margin: [0, 10, 0, 6] },
        tableHeader: {
            bold: true, fontSize: 10, color: 'white',
            fillColor: '#2a3f54', alignment: 'center'
        },
        tableHeaderLeft: {
            bold: true, fontSize: 10, color: 'white',
            fillColor: '#2a3f54', alignment: 'left'
        },
        tableCell: { fontSize: 9, alignment: 'left' },
        tableCellCenter: { fontSize: 9, alignment: 'center' },
        tableFooter: { margin: [0, 30, 0, 10] },
        footerHeader: {
            bold: true, fontSize: 12, color: 'white',
            fillColor: '#2a3f54', margin: [3, 3, 3, 3]
        }
    };

    const gridLayout = {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => 'black',
        vLineColor: () => 'black'
    };

    const header = (currentPage, pageCount) => ({
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

    const resumen = {
        stack: [
            ...(logoBase64
                ? [{ image: logoBase64, width: 50, alignment: 'left', margin: [0, 0, 0, 10] }]
                : []),
            {
                text: 'EVALUACIÓN DE LA EFICIENCIA DEL CONTROL INTERNO Y GOBERNANZA',
                style: 'header',
                alignment: 'center'
            },
            {
                table: {
                    widths: ['auto', '*'],
                    body: [
                        ...(unidad
                            ? [[
                                { text: tipo || 'Institución', style: 'tableHeaderLeft' },
                                { text: unidad, style: 'tableCell' }
                            ]]
                            : []),
                        [
                            { text: 'Período', style: 'tableHeaderLeft' },
                            { text: safe(periodoSeleccionado), style: 'tableCell' }
                        ]
                    ]
                },
                layout: gridLayout,
                margin: [0, 0]
            }
        ]
    };

    let mats = matrices.map((m, i) => ({ m, i }));

    // 1) Filtrado por índices
    if (filter === 'indices' && indices.length > 0) {
        const set = new Set(indices.map(n => n - 1)); // convertir a base 0
        mats = mats.filter(({ i }) => set.has(i));
    }

    // 2) Filtrado por estado
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

    const content = [resumen];

    mats.forEach(({ m, i }, idx) => {
        const titulo = m?.titulo ?? m?.TITULO ?? `Tabla #${m?.matriz ?? m?.MATRIZ ?? idx + 1}`;
        const headers = (m?.columnas?.headers) || (m?.COLUMNAS?.HEADERS) || [];
        const filasRaw = m?.filas ?? m?.FILAS ?? [];
        const filas = Array.isArray(filasRaw) ? filasRaw : [];
        const len = headers.length;

        content.push({
            text: titulo,
            style: 'sectionTitle',
            margin: [0, idx === 0 ? 0 : 6, 0, 6]
        });

        const body = [];
        body.push(headers.map((h, i) => ({
            text: safe(h),
            style: i === 0 ? 'tableHeaderLeft' : 'tableHeader'
        })));

        filas.forEach((fila) => {
            const arr = Array.isArray(fila) ? fila : [];
            const padded = len > 0
                ? (arr.length < len ? [...arr, ...Array(len - arr.length).fill(null)] : arr.slice(0, len))
                : arr;
            body.push(padded.map((cel) => ({ text: safe(cel), style: 'tableCell', noWrap: false })));
        });

        content.push({
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
            margin: [0, 0, 0, 12]
        });
    });

    const buildFirmaFinal = () => {
        const nombreResp = (responsable?.nombre ?? '').toString();
        const puestoResp = (responsable?.puesto ?? '').toString();
        return {
            layout: 'noBorders',
            table: {
                widths: ['auto', '*'],
                body: [
                    [
                        { text: 'Nombre de responsable:', margin: [0, 8, 8, 0] },
                        { text: nombreResp, margin: [0, 6, 0, 2], border: [false, false, false, true] }
                    ],
                    [
                        { text: 'Puesto de responsable:', margin: [0, 8, 8, 0] },
                        { text: puestoResp, margin: [0, 6, 0, 2], border: [false, false, false, true] }
                    ],
                    [
                        { text: 'Firma de responsable:', margin: [0, 8, 8, 0] },
                        { text: '', margin: [0, 6, 0, 2], border: [false, false, false, true] }
                    ],
                    [
                        { text: 'Sello:', margin: [0, 8, 8, 0] },
                        { text: '', margin: [0, 6, 0, 2], border: [false, false, false, true] }
                    ]
                ]
            },
            margin: [0, 6, 0, 6]
        };
    };

    content.push(buildFirmaFinal());

    const nombre = nombreArchivo || `Primera_Matriz_${safe(periodoSeleccionado)}.pdf`;

    pdfMake.createPdf({
        pageOrientation: 'portrait',
        pageMargins: [30, 70, 30, 30],
        header,
        styles,
        content
    }).download(nombre);
}
