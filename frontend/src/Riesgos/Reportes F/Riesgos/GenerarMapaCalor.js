/**
 * @fileoverview
 * Reporte de mapa de calor de riesgos: generación de PDF agrupado por unidad.
 *
 * @module Riesgos/Reportes F/Riesgos/GenerarMapaCalor
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = (pdfFonts?.pdfMake?.vfs) ?? pdfFonts.vfs ?? pdfMake.vfs;

/**
 * Genera un PDF con mapas de calor de riesgos agrupados por unidad.
 *
 * @param {Object} payload - { propiedades: [{ key, label, source }], valores: [...] }
 * @param {string} [logoBase64] - Logo en base64 (opcional)
 * @param {Object} [meta] - { titulo, subtitulo, pageSize, periodo, responsable?: { nombre?: string, puesto?: string } }
 * @param {string} [nombreArchivo='Mapa_de_Calor.pdf'] - Nombre del archivo descargado
 */
export function GenerarMapaCalor(payload, logoBase64, meta = {}, nombreArchivo = 'Mapa_de_Calor.pdf') {
    const { propiedades = [], valores = [] } = payload || {};

    const clamp15 = v => Math.max(1, Math.min(5, Number(v) || 1));
    const safe = v => (v == null || v === '') ? '—' : String(v);
    const zoneColor = (sev, prob) => {
        const score = Number(sev) * Number(prob);
        if (score >= 16) return '#e74c3c';
        if (score >= 12) return '#f1c40f';
        return '#2ecc71';
    };

    const periodo = safe(meta?.periodo ?? valores?.[0]?.Periodo);

    // Agrupar por unidad
    const grupos = {};
    valores.forEach(v => {
        const unidad = safe(v['Nombre unidad']);
        if (!grupos[unidad]) grupos[unidad] = [];
        grupos[unidad].push(v);
    });

    const now = new Date();
    const fecha = now.toLocaleDateString();
    const hora = now.toLocaleTimeString();

    const styles = {
        titulo: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 4, 0, 2] },
        subtitulo: { fontSize: 12, italics: true, alignment: 'center', margin: [0, 0, 0, 8] },
        fichaHeader: { bold: true, fontSize: 10, color: 'white', fillColor: '#2a3f54', margin: [3, 3, 3, 3] },
        fichaData: { fontSize: 10, margin: [3, 3, 3, 3] },
        tableHeader: { bold: true, fontSize: 9, color: 'white', fillColor: '#2a3f54', margin: [3, 3, 3, 3] },
        tableCell: { fontSize: 8, margin: [3, 3, 3, 3] },
        sinDatos: { italics: true, margin: [0, 8, 0, 12] },

        footerSmall: { fontSize: 9 },

        firmaLabel: { fontSize: 10, margin: [0, 2, 0, 2] }
    };

    const header = (currentPage, pageCount) => ({
        columns: [
            { text: '', width: '*' },
            { text: `Página ${currentPage}/${pageCount}`, alignment: 'right', margin: [0, 8, 30, 0], style: 'footerSmall' }
        ]
    });

    const fichaSuperior = (unidad) => {
        const titulo = meta?.titulo || 'Mapa de Calor de Riesgos';
        const subtitulo = meta?.subtitulo || '';

        return {
            table: {
                widths: [logoBase64 ? 60 : 0, '*', 140],
                body: [[
                    logoBase64 ? { image: logoBase64, width: 46, height: 46, margin: [0, 2, 10, 2] } : '',
                    {
                        stack: [
                            { text: titulo, style: 'titulo' },
                            subtitulo ? { text: subtitulo, style: 'subtitulo' } : {},
                            {
                                table: {
                                    widths: ['auto', '*', 'auto', '*'],
                                    body: [
                                        [
                                            { text: 'Unidad', style: 'fichaHeader' }, { text: safe(unidad), style: 'fichaData' },
                                            { text: 'Período', style: 'fichaHeader' }, { text: safe(periodo), style: 'fichaData' }
                                        ]
                                    ]
                                },
                                layout: {
                                    hLineWidth: () => 1, vLineWidth: () => 1,
                                    hLineColor: () => '#000', vLineColor: () => '#000'
                                }
                            }
                        ]
                    },
                    { alignment: 'right', stack: [{ text: hora, fontSize: 10 }, { text: fecha, fontSize: 10 }] }
                ]]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 6]
        };
    };

    // =============== SVG del mapa de calor ===============
    const buildSvgMapa = (puntos, {
        gridSize = 5,
        cell = 54,
        padLeft = 56, padRight = 10, padTop = 8, padBottom = 42,
        marginTop = 2, marginBottom = 8
    } = {}) => {
        const GW = gridSize * cell, GH = gridSize * cell;
        const W = GW + padLeft + padRight, H = GH + padTop + padBottom;
        const ox = padLeft, oy = padTop;
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;

        // Cuadrícula + números
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const sev = col + 1, prob = gridSize - row;
                const x = ox + col * cell, y = oy + row * cell;
                const score = sev * prob;
                svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${zoneColor(sev, prob)}" stroke="#fff" stroke-width="0.8"/>`;
                svg += `<text x="${x + cell / 2}" y="${y + cell / 2 + 3}" font-size="11" text-anchor="middle" fill="#000">${score}</text>`;
            }
        }

        // Ejes
        svg += `<rect x="${ox}" y="${oy}" width="${GW}" height="${GH}" fill="none" stroke="#000" stroke-width="1.2"/>`;
        for (let i = 1; i <= gridSize; i++) {
            const cx = ox + (i - 0.5) * cell;
            const yBase = oy + GH;
            svg += `<text x="${cx}" y="${yBase + 18}" font-size="10" text-anchor="middle" fill="#000">${i}</text>`;
        }
        svg += `<text x="${ox + GW / 2}" y="${oy + GH + 34}" font-size="11" text-anchor="middle" fill="#000">Severidad</text>`;
        for (let i = 1; i <= gridSize; i++) {
            const cy = oy + GH - (i - 0.5) * cell;
            const xBase = ox;
            svg += `<text x="${xBase - 12}" y="${cy + 3}" font-size="10" text-anchor="end" fill="#000">${i}</text>`;
        }
        svg += `<text x="${ox - 36}" y="${oy + GH / 2}" font-size="11" text-anchor="middle" fill="#000" transform="rotate(-90 ${ox - 36}, ${oy + GH / 2})">Probabilidad</text>`;

        // Agrupar puntos por (sev, prob)
        const grouped = new Map();
        puntos.forEach(p => {
            const key = `${p.sev}-${p.prob}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(p);
        });

        const pointRadius = 8;
        grouped.forEach((lista, key) => {
            const [sevStr, probStr] = key.split('-');
            const sev = Number(sevStr), prob = Number(probStr);
            const cx = ox + (sev - 0.5) * cell;
            const cy = oy + (gridSize - prob + 0.5) * cell;

            let offsets;
            if (lista.length === 1) {
                const off = cell * 0.28;
                offsets = [{ dx: off, dy: -off }];
            } else {
                const rad = cell * 0.3;
                offsets = Array.from({ length: lista.length }).map((_, i) => {
                    const ang = (2 * Math.PI * i) / lista.length;
                    return { dx: rad * Math.cos(ang), dy: rad * Math.sin(ang) };
                });
            }

            lista.forEach((p, i) => {
                const { dx, dy } = offsets[i];
                const px = cx + dx, py = cy + dy;
                const fs = p.ref.length <= 3 ? 9 : p.ref.length === 4 ? 8 : 7;
                svg += `<circle cx="${px}" cy="${py}" r="${pointRadius}" fill="#fff" stroke="#000" stroke-width="1"/>`;
                svg += `<text x="${px}" y="${py}" font-size="${fs}" text-anchor="middle" dominant-baseline="middle" fill="#000">${p.ref}</text>`;
            });
        });

        svg += `</svg>`;
        return { svg, width: W, alignment: 'center', margin: [0, marginTop, 0, marginBottom] };
    };

    // =============== Tabla dinámica ===============
    const buildTabla = (riesgos) => {
        const headers = [{ text: 'No.', style: 'tableHeader', alignment: 'center' }];
        propiedades.forEach(p => headers.push({ text: safe(p.label), style: 'tableHeader', alignment: 'center' }));

        const body = [headers];

        riesgos.forEach((r, i) => {
            const row = [{ text: String(i + 1), style: 'tableCell', alignment: 'center' }];

            propiedades.forEach((p) => {
                if ((p.source ?? 'predefinida') === 'predefinida') {
                    row.push({ text: safe(r[p.label]), style: 'tableCell' });
                } else {
                    const tmp = r.EXTRAS || {};
                    row.push({ text: safe(tmp[p.label]), style: 'tableCell' });
                }
            });

            body.push(row);
        });

        return {
            table: {
                headerRows: 1,
                widths: [28, ...Array(propiedades.length).fill('*')],
                body
            },
            layout: {
                hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
                vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? 1 : 0.5,
                hLineColor: () => '#000',
                vLineColor: () => '#000'
            },
            margin: [0, 6, 0, 0]
        };
    };

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

    const buildFirmaFinal = () => ({
        margin: [0, 10, 0, 0],
        stack: [
            signatureRow('Nombre de responsable', resp?.nombre || ''),
            signatureRow('Puesto de responsable', resp?.puesto || ''),
            signatureRow('Firma de responsable', ''),
            signatureRow('Sello', '')
        ]
    });

    const content = [];

    Object.entries(grupos).forEach(([unidad, riesgos], idx) => {
        if (idx > 0) content.push({ text: '', pageBreak: 'before' });
        content.push(fichaSuperior(unidad));

        const puntos = riesgos
            .filter(r => r['Probabilidad ajustada'] && r['Severidad ajustada'])
            .map(r => ({
                ref: safe(r['Ref.']),
                prob: clamp15(r['Probabilidad ajustada']),
                sev: clamp15(r['Severidad ajustada'])
            }));

        if (!puntos.length) {
            content.push({ text: 'Sin datos ingresados.', style: 'sinDatos' });
        } else {
            content.push(buildSvgMapa(puntos));
            content.push(buildTabla(riesgos));
        }
    });

    content.push(buildFirmaFinal());

    const docDefinition = {
        pageSize: meta?.pageSize || 'A4',
        pageOrientation: 'portrait',
        pageMargins: [26, 24, 26, 20],
        header,
        styles,
        content
    };

    pdfMake.createPdf(docDefinition).download(nombreArchivo);
}
