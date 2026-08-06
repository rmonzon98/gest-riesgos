/**
 * @fileoverview
 * Vista institucional de consulta y mantenimiento del Anexo 1 completo.
 *
 * @module Riesgos/Anexo 1/Anexo1Institucional.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useMemo, useState } from 'react';
import apiClient from 'api/apiClient';
import {
    Box, Card, CardHeader, CardContent, Typography, Button, FormControl, Select, MenuItem, InputLabel,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Stack, Alert,
    useMediaQuery, TextField, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, Tooltip, Divider, CircularProgress, Snackbar
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PreviewIcon from '@mui/icons-material/Preview';
import TableChartIcon from '@mui/icons-material/TableChart';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import DescriptionRounded from '@mui/icons-material/DescriptionRounded';
import GridOnRounded from '@mui/icons-material/GridOnRounded';
import { fmt } from 'funciones/Fechas';
import { ReportePrimeraMatrizInst } from '../Reportes F/Institucionales/ReportePrimeraMatrizInst';
import htmlDocx from 'html-docx-js/dist/html-docx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const escapeHtmlWithBreaks = (value) => {
    const str = String(value ?? '');
    const escaped = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    return escaped.replace(/\n/g, '<br>');
};

function Anexo1Institucional() {
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState('');
    const [cargando, setCargando] = useState(false);
    const [cargandoDefecto, setCargandoDefecto] = useState(false);
    const [alerta, setAlerta] = useState(null);

    const [matrices, setMatrices] = useState([]);
    const [active, setActive] = useState(0);
    const [origen, setOrigen] = useState(null);
    const [logo, setLogo] = useState('');
    const [institucion, setInstitucion] = useState('');

    const [direcciones, setDirecciones] = useState([]);

    const [filtro, setFiltro] = useState('all');
    const [indicesTexto, setIndicesTexto] = useState('');

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewTarget, setPreviewTarget] = useState(null);
    const [previewSelectedEntidad, setPreviewSelectedEntidad] = useState('');

    const [supNombre, setSupNombre] = useState('');
    const [supPuesto, setSupPuesto] = useState('');
    const [openSup, setOpenSup] = useState(false);
    const [loadingSup, setLoadingSup] = useState(false);
    const [confirmingSup, setConfirmingSup] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });
    const handleCloseSnack = (_e, reason) => {
        if (reason === 'clickaway') return;
        setSnack(prev => ({ ...prev, open: false }));
    };

    const theme = useTheme();
    const isMobile = useMediaQuery(`(max-width:${theme.breakpoints.values.md}px)`);

    const TIPO_MATRIZ = 1;
    const getMatProp = (m, key) => m?.[key] ?? m?.[key?.toUpperCase?.()];

    const isMatrixComplete = (m) => {
        if (!m) return false;
        const headers = (m?.columnas?.headers) || (m?.COLUMNAS?.HEADERS) || [];
        const filas = (m?.filas ?? m?.FILAS) || [];
        const headersLen = headers.length;
        if (headersLen <= 1) return false;
        for (let r = 0; r < filas.length; r++) {
            const fila = Array.isArray(filas[r]) ? filas[r] : [];
            const padded = fila.length < headersLen ? [...fila, ...Array(headersLen - fila.length).fill(null)] : fila.slice(0, headersLen);
            for (let c = 1; c < headersLen; c++) {
                const celda = padded[c];
                if (celda === null || celda === undefined || String(celda).trim() === '') return false;
            }
        }
        return true;
    };
    const getMatrixStatus = (m) => {
        const obligatorio = Number(m?.obligatorio ?? m?.OBLIGATORIO ?? 0) === 1;
        const complete = isMatrixComplete(m);
        if (complete) return { color: 'success.main', obligatorio, complete };
        if (obligatorio) return { color: 'error.main', obligatorio, complete };
        return { color: 'warning.main', obligatorio, complete };
    };
    const ColorDot = ({ color }) => (
        <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, display: 'inline-block', mr: 1 }} />
    );

    const obtenerPeriodos = async () => {
        try {
            const { data } = await apiClient.get('/api/periodos-actualizados');
            setPeriodos(data.result ?? data ?? []);
        } catch {
            setPeriodos([]);
        }
    };

    const obtenerLogo = async () => {
        try {
            const { data } = await apiClient.get('/api/reportes-actualizados/obtener-logo');
            setLogo('data:image/png;base64,' + (data.logo ?? ''));
            setInstitucion(data.nombre ?? '');
        } catch {
            setLogo(''); setInstitucion('');
        }
    };

    const obtenerSuperior = async () => {
        try {
            setLoadingSup(true);
            const { data } = await apiClient.get('/api/reportes-actualizados/obtener-superior');
            if (data?.nombre) setSupNombre(String(data.nombre));
            if (data?.puesto) setSupPuesto(String(data.puesto));
        } catch (e) {
            console.warn('[Anexo1Institucional] No se pudo obtener el superior:', e?.message || e);
        } finally {
            setLoadingSup(false);
        }
    };

    useEffect(() => {
        obtenerPeriodos();
        obtenerLogo();
        obtenerSuperior();
    }, []);

    const cargarTodoPorPeriodo = async (p) => {
        if (!p) return;
        setCargando(true);
        setAlerta(null);
        try {
            const dirReq = apiClient.get('/api/institucion-actualizados/obtener-primer-matriz-direcciones', { params: { periodo: p } });
            const defReq = apiClient.get('/api/primera-matriz-actualizados/matriz-defecto', { params: { periodo: p, institucional: true } });
            const instReq = apiClient.get('/api/institucion-actualizados/primera-matriz', { params: { periodo: p, tipo: TIPO_MATRIZ } });

            const [dirRes, defRes, instRes] = await Promise.allSettled([dirReq, defReq, instReq]);

            let dirs = [];
            if (dirRes.status === 'fulfilled') {
                const raw = dirRes.value?.data;
                const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.historial) ? raw.historial : [];
                dirs = arr
                    .map(r => ({
                        CODIGO_ENTIDAD: r.CODIGO_ENTIDAD,
                        SIGLAS_ENTIDAD: r.SIGLAS_ENTIDAD || r.siglas_entidad || r.SIGLAS || r.siglas || '',
                        CODIGO_HISTORIAL: r.CODIGO_HISTORIAL,
                        matrices: (r.RESPUESTA?.matrices) || (r.RESPUESTA?.MATRICES) || []
                    }))
                    .filter(d => Array.isArray(d.matrices) && d.matrices.length > 0);
            }
            setDirecciones(dirs);

            let defMats = [];
            if (defRes.status === 'fulfilled') {
                const d = defRes.value?.data;
                defMats =
                    Array.isArray(d?.matrices) ? d.matrices
                        : Array.isArray(d?.MATRICES) ? d.MATRICES
                            : Array.isArray(d?.respuesta?.matrices) ? d.respuesta.matrices
                                : [];
            }

            let instMats = [];
            let instCellSelectionsArr = [];
            if (instRes.status === 'fulfilled') {
                const d = instRes.value?.data || {};
                const arr =
                    Array.isArray(d?.matrices) ? d.matrices
                        : Array.isArray(d?.MATRICES) ? d.MATRICES
                            : Array.isArray(d?.respuesta?.matrices) ? d.respuesta.matrices
                                : [];
                instMats = arr;

                const cs =
                    Array.isArray(d?.cellSelections) ? d.cellSelections
                        : Array.isArray(d?.CELLSELECTIONS) ? d.CELLSELECTIONS
                            : Array.isArray(d?.respuesta?.cellSelections) ? d.respuesta.cellSelections
                                : [];
                instCellSelectionsArr = Array.isArray(cs) ? cs : [];
            }

            let normalized = [];
            if (instMats.length > 0) {
                normalized = instMats.map(m => ({ ...m, provenance: m.provenance || {} }));
                if (instCellSelectionsArr.length > 0) {
                    const idxByMatNum = new Map();
                    normalized.forEach((m, i) => idxByMatNum.set(Number(getMatProp(m, 'matriz')), i));
                    instCellSelectionsArr.forEach(x => {
                        const matrizNum = Number(x.matriz ?? x.MATRIZ);
                        const i = idxByMatNum.get(matrizNum);
                        if (i == null) return;
                        const prov = normalized[i].provenance || {};
                        const r = Number(x.fila ?? x.FILA);
                        const c = Number(x.columna ?? x.COLUMNA);
                        if (!isNaN(r) && !isNaN(c)) {
                            prov[r] = prov[r] || {};
                            prov[r][c] = {
                                codigo_entidad: x.codigo_entidad ?? x.CODIGO_ENTIDAD ?? null,
                                siglas_entidad: x.siglas_entidad ?? x.SIGLAS_ENTIDAD ?? '',
                                codigo_historial: x.codigo_historial ?? x.CODIGO_HISTORIAL ?? null
                            };
                        }
                        normalized[i].provenance = prov;
                    });
                }
                setMatrices(normalized);
                setOrigen('version');
            } else {
                normalized = defMats.map(m => ({ ...m, provenance: {} }));
                setMatrices(normalized);
                setOrigen('defecto');
            }

            setActive(0);
        } catch (e) {
            console.error('[Anexo1Institucional] Error al cargar por periodo:', e);
            setAlerta('No fue posible cargar la información del período.');
            setMatrices([]); setDirecciones([]); setOrigen(null);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (!periodo) {
            setMatrices([]); setActive(0); setOrigen(null);
            setDirecciones([]);
            return;
        }
        cargarTodoPorPeriodo(periodo);
    }, [periodo]);

    const cargarMatrizDefecto = async () => {
        if (!periodo) return;
        try {
            setCargandoDefecto(true);
            setAlerta(null);
            const { data } = await apiClient.get('/api/primera-matriz-actualizados/matriz-defecto', {
                                params: { periodo, institucional: true }
            });
            const defMats =
                Array.isArray(data?.matrices) ? data.matrices
                    : Array.isArray(data?.MATRICES) ? data.MATRICES
                        : Array.isArray(data?.respuesta?.matrices) ? data.respuesta.matrices
                            : [];
            setMatrices(defMats.map(m => ({ ...m, provenance: {} })));
            setActive(0);
            setOrigen('defecto');
        } catch (e) {
            console.error('[Anexo1Institucional] Error cargarMatrizDefecto:', e);
            setAlerta('No fue posible cargar la matriz por defecto del período.');
        } finally {
            setCargandoDefecto(false);
        }
    };

    const getValorDesdeDireccion = (codigoEntidad, matrizNum, rowIdx, colIdx) => {
        const fuente = direcciones.find(d => d.CODIGO_ENTIDAD === Number(codigoEntidad));
        if (!fuente) return '';
        const mFuente = (fuente.matrices || []).find(mm => Number(getMatProp(mm, 'matriz')) === Number(matrizNum));
        if (!mFuente) return '';
        const filas = getMatProp(mFuente, 'filas') || [];
        const row = Array.isArray(filas[rowIdx]) ? filas[rowIdx] : [];
        return row[colIdx] ?? '';
    };

    const clearCellOrigin = (matrizIndex, rowIdx, colIdx) => {
        setMatrices(prev => {
            const copy = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
            const prov = copy[matrizIndex].provenance || {};
            if (prov?.[rowIdx]?.[colIdx]) {
                delete prov[rowIdx][colIdx];
                if (Object.keys(prov[rowIdx]).length === 0) delete prov[rowIdx];
            }
            copy[matrizIndex].provenance = prov;
            return copy;
        });
    };

    const handleCellChange = (matrizIndex, rowIdx, colIdx, value) => {
        const m = matrices[matrizIndex];
        if (!m || colIdx === 0) return;
        const headers = getMatProp(getMatProp(m, 'columnas'), 'headers') || [];
        const colCountLocal = headers.length;

        setMatrices(prev => {
            const copy = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
            const mm = copy[matrizIndex];
            const filas = getMatProp(mm, 'filas') || [];
            if (!Array.isArray(filas[rowIdx])) filas[rowIdx] = [];
            while (filas[rowIdx].length < colCountLocal) filas[rowIdx].push(null);
            filas[rowIdx][colIdx] = value;
            mm.filas = filas;
            return copy;
        });

        clearCellOrigin(matrizIndex, rowIdx, colIdx);
    };

    const abrirPreview = (target) => { setPreviewTarget(target); setPreviewSelectedEntidad(''); setPreviewOpen(true); };
    const cerrarPreview = () => { setPreviewOpen(false); setPreviewTarget(null); setPreviewSelectedEntidad(''); };

    const buildPreview = useMemo(() => {
        if (!previewOpen || !previewTarget) return null;
        const { type, matrizIndex, rowIdx, colIdx } = previewTarget;
        const cur = matrices[matrizIndex];
        if (!cur) return null;
        const matrizNum = Number(getMatProp(cur, 'matriz'));
        const headers = getMatProp(getMatProp(cur, 'columnas'), 'headers') || [];
        const filas = getMatProp(cur, 'filas') || [];
        const colLen = headers.length;

        const candidatos = direcciones.map(d => {
            let previewCells = [];
            if (type === 'cell') {
                const valor = getValorDesdeDireccion(d.CODIGO_ENTIDAD, matrizNum, rowIdx, colIdx);
                previewCells = [{ r: rowIdx, c: colIdx, valor }];
            } else if (type === 'row') {
                const r = rowIdx;
                for (let c = 1; c < colLen; c++) {
                    previewCells.push({ r, c, valor: getValorDesdeDireccion(d.CODIGO_ENTIDAD, matrizNum, r, c) });
                }
            } else if (type === 'col') {
                const c = colIdx;
                for (let r = 0; r < filas.length; r++) {
                    previewCells.push({ r, c, valor: getValorDesdeDireccion(d.CODIGO_ENTIDAD, matrizNum, r, c) });
                }
            } else if (type === 'matrix') {
                for (let r = 0; r < filas.length; r++) {
                    for (let c = 1; c < colLen; c++) {
                        previewCells.push({ r, c, valor: getValorDesdeDireccion(d.CODIGO_ENTIDAD, matrizNum, r, c) });
                    }
                }
            }
            const nonEmpty = previewCells.filter(x => (x.valor ?? '').toString().trim() !== '').length;
            return { CODIGO_ENTIDAD: d.CODIGO_ENTIDAD, SIGLAS_ENTIDAD: d.SIGLAS_ENTIDAD, CODIGO_HISTORIAL: d.CODIGO_HISTORIAL, cells: previewCells, nonEmpty };
        });

        return { type, matrizIndex, matrizNum, headers, filas, candidatos, colLen };
    }, [previewOpen, previewTarget, matrices, direcciones]);

    const aplicarPreview = () => {
        if (!buildPreview || !previewSelectedEntidad) return;
        const { matrizIndex, candidatos } = buildPreview;
        const d = candidatos.find(x => x.CODIGO_ENTIDAD === Number(previewSelectedEntidad));
        if (!d) return;

        setMatrices(prev => {
            const copy = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
            const mm = copy[matrizIndex];
            const headers = getMatProp(getMatProp(mm, 'columnas'), 'headers') || [];
            const colLen = headers.length;
            const filas = getMatProp(mm, 'filas') || [];

            d.cells.forEach(({ r, c, valor }) => {
                if (c === 0) return;
                if (!Array.isArray(filas[r])) filas[r] = [];
                while (filas[r].length < colLen) filas[r].push(null);
                filas[r][c] = valor ?? '';
            });

            const prov = mm.provenance || {};
            d.cells.forEach(({ r, c, valor }) => {
                if (c === 0) return;
                const hasContent = String(valor ?? '').trim() !== '';
                if (hasContent) {
                    prov[r] = prov[r] || {};
                    prov[r][c] = {
                        codigo_entidad: d.CODIGO_ENTIDAD,
                        siglas_entidad: d.SIGLAS_ENTIDAD,
                        codigo_historial: d.CODIGO_HISTORIAL
                    };
                } else if (prov?.[r]?.[c]) {
                    delete prov[r][c];
                    if (Object.keys(prov[r]).length === 0) delete prov[r];
                }
            });
            mm.provenance = prov;

            return copy;
        });

        cerrarPreview();
    };

    const handleGuardar = async () => {
        if (!periodo || matrices.length === 0) return;
        setAlerta(null);

        const payload = {
            periodo,
            tipo: TIPO_MATRIZ,
            matrices: matrices.map(m => ({
                matriz: getMatProp(m, 'matriz'),
                titulo: getMatProp(m, 'titulo') ?? null,
                columnas: getMatProp(m, 'columnas'),
                filas: getMatProp(m, 'filas'),
                obligatorio: Number(m?.obligatorio ?? m?.OBLIGATORIO ?? 0),
                provenance: m.provenance || {}
            }))
        };

        try {
            await apiClient.post('/api/institucion-actualizados/primera-matriz', payload);
            setSnack({ open: true, msg: 'Guardado exitoso', sev: 'success' });
            await cargarTodoPorPeriodo(periodo);
        } catch (e) {
            console.error('[Anexo1Institucional] Error al guardar:', e);
            setAlerta('Ocurrió un error al guardar. Intenta de nuevo.');
        }
    };

    const openSupFor = async (action) => {
        setPendingAction(action);
        await obtenerSuperior();
        setOpenSup(true);
    };
    const closeSup = () => {
        setOpenSup(false);
        setPendingAction(null);
    };

    const confirmarYImprimir = async () => {
        if (!(supNombre?.trim()) || !(supPuesto?.trim())) {
            setAlerta('Completa nombre y puesto del superior para continuar.');
            return;
        }
        setConfirmingSup(true);
        try {
            const responsable = { nombre: supNombre.trim(), puesto: supPuesto.trim() };

            if (pendingAction?.type === 'general') {
                const indices = indicesTexto
                    .split(',')
                    .map(t => parseInt(t.trim(), 10))
                    .filter(n => !isNaN(n) && n > 0);

                ReportePrimeraMatrizInst({
                    matrices,
                    periodoSeleccionado: periodo,
                    logoBase64: logo,
                    unidad: institucion,
                    filter: filtro,
                    indices,
                    includeEmpty: true,
                    responsable
                });
            } else if (pendingAction?.type === 'single') {
                const idx = typeof pendingAction.matrizIndex === 'number' ? pendingAction.matrizIndex : active;
                const cur = matrices[idx];
                if (cur) {
                    ReportePrimeraMatrizInst({
                        matrices: [cur],
                        periodoSeleccionado: periodo,
                        logoBase64: logo,
                        unidad: institucion,
                        responsable
                    });
                }
            }
            closeSup();
        } finally {
            setConfirmingSup(false);
        }
    };

    const getMatricesFiltradasGeneral = () => {
        if (!matrices || matrices.length === 0) return [];
        if (filtro !== 'indices') return matrices;
        const indices = indicesTexto
            .split(',')
            .map(t => parseInt(t.trim(), 10))
            .filter(n => !isNaN(n) && n > 0);
        if (indices.length === 0) return matrices;
        const set = new Set(indices);
        return matrices.filter(m => set.has(Number(getMatProp(m, 'matriz'))));
    };

    const buildHtmlForMatrices = (mats) => {
        if (!mats || mats.length === 0) return '';
        const periodoInfo = periodos.find(p => String(p.CODIGO_PERIODO) === String(periodo));
        let html = '<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Anexo 1 institucional</title></head><body>';
        html += '<h1>Consolidado de evaluación de la eficiencia del control interno y gobernanza</h1>';
        if (institucion) {
            html += `<p><strong>Institución:</strong> ${escapeHtmlWithBreaks(institucion)}</p>`;
        }
        if (periodoInfo) {
            html += `<p><strong>Período:</strong> ${escapeHtmlWithBreaks(fmt(periodoInfo.PERIODO_INICIAL))} - ${escapeHtmlWithBreaks(fmt(periodoInfo.PERIODO_FINAL))} del ${escapeHtmlWithBreaks(periodoInfo.CODIGO_PERIODO)}</p>`;
        } else if (periodo) {
            html += `<p><strong>Período:</strong> ${escapeHtmlWithBreaks(periodo)}</p>`;
        }
        mats.forEach((m, index) => {
            const num = getMatProp(m, 'matriz');
            const titulo = getMatProp(m, 'titulo') || `Tabla #${num || index + 1}`;
            const headers = getMatProp(getMatProp(m, 'columnas'), 'headers') || [];
            const filas = getMatProp(m, 'filas') || [];
            html += `<h2>${escapeHtmlWithBreaks(titulo)}</h2>`;
            if (headers.length === 0 && (!Array.isArray(filas) || filas.length === 0)) {
                html += '<p>No hay datos para esta tabla.</p>';
                return;
            }
            html += '<table border="1" style="border-collapse:collapse;width:100%;font-size:11pt;">';
            if (headers.length > 0) {
                html += '<thead><tr>';
                headers.forEach(h => {
                    html += `<th style="padding:4px;background-color:#f0f0f0;">${escapeHtmlWithBreaks(h)}</th>`;
                });
                html += '</tr></thead>';
            }
            html += '<tbody>';
            if (Array.isArray(filas) && filas.length > 0) {
                filas.forEach(fila => {
                    const arr = Array.isArray(fila) ? fila : [];
                    const padded = headers.length > 0
                        ? (arr.length < headers.length ? [...arr, ...Array(headers.length - arr.length).fill('')] : arr.slice(0, headers.length))
                        : arr;
                    html += '<tr>';
                    padded.forEach(celda => {
                        html += `<td style="padding:4px;vertical-align:top;">${escapeHtmlWithBreaks(celda ?? '')}</td>`;
                    });
                    html += '</tr>';
                });
            } else {
                html += `<tr><td colspan="${headers.length || 1}">No hay filas.</td></tr>`;
            }
            html += '</tbody></table>';
        });
        html += '</body></html>';
        return html;
    };

    const handleExportWordGeneral = () => {
        if (!periodo || matrices.length === 0) return;
        const mats = getMatricesFiltradasGeneral();
        if (!mats || mats.length === 0) return;
        const html = buildHtmlForMatrices(mats);
        if (!html) return;
        const fileSuffix = periodo ? `P${periodo}` : 'sin_periodo';
        const blob = htmlDocx.asBlob(html);
        saveAs(blob, `Anexo1Institucional_${fileSuffix}_general.docx`);
    };

    const handleExportWordSingle = () => {
        if (!periodo || matrices.length === 0) return;
        const cur = matrices[active];
        if (!cur) return;
        const html = buildHtmlForMatrices([cur]);
        if (!html) return;
        const num = getMatProp(cur, 'matriz') || active + 1;
        const fileSuffix = periodo ? `P${periodo}` : 'sin_periodo';
        const blob = htmlDocx.asBlob(html);
        saveAs(blob, `Anexo1Institucional_${fileSuffix}_tabla_${num}.docx`);
    };

    const exportExcelForMatrices = async (mats, filename) => {
        if (!mats || mats.length === 0) return;
        const workbook = new ExcelJS.Workbook();

        const resumenSheet = workbook.addWorksheet('Resumen');
        resumenSheet.addRow(['Matriz', 'Título']);

        mats.forEach((m, index) => {
            const num = Number(getMatProp(m, 'matriz')) || index + 1;
            const titulo = getMatProp(m, 'titulo') || `Tabla #${num}`;
            resumenSheet.addRow([num, titulo]);

            let sheetName = `Matriz ${num} - ${titulo}`;
            sheetName = String(sheetName).replace(/[:\\/?*\[\]]/g, ' ');
            if (sheetName.length > 31) {
                sheetName = sheetName.slice(0, 31);
            }

            const sheet = workbook.addWorksheet(sheetName);
            const headers = getMatProp(getMatProp(m, 'columnas'), 'headers') || [];
            const filas = getMatProp(m, 'filas') || [];
            if (headers.length > 0) {
                sheet.addRow(headers);
            }
            if (Array.isArray(filas) && filas.length > 0) {
                filas.forEach(fila => {
                    const arr = Array.isArray(fila) ? fila : [];
                    const padded = headers.length > 0
                        ? (arr.length < headers.length ? [...arr, ...Array(headers.length - arr.length).fill('')] : arr.slice(0, headers.length))
                        : arr;
                    sheet.addRow(padded);
                });
            }
            if (sheet.columns) {
                sheet.columns.forEach(column => {
                    if (column && (!column.width || column.width < 20)) {
                        column.width = 30;
                    }
                });
            }
        });

        if (resumenSheet.getColumn && resumenSheet.columns && resumenSheet.columns.length >= 2) {
            resumenSheet.getColumn(1).width = 10;
            resumenSheet.getColumn(2).width = 80;
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, filename);
    };

    const handleExportExcelGeneral = async () => {
        if (!periodo || matrices.length === 0) return;
        const mats = getMatricesFiltradasGeneral();
        if (!mats || mats.length === 0) return;
        const fileSuffix = periodo ? `P${periodo}` : 'sin_periodo';
        try {
            await exportExcelForMatrices(mats, `Anexo1Institucional_${fileSuffix}_general.xlsx`);
        } catch (e) {
            console.error('[Anexo1Institucional] Error al exportar Excel general:', e);
        }
    };

    const handleExportExcelSingle = async () => {
        if (!periodo || matrices.length === 0) return;
        const cur = matrices[active];
        if (!cur) return;
        const num = getMatProp(cur, 'matriz') || active + 1;
        const fileSuffix = periodo ? `P${periodo}` : 'sin_periodo';
        try {
            await exportExcelForMatrices([cur], `Anexo1Institucional_${fileSuffix}_tabla_${num}.xlsx`);
        } catch (e) {
            console.error('[Anexo1Institucional] Error al exportar Excel de tabla única:', e);
        }
    };

    const responsablePreview = (supNombre?.trim() || supPuesto?.trim())
        ? `${supNombre?.trim() || ''}${supNombre && supPuesto ? ' — ' : ''}${supPuesto?.trim() || ''}`
        : '';

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Consolidado de evaluación de la eficiencia del control interno y gobernanza
            </Typography>

            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader title="Matrices para institución" />
                <CardContent>
                    {periodos.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No hay elementos aún registrados.</Typography>
                    ) : (
                        <>
                            <FormControl fullWidth>
                                <InputLabel id="periodo-label">Seleccione un periodo</InputLabel>
                                <Select
                                    labelId="periodo-label"
                                    label="Seleccione un periodo"
                                    value={periodo}
                                    onChange={(e) => { setPeriodo(e.target.value); setMatrices([]); setActive(0); setAlerta(null); }}
                                >
                                    {periodos.map(p => (
                                        <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                                            {fmt(p.PERIODO_INICIAL)} - {fmt(p.PERIODO_FINAL)} del {p.CODIGO_PERIODO}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                                <FormControl sx={{ minWidth: 200 }}>
                                    <InputLabel id="filtro-label">Filtro de impresión</InputLabel>
                                    <Select
                                        labelId="filtro-label"
                                        label="Filtro de impresión"
                                        value={filtro}
                                        onChange={(e) => {
                                            setIndicesTexto("");
                                            setFiltro(e.target.value);
                                        }}
                                    >
                                        <MenuItem value="all">Todas las tablas</MenuItem>
                                        <MenuItem value="indices">Por índice...</MenuItem>
                                    </Select>
                                </FormControl>
                                {filtro === 'indices' && (
                                    <TextField
                                        label="Índices (ej: 1,3,5)"
                                        size="small"
                                        value={indicesTexto}
                                        onChange={(e) => setIndicesTexto(e.target.value)}
                                        sx={{ width: 200 }}
                                    />
                                )}
                            </Stack>

                            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                <Button
                                    variant="outlined"
                                    onClick={cargarMatrizDefecto}
                                    disabled={!periodo || cargando || cargandoDefecto}
                                >
                                    {cargandoDefecto ? 'Cargando…' : 'Matriz por defecto'}
                                </Button>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PictureAsPdfIcon />}
                                    onClick={() => openSupFor({ type: 'general' })}
                                    disabled={!periodo || matrices.length === 0}
                                >
                                    Generar reporte general
                                </Button>

                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    startIcon={<DescriptionRounded />}
                                    onClick={handleExportWordGeneral}
                                    disabled={!periodo || matrices.length === 0}
                                >
                                    Word
                                </Button>

                                <Button
                                    variant="outlined"
                                    color="success"
                                    startIcon={<GridOnRounded />}
                                    onClick={handleExportExcelGeneral}
                                    disabled={!periodo || matrices.length === 0}
                                >
                                    Excel
                                </Button>
                            </Box>

                            {origen && (
                                <Alert severity={origen === 'version' ? 'success' : 'info'} sx={{ mt: 2 }}>
                                    {origen === 'version' ? 'Se cargó la última versión guardada de este período.' : 'Se cargó la matriz por defecto del período.'}
                                </Alert>
                            )}
                            {alerta && (
                                <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setAlerta(null)}>
                                    {alerta}
                                </Alert>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {periodo && (
                <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                        {cargando ? (
                            <Typography variant="body2">Cargando…</Typography>
                        ) : matrices.length === 0 ? (
                            <Typography variant="body2">Cargue la información del período para visualizarla.</Typography>
                        ) : (
                            <>
                                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                                    <InputLabel id="matriz-trabajar-label">Matriz a trabajar</InputLabel>
                                    <Select
                                        labelId="matriz-trabajar-label"
                                        label="Matriz a trabajar"
                                        value={String(active)}
                                        onChange={(e) => setActive(Number(e.target.value))}
                                    >
                                        {matrices.map((m, i) => {
                                            const nombre = getMatProp(m, 'titulo') ?? `Tabla #${getMatProp(m, 'matriz') ?? (i + 1)}`;
                                            const st = getMatrixStatus(m);
                                            return (
                                                <MenuItem key={i} value={String(i)} sx={{ '& .txt': { color: st.color } }}>
                                                    <ColorDot color={st.color} />
                                                    <span className="txt">{nombre}</span>
                                                </MenuItem>
                                            );
                                        })}
                                    </Select>
                                </FormControl>

                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap' }}>
                                    <Tooltip title="Vista previa y aplicar a MATRIZ completa">
                                        <Button size="small" startIcon={<TableChartIcon />} onClick={() => abrirPreview({ type: 'matrix', matrizIndex: active })}>
                                            Vista previa (matriz)
                                        </Button>
                                    </Tooltip>
                                </Stack>

                                {(() => {
                                    const m = matrices[active];
                                    const headers = (getMatProp(getMatProp(m, 'columnas'), 'headers')) || [];
                                    const filas = getMatProp(m, 'filas') || [];
                                    const len = headers.length;
                                    const prov = m.provenance || {};

                                    return (
                                        <Box sx={{ p: 2, border: '1px dashed', borderRadius: 2 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                                {getMatProp(m, 'titulo') || `Tabla #${getMatProp(m, 'matriz')}`}
                                            </Typography>
                                            <TableContainer component={Box} sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                                <Table stickyHeader size="small" sx={{
                                                    tableLayout: 'fixed', minWidth: 900,
                                                    '& th, & td': { wordBreak: 'break-word', whiteSpace: 'normal', verticalAlign: 'top' }
                                                }}>
                                                    <TableHead>
                                                        <TableRow>
                                                            {headers.map((h, i) => (
                                                                <TableCell key={i} sx={{
                                                                    fontWeight: 'bold',
                                                                    ...(i === 0
                                                                        ? { position: 'sticky', left: 0, zIndex: 3, backgroundColor: 'background.paper', minWidth: 220, maxWidth: 280 }
                                                                        : { minWidth: 220 })
                                                                }}>
                                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                                        <span>{h}</span>
                                                                        {i > 0 && (
                                                                            <Tooltip title={`Vista previa (columna ${i + 1})`}>
                                                                                <IconButton size="small" onClick={() => abrirPreview({ type: 'col', matrizIndex: active, colIdx: i })}>
                                                                                    <ViewColumnIcon fontSize="inherit" />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        )}
                                                                    </Stack>
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {Array.isArray(filas) && filas.length > 0 ? (
                                                            filas.map((fila, rIdx) => {
                                                                const arr = Array.isArray(fila) ? fila : [];
                                                                const padded = len > 0 ? (arr.length < len ? [...arr, ...Array(len - arr.length).fill(null)] : arr.slice(0, len)) : arr;
                                                                return (
                                                                    <TableRow key={rIdx}>
                                                                        {padded.map((celda, cIdx) => {
                                                                            if (cIdx === 0) {
                                                                                return (
                                                                                    <TableCell key={cIdx} sx={{
                                                                                        fontWeight: 500, position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'background.paper',
                                                                                        minWidth: 220, maxWidth: 280
                                                                                    }}>
                                                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                                                            <span>{celda ?? ''}</span>
                                                                                            <Tooltip title={`Vista previa (fila ${rIdx + 1})`}>
                                                                                                <IconButton size="small" onClick={() => abrirPreview({ type: 'row', matrizIndex: active, rowIdx: rIdx })}>
                                                                                                    <ViewStreamIcon fontSize="inherit" />
                                                                                                </IconButton>
                                                                                            </Tooltip>
                                                                                        </Stack>
                                                                                    </TableCell>
                                                                                );
                                                                            }
                                                                            const meta = prov?.[rIdx]?.[cIdx] || null;
                                                                            return (
                                                                                <TableCell key={cIdx} sx={{ minWidth: 220 }}>
                                                                                    <Stack direction="row" spacing={0.5} alignItems="flex-start">
                                                                                        <TextField
                                                                                            fullWidth multiline rows={isMobile ? 2 : 3} size="small"
                                                                                            value={celda ?? ''} placeholder="Escriba o use vista previa"
                                                                                            onChange={(e) => handleCellChange(active, rIdx, cIdx, e.target.value)}
                                                                                            inputProps={{ style: { lineHeight: 1.3 } }}
                                                                                        />
                                                                                        <Tooltip title="Vista previa (celda)">
                                                                                            <IconButton
                                                                                                size="small"
                                                                                                onClick={() => abrirPreview({ type: 'cell', matrizIndex: active, rowIdx: rIdx, colIdx: cIdx })}
                                                                                                sx={{ mt: 0.5 }}
                                                                                            >
                                                                                                <PreviewIcon fontSize="inherit" />
                                                                                            </IconButton>
                                                                                        </Tooltip>
                                                                                    </Stack>
                                                                                    {meta?.siglas_entidad && (
                                                                                        <Chip size="small" sx={{ mt: 0.5 }} color="info" label={`Origen: ${meta.siglas_entidad}`} />
                                                                                    )}
                                                                                </TableCell>
                                                                            );
                                                                        })}
                                                                    </TableRow>
                                                                );
                                                            })
                                                        ) : (
                                                            <TableRow><TableCell colSpan={len || 1} align="center">No hay filas</TableCell></TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>

                                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Usa los íconos de vista previa para aplicar por celda, fila, columna o toda la matriz.
                                                </Typography>
                                                <Stack direction="row" spacing={1}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<PictureAsPdfIcon />}
                                                        onClick={() => openSupFor({ type: 'single', matrizIndex: active })}
                                                    >
                                                        Imprimir solamente esta tabla
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<DescriptionRounded />}
                                                        onClick={handleExportWordSingle}
                                                    >
                                                        Word
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<GridOnRounded />}
                                                        onClick={handleExportExcelSingle}
                                                    >
                                                        Excel
                                                    </Button>
                                                </Stack>
                                            </Box>
                                        </Box>
                                    );
                                })()}

                                <Box sx={{ mt: 3 }}>
                                    <Button variant="contained" color="primary" onClick={handleGuardar} disabled={!periodo || matrices.length === 0}>
                                        Guardar
                                    </Button>
                                </Box>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            <Snackbar
                open={snack.open}
                autoHideDuration={6000}
                onClose={handleCloseSnack}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnack} severity={snack.sev} variant="filled" sx={{ width: '100%' }}>
                    {snack.msg}
                </Alert>
            </Snackbar>

            <Dialog open={previewOpen} onClose={cerrarPreview} maxWidth="lg" fullWidth>
                <DialogTitle>Vista previa de aplicación</DialogTitle>
                <DialogContent dividers>
                    {!buildPreview ? (
                        <Typography variant="body2">Cargando…</Typography>
                    ) : (
                        <Box>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                Alcance:{' '}
                                <b>
                                    {buildPreview.type === 'cell' && 'Celda'}
                                    {buildPreview.type === 'row' && 'Fila completa'}
                                    {buildPreview.type === 'col' && 'Columna completa'}
                                    {buildPreview.type === 'matrix' && 'Matriz completa'}
                                </b>
                                {' · '}Matriz #{buildPreview.matrizNum}
                                {previewTarget?.rowIdx != null && <> · Fila {previewTarget.rowIdx + 1}</>}
                                {previewTarget?.colIdx != null && <> · Columna {previewTarget.colIdx + 1}</>}
                            </Typography>

                            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                <InputLabel id="preview-dir-label">Dirección (SIGLAS_ENTIDAD)</InputLabel>
                                <Select
                                    labelId="preview-dir-label"
                                    label="Dirección (SIGLAS_ENTIDAD)"
                                    value={previewSelectedEntidad}
                                    onChange={(e) => setPreviewSelectedEntidad(e.target.value)}
                                >
                                    {buildPreview.candidatos.map(d => (
                                        <MenuItem key={`${d.CODIGO_ENTIDAD}-${d.CODIGO_HISTORIAL}`} value={d.CODIGO_ENTIDAD}>
                                            {d.SIGLAS_ENTIDAD || `ENT ${d.CODIGO_ENTIDAD}`} — {d.nonEmpty} celdas con contenido
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Divider sx={{ mb: 2 }} />

                            {previewSelectedEntidad ? (
                                (() => {
                                    const dir = direcciones.find(x => x.CODIGO_ENTIDAD === Number(previewSelectedEntidad));
                                    const srcMatrix = dir?.matrices?.find(mm => Number(getMatProp(mm, 'matriz')) === Number(buildPreview.matrizNum));
                                    const srcHeaders = getMatProp(getMatProp(srcMatrix, 'columnas'), 'headers') || buildPreview.headers || [];
                                    const srcRows = getMatProp(srcMatrix, 'filas') || [];
                                    const colLen = srcHeaders.length;

                                    const targetSet = new Set(
                                        buildPreview.candidatos
                                            .find(c => c.CODIGO_ENTIDAD === Number(previewSelectedEntidad))
                                            ?.cells
                                            ?.map(({ r, c }) => `${r}:${c}`) || []
                                    );

                                    const isTarget = (r, c) => targetSet.has(`${r}:${c}`);

                                    return (
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                                Vista de la matriz de <b>{dir?.SIGLAS_ENTIDAD || `ENT ${dir?.CODIGO_ENTIDAD}`}</b> (solo se copiarán celdas resaltadas).
                                            </Typography>

                                            <TableContainer component={Box} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 520 }}>
                                                <Table size="small" stickyHeader sx={{
                                                    tableLayout: 'fixed',
                                                    minWidth: 900,
                                                    '& th, & td': { wordBreak: 'word-break', whiteSpace: 'normal', verticalAlign: 'top' }
                                                }}>
                                                    <TableHead>
                                                        <TableRow>
                                                            {srcHeaders.map((h, i) => (
                                                                <TableCell key={i} sx={{
                                                                    fontWeight: 'bold',
                                                                    ...(i === 0
                                                                        ? { position: 'sticky', left: 0, zIndex: 3, backgroundColor: 'background.paper', minWidth: 220, maxWidth: 280 }
                                                                        : { minWidth: 220 })
                                                                }}>
                                                                    {h}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {srcRows.length > 0 ? (
                                                            srcRows.map((fila, rIdx) => {
                                                                const arr = Array.isArray(fila) ? fila : [];
                                                                const padded = colLen > 0 ? (arr.length < colLen ? [...arr, ...Array(colLen - arr.length).fill(null)] : arr.slice(0, colLen)) : arr;
                                                                return (
                                                                    <TableRow key={rIdx}>
                                                                        {padded.map((valor, cIdx) => {
                                                                            if (cIdx === 0) {
                                                                                return (
                                                                                    <TableCell key={cIdx} sx={{
                                                                                        position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'background.paper',
                                                                                        fontWeight: 500, minWidth: 220, maxWidth: 280
                                                                                    }}>
                                                                                        {valor ?? ''}
                                                                                    </TableCell>
                                                                                );
                                                                            }

                                                                            const inTarget = isTarget(rIdx, cIdx);
                                                                            const text = inTarget ? (valor ?? '') : '';
                                                                            const shouldHighlight = inTarget && String(text).trim() !== '';

                                                                            return (
                                                                                <TableCell
                                                                                    key={cIdx}
                                                                                    sx={{
                                                                                        minWidth: 220,
                                                                                        backgroundColor: shouldHighlight ? 'warning.light' : undefined
                                                                                    }}
                                                                                >
                                                                                    {text}
                                                                                </TableCell>
                                                                            );
                                                                        })}
                                                                    </TableRow>
                                                                );
                                                            })
                                                        ) : (
                                                            <TableRow>
                                                                <TableCell colSpan={colLen || 1} align="center">La dirección no tiene filas para esta matriz.</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>

                                            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                                                Amarillo = celdas que se copiarán. En blanco = no se copiarán (fuera del alcance o sin contenido).
                                            </Typography>
                                        </Box>
                                    );
                                })()
                            ) : (
                                <Alert severity="info">Elige una dirección para previsualizar.</Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={cerrarPreview}>Cerrar</Button>
                    <Button variant="contained" onClick={aplicarPreview} disabled={!buildPreview || !previewSelectedEntidad}>
                        Aplicar
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openSup} onClose={closeSup} fullWidth maxWidth="sm">
                <DialogTitle>Confirmar información del superior</DialogTitle>
                <DialogContent dividers>
                    {loadingSup && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <CircularProgress size={18} /> <span>Cargando datos…</span>
                        </Stack>
                    )}
                    <Stack spacing={2}>
                        <TextField
                            label="Nombre del superior"
                            value={supNombre}
                            onChange={(e) => setSupNombre(e.target.value)}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Puesto"
                            value={supPuesto}
                            onChange={(e) => setSupPuesto(e.target.value)}
                            fullWidth
                            required
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeSup}>Cancelar</Button>
                    <Button onClick={confirmarYImprimir} variant="contained" disabled={confirmingSup}>
                        {confirmingSup ? 'Generando…' : 'Confirmar e imprimir'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Anexo1Institucional;
