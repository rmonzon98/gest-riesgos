/**
 * @fileoverview
 * Controles de importación y exportación a Excel para las matrices del Anexo 2.
 *
 * @module Riesgos/Anexo 2/Anexo2ExcelIO.jsx
 * @version 1.1
 * @author Equipo de Desarrollo
 */

import { useRef, useState } from 'react';
import {
    Button, Backdrop, CircularProgress, Stack, Typography,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import GridOnRounded from '@mui/icons-material/GridOnRounded';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import { readWorkbookFromArrayBuffer, worksheetToAoA } from 'utils/excelPreview';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Utils
const norm = (s) => (s === null || s === undefined) ? '' : String(s).trim();
const eq = (a, b) => norm(a) === norm(b);
const toSiNo = (v) => {
    const s = norm(v).toLowerCase();
    if (s === 'si' || s === 'sí' || s === 's' || s === 'yes' || s === 'y') return 'Sí';
    if (s === 'no' || s === 'n') return 'No';
    return '';
};
const isNo = (v) => norm(v).toLowerCase() === 'no';
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Helpers específicos de matrices/tablas
const getTitulo = (m) => norm(m?.titulo ?? m?.TITULO ?? '');

const buildSheetName = (m, num) => {
    const base = `tabla ${num}`;
    const titulo = getTitulo(m);
    if (!titulo) return base;

    // Excel no permite: : \ / ? * [ ]
    const cleaned = titulo.replace(/[:\\\/\?\*\[\]]/g, ' ');
    const maxLen = 31;
    const separator = ' - ';
    const remaining = maxLen - (base.length + separator.length);

    if (remaining <= 0) {
        return base;
    }

    let shortTitle = cleaned;
    if (shortTitle.length > remaining) {
        shortTitle = shortTitle.slice(0, remaining);
    }

    return `${base}${separator}${shortTitle}`.trim();
};

/**
 * IO Excel para Anexo 2
 * - Hoja 1: Instrucciones + índice
 * - Hoja por cada tabla "tabla N - título"
 * - Solo se editan las 2 últimas columnas: Aplica (Sí/No) y Comentario
 * - Si Aplica = "Sí", Comentario es obligatorio (validación)
 * - Import valida headers/etiquetas y copia solo las 2 últimas columnas
 * - TODAS las celdas se muestran con wrapText (múltiples líneas)
 */
export default function Anexo2ExcelIO({
    matrices,
    setMatrices,
    periodo,
    setActive,
    setAlerta,
    disabled = false,
    size = 'medium',
    variant = 'outlined',
    loadingUI = 'dialog'
}) {
    const fileInputRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [busyText, setBusyText] = useState('');

    const getNum = (m, idx) => {
        const n = m?.matriz ?? m?.MATRIZ;
        return Number.isFinite(+n) && +n > 0 ? +n : (idx + 1);
    };

    const headersOf = (m) => (m?.columnas?.headers) || (m?.COLUMNAS?.HEADERS) || [];
    const filasOf = (m) => (m?.filas ?? m?.FILAS) || [];

    const buildAoAFromMatrix = (m) => {
        const hs = headersOf(m);
        const rows = filasOf(m);
        const aoa = [];
        if (hs.length) aoa.push(hs);
        rows.forEach((fila) => {
            const arr = Array.isArray(fila) ? fila : [];
            const padded = arr.length < hs.length ? [...arr, ...Array(hs.length - arr.length).fill('')] : arr.slice(0, hs.length);
            aoa.push(padded.map(v => (v === null || v === undefined) ? '' : v));
        });
        return aoa;
    };

    const handleExport = async () => {
        if (!periodo || !Array.isArray(matrices) || matrices.length === 0) return;

        try {
            setBusy(true);
            setBusyText('Preparando…');
            await nextFrame(); await sleep(20);
            setBusyText('Generando Excel…');

            const wb = new ExcelJS.Workbook();

            // ========== Hoja de Instrucciones ==========
            const wsI = wb.addWorksheet('Instrucciones', { properties: { tabColor: { argb: 'FF4F81BD' } } });
            wsI.getCell('A1').value = 'Instrucciones para el llenado del Excel (Anexo 2)';
            wsI.getCell('A1').font = { bold: true, size: 14 };
            wsI.getCell('A1').alignment = { vertical: 'top' };
            wsI.addRow([]);
            wsI.addRow(['- No crear columnas nuevas ni filas adicionales.']);
            wsI.addRow(['- No modificar los encabezados (fila 1) ni las etiquetas de fila (columna 1).']);
            wsI.addRow(['- Solo debe ingresar información en las dos últimas columnas: "Aplica (Sí/No)" y "Comentario".']);
            wsI.addRow(['- Si "Aplica" = "Sí", el "Comentario" es obligatorio.']);
            wsI.addRow(['- Use solamente "Sí" o "No" en la columna "Aplica".']);
            wsI.addRow([]);
            wsI.addRow(['Contenido de este archivo:']).font = { bold: true };

            // Nuevo índice con TÍTULO
            wsI.addRow(['Tabla', 'Título', '# Filas', '# Columnas', 'Editar solo']).font = { bold: true };
            matrices.forEach((m, idx) => {
                const hs = headersOf(m);
                const rs = filasOf(m);
                const titulo = getTitulo(m) || '(Sin título)';
                wsI.addRow([
                    `tabla ${getNum(m, idx)}`,
                    titulo,
                    rs.length,
                    hs.length,
                    'Aplica y Comentario'
                ]);
            });

            wsI.columns.forEach((col, i) => {
                col.width = [18, 60, 12, 12, 24][i] ?? 18;
            });
            wsI.eachRow(r => r.eachCell(c => {
                c.alignment = { wrapText: true, vertical: 'top' };
            }));
            await wsI.protect('riesgos123', { selectLockedCells: true, selectUnlockedCells: true });

            // ========== Hojas por TABLA ==========
            for (let idx = 0; idx < matrices.length; idx++) {
                const m = matrices[idx];
                const hs = headersOf(m);
                const rs = filasOf(m);
                const len = hs.length;
                const idxAplica = Math.max(0, len - 2);
                const idxComentario = Math.max(0, len - 1);

                const numTabla = getNum(m, idx);
                const sheetName = buildSheetName(m, numTabla);

                const ws = wb.addWorksheet(sheetName, {
                    properties: { tabColor: { argb: 'FF00AA00' } }
                });

                // Datos
                const aoa = buildAoAFromMatrix(m);
                ws.addRows(aoa);

                // Wrap text en todas las celdas
                const totalRows = aoa.length;
                const totalCols = hs.length;
                for (let r = 1; r <= totalRows; r++) {
                    const row = ws.getRow(r);
                    for (let c = 1; c <= totalCols; c++) {
                        const cell = row.getCell(c);
                        cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: 'top' };
                    }
                    row.commit?.();
                }

                for (let c = 1; c <= len; c++) {
                    ws.getColumn(c).width = c === 1 ? 45 : (c === idxComentario + 1 ? 42 : 24);
                }

                if (aoa.length) {
                    const headerRow = ws.getRow(1);
                    headerRow.font = { bold: true };
                    headerRow.commit?.();
                }

                ws.eachRow((row) => {
                    row.eachCell((cell) => { cell.protection = { locked: true }; });
                });

                // Desbloquear solo "Aplica" y "Comentario" (últimas 2 columnas, r>1) + validaciones
                for (let r = 2; r <= (rs.length + 1); r++) {
                    // "Aplica"
                    const cA = ws.getCell(r, idxAplica + 1);
                    cA.protection = { locked: false };
                    cA.alignment = { ...(cA.alignment || {}), vertical: 'top', wrapText: true };
                    ws.dataValidations.add(cA.address, {
                        type: 'list',
                        allowBlank: false,
                        formulae: ['"Sí,No"'],
                        showErrorMessage: true,
                        errorStyle: 'stop',
                        error: 'Debe elegir "Sí" o "No".'
                    });

                    const cC = ws.getCell(r, idxComentario + 1);
                    cC.protection = { locked: false };
                    cC.alignment = { ...(cC.alignment || {}), vertical: 'top', wrapText: true };
                    // Si Aplica = "Sí" => comentario obligatorio (validación custom)
                    ws.dataValidations.add(cC.address, {
                        type: 'custom',
                        allowBlank: true,
                        formulae: ['OR(INDIRECT(ADDRESS(ROW(),COLUMN()-1))="No",LEN(TRIM(INDIRECT(ADDRESS(ROW(),COLUMN()))))>0)'],
                        showErrorMessage: true,
                        errorStyle: 'stop',
                        error: 'Si "Aplica" es "Sí", el comentario es obligatorio.'
                    });
                }

                await ws.protect('riesgos123', { selectLockedCells: true, selectUnlockedCells: true });
            }

            setBusyText('Empaquetando archivo…');
            const buf = await wb.xlsx.writeBuffer();
            saveAs(
                new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                `Anexo2_${periodo}.xlsx`
            );
        } catch (e) {
            console.error(e);
            setAlerta?.('No se pudo generar el Excel.');
        } finally {
            setBusy(false); setBusyText('');
        }
    };

    const findIndexBySheetName = (sheetName, mats) => {
        // Acepta "tabla N", "tabla N - título", o "matriz N" (compatibilidad)
        const m = sheetName.match(/^(tabla|matriz)\s+(\d+)/i);
        if (m) {
            const n = parseInt(m[2], 10);
            if (!Number.isNaN(n) && n > 0) {
                const byProp = mats.findIndex(mm => +((mm?.matriz ?? mm?.MATRIZ) || -1) === n);
                return byProp >= 0 ? byProp : (n - 1 < mats.length ? n - 1 : -1);
            }
        }
        return -1;
    };

    const overlaySheetIntoMatrixStrict = (ws, m) => {
        const aoa = worksheetToAoA(ws);
        const issues = [];
        let changed = false;

        if (!aoa || aoa.length === 0) {
            issues.push('Hoja vacía.');
            return { changed, issues };
        }

        const sysHeaders = headersOf(m);
        const sysRows = filasOf(m);
        const len = sysHeaders.length;
        const a = Math.max(0, len - 2);
        const c = Math.max(0, len - 1);

        const xlHeaders = aoa[0] || [];
        const xlDataRows = aoa.slice(1);
        if (len !== xlHeaders.length) issues.push(`# columnas no coincide (sistema=${len}, excel=${xlHeaders.length}).`);

        const badHeaderIdx = [];
        for (let i = 0; i < Math.min(len, xlHeaders.length); i++) {
            if (!eq(sysHeaders[i], xlHeaders[i])) badHeaderIdx.push(i + 1);
        }
        if (badHeaderIdx.length) issues.push(`Encabezados distintos en columnas: ${badHeaderIdx.join(', ')}.`);

        if (sysRows.length !== xlDataRows.length) {
            issues.push(`# filas no coincide (sistema=${sysRows.length}, excel=${xlDataRows.length}).`);
        }

        const badRowIdx = [];
        for (let r = 0; r < Math.min(sysRows.length, xlDataRows.length); r++) {
            const sysLabel = Array.isArray(sysRows[r]) ? sysRows[r][0] : '';
            const xlLabel = xlDataRows[r]?.[0];
            if (!eq(sysLabel, xlLabel)) badRowIdx.push(r + 1);
        }
        if (badRowIdx.length) issues.push(`Etiquetas de fila (col 1) no coinciden en filas: ${badRowIdx.join(', ')}.`);

        if (issues.length) return { changed, issues };

        const target = sysRows.map((row) => {
            const arr = Array.isArray(row) ? [...row] : [];
            while (arr.length < len) arr.push(null);
            return arr;
        });

        for (let r = 0; r < sysRows.length; r++) {
            const xlRow = xlDataRows[r] || [];
            const vA = toSiNo(xlRow[a]);
            const vC = (xlRow[c] === undefined ? '' : xlRow[c]);

            if (!vA) {
                issues.push(`Fila ${r + 2}: "Aplica" vacío o inválido (use "Sí" o "No").`);
                continue;
            }
            if (!isNo(vA) && norm(vC) === '') {
                issues.push(`Fila ${r + 2}: "Comentario" es obligatorio porque "Aplica" = "Sí".`);
            }

            if (target[r][a] !== vA) { target[r][a] = vA; changed = true; }
            if (target[r][c] !== vC) { target[r][c] = vC; changed = true; }
        }

        if (m.filas) m.filas = target; else m.FILAS = target;
        return { changed, issues };
    };

    const handleImport = async (file) => {
        try {
            setBusy(true);
            setBusyText('Cargando Excel…');
            await nextFrame(); await sleep(20);

            const buf = await file.arrayBuffer();
            const wb = await readWorkbookFromArrayBuffer(buf);
            const sheetNames = wb.worksheets.map((ws) => ws.name);
            if (sheetNames.length === 0) { setAlerta?.('El archivo no contiene hojas.'); return; }

            const base = typeof structuredClone === 'function'
                ? structuredClone(matrices)
                : JSON.parse(JSON.stringify(matrices));

            const changedIdxs = [];
            const allIssues = [];

            sheetNames.forEach((sn, i) => {
                if (sn === 'Instrucciones') return;
                const ws = wb.getWorksheet(sn);
                if (!ws) return;

                const idx = findIndexBySheetName(sn, base);
                if (idx >= 0 && idx < base.length) {
                    const { changed, issues } = overlaySheetIntoMatrixStrict(ws, base[idx]);
                    if (issues.length) allIssues.push(`Hoja "${sn}": ${issues.join(' ')}`);
                    if (changed) changedIdxs.push(idx);
                } else {
                    allIssues.push(`Hoja "${sn}": nombre no coincide con ninguna tabla (debe iniciar con "tabla N").`);
                }

                if (i % 6 === 0) { requestAnimationFrame(() => { }); }
            });

            if (changedIdxs.length > 0) {
                setMatrices?.(base);
                setActive?.(changedIdxs[0]);
            }

            if (allIssues.length && changedIdxs.length) {
                setAlerta?.(`Se aplicaron cambios, pero con advertencias:\n- ${allIssues.join('\n- ')}`);
            } else if (allIssues.length && !changedIdxs.length) {
                setAlerta?.(`No se aplicaron cambios debido a inconsistencias:\n- ${allIssues.join('\n- ')}`);
            } else {
                setAlerta?.('Archivo Excel cargado y datos aplicados.');
            }
        } catch (e) {
            console.error('Error leyendo Excel', e);
            setAlerta?.('No fue posible leer el Excel. Verifique el formato.');
        } finally {
            setBusy(false); setBusyText('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const LoaderBackdrop = (
        <Backdrop
            open={busy}
            sx={{ zIndex: (t) => t.zIndex.modal + 1, color: '#fff', flexDirection: 'column' }}
        >
            <CircularProgress color="inherit" />
            {busyText && <Typography sx={{ mt: 2 }}>{busyText}</Typography>}
        </Backdrop>
    );

    const LoaderDialog = (
        <Dialog open={busy} fullWidth maxWidth="xs" disableEscapeKeyDown onClose={() => { }} PaperProps={{ sx: { p: 2 } }}>
            <DialogTitle sx={{ pb: 0 }}>Procesando…</DialogTitle>
            <DialogContent sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 2 }}>
                <CircularProgress />
                <Typography>{busyText || 'Trabajando…'}</Typography>
            </DialogContent>
            <DialogActions>
                <Typography variant="caption" sx={{ opacity: 0.7, pr: 1 }}>
                    Por favor, no cierres esta ventana.
                </Typography>
            </DialogActions>
        </Dialog>
    );

    return (
        <>
            <Stack direction="row" spacing={1} alignItems="center">
                <Button
                    variant={variant}
                    color="success"
                    startIcon={<GridOnRounded />}
                    onClick={handleExport}
                    disabled={disabled || !periodo || !matrices?.length || busy}
                    size={size}
                >
                    Excel para carga de datos
                </Button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (f) handleImport(f);
                    }}
                />
                <Button
                    variant={variant}
                    color="primary"
                    startIcon={<UploadFileRounded />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || !periodo || !matrices?.length || busy}
                    size={size}
                >
                    Cargar Excel
                </Button>
            </Stack>

            {loadingUI === 'dialog' ? LoaderDialog : LoaderBackdrop}
        </>
    );
}
