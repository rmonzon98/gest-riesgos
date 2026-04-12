/**
 * @fileoverview 
 * Módulo del sistema de Gestión de Riesgos.
 *
 * Generación del reporte institucional de Mapa de Calor:
 *
 * - Construye uno o varios mapas de calor (5x5) a partir de probabilidad y severidad ajustadas.
 * - Puede generar un único mapa institucional o uno por unidad organizacional (`dividirPorUnidad`).
 * - Dibuja el mapa como SVG incrustado en el PDF y agrega una tabla dinámica de riesgos.
 * - Ajusta tamaño de hoja y orientación, e incluye bloque de firma institucional.
 *
 * @module Riesgos/Reportes F/Institucionales/MapaCalorInst.js
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = (pdfFonts?.pdfMake?.vfs) ?? pdfFonts.vfs ?? pdfMake.vfs;

/**
 * Mapa de Calor Institucional (uno o por unidad) + tabla dinámica.
 * Acepta mismo payload/meta que MatrizEvaluacionInst.
 *
 * @param {{propiedades: Array<{key?:string,label?:string,source?:'predefinida'|'extra'}>, valores: Array<object>}} payload
 * @param {string} [logoBase64]
 * @param {Object} [meta] - {
 *   notas, periodo, groupKey, dividirPorUnidad,
 *   pageSize|page_size, orientation, nombre, tipo,
 *   responsable?: { nombre?: string, puesto?: string } // NUEVO
 * }
 * @param {string} [nombreArchivo="Mapa_de_Calor_Institucional.pdf"]
 */
