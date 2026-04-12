/**
 * @fileoverview
 * Controles de importación y exportación a Excel para las matrices del Anexo 1.
 *
 * @module Riesgos/Anexo 1/Anexo1ExcelIO.jsx
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
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Anexo1ExcelIO
 * Componente principal del módulo.
 *
 * - Orquesta su estado interno y renderiza la UI del flujo correspondiente.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function Anexo1ExcelIO({
    matrices,
    setMatrices,
    periodo,
    setActive,
    setAlerta,
    disabled = false,
    size = 'medium',
    variant = 'outlined',
    loadingUI = 'backdrop'
}) {
    const fileInputRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [busyText, setBusyText] = useState('');

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const nextFrame = () =>
        new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const norm = (s) => (s === null || s === undefined) ? '' : String(s).trim();
    const eq = (a, b) => norm(a) === norm(b);

    const getNumMatriz = (m, idx) => {
        const n = m?.matriz ?? m?.MATRIZ;
        const num = Number.isFinite(+n) && +n > 0 ? +n : (idx + 1);
        return num;
    };

    const getTituloMatriz = (m) => {
        return norm(m?.titulo ?? m?.TITULO ?? '');
    };

    /**
     * Construye el nombre de la hoja en Excel:
     * - Siempre empieza con "matriz N"
     * - Si hay título, lo agrega: "matriz N - Título..."
     * - Respeta el límite de 31 caracteres y limpia caracteres inválidos
     */
    const buildSheetName = (m, num) => {
        const base = `matriz ${num}`;
        const titulo = getTituloMatriz(m);
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

    const buildAoAFromMatrix = (m) => {
        const headersM = (m?.columnas?.headers) || (m?.COLUMNAS?.HEADERS) || [];
        const filasM = (m?.filas ?? m?.FILAS) || [];
        const len = headersM.length;
        const aoa = [];
        if (len > 0) aoa.push(headersM);
        filasM.forEach((fila) => {
            const arr = Array.isArray(fila) ? fila : [];
            const padded = arr.length < len ? [...arr, ...Array(len - arr.length).fill('')] : arr.slice(0, len);
            aoa.push(padded.map(v => (v === null || v === undefined) ? '' : v));
        });
        return aoa;
    };

    /**
     * Genera un archivo Excel a partir de las matrices cargadas.
     *
     * Crea una hoja por matriz y aplica encabezados, estilos y protecciones.
     */
    const handleExportExcel = async () => {
        if (!periodo || !Array.isArray(matrices) || matrices.length === 0) return;
        console.log(matrices)
        try {
            setBusy(true);
            setBusyText('Preparando…');
            await nextFrame();
            await sleep(30);
            setBusyText('Generando Excel…');

            const wb = new ExcelJS.Workbook();

            // ========== Hoja de INSTRUCCIONES ==========
            const wsInstr = wb.addWorksheet('Instrucciones', { properties: { tabColor: { argb: 'FF4F81BD' } } });
            wsInstr.getCell('A1').value = 'Instrucciones para el llenado del Excel';
            wsInstr.getCell('A1').font = { bold: true, size: 14 };
            wsInstr.getCell('A1').alignment = { vertical: 'top' };

            wsInstr.addRow([]);
            wsInstr.addRow(['- No crear columnas nuevas ni filas adicionales.']);
            wsInstr.addRow(['- No modificar los encabezados (fila 1) ni las etiquetas de fila (columna 1).']);
            wsInstr.addRow(['- Solo debe ingresar información en las celdas habilitadas (en blanco).']);
            wsInstr.addRow(['- Cada hoja corresponde a una matriz; respete su estructura.']);
            wsInstr.addRow([]);

            wsInstr.addRow(['Contenido de este archivo:']).font = { bold: true };

            // Ahora incluimos el NOMBRE (título) de cada matriz
            const tocHeader = ['Matriz', 'Título', 'Obligatoriedad', '# Filas', '# Columnas'];
            wsInstr.addRow(tocHeader);
            const tocHeaderRow = wsInstr.lastRow;
            tocHeaderRow.font = { bold: true };
            tocHeaderRow.alignment = { wrapText: true, vertical: 'top' };

            matrices.forEach((m, idx) => {
                const num = getNumMatriz(m, idx);
                const obligatorio = Number(m?.obligatorio ?? m?.OBLIGATORIO ?? 0) === 1;
                const headersM = (m?.columnas?.headers) || (m?.COLUMNAS?.HEADERS) || [];
                const filasM = (m?.filas ?? m?.FILAS) || [];
                const titulo = getTituloMatriz(m) || '(Sin título)';

                wsInstr.addRow([
                    `matriz ${num}`,
                    titulo,
                    obligatorio ? 'Obligatoria' : 'Opcional',
                    filasM.length,
                    headersM.length
                ]);
            });

            wsInstr.columns.forEach((col, i) => {
                // Ajustamos anchos considerando la nueva columna de título
                col.width = [18, 60, 20, 12, 14][i] ?? 20;
            });
            wsInstr.eachRow(r => r.eachCell(c => {
                c.alignment = { wrapText: true, vertical: 'top' };
            }));
            await wsInstr.protect('riesgos123', { selectLockedCells: true, selectUnlockedCells: true });

            // ========== Hojas por MATRIZ ==========
            for (let idx = 0; idx < matrices.length; idx++) {
                const m = matrices[idx];
                const num = getNumMatriz(m, idx);
                const sheetName = buildSheetName(m, num);
                setBusyText(`Generando hoja "${sheetName}"…`);
                if (idx % 5 === 0) { await nextFrame(); }

                const obligatorio = Number(m?.obligatorio ?? m?.OBLIGATORIO ?? 0) === 1;
                const tabColor = obligatorio ? 'FFFF0000' : 'FF00AA00';

                const ws = wb.addWorksheet(sheetName, {
                    properties: { tabColor: { argb: tabColor } }
                });

                const aoa = buildAoAFromMatrix(m);
                ws.addRows(aoa);

                const maxCols = aoa[0]?.length || 0;
                for (let c = 1; c <= maxCols; c++) {
                    ws.getColumn(c).width = c === 1 ? 45 : 24;
                }

                if (aoa.length) {
                    const headerRow = ws.getRow(1);
                    headerRow.font = { bold: true };
                    headerRow.eachCell(cell => {
                        cell.alignment = { wrapText: true, vertical: 'top' };
                    });
                    headerRow.commit?.();
                }

                ws.eachRow((row, rIdx) => {
                    row.eachCell((cell, cIdx) => {
                        if (cIdx === 1 || rIdx === 1) {
                            cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: 'top' };
                        }
                        cell.protection = { locked: true };
                        if (rIdx > 1 && cIdx > 1) {
                            cell.protection = { locked: false };
                            cell.alignment = { ...(cell.alignment || {}), vertical: 'top', wrapText: true };
                        }
                    });
                });

                await ws.protect('riesgos123', {
                    selectLockedCells: true,
                    selectUnlockedCells: true
                });
            }

            setBusyText('Empaquetando archivo…');
            const buf = await wb.xlsx.writeBuffer();

            saveAs(
                new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                `Matrices_Anexo1_${periodo}.xlsx`
            );
        } catch (e) {
            console.error(e);
            setAlerta?.('No se pudo generar el Excel.');
        } finally {
            setBusy(false);
            setBusyText('');
        }
    };

    // ========= IMPORTAR con XLSX (valida estructura, copia solo datos) =========

    /**
     * Busca la matriz a partir del nombre de la hoja.
     * Ahora la hoja puede llamarse:
     *   - "matriz 1"
     *   - "matriz 1 - Normas ..."
     * por lo que el regex solo exige que empiece con "matriz N".
     */
    const findMatrixIndexBySheetName = (sheetName, mats) => {
        const m = sheetName.match(/^matriz\s+(\d+)/i);
        if (m) {
            const n = parseInt(m[1], 10);
            if (!Number.isNaN(n) && n > 0) {
                const byProp = mats.findIndex(mm => +((mm?.matriz ?? mm?.MATRIZ) || -1) === n);
                return byProp >= 0 ? byProp : (n - 1 < mats.length ? n - 1 : -1);
            }
        }
        return -1;
    };

    /**
     * Copia los datos de una hoja Excel hacia la matriz correspondiente,
     * validando estructura (encabezados y etiquetas de fila).
     */
    const overlaySheetIntoMatrixStrict = (ws, m) => {
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
        const issues = [];
        let changed = false;

        if (!aoa || aoa.length === 0) {
            issues.push('Hoja vacía.');
            return { changed, issues };
        }

        const sysHeaders = (m?.columnas?.headers) || (m?.COLUMNAS?.HEADERS) || [];
        const sysRows = (m?.filas ?? m?.FILAS) || [];
        const sysColsCount = sysHeaders.length;
        const sysRowsCount = sysRows.length;

        const xlHeaders = aoa[0] || [];
        const xlDataRows = aoa.slice(1);
        const xlColsCount = xlHeaders.length;
        const xlRowsCount = xlDataRows.length;

        if (sysColsCount !== xlColsCount) issues.push(`# columnas no coincide (sistema=${sysColsCount}, excel=${xlColsCount}).`);
        if (sysRowsCount !== xlRowsCount) issues.push(`# filas no coincide (sistema=${sysRowsCount}, excel=${xlRowsCount}).`);

        const badHeaderIdx = [];
        const maxCols = Math.min(sysColsCount, xlColsCount);
        for (let c = 0; c < maxCols; c++) {
            if (!eq(sysHeaders[c], xlHeaders[c])) badHeaderIdx.push(c);
        }
        if (badHeaderIdx.length) issues.push(`Encabezados distintos en columnas: ${badHeaderIdx.map(i => i + 1).join(', ')}.`);

        const badRowIdx = [];
        const maxRows = Math.min(sysRowsCount, xlRowsCount);
        for (let r = 0; r < maxRows; r++) {
            const sysLabel = Array.isArray(sysRows[r]) ? sysRows[r][0] : '';
            const xlLabel = xlDataRows[r]?.[0];
            if (!eq(sysLabel, xlLabel)) badRowIdx.push(r + 1);
        }
        if (badRowIdx.length) issues.push(`Etiquetas de fila (col 0) no coinciden en filas: ${badRowIdx.join(', ')}.`);

        if (issues.length) return { changed, issues };

        const targetRows = sysRows.map(row => {
            const arr = Array.isArray(row) ? [...row] : [];
            while (arr.length < sysColsCount) arr.push(null);
            return arr;
        });

        for (let r = 0; r < sysRowsCount; r++) {
            const xlRow = xlDataRows[r] || [];
            for (let c = 1; c < sysColsCount; c++) {
                const val = xlRow[c] === undefined ? '' : xlRow[c];
                if (targetRows[r][c] !== val) {
                    targetRows[r][c] = val;
                    changed = true;
                }
            }
        }

        if (m.filas) m.filas = targetRows; else m.FILAS = targetRows;
        return { changed, issues };
    };

    const handleImportExcel = async (file) => {
        try {
            setBusy(true);
            setBusyText('Cargando Excel…');
            await nextFrame();
            await sleep(30);

            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const sheetNames = wb.SheetNames || [];
            if (sheetNames.length === 0) { setAlerta?.('El archivo no contiene hojas.'); return; }

            const base = typeof structuredClone === 'function'
                ? structuredClone(matrices)
                : JSON.parse(JSON.stringify(matrices));

            const changedIdxs = [];
            const allIssues = [];

            sheetNames.forEach((sn, i) => {
                if (sn === 'Instrucciones') return;
                const ws = wb.Sheets[sn];
                if (!ws) return;

                const idx = findMatrixIndexBySheetName(sn, base);
                if (idx >= 0 && idx < base.length) {
                    const { changed, issues } = overlaySheetIntoMatrixStrict(ws, base[idx]);
                    if (issues.length) allIssues.push(`Hoja "${sn}": ${issues.join(' ')}`);
                    if (changed) changedIdxs.push(idx);
                } else {
                    allIssues.push(`Hoja "${sn}": no se encontró una matriz correspondiente (use nombres que comiencen con "matriz #").`);
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
            setBusy(false);
            setBusyText('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    /**
     * Indicador de carga a pantalla completa (backdrop) para operaciones con Excel.
     */
    const LoaderBackdrop = (
        <Backdrop
            open={busy}
            sx={{
                zIndex: (theme) => theme.zIndex.modal + 1,
                color: '#fff',
                flexDirection: 'column'
            }}
        >
            <CircularProgress color="inherit" />
            {busyText && <Typography sx={{ mt: 2 }}>{busyText}</Typography>}
        </Backdrop>
    );

    /**
     * Diálogo modal de progreso para procesos largos de importación/exportación.
     */
    const LoaderDialog = (
        <Dialog
            open={busy}
            fullWidth
            maxWidth="xs"
            disableEscapeKeyDown
            onClose={() => { }}
            PaperProps={{ sx: { p: 2 } }}
        >
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
                    onClick={handleExportExcel}
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
                        if (f) handleImportExcel(f);
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
