/**
 * @fileoverview 
 * Generación del reporte institucional de la Matriz de Evaluación:
 *
 * - Construye un PDF en formato tabla con los riesgos evaluados.
 * - Permite dividir la información por unidad o consolidarla a nivel institucional.
 * - Soporta configuración dinámica de tamaño de página y metadatos de encabezado.
 * - Incluye un bloque de firma para el responsable del reporte.
 *
 * @module Riesgos/Reportes F/Institucionales/MatrizEvaluacionInst.js
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = (pdfFonts?.pdfMake?.vfs) ?? pdfFonts.vfs ?? pdfMake.vfs;

/**
 * Genera PDF de Matriz de Evaluación Institucional, con o sin división por unidad.
 *
 * @param {Object} payload - { propiedades: [{ key,label,source }], valores: [ ... ] }
 * @param {string} [logoBase64] - Logo opcional en base64
 * @param {Object} [meta] - {
 *    titulo, subtitulo, notas, periodo, groupKey,
 *    dividirPorUnidad: boolean,
 *    pageSize | page_size: 'A4' | 'A3' | 'LEGAL' | 'LETTER' | 'TABLOID' | { unit, width, height },
 *    nombre?: string,   // se muestra en tablita inicial
 *    tipo?: string,     // se muestra en tablita inicial
 *    responsable?: { nombre?: string, puesto?: string }
 * }
 * @param {string} [nombreArchivo] - Nombre del archivo a descargar
 */
