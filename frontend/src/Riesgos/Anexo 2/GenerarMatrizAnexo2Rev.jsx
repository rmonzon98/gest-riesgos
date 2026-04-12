/**
 * @fileoverview
 * Generador de reporte PDF para las matrices del Anexo 2.
 *
 * @module Riesgos/Anexo 2/GenerarMatrizAnexo2Rev.jsx
 * @version 1.2
 * @author Equipo
 */

import React, { useState } from 'react';
import { Button, Snackbar, Alert } from '@mui/material';
import { PictureAsPdf as PictureAsPdfIcon } from '@mui/icons-material';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

/**
 * GenerarMatrizAnexo2Rev
 *
 * Componente principal del módulo.
 *
 * - Recibe las matrices del Anexo 2 ya armadas y genera un PDF con:
 *   - Encabezado (logo, título, unidad, período)
 *   - Una página por matriz
 *   - Comentario de la tabla (comentario_tabla), si viene
 *   - Bloque de firma final opcional
 *
 * @component
 * @returns {JSX.Element}
 */
export default function GenerarMatrizAnexo2Rev({
    matrices = [],
    entidad = '',
    periodo = '',
    logoBase64 = null,
    abrir = true,
    mostrarFirmaFinal = true,
    responsable = null, // { nombre, puesto } opcional
}) {
    const [snack, setSnack] = useState({
        open: false,
        msg: '',
        sev: 'info',
    });

    const showSnack = (msg, sev = 'info') => {
        setSnack({ open: true, msg, sev });
    };

    const handleSnackClose = (_event, reason) => {
        if (reason === 'clickaway') return;
        setSnack(prev => ({ ...prev, open: false }));
    };

    /**
     * Retorna la fecha y hora actual formateada para incluirla en el pie.
     */
    const now = () => {
        const dt = new Date();
        const two = (n) => String(n).padStart(2, '0');
        const dd = two(dt.getDate());
        const mm = two(dt.getMonth() + 1);
        const yyyy = dt.getFullYear();
        let hh = dt.getHours();
        const m = two(dt.getMinutes());
        const s = two(dt.getSeconds());
        const ampm = hh >= 12 ? 'p. m.' : 'a. m.';
        hh = hh % 12;
        if (hh === 0) hh = 12;
        return `${dd}/${mm}/${yyyy}\n${hh}:${m}:${s} ${ampm}`;
    };

    /**
     * Construye una tabla de pdfMake a partir de una matriz.
     */
    const buildTableForMatrix = (mat) => {
        const headers = (mat?.columnas?.headers || []).map((h) => ({
            text: h,
            style: 'thWhite',
        }));

        const filasSrc = Array.isArray(mat?.filas) ? mat.filas : [];
        const rows = filasSrc.map((f) =>
            f.map((c, idx) => ({
                text: c == null ? '' : String(c),
                style: idx === 0 ? 'tdFirst' : 'td',
            })),
        );

        // Primera columna más ancha para la descripción
        const widths = headers.map((_, i) => (i === 0 ? 220 : '*'));

        return {
            table: {
                headerRows: 1,
                dontBreakRows: true,
                widths,
                body: [headers, ...rows],
            },
            layout: {
                fillColor: (rowIndex) => (rowIndex === 0 ? '#0b3861' : null),
                hLineColor: () => '#cccccc',
                vLineColor: () => '#cccccc',
                hLineWidth: () => 0.7,
                vLineWidth: () => 0.7,
                paddingLeft: () => 6,
                paddingRight: () => 6,
                paddingTop: () => 4,
                paddingBottom: () => 4,
            },
        };
    };

    const generarPDF = () => {
        if (!matrices.length) {
            showSnack('No hay datos para generar el PDF.', 'warning');
            return;
        }

        const content = [];

        // ===== Encabezado general =====
        const headerRow = [];
        if (logoBase64) {
            headerRow.push({
                image: logoBase64,
                width: 70,
                height: 70,
                margin: [0, 0, 10, 0],
            });
        } else {
            headerRow.push({ width: 70, text: '' });
        }

        headerRow.push({
            text: 'Riesgos de fraude y corrupción — Matrices (Anexo 2)',
            style: 'title',
            alignment: 'center',
            margin: [0, 8, 0, 0],
        });

        headerRow.push({ width: 70, text: '' });

        content.push({
            columns: headerRow,
            columnGap: 10,
            margin: [0, 0, 0, 6],
        });

        content.push({
            table: {
                widths: ['50%', '50%'],
                body: [[
                    { text: `Unidad: ${entidad || ''}`, style: 'unit' },
                    { text: `Período de evaluación: ${periodo || ''}`, style: 'unit' },
                ]],
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 6],
        });

        // ===== Tablas de matrices =====
        matrices.forEach((mat, idx) => {
            // Cada matriz inicia en nueva página, excepto la primera
            if (idx > 0) {
                content.push({ text: '', pageBreak: 'before' });
            }

            const tituloTabla =
                mat?.titulo ||
                `Tabla #${mat?.matriz != null ? mat.matriz : idx + 1}`;

            content.push({
                text: tituloTabla,
                style: 'sectionTitle',
                margin: [0, 0, 0, 6],
            });

            // Tabla principal
            content.push(buildTableForMatrix(mat));

            // Comentario de la tabla (nuevo)
            const comentarioTabla =
                mat?.comentario_tabla ??
                mat?.COMENTARIO_TABLA ??
                '';

            if (comentarioTabla && String(comentarioTabla).trim() !== '') {
                content.push({
                    text: `Comentario de la tabla:\n${String(comentarioTabla)}`,
                    style: 'comment',
                    margin: [0, 6, 0, 0],
                });
            }
        });

        // ===== Bloque de firma final (opcional) =====
        if (mostrarFirmaFinal) {
            const nombreResp = responsable?.nombre || '';
            const puestoResp = responsable?.puesto || '';
            const tieneResp = nombreResp.trim() || puestoResp.trim();

            const textoFirmaBase =
                'RESPONSABLE DE LA ELABORACIÓN, FAVOR COLOCAR NOMBRE,\nPUESTO Y SELLO:';

            const textoFirma =
                tieneResp
                    ? `${textoFirmaBase}\n\n${nombreResp}\n${puestoResp}`
                    : textoFirmaBase;

            content.push({
                margin: [0, 18, 0, 0],
                table: {
                    widths: ['60%', '40%'],
                    body: [[
                        { text: textoFirma, style: 'signatureCell' },
                        { text: '' },
                    ]],
                },
                layout: {
                    fillColor: (_rowIndex, _node, columnIndex) =>
                        columnIndex === 0 ? '#0b3861' : null,
                    hLineWidth: () => 0.7,
                    vLineWidth: () => 0.7,
                    hLineColor: () => '#000',
                    vLineColor: () => '#000',
                    paddingLeft: () => 6,
                    paddingRight: () => 6,
                    paddingTop: () => 6,
                    paddingBottom: () => 6,
                },
            });
        }

        const docDefinition = {
            pageOrientation: 'landscape',
            pageSize: 'A4',
            pageMargins: [20, 20, 20, 40],
            defaultStyle: { fontSize: 9, lineHeight: 1.1 },
            content,
            styles: {
                title: { fontSize: 15, bold: true },
                unit: { fontSize: 11, alignment: 'left', margin: [0, 0, 0, 2] },
                sectionTitle: { fontSize: 12, bold: true },
                thWhite: { bold: true, fontSize: 9, color: '#fff' },
                td: { fontSize: 9 },
                tdFirst: { fontSize: 9, bold: true },
                signatureCell: { color: '#fff', bold: true, fontSize: 10 },
                comment: { fontSize: 9, italics: true },
            },
            footer: (currentPage, pageCount) => ({
                columns: [
                    {
                        text: `Página ${currentPage} de ${pageCount}`,
                        alignment: 'left',
                        margin: [20, 5, 0, 0],
                        fontSize: 9,
                    },
                    {
                        text: now(),
                        alignment: 'right',
                        margin: [0, 5, 20, 0],
                        fontSize: 9,
                    },
                ],
            }),
        };

        const pdf = pdfMake.createPdf(docDefinition);
        if (abrir) {
            pdf.open();
            showSnack('Abriendo PDF de Anexo 2…', 'success');
        } else {
            pdf.download(
                `Matriz_Anexo_II_${entidad || 'Entidad'}_${periodo || ''}.pdf`,
            );
            showSnack('Descargando PDF de Anexo 2…', 'success');
        }
    };

    return (
        <>
            <Button
                variant="contained"
                color="info"
                startIcon={<PictureAsPdfIcon />}
                onClick={generarPDF}
            >
                Generar PDF
            </Button>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={handleSnackClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleSnackClose}
                    severity={snack.sev}
                    sx={{ width: '100%' }}
                    variant="filled"
                >
                    {snack.msg}
                </Alert>
            </Snackbar>
        </>
    );
}
