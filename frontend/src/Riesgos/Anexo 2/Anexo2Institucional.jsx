/**
 * @fileoverview
 * Vista institucional de consulta y mantenimiento del Anexo 2 consolidado.
 *
 * @module Riesgos/Anexo 2/Anexo2Institucional.jsx
 * @version 1.3
 * @author Equipo
 */

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
    Box,
    Card,
    CardHeader,
    CardContent,
    Typography,
    Button,
    FormControl,
    Select,
    MenuItem,
    InputLabel,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Stack,
    Alert,
    useMediaQuery,
    TextField,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
    Divider,
    CircularProgress,
    Snackbar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import GridOnRounded from '@mui/icons-material/GridOnRounded';
import DescriptionRounded from '@mui/icons-material/DescriptionRounded';
import { ReporteSegundaMatrizInst } from '../Reportes F/Institucionales/ReporteSegundaMatrizInst';
import htmlDocx from 'html-docx-js/dist/html-docx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const safefmt = (v) => {
    try {
        if (!v) return '';
        const d = new Date(v);
        return isNaN(d) ? String(v) : d.toLocaleDateString();
    } catch {
        return String(v ?? '');
    }
};

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

const API_DEFECTO = '/api/segunda-matriz-actualizados/matriz-defecto';
const API_VERSION = '/api/institucion-actualizados/segunda-matriz';
const API_DIR_INFO = '/api/institucion-actualizados/obtener-segunda-matriz-direcciones';
const API_SUP = '/api/reportes-actualizados/obtener-superior';
const TIPO_MATRIZ = 2;

const H = {
    get: (obj, k) => obj?.[k] ?? obj?.[k?.toUpperCase?.()],
    isNo: (v) => String(v ?? '').trim().toLowerCase() === 'no',
    parseMaybeJSON: (val) => {
        if (val == null) return null;
        if (typeof val === 'string') {
            try {
                return JSON.parse(val);
            } catch {
                return null;
            }
        }
        return val;
    },
    normKey: (s) =>
        String(s ?? '')
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .trim()
            .toLowerCase(),
    rowKeyFrom: (row) => `${(row?.[0] ?? '').toString()} | ${(row?.[1] ?? '').toString()}`,
};

const normalizeMatrices = (list = []) =>
    list.map((m, i) => ({
        matriz: Number(H.get(m, 'matriz')) || i + 1,
        titulo: String(H.get(m, 'titulo') ?? ''),
        columnas: H.parseMaybeJSON(H.get(m, 'columnas')) ?? { headers: [] },
        filas: H.parseMaybeJSON(H.get(m, 'filas')) ?? [],
        obligatorio: 1,
    }));

function normalizeDireccionesInfo(payload) {
    const map = new Map();
    const siglasSet = new Set();
    const nombresSet = new Set();
    if (!payload || !Array.isArray(payload.historial)) return { map, siglasSet, nombresSet };

    const sorted = [...payload.historial].sort((a, b) => {
        const ah = Number(a.CODIGO_HISTORIAL ?? 0);
        const bh = Number(b.CODIGO_HISTORIAL ?? 0);
        if (ah !== bh) return bh - ah;
        const ad = new Date(a.FECHA_CREACION ?? 0).getTime();
        const bd = new Date(b.FECHA_CREACION ?? 0).getTime();
        return bd - ad;
    });

    for (const item of sorted) {
        const siglas = String(item.SIGLAS_ENTIDAD ?? '').trim();
        const nombre = String(item.NOMBRE_ENTIDAD ?? '').trim();
        if (siglas) siglasSet.add(siglas);
        if (nombre) nombresSet.add(nombre);

        const mats = item?.RESPUESTA?.matrices;
        if (!Array.isArray(mats)) continue;
        for (const mm of mats) {
            const mnum = Number(H.get(mm, 'matriz'));
            const filas = H.get(mm, 'filas') ?? [];
            if (!map.has(mnum)) map.set(mnum, new Map());
            const rowMap = map.get(mnum);
            for (const fila of filas) {
                const realKey = H.rowKeyFrom(fila);
                if (!realKey) continue;
                const aplica = fila[fila.length - 2] ?? '';
                const comentario = fila[fila.length - 1] ?? '';
                const entry = {
                    siglas: siglas || '—',
                    aplica: aplica ?? '',
                    comentario: comentario ?? '',
                };
                const norm = H.normKey(realKey);
                const arr = rowMap.get(norm) ?? [];
                arr.push(entry);
                rowMap.set(norm, arr);
            }
        }
    }
    return { map, siglasSet, nombresSet };
}

function buildOrigenMapFromApiMatrices(apiMatrices = []) {
    const out = new Map();
    for (const m of apiMatrices) {
        const matrizNum = String(Number(H.get(m, 'matriz')) || 0);
        const origenObj = H.get(m, 'origen_por_fila') || {};
        const mapM = new Map();
        for (const [realKey, origen] of Object.entries(origenObj)) {
            if (!realKey) continue;
            const norm = H.normKey(realKey);
            const val = String(origen ?? '').trim();
            if (val) mapM.set(norm, val);
        }
        out.set(matrizNum, mapM);
    }
    return out;
}

/**
 * Vista institucional del Anexo 2 consolidado.
 *
 * Permite consultar matrices por periodo, generar PDF, Excel y Word a nivel institución.
 *
 * @component
 */