export function MatrizEvaluacionInst(payload, logoBase64, meta = {}, nombreArchivo = "Matriz_Evaluacion_Institucional.pdf") {
    const propiedades = Array.isArray(payload?.propiedades) ? payload.propiedades : [];
    const rows = Array.isArray(payload?.valores) ? payload.valores : [];

    // === Helpers ===
    const safe = (v) => (v === null || v === undefined || v === "") ? "—" : String(v);
    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();

    // === Conversión de unidades a puntos ===
    const mmToPt = (mm) => (Number(mm) * 72) / 25.4;
    const inToPt = (inch) => Number(inch) * 72;

    // === Definición de tamaño de página ===
    const resolvePageSize = (ps) => {
        const val = ps ?? meta?.pageSize ?? meta?.page_size ?? "A4";
        if (typeof val === "string") return val.toUpperCase();
        if (val && typeof val === "object" && ("width" in val) && ("height" in val)) {
            const unit = (val.unit || "pt").toLowerCase();
            if (unit === "mm") return { width: mmToPt(val.width), height: mmToPt(val.height) };
            if (unit === "in") return { width: inToPt(val.width), height: inToPt(val.height) };
            return { width: Number(val.width), height: Number(val.height) };
        }
        return "A4";
    };

    // === Resolución de valores ===
    const getCellValue = (row, prop) => {
        const label = prop?.label ?? "";
        const key = prop?.key ?? "";
        if ((prop?.source ?? "predefinida") === "extra") {
            if (row?.EXTRAS && Object.prototype.hasOwnProperty.call(row.EXTRAS, label)) return safe(row.EXTRAS[label]);
            if (row?.EXTRAS && Object.prototype.hasOwnProperty.call(row.EXTRAS, key)) return safe(row.EXTRAS[key]);
            return "—";
        }
        if (Object.prototype.hasOwnProperty.call(row, label)) return safe(row[label]);
        if (Object.prototype.hasOwnProperty.call(row, key)) return safe(row[key]);
        return "—";
    };

    // === Agrupación opcional por unidad ===
    const candidateKeys = [
        meta?.groupKey,
        "Nombre unidad", "Unidad", "Unidad organizacional", "NOMBRE_UNIDAD",
        "Dirección", "Direccion", "DIRECCION",
        "Dirección evaluada", "Dirección / Unidad", "Área evaluada"
    ].filter(Boolean);

    const findGroupKey = (items) => {
        for (const c of candidateKeys) {
            const hasAny = items.some(r => r && (r[c] !== undefined && r[c] !== null && r[c] !== ""));
            if (hasAny) return c;
        }
        return null;
    };

    const groupKey = findGroupKey(rows);
    const getGroupValue = (row) => groupKey ? safe(row[groupKey]) : "Sin unidad";

    const grupos = {};
    if (meta.dividirPorUnidad) {
        rows.forEach((row) => {
            const g = getGroupValue(row);
            if (!grupos[g]) grupos[g] = [];
            grupos[g].push(row);
        });
    } else {
        grupos["Institucional"] = rows;
    }

    // === Estilos y layouts ===
    const styles = {
        title: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
        subtitle: { fontSize: 10, italics: true, margin: [0, 0, 0, 10] },
        groupTitle: { fontSize: 11, bold: true, margin: [0, 10, 0, 6] },
        tableHeader: { bold: true, fontSize: 8, color: "white", fillColor: "#2a3f54", alignment: "center" },
        tableCell: { fontSize: 7, alignment: "left" },
        notes: { fontSize: 8, italics: true, margin: [0, 10, 0, 0] },
        footerSmall: { fontSize: 9 },
        fichaHeaderLeft: { bold: true, fontSize: 10, color: "white", fillColor: "#2a3f54", alignment: "left" },
        fichaCell: { fontSize: 9, alignment: "left" },
        tableFooter: { margin: [0, 30, 0, 10] },
        footerHeader: { bold: true, fontSize: 12, color: "white", fillColor: "#2a3f54", margin: [3, 3, 3, 3] }
    };

    const blackLayout = {
        hLineWidth: () => 0.8,
        vLineWidth: () => 0.8,
        hLineColor: () => "black",
        vLineColor: () => "black"
    };

    const header = (currentPage, pageCount) => ({
        columns: [
            { text: "", width: "*" },
            {
                alignment: "right",
                stack: [
                    { text: `Página ${currentPage} de ${pageCount}`, style: "footerSmall" },
                    { text: formattedDate, style: "footerSmall" },
                    { text: formattedTime, style: "footerSmall" }
                ],
                width: "auto"
            }
        ],
        margin: [40, 12]
    });

    /**
     * buildIntroFicha
     *
     * Construye una pequeña tabla inicial con la información
     * general de la institución (nombre y tipo), si está disponible.
     *
     * @returns {Object|null}  Definición de tabla para pdfMake o `null` si no hay datos.
     */
    const buildIntroFicha = () => {
        const hasNombre = !!meta?.nombre;
        const hasTipo = !!meta?.tipo;
        if (!hasNombre && !hasTipo) return null;

        const rows = [];
        if (hasNombre) rows.push([{ text: "Nombre", style: "fichaHeaderLeft" }, { text: safe(meta.nombre), style: "fichaCell" }]);
        if (hasTipo) rows.push([{ text: "Tipo", style: "fichaHeaderLeft" }, { text: safe(meta.tipo), style: "fichaCell" }]);

        return {
            table: {
                widths: ["auto", "*"],
                body: rows
            },
            layout: blackLayout,
            margin: [12, 0, 12, 10]
        };
    };

    /**
     * buildGroupFicha
     *
     * Crea la ficha resumen por grupo/unidad con los campos:
     * - Unidad
     * - Período
     *
     * @param {string} unidadNombre   Nombre de la unidad o grupo.
     * @param {string|number} periodoTexto  Período a mostrar.
     * @returns {Object}              Tabla pdfMake con los datos de unidad/período.
     */
    const buildGroupFicha = (unidadNombre, periodoTexto) => ({
        table: {
            widths: ["auto", "*"],
            body: [
                [{ text: "Unidad", style: "fichaHeaderLeft" }, { text: safe(unidadNombre), style: "fichaCell" }],
                [{ text: "Período", style: "fichaHeaderLeft" }, { text: safe(periodoTexto ?? "—"), style: "fichaCell" }]
            ]
        },
        layout: blackLayout,
        margin: [12, 4, 12, 6]
    });
    
    /**
     * makeGroupTable
     *
     * Construye la tabla de riesgos para un grupo/unidad específico.
     *
     * @param {string} groupName     Nombre del grupo/unidad.
     * @param {Array<Object>} dataRows  Filas asociadas a la unidad.
     * @returns {Object}   
     */
    const makeGroupTable = (groupName, dataRows) => {
        const tableHeader = [
            { text: "No.", style: "tableHeader" },
            ...propiedades.map((p) => ({ text: p?.label ?? p?.key ?? "—", style: "tableHeader" }))
        ];
        const body = [tableHeader];
        dataRows.forEach((row, idx) => {
            const cells = [
                { text: String(idx + 1), style: "tableCell" },
                ...propiedades.map((p) => ({ text: getCellValue(row, p), style: "tableCell" }))
            ];
            body.push(cells);
        });
        const widths = ["auto", ...propiedades.map(() => "auto")];
        return {
            stack: [
                meta.dividirPorUnidad ? buildGroupFicha(groupName, meta?.periodo ?? meta?.subtitulo) : {},
                {
                    table: { headerRows: 1, widths, body },
                    layout: blackLayout,
                    margin: [12, 0, 12, 12]
                }
            ]
        };
    };

    const groupNames = Object.keys(grupos).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    const groupsContent = groupNames.flatMap((gName) => [makeGroupTable(gName, grupos[gName])]);

    
    const resp = meta?.responsable ?? {};
    const nombreResp = (resp?.nombre ?? "").toString();
    const puestoResp = (resp?.puesto ?? "").toString();

    const firmaBloque = {
        layout: "noBorders",
        table: {
            widths: ["auto", "*"],
            body: [
                [
                    { text: "Nombre de responsable:", margin: [0, 8, 8, 0] },
                    { text: nombreResp, margin: [0, 6, 0, 2], border: [false, false, false, true] }
                ],
                [
                    { text: "Puesto de responsable:", margin: [0, 8, 8, 0] },
                    { text: puestoResp, margin: [0, 6, 0, 2], border: [false, false, false, true] }
                ],
                [
                    { text: "Firma de responsable:", margin: [0, 8, 8, 0] },
                    { text: "", margin: [0, 6, 0, 2], border: [false, false, false, true] }
                ],
                [
                    { text: "Sello:", margin: [0, 8, 8, 0] },
                    { text: "", margin: [0, 6, 0, 2], border: [false, false, false, true] }
                ]
            ]
        },
        margin: [12, 10, 12, 8]
    };

    // === Documento final ===
    const pageSize = resolvePageSize(meta?.pageSize);
    const introFicha = buildIntroFicha();
    const docDefinition = {
        pageSize,
        pageOrientation: "landscape",
        pageMargins: [44, 90, 44, 44],
        header,
        content: [
            ...(logoBase64 ? [{ image: logoBase64, width: 60, alignment: "left", margin: [0, 0, 0, 12] }] : []),
            { text: meta?.titulo ?? "MATRIZ DE EVALUACIÓN INSTITUCIONAL", style: "title", alignment: "center" },
            ...(meta?.subtitulo ? [{ text: meta.subtitulo, style: "subtitle", alignment: "center" }] : []),
            ...(introFicha ? [introFicha] : []),
            ...groupsContent,
            ...(meta?.notas ? [{ text: `Notas: ${meta.notas}`, style: "notes" }] : []),
            firmaBloque
        ],
        styles,
        defaultStyle: { fontSize: 7 }
    };

    const fileName = nombreArchivo || "Matriz_Evaluacion_Institucional.pdf";
    pdfMake.createPdf(docDefinition).download(fileName);
}