export function MapaCalorInst(payload, logoBase64, meta = {}, nombreArchivo = "Mapa_de_Calor_Institucional.pdf") {
    const propiedades = Array.isArray(payload?.propiedades) ? payload.propiedades : [];
    const valores = Array.isArray(payload?.valores) ? payload.valores : [];

    /**
     * safe
     *
     * Normaliza valores para impresión en el PDF.
     * - Si el valor es nulo, indefinido o cadena vacía → devuelve "—".
     * - En caso contrario lo convierte a string.
     *
     * @param {any} v
     * @returns {string}
     */
    const safe = (v) => (v === null || v === undefined || v === "") ? "—" : String(v);
     
    /**
     * clamp15
     *
     * Asegura que un valor numérico se mantenga en el rango [1, 5].
     * - Convierte a número, si falla usa 1.
     * - Aplica límites inferiores y superiores.
     *
     * @param {number|string} v
     * @returns {number}  Valor entre 1 y 5.
     */
    const clamp15 = (v) => Math.max(1, Math.min(5, Number(v) || 1));
    const zoneColor = (sev, prob) => {
        const s = Number(sev) * Number(prob);
        if (s >= 16) return "#e74c3c"; // alto
        if (s >= 12) return "#f1c40f"; // medio
        return "#2ecc71";             // bajo
    };

    const now = new Date();
    const formattedDate = now.toLocaleDateString();
    const formattedTime = now.toLocaleTimeString();

    // ===== Conversión y tamaño de hoja =====
    const mmToPt = (mm) => (Number(mm) * 72) / 25.4;
    const inToPt = (inch) => Number(inch) * 72;
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

    // ===== Clave de agrupación =====
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

    const groupKey = findGroupKey(valores);
    const getGroupValue = (row) => groupKey ? safe(row[groupKey]) : "Sin unidad";

    // ===== Estilos =====
    const styles = {
        footerSmall: { fontSize: 9 },

        fichaHeader: { bold: true, fontSize: 10, color: "white", fillColor: "#2a3f54", margin: [3, 3, 3, 3] },
        fichaData: { fontSize: 10, margin: [3, 3, 3, 3] },

        groupLabel: { bold: true, margin: [0, 6, 0, 6], fontSize: 12 },

        tableHeader: { bold: true, fontSize: 9, color: "white", fillColor: "#2a3f54", alignment: "center", margin: [3, 3, 3, 3] },
        tableCell: { fontSize: 8, margin: [3, 3, 3, 3] },
        sinDatos: { italics: true, margin: [0, 8, 0, 12] },

        footerHeader: { bold: true, fontSize: 12, color: "white", fillColor: "#2a3f54", margin: [3, 3, 3, 3] }
    };

    const blackLayout = {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#000",
        vLineColor: () => "#000"
    };

    // ===== Header =====
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
     * buildIntroBlock
     *
     * Construye el bloque de encabezado institucional:
     * - Columna izquierda: logo (si se proporciona).
     * - Columna derecha: ficha con Nombre y/o Tipo, si están en `meta`.
     *
     * @returns {object}
     */
    const buildIntroBlock = () => {
        const hasNombre = !!meta?.nombre, hasTipo = !!meta?.tipo;

        const ficha = (hasNombre || hasTipo) ? {
            table: {
                widths: ["auto", "*"],
                body: [
                    ...(hasNombre ? [[{ text: "Nombre", style: "fichaHeader" }, { text: safe(meta.nombre), style: "fichaData" }]] : []),
                    ...(hasTipo ? [[{ text: "Tipo", style: "fichaHeader" }, { text: safe(meta.tipo), style: "fichaData" }]] : []),
                ]
            },
            layout: blackLayout,
            margin: [0, 15, 0, 0]
        } : null;

        return {
            columns: [
                ...(logoBase64
                    ? [{ image: logoBase64, width: 60, margin: [0, 0, 12, 0] }]
                    : [{ text: "" }]),
                { width: "*", stack: [...(ficha ? [ficha] : [])] }
            ],
            columnGap: 12,
            margin: [12, 10, 12, 20]
        };
    };

    /**
     * buildSvgMapa
     *
     * Dibuja el mapa de calor 5x5 en SVG y coloca los puntos de riesgo.
     *
     * - gridSize = 5: define una matriz 5x5 (escala 1–5).
     * - cell = 54: tamaño en px de cada celda del grid.
     * - padLeft / padRight / padTop / padBottom: márgenes internos para ejes y etiquetas.
     *
     * @param {Array<{ref:string,prob:number,sev:number}>} puntos
     *        Lista de riesgos a ubicar en el mapa (ya con valores clamp15).
     * @returns {{svg:string,width:number,alignment:string,margin:number[]}}
     */
    const buildSvgMapa = (puntos) => {
        const gridSize = 5, cell = 54;
        const padLeft = 56, padRight = 10, padTop = 8, padBottom = 42;
        const GW = gridSize * cell, GH = gridSize * cell;
        const W = GW + padLeft + padRight, H = GH + padTop + padBottom;
        const ox = padLeft, oy = padTop;
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const sev = col + 1, prob = gridSize - row;
                const x = ox + col * cell, y = oy + row * cell;
                const score = sev * prob;
                svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${zoneColor(sev, prob)}" stroke="#fff" stroke-width="0.8"/>`;
                svg += `<text x="${x + cell / 2}" y="${y + cell / 2 + 3}" font-size="11" text-anchor="middle" fill="#000">${score}</text>`;
            }
        }

        svg += `<rect x="${ox}" y="${oy}" width="${GW}" height="${GH}" fill="none" stroke="#000" stroke-width="1.2"/>`;
        for (let i = 1; i <= gridSize; i++) {
            const cx = ox + (i - 0.5) * cell;
            const yBase = oy + GH;
            svg += `<text x="${cx}" y="${yBase + 18}" font-size="10" text-anchor="middle" fill="#000">${i}</text>`;
        }
        svg += `<text x="${ox + GW / 2}" y="${oy + GH + 34}" font-size="11" text-anchor="middle" fill="#000">Severidad</text>`;
        for (let i = 1; i <= gridSize; i++) {
            const cy = oy + GH - (i - 0.5) * cell;
            svg += `<text x="${ox - 12}" y="${cy + 3}" font-size="10" text-anchor="end" fill="#000">${i}</text>`;
        }
        svg += `<text x="${ox - 36}" y="${oy + GH / 2}" font-size="11" text-anchor="middle" fill="#000" transform="rotate(-90 ${ox - 36}, ${oy + GH / 2})">Probabilidad</text>`;

        const grouped = new Map();
        puntos.forEach(p => {
            const key = `${p.sev}-${p.prob}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(p);
        });

        const pointRadius = 8;
        grouped.forEach((lista, key) => {
            const [sevStr, probStr] = key.split("-");
            const sev = Number(sevStr), prob = Number(probStr);
            const cx = ox + (sev - 0.5) * cell;
            const cy = oy + (gridSize - prob + 0.5) * cell;

            const rad = cell * 0.3;
            const offsets = lista.length === 1
                ? [{ dx: 0, dy: 0 }]
                : Array.from({ length: lista.length }).map((_, i) => {
                    const ang = (2 * Math.PI * i) / lista.length;
                    return { dx: rad * Math.cos(ang), dy: rad * Math.sin(ang) };
                });

            lista.forEach((p, i) => {
                const { dx, dy } = offsets[i];
                const px = cx + dx, py = cy + dy;
                const fs = p.ref.length <= 3 ? 9 : p.ref.length === 4 ? 8 : 7;
                svg += `<circle cx="${px}" cy="${py}" r="${pointRadius}" fill="#fff" stroke="#000" stroke-width="1"/>`;
                svg += `<text x="${px}" y="${py}" font-size="${fs}" text-anchor="middle" dominant-baseline="middle" fill="#000">${p.ref}</text>`;
            });
        });

        svg += `</svg>`;
        return { svg, width: W, alignment: "center", margin: [0, 2, 0, 8] };
    };

   
    /**
     * buildTabla
     *
     * Construye la tabla detallada de riesgos que acompaña al mapa:
     * - Primera columna: numeración correlativa.
     * - Resto de columnas: según `propiedades` (predefinida vs extra).
     *
     * @param {Array<object>} riesgos  Filas originales del payload para una unidad (o todo institucional).
     * @returns {object}               Definición de tabla pdfMake.
     */
    const buildTabla = (riesgos) => {
        const headers = [{ text: "No.", style: "tableHeader", alignment: "center" }];
        propiedades.forEach(p => headers.push({ text: safe(p.label ?? p.key), style: "tableHeader", alignment: "center" }));

        const body = [headers];

        const getCellValue = (row, p) => {
            const label = p?.label ?? "";
            const key = p?.key ?? "";
            if ((p?.source ?? "predefinida") === "extra") {
                if (row?.EXTRAS && row.EXTRAS[label] !== undefined) return safe(row.EXTRAS[label]);
                if (row?.EXTRAS && row.EXTRAS[key] !== undefined) return safe(row.EXTRAS[key]);
                return "—";
            }
            if (row[label] !== undefined) return safe(row[label]);
            if (row[key] !== undefined) return safe(row[key]);
            return "—";
        };

        riesgos.forEach((r, i) => {
            const row = [{ text: String(i + 1), style: "tableCell", alignment: "center" }];
            propiedades.forEach((p) => row.push({ text: getCellValue(r, p), style: "tableCell" }));
            body.push(row);
        });

        return {
            table: { headerRows: 1, widths: [28, ...Array(propiedades.length).fill("*")], body },
            layout: blackLayout,
            margin: [0, 6, 0, 0]
        };
    };

    const buildFirmaFinal = () => {
        const resp = meta?.responsable ?? {};
        const nombreResp = (resp?.nombre ?? "").toString();
        const puestoResp = (resp?.puesto ?? "").toString();

        return {
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
    };

    const content = [];
    content.push(buildIntroBlock()); 

    if (meta.dividirPorUnidad) {
        const grupos = {};
        valores.forEach(v => {
            const g = getGroupValue(v);
            if (!grupos[g]) grupos[g] = [];
            grupos[g].push(v);
        });

        const groupNames = Object.keys(grupos).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
        groupNames.forEach((unidad, idx) => {
            if (idx > 0) content.push({ text: "", pageBreak: "before" });
            content.push({ text: `Unidad: ${unidad}`, style: "groupLabel" });

            const riesgos = grupos[unidad] || [];
            const puntos = riesgos
                .filter(r => r["Probabilidad ajustada"] && r["Severidad ajustada"])
                .map(r => ({ ref: safe(r["Ref."]), prob: clamp15(r["Probabilidad ajustada"]), sev: clamp15(r["Severidad ajustada"]) }));

            if (!puntos.length) {
                content.push({ text: "Sin datos ingresados.", style: "sinDatos" });
            } else {
                content.push(buildSvgMapa(puntos));
                content.push(buildTabla(riesgos));
            }
        });
    } else {
        const puntosAll = valores
            .filter(r => r["Probabilidad ajustada"] && r["Severidad ajustada"])
            .map(r => ({ ref: safe(r["Ref."]), prob: clamp15(r["Probabilidad ajustada"]), sev: clamp15(r["Severidad ajustada"]) }));

        if (!puntosAll.length) {
            content.push({ text: "Sin datos ingresados.", style: "sinDatos" });
        } else {
            content.push(buildSvgMapa(puntosAll));
            content.push(buildTabla(valores));
        }
    }

    if (meta?.notas) content.push({ text: `Notas: ${safe(meta.notas)}`, italics: true, margin: [0, 10, 0, 0] });
    content.push(buildFirmaFinal());

    const docDefinition = {
        pageSize: resolvePageSize(meta?.pageSize),
        pageOrientation: meta?.orientation || "portrait",
        pageMargins: [44, 90, 44, 44], // espacio para header
        header,
        styles,
        content
    };

    pdfMake.createPdf(docDefinition).download(nombreArchivo);
}