export default function Anexo2Institucional() {
    // Periodo y carga
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState('');
    const [cargando, setCargando] = useState(false);
    const [cargandoDefecto, setCargandoDefecto] = useState(false);
    const [alerta, setAlerta] = useState(null);
    const [guardando, setGuardando] = useState(false);

    // Matrices / navegación
    const [matrices, setMatrices] = useState([]);
    const [active, setActive] = useState(0);
    const [origen, setOrigen] = useState(null); // 'version' | 'defecto'

    // Reporte / metadatos
    const [logo, setLogo] = useState('');
    const [institucion, setInstitucion] = useState('');

    // Direcciones (sugerencias)
    const [dirInfo, setDirInfo] = useState(new Map());
    const [siglasGlobales, setSiglasGlobales] = useState([]);
    const [nombresGlobales, setNombresGlobales] = useState([]);

    // Origen a guardar por fila
    const [origenByRowKey, setOrigenByRowKey] = useState(new Map());
    const getRowKey = (rowArr) => H.normKey(H.rowKeyFrom(rowArr));
    const setOrigenFor = (matrizNum, rowArr, origenSiglas) => {
        setOrigenByRowKey((prev) => {
            const copy = new Map(prev);
            const mk = String(matrizNum);
            const k = getRowKey(rowArr);
            const m = new Map(copy.get(mk) || []);
            if (origenSiglas && String(origenSiglas).trim() !== '') m.set(k, origenSiglas);
            else m.delete(k);
            copy.set(mk, m);
            return copy;
        });
    };
    const getOrigenFor = (matrizNum, rowArr) => {
        const mm = origenByRowKey.get(String(matrizNum));
        if (!mm) return '';
        return mm.get(getRowKey(rowArr)) || '';
    };

    // Impresión
    const [filtro, setFiltro] = useState('all');
    const [indicesTexto, setIndicesTexto] = useState('');

    // Previews
    const [previewOpen, setPreviewOpen] = useState(false);
    const [rowPreview, setRowPreview] = useState({ open: false, rowIdx: -1, sugIdx: 0 });
    const [matrixPreviewSiglas, setMatrixPreviewSiglas] = useState('');

    // Superior/responsable
    const [supNombre, setSupNombre] = useState('');
    const [supPuesto, setSupPuesto] = useState('');
    const [openSup, setOpenSup] = useState(false);
    const [loadingSup, setLoadingSup] = useState(false);
    const [confirmingSup, setConfirmingSup] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // { type:'general' } | { type:'single', matrizIndex:number }

    // Snackbar
    const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

    const handleCloseSnack = (_e, reason) => {
        if (reason === 'clickaway') return;
        setSnack((prev) => ({ ...prev, open: false }));
    };

    const theme = useTheme();
    const isMobile = useMediaQuery(`(max-width:${theme.breakpoints.values.md}px)`);
    const headersReq = { 'x-access-token': localStorage.getItem('token') };

    // Init
    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get('/api/periodos-actualizados', { headers: headersReq });
                setPeriodos(data.result ?? data ?? []);
            } catch {
                setPeriodos([]);
            }
        })();

        (async () => {
            try {
                const { data } = await axios.get('/api/reportes-actualizados/obtener-logo', {
                    headers: headersReq,
                });
                setLogo('data:image/png;base64,' + (data.logo ?? ''));
                setInstitucion(data.nombre ?? '');
            } catch {
                // ignore
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Obtiene información del superior institucional que respalda el reporte.
     */
    const obtenerSuperior = async () => {
        try {
            setLoadingSup(true);
            const { data } = await axios.get(API_SUP, { headers: headersReq });
            if (data?.nombre) setSupNombre(String(data.nombre));
            if (data?.puesto) setSupPuesto(String(data.puesto));
        } catch (e) {
            console.warn('[Anexo2Institucional] No se pudo obtener el superior:', e?.message || e);
        } finally {
            setLoadingSup(false);
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
            setSnack({
                open: true,
                msg: 'Completa nombre y puesto del superior para continuar.',
                sev: 'warning',
            });
            return;
        }
        setConfirmingSup(true);
        try {
            const responsable = { nombre: supNombre.trim(), puesto: supPuesto.trim() };

            if (pendingAction?.type === 'general') {
                const mats = matricesParaImprimir();
                if (!periodo || mats.length === 0) {
                    setSnack({
                        open: true,
                        msg: 'No hay tablas para imprimir con el filtro seleccionado.',
                        sev: 'warning',
                    });
                    return;
                }
                const options =
                    filtro === 'all'
                        ? { filter: 'all', includeEmpty: true }
                        : filtro === 'complete'
                            ? { filter: 'complete', includeEmpty: true }
                            : filtro === 'indices'
                                ? { filter: 'all', indicesText: indicesTexto || '', includeEmpty: true }
                                : { filter: 'partial', includeEmpty: true };

                ReporteSegundaMatrizInst(
                    mats,
                    periodo,
                    logo,
                    institucion,
                    options,
                    undefined,
                    responsable
                );
            } else if (pendingAction?.type === 'single') {
                const idx =
                    typeof pendingAction.matrizIndex === 'number'
                        ? pendingAction.matrizIndex
                        : active;
                const cur = matrices[idx];
                if (cur) {
                    ReporteSegundaMatrizInst(
                        [cur],
                        periodo,
                        logo,
                        institucion,
                        { filter: 'all', includeEmpty: true },
                        undefined,
                        responsable
                    );
                }
            }
            closeSup();
        } finally {
            setConfirmingSup(false);
        }
    };

    /**
     * Recupera la matriz marcada como configuración por defecto del Anexo 2.
     */
    const cargarMatrizDefecto = async (p) => {
        if (!p) return;
        try {
            setCargandoDefecto(true);
            const { data } = await axios.get(API_DEFECTO, {
                headers: headersReq,
                params: { periodo: p },
            });
            const arr = Array.isArray(data?.matrices) ? normalizeMatrices(data.matrices) : [];
            setMatrices(arr);
            setActive(0);
            setOrigen('defecto');
            setAlerta(null);
            setOrigenByRowKey(new Map());
        } catch {
            setMatrices([]);
            setActive(0);
            setOrigen(null);
            setOrigenByRowKey(new Map());
            setAlerta('No fue posible cargar la matriz por defecto del período.');
        } finally {
            setCargandoDefecto(false);
        }
    };

    // Cargar versión o defecto; restaura orígenes
    const cargarUltimaOVersionDefecto = async (p) => {
        if (!p) return;
        try {
            setCargando(true);
            setAlerta(null);
            const { data } = await axios.get(API_VERSION, {
                headers: headersReq,
                params: { periodo: p, tipo: TIPO_MATRIZ },
            });
            const apiMatrices = Array.isArray(data?.matrices)
                ? data.matrices
                : Array.isArray(data?.MATRICES)
                    ? data.MATRICES
                    : [];
            const arr = normalizeMatrices(apiMatrices);

            if (arr.length > 0) {
                setMatrices(arr);
                setActive(0);
                setOrigen('version');
                const origenMap = buildOrigenMapFromApiMatrices(apiMatrices);
                setOrigenByRowKey(origenMap);
            } else {
                await cargarMatrizDefecto(p);
            }
        } catch {
            await cargarMatrizDefecto(p);
        } finally {
            setCargando(false);
        }
    };

    // Cargar sugerencias de Direcciones
    const cargarDireccionesInfo = async (p) => {
        try {
            const { data } = await axios.get(API_DIR_INFO, {
                headers: headersReq,
                params: { periodo: p },
            });
            const { map, siglasSet, nombresSet } = normalizeDireccionesInfo(data ?? {});
            setDirInfo(map);
            setSiglasGlobales(Array.from(siglasSet));
            setNombresGlobales(Array.from(nombresSet));
            setMatrixPreviewSiglas('');
        } catch {
            setDirInfo(new Map());
            setSiglasGlobales([]);
            setNombresGlobales([]);
            setMatrixPreviewSiglas('');
        }
    };

    useEffect(() => {
        if (!periodo) {
            setMatrices([]);
            setActive(0);
            setOrigen(null);
            setDirInfo(new Map());
            setSiglasGlobales([]);
            setNombresGlobales([]);
            setOrigenByRowKey(new Map());
            setMatrixPreviewSiglas('');
            return;
        }
        (async () => {
            await cargarUltimaOVersionDefecto(periodo);
            await cargarDireccionesInfo(periodo);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodo]);

    const periodoLabel = useMemo(() => {
        if (!periodo) return '';
        const p = periodos.find((x) => String(x.CODIGO_PERIODO) === String(periodo));
        if (!p) return `Código ${periodo}`;
        return `${safefmt(p.PERIODO_INICIAL)} - ${safefmt(p.PERIODO_FINAL)} del ${p.CODIGO_PERIODO}`;
    }, [periodos, periodo]);

    // Atajos de matriz activa
    const mat = matrices[active] || null;
    const headers = Array.isArray(mat?.columnas?.headers) ? mat.columnas.headers : [];
    const colCount = headers.length;
    const idxAplica = Math.max(0, colCount - 2);
    const idxComentario = Math.max(0, colCount - 1);

    const handleCellChange = (rowIdx, colIdx, value) => {
        if (!mat) return;
        if (colIdx !== idxAplica && colIdx !== idxComentario) return;
        setMatrices((prev) => {
            const copy =
                typeof structuredClone === 'function'
                    ? structuredClone(prev)
                    : JSON.parse(JSON.stringify(prev));
            const m = copy[active];
            const filas = Array.isArray(m.filas) ? m.filas : (m.filas = []);
            if (!Array.isArray(filas[rowIdx])) filas[rowIdx] = [];
            while (filas[rowIdx].length < colCount) filas[rowIdx].push(null);
            filas[rowIdx][colIdx] = value ?? '';
            if (filas[rowIdx][idxAplica] == null) filas[rowIdx][idxAplica] = '';
            if (filas[rowIdx][idxComentario] == null) filas[rowIdx][idxComentario] = '';
            setOrigenFor(m.matriz, filas[rowIdx], 'Usuario');
            return copy;
        });
    };

    const getSuggestionsForRow = (matrizNum, rowArr) => {
        const mMap = dirInfo.get(Number(matrizNum));
        if (!mMap) return [];
        const arr = mMap.get(H.normKey(H.rowKeyFrom(rowArr))) ?? [];
        return Array.isArray(arr) ? arr : [];
    };

    const getSiglasForMatrix = (matrizNum) => {
        const mMap = dirInfo.get(Number(matrizNum));
        if (!mMap) return [];
        const set = new Set();
        for (const arr of mMap.values()) {
            for (const s of arr) set.add(s.siglas);
        }
        return Array.from(set);
    };

    const getChosenSuggestion = (matrizNum, rowArr, overrideSiglas = '') => {
        const list = getSuggestionsForRow(matrizNum, rowArr);
        if (list.length === 0) return null;
        if (overrideSiglas) {
            const foundOverride = list.find((x) => x.siglas === overrideSiglas);
            if (foundOverride) return foundOverride;
        }
        return list[0];
    };

    // Previsualización por FILA
    const openRowPreview = (rowIdx) => {
        const rowArr = Array.isArray(mat?.filas?.[rowIdx]) ? mat.filas[rowIdx] : [];
        const list = getSuggestionsForRow(mat?.matriz, rowArr);
        if (!list || list.length === 0) {
            setSnack({
                open: true,
                msg: 'No hay sugerencias de Direcciones para esta fila.',
                sev: 'info',
            });
            return;
        }
        setRowPreview({ open: true, rowIdx, sugIdx: 0 });
    };

    const applyRowPreview = () => {
        if (!mat || rowPreview.rowIdx < 0) {
            setRowPreview({ open: false, rowIdx: -1, sugIdx: 0 });
            return;
        }
        const rowIdx = rowPreview.rowIdx;
        const rowArr = Array.isArray(mat.filas?.[rowIdx]) ? mat.filas[rowPreview.rowIdx] : [];
        const list = getSuggestionsForRow(mat.matriz, rowArr);
        const sug = list[rowPreview.sugIdx];
        if (!sug) {
            setRowPreview({ open: false, rowIdx: -1, sugIdx: 0 });
            return;
        }

        setMatrices((prev) => {
            const copy =
                typeof structuredClone === 'function'
                    ? structuredClone(prev)
                    : JSON.parse(JSON.stringify(prev));
            const m = copy[active];
            const filas = m.filas || [];
            if (!Array.isArray(filas[rowIdx])) filas[rowIdx] = [];
            while (filas[rowIdx].length < colCount) filas[rowIdx].push(null);
            filas[rowIdx][idxAplica] = sug.aplica ?? '';
            filas[rowIdx][idxComentario] = sug.comentario ?? '';
            setOrigenFor(m.matriz, filas[rowIdx], sug.siglas || '');
            return copy;
        });
        setRowPreview({ open: false, rowIdx: -1, sugIdx: 0 });
    };

    const isMatrixComplete = (m) => {
        if (!m) return false;
        const hs = H.get(H.get(m, 'columnas'), 'headers') || [];
        const len = hs.length;
        if (len < 2) return false;
        const a = Math.max(0, len - 2),
            c = Math.max(0, len - 1);
        const filas = H.get(m, 'filas') || [];
        for (const row of filas) {
            const padded = Array.isArray(row)
                ? row.length < len
                    ? [...row, ...Array(len - row.length).fill(null)]
                    : row
                : Array(len).fill(null);
            const va = padded[a],
                vc = padded[c];
            if (!va || String(va).trim() === '') return false;
            if (!H.isNo(va) && (!vc || String(vc).trim() === '')) return false;
        }
        return true;
    };

    const hayVacios = () => {
        for (const m of matrices) {
            const hs = H.get(H.get(m, 'columnas'), 'headers') || [];
            const len = hs.length,
                a = Math.max(0, len - 2),
                c = Math.max(0, len - 1);
            const filas = H.get(m, 'filas') || [];
            for (const row of filas) {
                const padded = Array.isArray(row)
                    ? row.length < len
                        ? [...row, ...Array(len - row.length).fill(null)]
                        : row
                    : Array(len).fill(null);
                const va = padded[a],
                    vc = padded[c];
                if (!va || String(va).trim() === '') return true;
                if (!H.isNo(va) && (!vc || String(vc).trim() === '')) return true;
            }
        }
        return false;
    };

    const handleGuardar = async () => {
        if (!periodo || matrices.length === 0) return;
        if (hayVacios())
            setAlerta(
                'Revise: "Aplica" es obligatorio; "Comentario" es obligatorio si Aplica es "Sí". Igual se guardará.'
            );
        else setAlerta(null);

        const matricesPayload = matrices.map((m) => {
            const filas = m.filas || [];
            const mapOrigenMatriz = origenByRowKey.get(String(m.matriz)) || new Map();
            const origen_por_fila = {};
            filas.forEach((row) => {
                const realKey = H.rowKeyFrom(row);
                const normKey = H.normKey(realKey);
                const origenFila = mapOrigenMatriz.get(normKey);
                if (origenFila && origenFila.trim() !== '') {
                    origen_por_fila[realKey] = origenFila;
                }
            });
            return {
                matriz: m.matriz,
                titulo: m.titulo ?? null,
                columnas: m.columnas,
                filas: filas,
                obligatorio: 1,
                origen_por_fila,
            };
        });

        const payload = { periodo, tipo: TIPO_MATRIZ, matrices: matricesPayload };

        try {
            setGuardando(true);
            await axios.post(API_VERSION, payload, { headers: headersReq });
            setSnack({ open: true, msg: 'Guardado exitoso', sev: 'success' });
            await cargarUltimaOVersionDefecto(periodo);
        } catch {
            setAlerta('Ocurrió un error al guardar. Intenta de nuevo.');
            setSnack({
                open: true,
                msg: 'Ocurrió un error al guardar. Intenta de nuevo.',
                sev: 'error',
            });
        } finally {
            setGuardando(false);
        }
    };

    const parseIndices = (txt) => {
        if (!txt) return [];
        const parts = String(txt)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const out = new Set();
        for (const p of parts) {
            if (/^\d+$/.test(p)) {
                out.add(Number(p));
                continue;
            }
            const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
            if (m) {
                const a = Number(m[1]),
                    b = Number(m[2]);
                const [from, to] = a <= b ? [a, b] : [b, a];
                for (let i = from; i <= to; i++) out.add(i);
            }
        }
        return Array.from(out).sort((x, y) => x - y);
    };

    const matricesParaImprimir = () => {
        let arr = matrices.slice();
        if (filtro === 'complete') arr = arr.filter(isMatrixComplete);
        if (filtro === 'indices') {
            const idxs = parseIndices(indicesTexto);
            if (idxs.length === 0) arr = [];
            else arr = arr.filter((m) => idxs.includes(Number(H.get(m, 'matriz'))));
        }
        return arr;
    };

    /**
     * Exportar a Excel:
     *  - Primera hoja: "Resumen" con número de matriz y título.
     *  - Una hoja por matriz: nombre "Matriz X - Título" (recortado a 31 caracteres).
     */
    const exportExcelForMatrices = async (mats, filename) => {
        if (!mats || mats.length === 0) return;

        const workbook = new ExcelJS.Workbook();

        // Hoja de resumen
        const resumenSheet = workbook.addWorksheet('Resumen');
        resumenSheet.columns = [
            { header: 'Matriz', key: 'matriz', width: 12 },
            { header: 'Título', key: 'titulo', width: 80 },
        ];

        mats.forEach((m, index) => {
            const num = Number(H.get(m, 'matriz')) || index + 1;
            const titulo = (H.get(m, 'titulo') || '').toString().trim() || `Matriz ${num}`;
            resumenSheet.addRow({ matriz: num, titulo });
        });

        const usedNames = new Set();
        const makeSheetName = (m, index) => {
            const num = Number(H.get(m, 'matriz')) || index + 1;
            const rawTitle = (H.get(m, 'titulo') || '').toString().trim();
            let base = `Matriz ${num}`;
            if (rawTitle) base += ` - ${rawTitle}`;
            if (base.length > 31) base = base.slice(0, 31);
            if (!base) base = `Matriz_${num}`;

            let name = base;
            let counter = 1;
            while (usedNames.has(name)) {
                const suffix = `_${counter++}`;
                const maxBaseLen = 31 - suffix.length;
                name = (base.slice(0, maxBaseLen) || base) + suffix;
            }
            usedNames.add(name);
            return name;
        };

        mats.forEach((m, index) => {
            const sheetName = makeSheetName(m, index);
            const sheet = workbook.addWorksheet(sheetName);

            const hs = Array.isArray(m?.columnas?.headers) ? m.columnas.headers : [];
            const filas = Array.isArray(m?.filas) ? m.filas : [];

            if (hs.length > 0) {
                sheet.addRow(hs);
            }

            if (filas.length > 0) {
                filas.forEach((fila) => {
                    const arr = Array.isArray(fila) ? fila : [];
                    const padded =
                        hs.length > 0
                            ? arr.length < hs.length
                                ? [...arr, ...Array(hs.length - arr.length).fill('')]
                                : arr.slice(0, hs.length)
                            : arr;
                    sheet.addRow(padded);
                });
            }

            if (sheet.columns) {
                sheet.columns.forEach((col) => {
                    if (col && (!col.width || col.width < 20)) {
                        col.width = 30;
                    }
                });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, filename);
    };

    const handleExportExcelGeneral = async () => {
        if (!periodo || matrices.length === 0) return;
        const mats = matricesParaImprimir();
        if (!mats || mats.length === 0) {
            setSnack({
                open: true,
                msg: 'No hay tablas para exportar con el filtro seleccionado.',
                sev: 'warning',
            });
            return;
        }
        const fileSuffix = periodo ? `P${periodo}` : 'sin_periodo';
        try {
            await exportExcelForMatrices(mats, `Anexo2Institucional_${fileSuffix}_general.xlsx`);
        } catch (e) {
            console.error('[Anexo2Institucional] Error al exportar Excel general:', e);
            setSnack({
                open: true,
                msg: 'Ocurrió un error al exportar a Excel.',
                sev: 'error',
            });
        }
    };

    const handleExportExcelSingle = async () => {
        if (!periodo || matrices.length === 0) return;
        const cur = matrices[active];
        if (!cur) return;
        const num = Number(H.get(cur, 'matriz')) || active + 1;
        const fileSuffix = periodo ? `P${periodo}` : 'sin_periodo';
        try {
            await exportExcelForMatrices(
                [cur],
                `Anexo2Institucional_${fileSuffix}_matriz_${num}.xlsx`
            );
        } catch (e) {
            console.error('[Anexo2Institucional] Error al exportar Excel de tabla única:', e);
            setSnack({
                open: true,
                msg: 'Ocurrió un error al exportar a Excel.',
                sev: 'error',
            });
        }
    };

    /**
     * Generar HTML para exportar a Word (todas las matrices que se envíen).
     */
    const buildHtmlForMatrices = (mats) => {
        let html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Anexo 2 institucional</title>
<style>
body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; }
h1, h2, h3 { font-weight: bold; }
table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
th, td { border: 1px solid #444; padding: 4px; vertical-align: top; }
th { background: #eeeeee; }
.meta { margin-bottom: 12px; }
</style>
</head>
<body>
<h1>Consolidado de evaluación de riesgos asociados al fraude o corrupción</h1>
`;

        if (institucion) {
            html += `<p class="meta"><b>Institución:</b> ${escapeHtmlWithBreaks(institucion)}</p>`;
        }
        if (periodoLabel) {
            html += `<p class="meta"><b>Período:</b> ${escapeHtmlWithBreaks(periodoLabel)}</p>`;
        }

        mats.forEach((m, index) => {
            const num = Number(H.get(m, 'matriz')) || index + 1;
            const titulo = (H.get(m, 'titulo') || '').toString().trim();
            const hs = Array.isArray(m?.columnas?.headers) ? m.columnas.headers : [];
            const filas = Array.isArray(m?.filas) ? m.filas : [];

            html += `<h2>Matriz ${num}${titulo ? ' - ' + escapeHtmlWithBreaks(titulo) : ''
                }</h2>`;

            if (hs.length === 0) {
                html += '<p>(Sin datos de encabezados)</p>';
                return;
            }

            html += '<table><thead><tr>';
            hs.forEach((h) => {
                html += `<th>${escapeHtmlWithBreaks(h)}</th>`;
            });
            html += '</tr></thead><tbody>';

            if (filas.length === 0) {
                html += '<tr>';
                hs.forEach(() => {
                    html += '<td></td>';
                });
                html += '</tr>';
            } else {
                filas.forEach((fila) => {
                    const arr = Array.isArray(fila) ? fila : [];
                    const padded =
                        arr.length < hs.length
                            ? [...arr, ...Array(hs.length - arr.length).fill('')]
                            : arr.slice(0, hs.length);
                    html += '<tr>';
                    padded.forEach((val) => {
                        html += `<td>${escapeHtmlWithBreaks(val ?? '')}</td>`;
                    });
                    html += '</tr>';
                });
            }

            html += '</tbody></table>';
        });

        html += '</body></html>';
        return html;
    };

    const handleExportWordGeneral = () => {
        if (!periodo || matrices.length === 0) return;
        const mats = matricesParaImprimir();
        if (!mats || mats.length === 0) {
            setSnack({
                open: true,
                msg: 'No hay tablas para exportar con el filtro seleccionado.',
                sev: 'warning',
            });
            return;
        }
        const fileSuffix = periodo ? `P${periodo}` : 'sin_periodo';
        try {
            const html = buildHtmlForMatrices(mats);
            const blob = htmlDocx.asBlob(html);
            saveAs(blob, `Anexo2Institucional_${fileSuffix}_general.docx`);
        } catch (e) {
            console.error('[Anexo2Institucional] Error al exportar Word general:', e);
            setSnack({
                open: true,
                msg: 'Ocurrió un error al exportar a Word.',
                sev: 'error',
            });
        }
    };

    const handleExportWordSingle = () => {
        if (!periodo || matrices.length === 0) return;
        const cur = matrices[active];
        if (!cur) return;
        const num = Number(H.get(cur, 'matriz')) || active + 1;
        const fileSuffix = periodo ? `P${periodo}` : 'sin_periodo';
        try {
            const html = buildHtmlForMatrices([cur]);
            const blob = htmlDocx.asBlob(html);
            saveAs(blob, `Anexo2Institucional_${fileSuffix}_matriz_${num}.docx`);
        } catch (e) {
            console.error('[Anexo2Institucional] Error al exportar Word de tabla única:', e);
            setSnack({
                open: true,
                msg: 'Ocurrió un error al exportar a Word.',
                sev: 'error',
            });
        }
    };

    /**
     * Construye la estructura de filas y columnas a partir de la matriz seleccionada
     * para mostrarla de forma amigable en la UI (vista previa matriz).
     */
    const buildPreview = useMemo(() => {
        if (!previewOpen) return null;
        const cur = matrices[active];
        if (!cur) return null;

        const headers = cur.columnas?.headers ?? [];
        const filas = cur.filas ?? [];
        const colLen = headers.length;
        const idxA = Math.max(0, colLen - 2);
        const idxC = Math.max(0, colLen - 1);

        const rows = filas.map((row) => {
            const padded = Array.isArray(row)
                ? row.length < colLen
                    ? [...row, ...Array(colLen - row.length).fill(null)]
                    : row.slice(0, colLen)
                : Array(colLen).fill(null);
            const chosen = getChosenSuggestion(cur.matriz, padded, matrixPreviewSiglas);
            const after = padded.slice();
            let changeA = false,
                changeC = false;
            if (chosen) {
                if ((chosen.aplica ?? '') !== (padded[idxA] ?? '')) {
                    after[idxA] = chosen.aplica ?? '';
                    changeA = true;
                }
                if ((chosen.comentario ?? '') !== (padded[idxC] ?? '')) {
                    after[idxC] = chosen.comentario ?? '';
                    changeC = true;
                }
            }
            return { before: padded, after, changeA, changeC, chosen };
        });

        const changeCount = rows.reduce(
            (acc, r) => acc + (r.changeA ? 1 : 0) + (r.changeC ? 1 : 0),
            0
        );
        const siglasList = getSiglasForMatrix(cur.matriz);
        return {
            headers,
            idxA,
            idxC,
            rows,
            changeCount,
            matrizIndex: active,
            matrizNum: cur.matriz,
            siglasList,
        };
    }, [previewOpen, active, matrices, dirInfo, matrixPreviewSiglas]);

    const aplicarSugerenciasMatriz = () => {
        if (!buildPreview) return;
        const { rows, matrizIndex, idxA, idxC, changeCount } = buildPreview;
        if (changeCount === 0) {
            setPreviewOpen(false);
            return;
        }
        setMatrices((prev) => {
            const copy =
                typeof structuredClone === 'function'
                    ? structuredClone(prev)
                    : JSON.parse(JSON.stringify(prev));
            const mm = copy[matrizIndex];
            const colLen = (mm?.columnas?.headers || []).length;
            const filas = mm.filas || [];
            rows.forEach(({ after, chosen }, r) => {
                if (!Array.isArray(filas[r])) filas[r] = [];
                while (filas[r].length < colLen) filas[r].push(null);
                filas[r][idxA] = after[idxA] ?? '';
                filas[r][idxC] = after[idxC] ?? '';
                const chosenOrigen = chosen?.siglas || '';
                if (chosenOrigen) setOrigenFor(mm.matriz, filas[r], chosenOrigen);
            });
            mm.filas = filas;
            return copy;
        });
        setPreviewOpen(false);
    };

    // Preview FILA
    const rowPreviewContent = useMemo(() => {
        if (!rowPreview.open || rowPreview.rowIdx < 0 || !mat) return null;
        const headers = mat.columnas?.headers ?? [];
        const colLen = headers.length;
        const idxA = Math.max(0, colLen - 2);
        const idxC = Math.max(0, colLen - 1);
        const rowArr = Array.isArray(mat.filas?.[rowPreview.rowIdx])
            ? mat.filas[rowPreview.rowIdx]
            : [];
        const before =
            rowArr.length < colLen
                ? [...rowArr, ...Array(colLen - rowArr.length).fill(null)]
                : rowArr.slice(0, colLen);
        const list = getSuggestionsForRow(mat.matriz, before);
        const sug = list[rowPreview.sugIdx];
        const after = before.slice();
        let changeA = false,
            changeC = false;
        if (sug) {
            if ((sug.aplica ?? '') !== (before[idxA] ?? '')) {
                after[idxA] = sug.aplica ?? '';
                changeA = true;
            }
            if ((sug.comentario ?? '') !== (before[idxC] ?? '')) {
                after[idxC] = sug.comentario ?? '';
                changeC = true;
            }
        }
        return { headers, before, after, idxA, idxC, changeA, changeC, list };
    }, [rowPreview, mat, dirInfo]);

    const headerOrigenLabel =
        siglasGlobales.length === 1
            ? `Origen: ${siglasGlobales[0]}`
            : siglasGlobales.length > 1
                ? `Origen: múltiples (${siglasGlobales.length})`
                : '';

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Consolidado de evaluación de riesgos asociados al fraude o corrupción
            </Typography>

            {/* Tarjeta superior */}
            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader
                    title={
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <span>Matrices para institución</span>
                        </Stack>
                    }
                    subheader={nombresGlobales.join(' • ') || undefined}
                />
                <CardContent>
                    {periodos.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No hay elementos aún registrados.
                        </Typography>
                    ) : (
                        <>
                            <FormControl fullWidth>
                                <InputLabel id="periodo-label">Seleccione un periodo</InputLabel>
                                <Select
                                    labelId="periodo-label"
                                    label="Seleccione un periodo"
                                    value={periodo}
                                    onChange={(e) => {
                                        setPeriodo(e.target.value);
                                        setMatrices([]);
                                        setActive(0);
                                        setAlerta(null);
                                    }}
                                >
                                    {periodos.map((p) => (
                                        <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                                            {safefmt(p.PERIODO_INICIAL)} - {safefmt(p.PERIODO_FINAL)} del{' '}
                                            {p.CODIGO_PERIODO}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* Filtro de impresión */}
                            <Stack
                                direction="row"
                                spacing={2}
                                sx={{ mt: 2, flexWrap: 'wrap' }}
                            >
                                <FormControl sx={{ minWidth: 200 }}>
                                    <InputLabel id="filtro-label">Filtro de impresión</InputLabel>
                                    <Select
                                        labelId="filtro-label"
                                        label="Filtro de impresión"
                                        value={filtro}
                                        onChange={(e) => setFiltro(e.target.value)}
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

                            {/* Acciones generales */}
                            <Box
                                sx={{
                                    mt: 2,
                                    display: 'flex',
                                    gap: 1,
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                }}
                            >
                                <Button
                                    variant="outlined"
                                    onClick={() => cargarMatrizDefecto(periodo)}
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
                                <Alert
                                    severity={origen === 'version' ? 'success' : 'info'}
                                    sx={{ mt: 2 }}
                                >
                                    {origen === 'version'
                                        ? 'Se cargó la última versión guardada de este período.'
                                        : 'Se cargó la matriz por defecto del período.'}
                                </Alert>
                            )}
                            {headerOrigenLabel && (
                                <Typography
                                    variant="body2"
                                    sx={{ mt: 1 }}
                                    color="text.secondary"
                                >
                                    {headerOrigenLabel}
                                </Typography>
                            )}
                            {alerta && (
                                <Alert
                                    severity="warning"
                                    sx={{ mt: 2 }}
                                    onClose={() => setAlerta(null)}
                                >
                                    {alerta}
                                </Alert>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Sección de tablas */}
            {periodo && (
                <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                        {cargando ? (
                            <Typography variant="body2">Cargando…</Typography>
                        ) : matrices.length === 0 ? (
                            <Typography variant="body2">
                                Cargue la información del período para visualizarla.
                            </Typography>
                        ) : (
                            <>
                                {/* Selector de matriz */}
                                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                                    <InputLabel id="matriz-trabajar-label">
                                        Matriz a trabajar
                                    </InputLabel>
                                    <Select
                                        labelId="matriz-trabajar-label"
                                        label="Matriz a trabajar"
                                        value={String(active)}
                                        onChange={(e) => setActive(Number(e.target.value))}
                                    >
                                        {matrices.map((m, i) => {
                                            const nombre =
                                                H.get(m, 'titulo') ??
                                                `Tabla #${H.get(m, 'matriz') ?? i + 1}`;
                                            const complete = isMatrixComplete(m);
                                            const color = complete
                                                ? 'success.main'
                                                : 'error.main';
                                            return (
                                                <MenuItem
                                                    key={i}
                                                    value={String(i)}
                                                    sx={{ '& .txt': { color } }}
                                                >
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            width: 10,
                                                            height: 10,
                                                            borderRadius: '50%',
                                                            bgcolor: color,
                                                            display: 'inline-block',
                                                            mr: 1,
                                                        }}
                                                    />
                                                    <span className="txt">{nombre}</span>
                                                    <Chip
                                                        label="Obligatoria"
                                                        size="small"
                                                        sx={{ ml: 1 }}
                                                        color={complete ? 'success' : 'error'}
                                                    />
                                                </MenuItem>
                                            );
                                        })}
                                    </Select>
                                </FormControl>

                                {/* Botón Vista previa (matriz) */}
                                <Box sx={{ mb: 2 }}>
                                    <Tooltip title="Vista previa y aplicar a MATRIZ completa (solo 'Aplica' y 'Comentario')">
                                        <span>
                                            <Button
                                                size="small"
                                                startIcon={<TableChartIcon />}
                                                onClick={() => setPreviewOpen(true)}
                                                disabled={!periodo || matrices.length === 0}
                                            >
                                                Vista previa (matriz)
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </Box>

                                {/* Tabla */}
                                {mat && headers.length >= 2 && (
                                    <Box
                                        sx={{
                                            p: 2,
                                            border: '1px dashed',
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle1"
                                            sx={{ fontWeight: 600, mb: 1 }}
                                        >
                                            {H.get(mat, 'titulo') ||
                                                `Tabla #${H.get(mat, 'matriz')}`}
                                        </Typography>

                                        <TableContainer
                                            component={Box}
                                            sx={{
                                                overflowX: 'auto',
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Table
                                                stickyHeader
                                                size="small"
                                                sx={{
                                                    tableLayout: 'fixed',
                                                    minWidth: 900,
                                                    '& th, & td': {
                                                        wordBreak: 'break-word',
                                                        whiteSpace: 'normal',
                                                        verticalAlign: 'top',
                                                    },
                                                }}
                                            >
                                                <TableHead>
                                                    <TableRow>
                                                        {headers.map((h, i) => (
                                                            <TableCell
                                                                key={i}
                                                                sx={{
                                                                    fontWeight: 'bold',
                                                                    ...(i === 0
                                                                        ? {
                                                                            position:
                                                                                'sticky',
                                                                            left: 0,
                                                                            zIndex: 3,
                                                                            backgroundColor:
                                                                                'background.paper',
                                                                            minWidth: 260,
                                                                            maxWidth: 320,
                                                                        }
                                                                        : i === idxAplica
                                                                            ? {
                                                                                minWidth: 200,
                                                                            }
                                                                            : i ===
                                                                                idxComentario
                                                                                ? {
                                                                                    minWidth: 360,
                                                                                }
                                                                                : {
                                                                                    minWidth: 220,
                                                                                }),
                                                                }}
                                                            >
                                                                {h}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>

                                                <TableBody>
                                                    {(H.get(mat, 'filas') ?? []).map(
                                                        (fila, rIdx) => {
                                                            const arr = Array.isArray(fila)
                                                                ? fila
                                                                : [];
                                                            const padded =
                                                                arr.length < colCount
                                                                    ? [
                                                                        ...arr,
                                                                        ...Array(
                                                                            colCount -
                                                                            arr.length
                                                                        ).fill(null),
                                                                    ]
                                                                    : arr.slice(
                                                                        0,
                                                                        colCount
                                                                    );
                                                            const aplicaVal =
                                                                padded[idxAplica];
                                                            const comentarioVal =
                                                                padded[idxComentario];
                                                            const origenActual =
                                                                getOrigenFor(
                                                                    mat.matriz,
                                                                    padded
                                                                );

                                                            return (
                                                                <TableRow key={rIdx}>
                                                                    {padded.map(
                                                                        (celda, cIdx) => {
                                                                            if (cIdx === 0) {
                                                                                return (
                                                                                    <TableCell
                                                                                        key={
                                                                                            cIdx
                                                                                        }
                                                                                        sx={{
                                                                                            fontWeight: 500,
                                                                                            position:
                                                                                                'sticky',
                                                                                            left: 0,
                                                                                            zIndex: 2,
                                                                                            backgroundColor:
                                                                                                'background.paper',
                                                                                            minWidth: 260,
                                                                                        }}
                                                                                    >
                                                                                        <Stack
                                                                                            direction="row"
                                                                                            alignItems="center"
                                                                                            spacing={
                                                                                                1
                                                                                            }
                                                                                            sx={{
                                                                                                flexWrap:
                                                                                                    'wrap',
                                                                                            }}
                                                                                        >
                                                                                            <Box
                                                                                                sx={{
                                                                                                    flex: 1,
                                                                                                    minWidth: 180,
                                                                                                }}
                                                                                            >
                                                                                                {celda ??
                                                                                                    ''}
                                                                                            </Box>

                                                                                            {!!origenActual &&
                                                                                                origenActual !==
                                                                                                'Usuario' && (
                                                                                                    <Chip
                                                                                                        label={`Origen: ${origenActual}`}
                                                                                                        size="small"
                                                                                                        sx={{
                                                                                                            bgcolor:
                                                                                                                '#0288d1',
                                                                                                            color: '#fff',
                                                                                                            fontWeight: 600,
                                                                                                        }}
                                                                                                    />
                                                                                                )}

                                                                                            <Tooltip title="Previsualizar y copiar (solo esta fila) desde Direcciones">
                                                                                                <span>
                                                                                                    <IconButton
                                                                                                        size="small"
                                                                                                        onClick={() =>
                                                                                                            openRowPreview(
                                                                                                                rIdx
                                                                                                            )
                                                                                                        }
                                                                                                    >
                                                                                                        <VisibilityOutlined fontSize="inherit" />
                                                                                                    </IconButton>
                                                                                                </span>
                                                                                            </Tooltip>
                                                                                        </Stack>
                                                                                    </TableCell>
                                                                                );
                                                                            }

                                                                            if (
                                                                                cIdx !==
                                                                                idxAplica &&
                                                                                cIdx !==
                                                                                idxComentario
                                                                            ) {
                                                                                return (
                                                                                    <TableCell
                                                                                        key={
                                                                                            cIdx
                                                                                        }
                                                                                        sx={{
                                                                                            minWidth: 220,
                                                                                        }}
                                                                                    >
                                                                                        {celda ??
                                                                                            ''}
                                                                                    </TableCell>
                                                                                );
                                                                            }

                                                                            if (
                                                                                cIdx ===
                                                                                idxAplica
                                                                            ) {
                                                                                return (
                                                                                    <TableCell
                                                                                        key={
                                                                                            cIdx
                                                                                        }
                                                                                        sx={{
                                                                                            minWidth: 200,
                                                                                        }}
                                                                                    >
                                                                                        <TextField
                                                                                            select
                                                                                            fullWidth
                                                                                            size="small"
                                                                                            value={
                                                                                                celda ??
                                                                                                ''
                                                                                            }
                                                                                            onChange={(
                                                                                                e
                                                                                            ) =>
                                                                                                handleCellChange(
                                                                                                    rIdx,
                                                                                                    cIdx,
                                                                                                    e
                                                                                                        .target
                                                                                                        .value
                                                                                                )
                                                                                            }
                                                                                            helperText='Seleccione "Sí" o "No"'
                                                                                            required
                                                                                        >
                                                                                            <MenuItem value="Sí">
                                                                                                Sí
                                                                                            </MenuItem>
                                                                                            <MenuItem value="No">
                                                                                                No
                                                                                            </MenuItem>
                                                                                        </TextField>
                                                                                    </TableCell>
                                                                                );
                                                                            }

                                                                            const aplicaEsNo =
                                                                                H.isNo(
                                                                                    aplicaVal
                                                                                );
                                                                            const comentarioRequerido =
                                                                                !aplicaEsNo;
                                                                            const comentarioVacio =
                                                                                !comentarioVal ||
                                                                                String(
                                                                                    comentarioVal
                                                                                )
                                                                                    .trim()
                                                                                    .toString() ===
                                                                                '';

                                                                            return (
                                                                                <TableCell
                                                                                    key={
                                                                                        cIdx
                                                                                    }
                                                                                    sx={{
                                                                                        minWidth: 360,
                                                                                    }}
                                                                                >
                                                                                    <TextField
                                                                                        fullWidth
                                                                                        multiline
                                                                                        rows={
                                                                                            isMobile
                                                                                                ? 2
                                                                                                : 3
                                                                                        }
                                                                                        size="small"
                                                                                        value={
                                                                                            celda ??
                                                                                            ''
                                                                                        }
                                                                                        placeholder={
                                                                                            aplicaEsNo
                                                                                                ? 'Comentario (opcional por "No")'
                                                                                                : 'Comentario (requerido por "Sí")'
                                                                                        }
                                                                                        onChange={(
                                                                                            e
                                                                                        ) =>
                                                                                            handleCellChange(
                                                                                                rIdx,
                                                                                                cIdx,
                                                                                                e
                                                                                                    .target
                                                                                                    .value
                                                                                            )
                                                                                        }
                                                                                        inputProps={{
                                                                                            style: {
                                                                                                lineHeight:
                                                                                                    1.3,
                                                                                            },
                                                                                        }}
                                                                                        helperText={
                                                                                            aplicaEsNo
                                                                                                ? 'Opcional porque seleccionó "No"'
                                                                                                : 'Requerido si selecciona "Sí"'
                                                                                        }
                                                                                        error={
                                                                                            comentarioRequerido &&
                                                                                            comentarioVacio
                                                                                        }
                                                                                    />
                                                                                </TableCell>
                                                                            );
                                                                        }
                                                                    )}
                                                                </TableRow>
                                                            );
                                                        }
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                        <Box
                                            sx={{
                                                mt: 1,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: 1,
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Solo “Aplica” y “Comentario” tienen
                                                edición o copia desde Direcciones (con
                                                vista previa).
                                            </Typography>
                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<PictureAsPdfIcon />}
                                                    onClick={() =>
                                                        openSupFor({
                                                            type: 'single',
                                                            matrizIndex: active,
                                                        })
                                                    }
                                                >
                                                    Imprimir solamente esta tabla
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<GridOnRounded />}
                                                    onClick={handleExportExcelSingle}
                                                >
                                                    Excel
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<DescriptionRounded />}
                                                    onClick={handleExportWordSingle}
                                                >
                                                    Word
                                                </Button>
                                            </Stack>
                                        </Box>
                                    </Box>
                                )}

                                {alerta && (
                                    <Alert
                                        severity="warning"
                                        sx={{ mb: 1, mt: 2 }}
                                        onClose={() => setAlerta(null)}
                                    >
                                        {alerta}
                                    </Alert>
                                )}

                                <Box sx={{ mt: 3 }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleGuardar}
                                        disabled={
                                            !periodo || guardando || matrices.length === 0
                                        }
                                    >
                                        {guardando ? 'Guardando…' : 'Guardar'}
                                    </Button>
                                </Box>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Diálogo Vista Previa (MATRIZ) */}
            <Dialog
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>Vista previa de aplicación desde Direcciones</DialogTitle>
                <DialogContent dividers>
                    {/* Selector de Dirección para TODA la matriz */}
                    {mat && (
                        <Stack
                            direction="row"
                            spacing={2}
                            sx={{ mb: 2 }}
                            alignItems="center"
                        >
                            <Typography variant="body2" sx={{ minWidth: 160 }}>
                                Dirección a copiar:
                            </Typography>
                            <FormControl size="small" sx={{ minWidth: 220 }}>
                                <Select
                                    value={matrixPreviewSiglas}
                                    onChange={(e) =>
                                        setMatrixPreviewSiglas(e.target.value)
                                    }
                                    displayEmpty
                                    renderValue={(v) =>
                                        v ? (
                                            <Chip
                                                label={v}
                                                size="small"
                                                sx={{
                                                    bgcolor: '#0288d1',
                                                    color: '#fff',
                                                    fontWeight: 600,
                                                }}
                                            />
                                        ) : (
                                            <span style={{ opacity: 0.7 }}></span>
                                        )
                                    }
                                >
                                    <MenuItem value=""></MenuItem>
                                    {getSiglasForMatrix(mat.matriz).map((sig) => (
                                        <MenuItem key={sig} value={sig}>
                                            {sig}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                    )}

                    {(() => {
                        const build = buildPreview;
                        if (!build)
                            return (
                                <Typography variant="body2">Cargando…</Typography>
                            );
                        return (
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    Matriz #{build.matrizNum} · Cambios detectados:{' '}
                                    <b>{build.changeCount}</b>
                                </Typography>
                                <Divider sx={{ my: 2 }} />
                                <TableContainer
                                    component={Box}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        maxHeight: 520,
                                    }}
                                >
                                    <Table
                                        size="small"
                                        stickyHeader
                                        sx={{
                                            tableLayout: 'fixed',
                                            minWidth: 900,
                                            '& th, & td': {
                                                wordBreak: 'break-word',
                                                whiteSpace: 'normal',
                                                verticalAlign: 'top',
                                            },
                                        }}
                                    >
                                        <TableHead>
                                            <TableRow>
                                                {build.headers.map((h, i) => (
                                                    <TableCell
                                                        key={i}
                                                        sx={{
                                                            fontWeight: 'bold',
                                                            ...(i === build.idxA
                                                                ? { minWidth: 200 }
                                                                : i === build.idxC
                                                                    ? { minWidth: 360 }
                                                                    : i === 0
                                                                        ? {
                                                                            position: 'sticky',
                                                                            left: 0,
                                                                            zIndex: 3,
                                                                            backgroundColor:
                                                                                'background.paper',
                                                                            minWidth: 260,
                                                                            maxWidth: 320,
                                                                        }
                                                                        : { minWidth: 220 }),
                                                        }}
                                                    >
                                                        {h}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {build.rows.map(
                                                (
                                                    {
                                                        before,
                                                        after,
                                                        changeA,
                                                        changeC,
                                                    },
                                                    rIdx
                                                ) => (
                                                    <TableRow key={rIdx}>
                                                        {after.map((val, cIdx) => {
                                                            if (cIdx === 0)
                                                                return (
                                                                    <TableCell
                                                                        key={cIdx}
                                                                        sx={{
                                                                            position:
                                                                                'sticky',
                                                                            left: 0,
                                                                            zIndex: 2,
                                                                            backgroundColor:
                                                                                'background.paper',
                                                                            fontWeight: 500,
                                                                            minWidth: 260,
                                                                        }}
                                                                    >
                                                                        {val ?? ''}
                                                                    </TableCell>
                                                                );
                                                            const highlight =
                                                                (cIdx ===
                                                                    build.idxA &&
                                                                    changeA) ||
                                                                (cIdx ===
                                                                    build.idxC &&
                                                                    changeC);
                                                            const showVal =
                                                                cIdx ===
                                                                    build.idxA ||
                                                                    cIdx === build.idxC
                                                                    ? val
                                                                    : before[cIdx];
                                                            return (
                                                                <TableCell
                                                                    key={cIdx}
                                                                    sx={{
                                                                        minWidth:
                                                                            cIdx ===
                                                                                build.idxC
                                                                                ? 360
                                                                                : 200,
                                                                        backgroundColor:
                                                                            highlight
                                                                                ? '#fff59d'
                                                                                : undefined,
                                                                    }}
                                                                >
                                                                    {showVal ?? ''}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        mt: 1,
                                        display: 'block',
                                        color: 'text.secondary',
                                    }}
                                >
                                    Amarillo = valores de “Aplica” / “Comentario” que se
                                    copiarán desde Direcciones.
                                </Typography>
                            </Box>
                        );
                    })()}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>Cerrar</Button>
                    <Button
                        variant="contained"
                        onClick={aplicarSugerenciasMatriz}
                        disabled={!buildPreview || buildPreview.changeCount === 0}
                    >
                        Aplicar sugerencias
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo Vista Previa FILA */}
            <Dialog
                open={rowPreview.open}
                onClose={() =>
                    setRowPreview({ open: false, rowIdx: -1, sugIdx: 0 })
                }
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Previsualización — Copiar solo esta fila</DialogTitle>
                <DialogContent dividers>
                    {!rowPreviewContent ? (
                        <Typography variant="body2">Cargando…</Typography>
                    ) : (
                        <Box>
                            {rowPreviewContent.list?.length > 1 && (
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    Esta fila tiene {rowPreviewContent.list.length}{' '}
                                    posibles orígenes; selecciona cuál copiar.
                                </Typography>
                            )}

                            <FormControl size="small" sx={{ minWidth: 220, mb: 2 }}>
                                <InputLabel id="row-origin-label">Dirección</InputLabel>
                                <Select
                                    labelId="row-origin-label"
                                    label="Dirección"
                                    value={rowPreview.sugIdx}
                                    onChange={(e) =>
                                        setRowPreview((prev) => ({
                                            ...prev,
                                            sugIdx: Number(e.target.value),
                                        }))
                                    }
                                >
                                    {rowPreviewContent.list.map((s, i) => (
                                        <MenuItem key={i} value={i}>
                                            {s.siglas}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TableContainer
                                component={Box}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                }}
                            >
                                <Table
                                    size="small"
                                    sx={{ tableLayout: 'fixed', minWidth: 700 }}
                                >
                                    <TableHead>
                                        <TableRow>
                                            {rowPreviewContent.headers.map((h, i) => (
                                                <TableCell
                                                    key={i}
                                                    sx={{
                                                        fontWeight: 'bold',
                                                        minWidth:
                                                            i === rowPreviewContent.idxC
                                                                ? 300
                                                                : i ===
                                                                    rowPreviewContent.idxA
                                                                    ? 180
                                                                    : 200,
                                                    }}
                                                >
                                                    {h}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <TableRow>
                                            {rowPreviewContent.after.map((val, cIdx) => {
                                                if (cIdx === 0)
                                                    return (
                                                        <TableCell
                                                            key={cIdx}
                                                            sx={{ fontWeight: 500 }}
                                                        >
                                                            {val ?? ''}
                                                        </TableCell>
                                                    );
                                                const highlight =
                                                    (cIdx ===
                                                        rowPreviewContent.idxA &&
                                                        rowPreviewContent.changeA) ||
                                                    (cIdx ===
                                                        rowPreviewContent.idxC &&
                                                        rowPreviewContent.changeC);
                                                const showVal =
                                                    cIdx === rowPreviewContent.idxA ||
                                                        cIdx === rowPreviewContent.idxC
                                                        ? val
                                                        : rowPreviewContent.before[cIdx];
                                                return (
                                                    <TableCell
                                                        key={cIdx}
                                                        sx={{
                                                            backgroundColor: highlight
                                                                ? '#fff59d'
                                                                : undefined,
                                                        }}
                                                    >
                                                        {showVal ?? ''}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Typography
                                variant="caption"
                                sx={{
                                    mt: 1,
                                    display: 'block',
                                    color: 'text.secondary',
                                }}
                            >
                                Amarillo = campos de “Aplica” / “Comentario” que
                                cambiarán al aplicar esta fila.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() =>
                            setRowPreview({
                                open: false,
                                rowIdx: -1,
                                sugIdx: 0,
                            })
                        }
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={applyRowPreview}
                        disabled={!rowPreviewContent}
                    >
                        Aplicar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo superior */}
            <Dialog open={openSup} onClose={closeSup} fullWidth maxWidth="sm">
                <DialogTitle>Confirmar información del superior</DialogTitle>
                <DialogContent dividers>
                    {loadingSup && (
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ mb: 2 }}
                        >
                            <CircularProgress size={18} />{' '}
                            <span>Cargando datos…</span>
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
                    <Button
                        onClick={confirmarYImprimir}
                        variant="contained"
                        disabled={confirmingSup}
                    >
                        {confirmingSup ? 'Generando…' : 'Confirmar e imprimir'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar global */}
            <Snackbar
                open={snack.open}
                autoHideDuration={6000}
                onClose={handleCloseSnack}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnack}
                    severity={snack.sev}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
