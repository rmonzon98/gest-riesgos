/**
 * @fileoverview 
 * Reportes institucionales de riesgos de fraude o corrupción (Segunda Matriz):
 * generación de PDF con filtros de impresión y bloque de firmas.
 *
 * @module Riesgos/Reportes F/Institucionales/ReporteSegundaMatrizInst.js
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = (pdfFonts?.pdfMake?.vfs) ?? pdfFonts.vfs ?? pdfMake.vfs;


/**
 * ReporteSegundaMatrizInst
 *
 * Genera el PDF institucional de la Segunda Matriz de riesgos de fraude o corrupción,
 * aplicando filtros de impresión y agregando un bloque de firma del responsable.
 *
 * - Construye un encabezado institucional con logo, institución y período.
 * - Filtra matrices.
 * - Renderiza cada matriz como tabla con encabezados y filas dinámicas.
 * - Agrega comentarios por tabla si existen (`comentario_tabla` / `COMENTARIO_TABLA`).
 * - Inserta al final un bloque de firmas con nombre y puesto del responsable.
 *
 *
 * @param {Array<Object>} matrices                    Conjunto de matrices a imprimir.
 * @param {string|number} periodoSeleccionado         Período a mostrar en el encabezado.
 * @param {string} [logoBase64]                       Logo institucional en base64 (opcional).
 * @param {string} [institucion]                      Nombre de la institución.
 * @param {string|PrintOptions} [nombreArchivoOrOptions] Nombre del PDF o configuración de impresión.
 * @param {string|PrintOptions} [tipoOrOptions]       Rótulo de institución o configuración de impresión.
 * @param {{nombre?:string, puesto?:string}} [responsable] Datos del responsable para el bloque de firma.
 * @returns {void}                                    Descarga el PDF generado en el navegador.
 */
