/**
 * @fileoverview
 * Reporte de matriz de evaluación de riesgos: generación de PDF agrupado por unidad.
 *
 * @module Riesgos/Reportes F/Riesgos/MatrizEvaluacion
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = (pdfFonts?.pdfMake?.vfs) ?? pdfFonts.vfs ?? pdfMake.vfs;

/**
 * Genera PDF de Matriz de Evaluación agrupado por Unidad, con selección de tamaño de hoja.
 *
 * @param {Object} payload - { propiedades: [{ key,label,source }], valores: [ ... ] }
 * @param {string} [logoBase64] - Logo opcional en base64
 * @param {Object} [meta] - {
 *    titulo, subtitulo, notas, periodo, groupKey,
 *    responsable?: { nombre?: string, puesto?: string },
 *    pageSize | page_size:  'A4' | 'A3' | 'LEGAL' | 'LETTER' | 'TABLOID' | { unit:'mm'|'in'|'pt', width:number, height:number }
 * }
 * @param {string} [nombreArchivo] - Nombre del archivo a descargar
 */
export function MatrizEvaluacion(payload, logoBase64, meta = {}, nombreArchivo = 'Matriz_de_Evaluacion.pdf') {
    const propiedades = Array.isArray(payload?.propiedades) ? payload.propiedades : [];
    const rows = Array.isArray(payload?.valores) ? payload.valores : [];

    const safe = (v) => (v === null || v === undefined || v === '') ? '—' : String(v);
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();

    // Conversión de unidades a puntos (pdfmake trabaja en puntos; 72 pt = 1 in)
    const mmToPt = (mm) => (Number(mm) * 72) / 25.4;
    const inToPt = (inch) => Number(inch) * 72;

    const resolvePageSize = (ps) => {
        const val = ps ?? meta?.page_size ?? 'A4';
        if (typeof val === 'string') return val.toUpperCase();
        if (val && typeof val === 'object' && ('width' in val) && ('height' in val)) {
            const unit = (val.unit || 'pt').toLowerCase();
            if (unit === 'mm') return { width: mmToPt(val.width), height: mmToPt(val.height) };
            if (unit === 'in') return { width: inToPt(val.width), height: inToPt(val.height) };
            return { width: Number(val.width), height: Number(val.height) }; 
        }
        return 'A4';
    };

    // Obtiene valor de celda según la propiedad
    const getCellValue = (row, prop) => {
        const label = prop?.label ?? '';
        const key = prop?.key ?? '';

        if ((prop?.source ?? 'predefinida') === 'extra') {
            if (row?.EXTRAS && Object.prototype.hasOwnProperty.call(row.EXTRAS, label)) return safe(row.EXTRAS[label]);
            if (row?.EXTRAS && Object.prototype.hasOwnProperty.call(row.EXTRAS, key)) return safe(row.EXTRAS[key]);
            return '—';
        }

        if (Object.prototype.hasOwnProperty.call(row, label)) return safe(row[label]);
        if (Object.prototype.hasOwnProperty.call(row, key)) return safe(row[key]);
        return '—';
    };

    // ===== Agrupación por "Nombre unidad" =====
    const candidateKeys = [
        meta?.groupKey,
        'Nombre unidad',
        'Unidad', 'Unidad organizacional', 'NOMBRE_UNIDAD',
        'Dirección', 'Direccion', 'DIRECCION',
        'Dirección evaluada', 'Dirección / Unidad',
        'Área evaluada'
    ].filter(Boolean);

    const findGroupKey = (items) => {
        for (const c of candidateKeys) {
            const hasAny = items.some(r => r && (r[c] !== undefined && r[c] !== null && r[c] !== ''));
            if (hasAny) return c;
        }
        return null;
    };

    const groupKey = findGroupKey(rows);
    const getGroupValue = (row) => groupKey ? safe(row[groupKey]) : 'Sin unidad';

    const grupos = {};
    rows.forEach((row) => {
        const g = getGroupValue(row);
        if (!grupos[g]) grupos[g] = [];
        grupos[g].push(row);
    });

    const styles = {
        title: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
        subtitle: { fontSize: 10, italics: true, margin: [0, 0, 0, 10] },
        groupTitle: { fontSize: 11, bold: true, margin: [0, 10, 0, 6] },
        tableHeader: { bold: true, fontSize: 8, color: 'white', fillColor: '#2a3f54', alignment: 'center' },
        tableCell: { fontSize: 7, alignment: 'left' },
        notes: { fontSize: 8, italics: true, margin: [0, 10, 0, 0] },
        footerSmall: { fontSize: 9 },

        fichaHeaderLeft: { bold: true, fontSize: 10, color: 'white', fillColor: '#2a3f54', alignment: 'left' },
        fichaCell: { fontSize: 9, alignment: 'left' },

        // Firmas (los títulos NO tienen línea; la línea va debajo)
        firmaLabel: { fontSize: 10, margin: [0, 2, 0, 2] }, // margen inferior para separar del trazo
    };

    const blackLayout = {
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
                    { text: `Página ${currentPage} de ${pageCount}`, style: 'footerSmall' },
                    { text: formattedDate, style: 'footerSmall' },
                    { text: formattedTime, style: 'footerSmall' }
                ],
                width: 'auto'
            }
        ],
        margin: [40, 12]
    });

    // ===== Ficha por grupo  =====
    const buildGroupFicha = (unidadNombre, periodoTexto) => ({
        table: {
            widths: ['auto', '*'],
            body: [
                [{ text: 'Unidad', style: 'fichaHeaderLeft' }, { text: safe(unidadNombre), style: 'fichaCell' }],
                [{ text: 'Período', style: 'fichaHeaderLeft' }, { text: safe(periodoTexto ?? '—'), style: 'fichaCell' }]
            ]
        },
        layout: blackLayout,
        margin: [12, 4, 12, 6]
    });

    // ===== Tabla por grupo =====
    const makeGroupTable = (groupName, dataRows) => {
        const tableHeader = [
            { text: 'No.', style: 'tableHeader' },
            ...propiedades.map((p) => ({ text: p?.label ?? p?.key ?? '—', style: 'tableHeader', noWrap: false }))
        ];

        const body = [tableHeader];
        dataRows.forEach((row, idx) => {
            const cells = [
                { text: String(idx + 1), style: 'tableCell', alignment: 'left' },
                ...propiedades.map((p) => ({ text: getCellValue(row, p), style: 'tableCell', noWrap: false }))
            ];
            body.push(cells);
        });

        const widths = ['auto', ...propiedades.map(() => 'auto')];

        return {
            stack: [
                buildGroupFicha(groupName, meta?.periodo ?? meta?.subtitulo),
                {
                    table: {
                        headerRows: 1,
                        widths,
                        body,
                        dontBreakRows: false,
                        keepWithHeaderRows: 1
                    },
                    layout: blackLayout,
                    margin: [12, 0, 12, 12]
                }
            ],
            margin: [0, 6, 0, 6]
        };
    };

    // Contenido por grupos
    const groupNames = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    const groupsContent = groupNames.flatMap((gName) => [makeGroupTable(gName, grupos[gName])]);

    const resp = meta?.responsable || {};
    const signatureRow = (label, value) => ({
        stack: [
            { text: `${label}${value ? `: ${value}` : ':'}`, style: 'firmaLabel' },
            {
                table: {
                    widths: ['*'],
                    body: [
                        [{ text: ' ', border: [false, true, false, false], margin: [0, 0, 0, 8] }]
                    ]
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

    const firmaBloque = {
        margin: [12, 10, 12, 8],
        stack: [
            signatureRow('Nombre de responsable', resp?.nombre || ''),
            signatureRow('Puesto de responsable', resp?.puesto || ''),
            signatureRow('Firma de responsable', ''),
            signatureRow('Sello', '')
        ]
    };

    // ===== DocDefinition =====
    const pageSize = resolvePageSize(meta?.pageSize);
    const docDefinition = {
        pageSize,
        pageOrientation: 'landscape',
        pageMargins: [44, 90, 44, 44],
        header,
        content: [
            ...(logoBase64 ? [{ image: logoBase64, width: 60, alignment: 'left', margin: [0, 0, 0, 12] }] : []),
            { text: meta?.titulo ?? 'MATRIZ DE EVALUACIÓN', style: 'title', alignment: 'center' },
            ...(meta?.subtitulo ? [{ text: meta.subtitulo, style: 'subtitle', alignment: 'center' }] : []),

            ...groupsContent,

            ...(meta?.notas ? [{ text: `Notas: ${meta.notas}`, style: 'notes' }] : []),

            firmaBloque
        ],
        styles,
        defaultStyle: { fontSize: 7 }
    };

    const fileName = nombreArchivo || 'Matriz_de_Evaluacion.pdf';
    pdfMake.createPdf(docDefinition).download(fileName);
}

/* ===== Ejemplo =====
MatrizEvaluacion(
  { propiedades, valores },
  null,
  {
    subtitulo: 'Periodo 2025',
    pageSize: 'LEGAL',
    responsable: { nombre: 'Prueba', puesto: 'Prueba' }
  }
);
*/