export function ReporteSegundaMatrizInst(
    matrices = [],
    periodoSeleccionado = '',
    logoBase64,
    institucion = '',
    nombreArchivoOrOptions = '',
    tipoOrOptions = '',
    responsable = {}
) {
    const safe = (v) => v == null || String(v).trim() === '' ? '—' : String(v);

    const isNo = (v) => String(v ?? '').trim().toLowerCase() === 'no';
    
    /**
     * getMatrixCompletionStatusA2 (implementación interna)
     *
     * - Recorre filas y columnas finales para determinar el estado de cada matriz.
     * - Se usa para decidir qué tablas se imprimen según `options.filter`.
     */
    const getMatrixCompletionStatusA2 = (m) => {
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
    };

    /**
     * parseIndicesText (implementación interna)
     *
     * - Permite pasar índices de tablas de forma compacta ("1,3,5-7").
     * - Se usa cuando el filtro es `filter: 'indices'`.
     */
    const parseIndicesText = (txt) => {
        if (!txt) return [];
        const parts = String(txt).split(',').map(s => s.trim()).filter(Boolean);
        const out = new Set();
        for (const p of parts) {
            if (/^\d+$/.test(p)) { out.add(Number(p)); continue; }
            const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
            if (m) {
                const a = Number(m[1]), b = Number(m[2]);
                const [from, to] = a <= b ? [a, b] : [b, a];
                for (let i = from; i <= to; i++) out.add(i);
            }
        }
        return Array.from(out).sort((x, y) => x - y);
    };

    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();

    const styles = {
        header: { fontSize: 18, bold: true, margin: [0, 20, 0, 10] },
        sectionTitle: { fontSize: 12, bold: true, margin: [0, 10, 0, 6] },
        tableHeader: { bold: true, fontSize: 10, color: 'white', fillColor: '#2a3f54', alignment: 'center' },
        tableHeaderLeft: { bold: true, fontSize: 10, color: 'white', fillColor: '#2a3f54', alignment: 'left' },
        tableCell: { fontSize: 9, alignment: 'left' },
        tableFooter: { margin: [0, 30, 0, 10] },
        footerHeader: { bold: true, fontSize: 12, color: 'white', fillColor: '#2a3f54', margin: [3, 3, 3, 3] }
    };

    const gridLayout = {
        hLineWidth: () => 0.8, vLineWidth: () => 0.8,
        hLineColor: () => 'black', vLineColor: () => 'black'
    };

    const header = (currentPage, pageCount) => ({
        columns: [
            { text: '', width: '*' },
            {
                alignment: 'right', width: 'auto',
                stack: [
                    { text: `Página ${currentPage} de ${pageCount}`, fontSize: 10 },
                    { text: formattedDate, fontSize: 10 },
                    { text: formattedTime, fontSize: 10 }
                ]
            }
        ],
        margin: [30, 10]
    });

    /** @type {PrintOptions} */
    let options = {
        filter: 'all',
        indices: [],
        includeEmpty: true
    };

    let nombreArchivo = (typeof nombreArchivoOrOptions === 'string') ? nombreArchivoOrOptions : '';
    let tipo = (typeof tipoOrOptions === 'string') ? tipoOrOptions : '';

    if (nombreArchivoOrOptions && typeof nombreArchivoOrOptions === 'object') {
        options = { ...options, ...nombreArchivoOrOptions };
    }
    if (tipoOrOptions && typeof tipoOrOptions === 'object') {
        options = { ...options, ...tipoOrOptions };
    }
    if (options?.nombreArchivo) nombreArchivo = options.nombreArchivo;
    if (options?.tipo) tipo = options.tipo;

    const resumen = {
        stack: [
            ...(logoBase64 ? [{ image: logoBase64, width: 50, alignment: 'left', margin: [0, 0, 0, 10] }] : []),
            { text: 'RIESGOS DE FRAUDE O CORRUPCIÓN', style: 'header', alignment: 'center' },
            {
                table: {
                    widths: ['auto', '*'],
                    body: [
                        ...(institucion ? [[{ text: tipo || 'Institución', style: 'tableHeaderLeft' }, { text: institucion, style: 'tableCell' }]] : []),
                        [{ text: 'Período', style: 'tableHeaderLeft' }, { text: safe(periodoSeleccionado), style: 'tableCell' }]
                    ]
                },
                layout: gridLayout
            }
        ]
    };

    // ===================== Filtrado de matrices =====================
    let mats = Array.isArray(matrices) ? matrices.slice() : [];

    // 1) Filtrado por índices (1-based)
    if (options.filter === 'indices') {
        let idxs = Array.isArray(options.indices) ? options.indices.slice() : [];
        if ((!idxs || idxs.length === 0) && options.indicesText) {
            idxs = parseIndicesText(options.indicesText);
        }
        if (idxs && idxs.length > 0) {
            const set0 = new Set(idxs.map(n => Number(n) - 1)); // a 0-based
            mats = mats.filter((_, i) => set0.has(i));
        } else {
            mats = [];
        }
    }

    // 2) Filtrado por estado (complete) y vacías
    mats = mats.filter((m) => {
        const status = getMatrixCompletionStatusA2(m);
        if (!options.includeEmpty && status === 'empty') return false;
        if (options.filter === 'complete') return status === 'complete';
        return true; 
    });

    if (!mats.length) {
        alert('No hay tablas que coincidan con el criterio de impresión.');
        return;
    }

    const content = [resumen];

    mats.forEach((m, idx) => {
        const titulo = m?.titulo ?? m?.TITULO ?? `Tabla #${m?.matriz ?? m?.MATRIZ ?? idx + 1}`;
        const headers = (m?.columnas?.headers) || (m?.COLUMNAS?.HEADERS) || [];
        const filasRaw = m?.filas ?? m?.FILAS ?? [];
        const filas = Array.isArray(filasRaw) ? filasRaw : [];
        const len = headers.length;

        content.push({ text: titulo, style: 'sectionTitle', margin: [0, idx === 0 ? 0 : 6, 0, 6] });

        const body = [];
        body.push(headers.map((h, i) => ({ text: safe(h), style: i === 0 ? 'tableHeaderLeft' : 'tableHeader' })));

        filas.forEach(row => {
            const arr = Array.isArray(row) ? row : [];
            const padded = len > 0 ? (arr.length < len ? [...arr, ...Array(len - arr.length).fill(null)] : arr.slice(0, len)) : arr;
            body.push(padded.map(c => ({ text: safe(c), style: 'tableCell', noWrap: false })));
        });

        const widths = headers.map((_, i) =>
            i === 0 ? 'auto' : '*'
        );

        content.push({
            table: { headerRows: 1, widths, body },
            layout: {
                hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1.2 : 0.6,
                vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? 1.2 : 0.6,
                hLineColor: () => 'black', vLineColor: () => 'black'
            },
            margin: [0, 0, 0, 12]
        });

        const comentarioTabla = m?.comentario_tabla ?? m?.COMENTARIO_TABLA
            ?? ((m?.meta ?? m?.META)?.comentario_tabla);
        if (comentarioTabla && String(comentarioTabla).trim() !== '') {
            content.push({
                text: String(comentarioTabla),
                style: { fontSize: 9, italics: true, margin: [0, -6, 0, 12] }
            });
        }
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

    const nombre = nombreArchivo || `Segunda_Matriz_${safe(periodoSeleccionado)}.pdf`;

    pdfMake.createPdf({
        pageOrientation: 'portrait',
        pageMargins: [30, 70, 30, 30],
        header,
        styles,
        content
    }).download(nombre);
}
