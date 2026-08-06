/**
 * @fileoverview
 * Formulario principal para captura y edición del Anexo 2 a nivel de unidad.
 *
 * @module Riesgos/Anexo 2/Anexo2Form.jsx
 * @version 1.0
 * @author Equipo
 */

import { useEffect, useMemo, useState } from 'react';
import apiClient from 'api/apiClient';
import {
    Box, Card, CardHeader, CardContent, Typography, FormControl, InputLabel, Select, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Stepper, Step, StepButton,
    MobileStepper, Button, Stack, TextField, Alert, Chip, useMediaQuery, useTheme, Snackbar,
    RadioGroup, FormControlLabel, Radio, Checkbox, Dialog, DialogTitle, DialogContent,
    DialogActions, LinearProgress, Grid, TablePagination
} from '@mui/material';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { safefmt as fmt } from 'funciones/Fechas';
import { GenerarReporteAnexo2DesdeUltimo } from 'Riesgos/Reportes F/Matrices/ReportesAnexo2';
import Anexo2ExcelIO from './Anexo2ExcelIO';
import CargaArchivos from 'Riesgos/Carga Documentos/CargaArchivos';

const parseMaybeJSON = (val) => {
    if (val == null) return null;
    if (typeof val === 'string') { try { return JSON.parse(val); } catch { return null; } }
    return val;
};
const normalizeMatrices = (list = []) =>
    list.map((m, i) => {
        const columnas = parseMaybeJSON(m.columnas ?? m.COLUMNAS) ?? { headers: [] };
        const filas = parseMaybeJSON(m.filas ?? m.FILAS) ?? [];
        const comentario_tabla =
            m.comentario_tabla ??
            m.COMENTARIO_TABLA ??
            (parseMaybeJSON(m.meta ?? m.META)?.comentario_tabla ?? '');

        return {
            matriz: m.matriz ?? m.MATRIZ ?? i + 1,
            titulo: (m.titulo ?? m.TITULO ?? '').toString(),
            columnas,
            filas,
            comentario_tabla: typeof comentario_tabla === 'string' ? comentario_tabla : ''
        };
    });
const get = (obj, k) => obj?.[k] ?? obj?.[k?.toUpperCase?.()] ?? null;
const isNo = (v) => String(v ?? '').trim().toLowerCase() === 'no';

function Anexo2Form() {
    const [unidad, setUnidad] = useState('');
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState('');

    const [historial, setHistorial] = useState([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [sel, setSel] = useState(null);

    const [page, setPage] = useState(0);
    const rowsPerPage = 5;

    const [matrices, setMatrices] = useState([]);
    const [active, setActive] = useState(0);

    const [cargandoDefecto, setCargandoDefecto] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [alerta, setAlerta] = useState(null);
    const [logo, setLogo] = useState('');

    const [printFilter, setPrintFilter] = useState('all');
    const [printIndicesStr, setPrintIndicesStr] = useState('');
    const [includeEmpty, setIncludeEmpty] = useState(true);
    const [printOptsCache, setPrintOptsCache] = useState(null);

    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [pdfLoadingData, setPdfLoadingData] = useState(false);
    const [pdfError, setPdfError] = useState('');
    const [respNombre, setRespNombre] = useState('');
    const [respPuesto, setRespPuesto] = useState('');

    const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

    const theme = useTheme();
    const isMobile = useMediaQuery(`(max-width:${theme.breakpoints.values.md}px)`);

    const mat = matrices[active] || null;
    const headers = Array.isArray(mat?.columnas?.headers) ? mat.columnas.headers : [];
    const colCount = headers.length;
    const idxAplica = Math.max(0, colCount - 2);
    const idxComentario = Math.max(0, colCount - 1);

    const obtenerUnidad = async () => {
        try {
            const res = await apiClient.get('/api/responsables-actualizados/obtener-mi-unidad');
            const u = res.data?.data;
            setUnidad(u ? (u.NOMBRE + (u.SIGLAS ? ` (${u.SIGLAS})` : '')) : '');
        } catch { setUnidad(''); }
    };

    const obtenerPeriodos = async () => {
        try {
            const { data } = await apiClient.get('/api/periodos-actualizados');
            setPeriodos(data.result ?? data ?? []);
        } catch { setPeriodos([]); }
    };

    const obtenerLogo = async () => {
        try {
            const { data } = await apiClient.get('/api/reportes-actualizados/obtener-logo');
            setLogo('data:image/png;base64,' + (data.logo ?? ''));
        } catch (e) {
            console.error('Error cargando logo', e);
        }
    };

    useEffect(() => { obtenerUnidad(); obtenerPeriodos(); obtenerLogo(); }, []);

    const handleCargarDefecto = async () => {
        if (!periodo) return;
        try {
            setCargandoDefecto(true);
            const { data } = await apiClient.get('/api/segunda-matriz-actualizados/matriz-defecto', {
                params: { periodo }
            });
            const arr = Array.isArray(data?.matrices) ? normalizeMatrices(data.matrices) : [];
            setMatrices(arr);
            setActive(0);
            setAlerta(null);
        } catch (e) {
            console.error('Error cargando matriz por defecto', e);
            setMatrices([]); setActive(0);
            setAlerta('No fue posible cargar la matriz por defecto del período seleccionado.');
        } finally {
            setCargandoDefecto(false);
        }
    };

    const obtenerHistorial = async () => {
        if (!periodo) return;

        setCargandoHistorial(true);
        setHistorial([]); setSel(null); setMatrices([]); setActive(0); setAlerta(null);
        setPage(0);

        try {
            const { data } = await apiClient.get('/api/segunda-matriz-actualizados/estado-historial', {
                params: { periodo }
            });

            const lista = Array.isArray(data?.historial) ? data.historial : [];
            if (lista.length === 0) {
                await handleCargarDefecto();
            } else {
                setHistorial(lista);
                const ultimo = lista[0] || null;
                setSel(ultimo);

                const mats = Array.isArray(ultimo?.RESPUESTA?.matrices)
                    ? normalizeMatrices(ultimo.RESPUESTA.matrices)
                    : [];

                if (mats.length > 0) {
                    setMatrices(mats);
                    setActive(0);
                } else {
                    await handleCargarDefecto();
                }
            }

            if (data?.defecto === 'N') {
                setAlerta('Está trabajando sobre una versión antigua de la matriz, cargue la versión por defecto para actualizar.');
            }
        } catch (e) {
            console.error('Error cargando historial', e);
            await handleCargarDefecto();
        } finally {
            setCargandoHistorial(false);
        }
    };

    useEffect(() => {
        setMatrices([]); setActive(0); setAlerta(null); setHistorial([]); setSel(null);
        if (periodo) obtenerHistorial();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodo]);

    const next = () => setActive(a => Math.min(a + 1, Math.max(0, matrices.length - 1)));
    const prev = () => setActive(a => Math.max(a - 1, 0));

    const handleCellChange = (rowIdx, colIdx, value) => {
        if (!mat) return;
        if (colIdx !== idxAplica && colIdx !== idxComentario) return;

        setMatrices(prev => {
            const copy = (typeof structuredClone === 'function') ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
            const m = copy[active];
            const filas = Array.isArray(m.filas) ? m.filas : (m.filas = []);
            if (!Array.isArray(filas[rowIdx])) filas[rowIdx] = [];
            while (filas[rowIdx].length < colCount) filas[rowIdx].push(null);

            filas[rowIdx][colIdx] = value ?? '';
            if (filas[rowIdx][idxAplica] == null) filas[rowIdx][idxAplica] = '';
            if (filas[rowIdx][idxComentario] == null) filas[rowIdx][idxComentario] = '';
            return copy;
        });
    };

    /**
     * Marca la columna "Aplica" de todas las filas de la matriz actual
     * con "Sí" o "No". Sobrescribe lo que haya actualmente.
     */
    const handleSetAllAplica = (value) => {
        if (!mat || !value) return;

        setMatrices(prev => {
            const copy = (typeof structuredClone === 'function') ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
            const m = copy[active];
            if (!m) return prev;

            const filas = Array.isArray(m.filas) ? m.filas : (m.filas = []);
            if (colCount === 0) return prev;

            for (let r = 0; r < filas.length; r++) {
                if (!Array.isArray(filas[r])) filas[r] = [];
                while (filas[r].length < colCount) filas[r].push(null);
                filas[r][idxAplica] = value;
                if (filas[r][idxComentario] == null) filas[r][idxComentario] = '';
            }

            return copy;
        });
    };

    const hayVacios = () => {
        for (const m of matrices) {
            const hs = get(get(m, 'columnas'), 'headers') || [];
            const len = hs.length, a = Math.max(0, len - 2), c = Math.max(0, len - 1);
            const filas = get(m, 'filas') || [];
            for (const row of filas) {
                const padded = Array.isArray(row)
                    ? (row.length < len ? [...row, ...Array(len - row.length).fill(null)] : row)
                    : Array(len).fill(null);
                const va = padded[a];
                const vc = padded[c];
                if (!va || String(va).trim() === '') return true;
                if (!isNo(va) && (!vc || String(vc).trim() === '')) return true;
            }
        }
        return false;
    };

    const isMatrixComplete = (m) => {
        if (!m) return false;
        const hs = get(get(m, 'columnas'), 'headers') || [];
        const len = hs.length;
        if (len < 2) return false;
        const a = Math.max(0, len - 2), c = Math.max(0, len - 1);
        const filas = get(m, 'filas') || [];
        for (const row of filas) {
            const padded = Array.isArray(row)
                ? (row.length < len ? [...row, ...Array(len - row.length).fill(null)] : row)
                : Array(len).fill(null);
            const va = padded[a];
            const vc = padded[c];
            if (!va || String(va).trim() === '') return false;
            if (!isNo(va) && (!vc || String(vc).trim() === '')) return false;
        }
        return true;
    };

    const handleGuardar = async () => {
        if (hayVacios()) setAlerta('Revise: "Aplica" es obligatorio; "Comentario" es obligatorio solo si Aplica es "Sí". Igual se guardará su avance.');
        else setAlerta(null);

        const payload = {
            periodo,
            matrices: matrices.map((m, i) => ([
                'matriz', get(m, 'matriz') ?? get(m, 'MATRIZ') ?? i + 1,
                'titulo', get(m, 'titulo') ?? get(m, 'TITULO') ?? null,
                'columnas', get(m, 'columnas') ?? get(m, 'COLUMNAS'),
                'filas', get(m, 'filas') ?? get(m, 'FILAS'),
                'comentario_tabla', get(m, 'comentario_tabla') ?? get(m, 'COMENTARIO_TABLA') ?? ''
            ]).reduce((acc, cur, idx, arr) => (idx % 2 === 0 ? { ...acc, [cur]: arr[idx + 1] } : acc), {}))
        };

        try {
            setGuardando(true);
            await apiClient.post('/api/segunda-matriz-actualizados/guardar-respuesta', payload);
            setSnack({ open: true, msg: 'Guardado exitoso', sev: 'success' });
            obtenerHistorial();
        } catch (e) {
            console.error('Error guardando matrices', e);
            setAlerta('Ocurrió un error al guardar. Intenta de nuevo.');
            setSnack({ open: true, msg: 'Ocurrió un error al guardar. Intenta de nuevo.', sev: 'error' });
        } finally {
            setGuardando(false);
        }
    };

    const openPdfModal = async () => {
        if (!periodo || !(sel?.RESPUESTA)) {
            setSnack({
                open: true,
                msg: 'Seleccione un período y asegúrese de tener una versión con respuesta para imprimir.',
                sev: 'warning'
            });
            return;
        }
        setPdfError('');
        setPdfModalOpen(true);
        setPdfLoadingData(true);

        try {
            const { data } = await apiClient.get('/api/reportes-actualizados/obtener-superior', {
                params: { periodo }
            });
            const sup = data?.data ?? data ?? {};
            setRespNombre(sup.NOMBRE_SUPERIOR ?? sup.nombre ?? sup.NOMBRE ?? '');
            setRespPuesto(sup.PUESTO_SUPERIOR ?? sup.puesto ?? sup.CARGO ?? '');
        } catch (e) {
            setPdfError('No fue posible obtener la información del superior. Puedes editar manualmente.');
            setRespNombre(''); setRespPuesto('');
        } finally {
            setPdfLoadingData(false);
        }
    };

    const confirmarImprimir = () => {
        if (!sel?.RESPUESTA || !periodo) return;
        const opts = printOptsCache || { filter: 'all', includeEmpty: true };
        const optsFinal = { ...opts, responsable: { nombre: respNombre || '', puesto: respPuesto || '' } };
        GenerarReporteAnexo2DesdeUltimo(sel, periodo, logo, unidad, optsFinal);
        setPdfModalOpen(false);
    };

    const handleImprimir = () => {
        const opts = { filter: printFilter, includeEmpty };
        if (printFilter === 'indices') {
            const arr = parseIndices(printIndicesStr);
            if (arr.length === 0) {
                setSnack({
                    open: true,
                    msg: 'Ingrese al menos un índice válido (ej.: 1,3,5 o rangos 2-4).',
                    sev: 'warning'
                });
                return;
            }
            opts.indices = arr;
        }
        setPrintOptsCache(opts);
        openPdfModal();
    };

    const parseIndices = (txt) => {
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

    const chipEstadoForm = (v) => {
        const map = {
            R: { label: 'Rechazado', color: 'error' }, A: { label: 'Aceptado', color: 'success' },
            M: { label: 'Modificado', color: 'info' }, I: { label: 'Ingresado', color: 'default' }
        };
        const meta = map[v] || { label: v || '—', color: 'default' };
        return <Chip label={meta.label} color={meta.color} size="small" />;
    };

    const chipEstadoFormConsolidador = (v) => {
            const map = {
                R: { label: 'Se necesita revisión', color: 'error' }, A: { label: 'Recibido', color: 'success' },
                M: { label: 'Modificado', color: 'info' }, I: { label: 'Ingresado', color: 'default' }
            };
            const meta = map[v] || { label: v || '—', color: 'default' };
            return <Chip label={meta.label} color={meta.color} size="small" />;
        };

    const totalHistorial = Array.isArray(historial) ? historial.length : 0;
    const pagedHistorial = useMemo(() => {
        const start = page * rowsPerPage;
        return (historial || []).slice(start, start + rowsPerPage);
    }, [historial, page]);

    const handleCloseSnack = (_e, reason) => {
        if (reason === 'clickaway') return;
        setSnack(prev => ({ ...prev, open: false }));
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Entrada de riesgos de fraude o corrupción
            </Typography>

            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader title={unidad || '—'} />
                <CardContent>
                    {periodos.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No hay períodos disponibles.</Typography>
                    ) : (
                        <>
                            <FormControl fullWidth>
                                <InputLabel id="periodo-label">Seleccione un período</InputLabel>
                                <Select
                                    labelId="periodo-label"
                                    label="Seleccione un período"
                                    value={periodo}
                                    onChange={(e) => setPeriodo(e.target.value)}
                                >
                                    {periodos.map((p) => (
                                        <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                                            {fmt(p.PERIODO_INICIAL)} - {fmt(p.PERIODO_FINAL)} del {p.CODIGO_PERIODO}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                <Button
                                    variant="outlined"
                                    onClick={handleCargarDefecto}
                                    disabled={!periodo || cargandoDefecto}
                                >
                                    {cargandoDefecto ? 'Cargando…' : 'Matriz por defecto'}
                                </Button>

                                <Anexo2ExcelIO
                                    matrices={matrices}
                                    setMatrices={setMatrices}
                                    periodo={periodo}
                                    setActive={setActive}
                                    setAlerta={setAlerta}
                                    disabled={!periodo || matrices.length === 0}
                                    size="medium"
                                    variant="outlined"
                                    loadingUI="dialog"
                                />
                            </Box>
                        </>
                    )}
                </CardContent>
            </Card>
            {periodo && <CargaArchivos flag={2} periodo={periodo} />}

            {periodo && (
                <Card sx={{ borderRadius: 2, mt: 2, mb: 2 }}>
                    <CardHeader title="Información ingresada del formulario" />
                    <CardContent>
                        <TableContainer component={Box} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflowX: 'auto' }}>
                            <Table size="small" stickyHeader sx={{ minWidth: 700 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell colSpan={2}></TableCell>
                                        <TableCell align="center" colSpan={3} style={{ fontWeight: 700, backgroundColor: "#f5f5f5" }}>
                                            Superior
                                        </TableCell>
                                        <TableCell align="center" colSpan={3} style={{ fontWeight: 700, backgroundColor: "#f5f5f5" }}>
                                            Encargado de supervisar
                                        </TableCell>
                                    </TableRow>

                                    <TableRow>
                                        <TableCell style={{ fontWeight: 700 }}>Usuario que ingresó información</TableCell>
                                        <TableCell style={{ fontWeight: 700 }}>Fecha</TableCell>
                                        <TableCell style={{ fontWeight: 700 }}>Estado</TableCell>
                                        <TableCell style={{ fontWeight: 700 }}>Nombre Superior</TableCell>
                                        <TableCell style={{ fontWeight: 700 }}>Comentario</TableCell>
                                        <TableCell style={{ fontWeight: 700 }}>Estado</TableCell>
                                        <TableCell style={{ fontWeight: 700 }}>Nombre Supervisor</TableCell>
                                        <TableCell style={{ fontWeight: 700 }}>Comentario</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {cargandoHistorial ? (
                                        <TableRow><TableCell colSpan={8}>Cargando…</TableCell></TableRow>
                                    ) : (totalHistorial > 0) ? (
                                        pagedHistorial.map((h, i) => {
                                            const seleccionado = sel && String(h.CODIGO_HISTORIAL) === String(sel.CODIGO_HISTORIAL);
                                            return (
                                                <TableRow
                                                    key={h.CODIGO_HISTORIAL ?? `${page}-${i}`}
                                                    hover
                                                    selected={!!seleccionado}
                                                    sx={{ cursor: 'default' }}
                                                >
                                                    <TableCell>{h.NOMBRE_USUARIO_CREACION}</TableCell>
                                                    <TableCell>{h.FECHA_CREACION ? new Date(h.FECHA_CREACION).toLocaleString() : '—'}</TableCell>                                                   
                                                    <TableCell>{(i === 0 && page === 0) ? chipEstadoForm(h.ESTADO_SUPERIOR) :
                                                        ((i + 1) + rowsPerPage * page === totalHistorial) ? chipEstadoForm('I') :
                                                            '-'
                                                    }</TableCell>
                                                    <TableCell>{h.NOMBRE_USUARIO_SUPERIOR ?? '—'}</TableCell>
                                                    <TableCell>{h.COMENTARIO_SUPERIOR ?? '—'}</TableCell>
                                                    <TableCell>{
                                                        (i === 0 && page === 0) ? chipEstadoFormConsolidador(h.ESTADO) :
                                                            ((i + 1) + rowsPerPage * page === totalHistorial) ? chipEstadoFormConsolidador('I') :
                                                                '-'
                                                    }</TableCell>
                                                    <TableCell>{h.NOMBRE_USUARIO_MODIFICACION ?? '—'}</TableCell>
                                                    <TableCell>{h.COMENTARIO_SUPERVISOR ?? '—'}</TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow><TableCell colSpan={8} align="center">Sin versiones guardadas</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TablePagination
                            component="div"
                            count={totalHistorial}
                            page={page}
                            onPageChange={(_e, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            rowsPerPageOptions={[5]}
                        />

                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Opciones de impresión</Typography>

                            <RadioGroup row value={printFilter} onChange={(e) => { setIncludeEmpty(true); setPrintFilter(e.target.value); }}>
                                <FormControlLabel value="all" control={<Radio />} label="Todas" />
                                <FormControlLabel value="indices" control={<Radio />} label="Por índice" />
                            </RadioGroup>

                            {printFilter === 'indices' && (
                                <TextField
                                    size="small"
                                    label="Índices (1-based)"
                                    placeholder="Ej.: 1,3,5-7"
                                    value={printIndicesStr}
                                    onChange={(e) => setPrintIndicesStr(e.target.value)}
                                    sx={{ maxWidth: 360 }}
                                    helperText="Use comas para separar. Ej.: 2,4,7"
                                />
                            )}

                            {printFilter !== 'indices' && (
                                <FormControlLabel
                                    control={<Checkbox checked={includeEmpty} onChange={(e) => setIncludeEmpty(e.target.checked)} />}
                                    label="Incluir tablas vacías"
                                />
                            )}

                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PictureAsPdfIcon />}
                                    disabled={!periodo || !sel || !sel.RESPUESTA}
                                    onClick={() => {
                                        const opts = { filter: printFilter, includeEmpty };
                                        if (printFilter === 'indices') {
                                            const indices = parseIndices(printIndicesStr);
                                            if (indices.length === 0) {
                                                setSnack({
                                                    open: true,
                                                    msg: 'Ingrese al menos un índice válido (1,3 o rango 2-4).',
                                                    sev: 'warning'
                                                });
                                                return;
                                            }
                                            opts.indices = indices;
                                        }
                                        setPrintOptsCache(opts);
                                        openPdfModal();
                                    }}
                                >
                                    Generar reporte
                                </Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {periodo && (
                <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                        {matrices.length === 0 ? (
                            <Typography variant="body2">Cargue la matriz por defecto para comenzar.</Typography>
                        ) : (
                            <>
                                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                    <InputLabel id="matriz-trabajar-label">Matriz a trabajar</InputLabel>
                                    <Select
                                        labelId="matriz-trabajar-label"
                                        label="Matriz a trabajar"
                                        value={String(active)}
                                        onChange={(e) => setActive(Number(e.target.value))}
                                    >
                                        {matrices.map((m, i) => {
                                            const nombre = get(m, 'titulo') ?? get(m, 'TITULO') ?? `Tabla #${get(m, 'matriz') ?? get(m, 'MATRIZ') ?? i + 1}`;
                                            return <MenuItem key={i} value={String(i)}>{nombre}</MenuItem>;
                                        })}
                                    </Select>
                                </FormControl>
                                <Typography variant="body2" sx={{ mb: 2, color: 'error.main' }}>
                                    Tabla obligatoria
                                </Typography>

                                {mat && (
                                    <Box sx={{ p: 2, border: '1px dashed', borderRadius: 2 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                            {get(mat, 'titulo') ?? get(mat, 'TITULO') ?? `Tabla #${get(mat, 'matriz') ?? get(mat, 'MATRIZ')}`}
                                        </Typography>

                                        {/* Controles para marcar "Aplica" en todas las filas */}
                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={1}
                                            alignItems="center"
                                            sx={{ mb: 1 }}
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                Rellenar columna "Aplica" para todas las filas:
                                            </Typography>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleSetAllAplica('Sí')}
                                            >
                                                Marcar "Sí" en todas
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleSetAllAplica('No')}
                                            >
                                                Marcar "No" en todas
                                            </Button>
                                        </Stack>

                                        <TableContainer sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                            <Table stickyHeader size="small" sx={{ '& th, & td': { wordBreak: 'break-word', whiteSpace: 'pre-line', verticalAlign: 'top' } }}>
                                                <TableHead>
                                                    <TableRow>
                                                        {headers.map((h, i) => (
                                                            <TableCell
                                                                key={i}
                                                                sx={{
                                                                    fontWeight: 'bold',
                                                                    ...(i === 0
                                                                        ? { position: 'sticky', left: 0, zIndex: 3, backgroundColor: 'background.paper', minWidth: 200, maxWidth: 260 }
                                                                        : { minWidth: 220 })
                                                                }}
                                                            >
                                                                {h}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {(mat?.filas ?? []).map((fila, rIdx) => {
                                                        const arr = Array.isArray(fila) ? fila : [];
                                                        const padded = arr.length < colCount ? [...arr, ...Array(colCount - arr.length).fill(null)] : arr.slice(0, colCount);
                                                        const aplicaVal = padded[idxAplica];
                                                        const comentarioVal = padded[idxComentario];

                                                        return (
                                                            <TableRow key={rIdx}>
                                                                {padded.map((celda, cIdx) => {
                                                                    const isEditable = (cIdx === idxAplica || cIdx === idxComentario);

                                                                    if (cIdx === 0) {
                                                                        return (
                                                                            <TableCell key={cIdx} sx={{ fontWeight: 500, position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'background.paper', minWidth: 200, maxWidth: 260 }}>
                                                                                {celda ?? ''}
                                                                            </TableCell>
                                                                        );
                                                                    }

                                                                    if (!isEditable) {
                                                                        return <TableCell key={cIdx} sx={{ minWidth: 220 }}>{celda ?? ''}</TableCell>;
                                                                    }

                                                                    if (cIdx === idxAplica) {
                                                                        return (
                                                                            <TableCell key={cIdx} sx={{ minWidth: 160 }}>
                                                                                <TextField
                                                                                    select fullWidth size="small"
                                                                                    value={celda ?? ''}
                                                                                    onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                                                                    helperText='Seleccione "Sí" o "No"'
                                                                                    required
                                                                                >
                                                                                    <MenuItem value="Sí">Sí</MenuItem>
                                                                                    <MenuItem value="No">No</MenuItem>
                                                                                </TextField>
                                                                            </TableCell>
                                                                        );
                                                                    }

                                                                    const aplicaEsNo = isNo(aplicaVal);
                                                                    const comentarioRequerido = !aplicaEsNo;
                                                                    const comentarioVacio = !comentarioVal || String(comentarioVal).trim() === '';

                                                                    return (
                                                                        <TableCell key={cIdx} sx={{ minWidth: 320 }}>
                                                                            <TextField
                                                                                fullWidth
                                                                                multiline
                                                                                rows={isMobile ? 2 : 4}
                                                                                size="small"
                                                                                value={celda ?? ''}
                                                                                placeholder={aplicaEsNo ? 'Comentario (opcional por "No")' : 'Comentario (requerido por "Sí")'}
                                                                                onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                                                                inputProps={{ style: { lineHeight: 1.3 } }}
                                                                                helperText={aplicaEsNo ? 'Opcional porque seleccionó "No"' : 'Requerido si selecciona "Sí"'}
                                                                                error={comentarioRequerido && comentarioVacio}
                                                                            />
                                                                        </TableCell>
                                                                    );
                                                                })}
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                        <Box sx={{ mb: 2, mt: 2 }}>
                                            <TextField
                                                label="Comentario de esta tabla (opcional)"
                                                placeholder="Notas o consideraciones específicas de esta tabla…"
                                                value={mat.comentario_tabla ?? ''}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setMatrices(prev => {
                                                        const copy = (typeof structuredClone === 'function') ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
                                                        copy[active].comentario_tabla = v;
                                                        return copy;
                                                    });
                                                }}
                                                multiline
                                                rows={3}
                                                fullWidth
                                                helperText="Este comentario no es obligatorio."
                                            />
                                        </Box>

                                        {!isMobile ? (
                                            <Stepper nonLinear activeStep={active} sx={{ mb: 1, mt: 2 }}>
                                                {matrices.map((mm, i) => {
                                                    const complete = isMatrixComplete(mm);
                                                    return (
                                                        <Step
                                                            key={i}
                                                            completed={complete}
                                                            sx={{
                                                                px: 0.5,
                                                                '& .MuiStepIcon-root': { color: complete ? 'success.main' : 'warning.main' },
                                                                '& .Mui-active .MuiStepIcon-root': { color: complete ? 'success.main' : 'warning.main' },
                                                            }}
                                                        >
                                                            <StepButton onClick={() => setActive(i)} />
                                                        </Step>
                                                    );
                                                })}
                                            </Stepper>
                                        ) : (
                                            <MobileStepper
                                                variant="dots"
                                                steps={matrices.length}
                                                position="static"
                                                activeStep={active}
                                                nextButton={<Button size="small" onClick={next} disabled={active === matrices.length - 1}>Siguiente <KeyboardArrowRight /></Button>}
                                                backButton={<Button size="small" onClick={prev} disabled={active === 0}><KeyboardArrowLeft /> Anterior</Button>}
                                                sx={{ mb: 2 }}
                                            />
                                        )}

                                        {matrices.length > 1 && !isMobile && (
                                            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                                <Button variant="outlined" onClick={prev} disabled={active === 0} startIcon={<KeyboardArrowLeft />}>Anterior</Button>
                                                <Button variant="outlined" onClick={next} disabled={active === matrices.length - 1} endIcon={<KeyboardArrowRight />}>Siguiente</Button>
                                            </Stack>
                                        )}
                                    </Box>
                                )}

                                {alerta && (
                                    <Alert severity="warning" sx={{ mb: 1, mt: 2 }} onClose={() => setAlerta(null)}>
                                        {alerta}
                                    </Alert>
                                )}

                                <Box sx={{ mt: 3 }}>
                                    <Button variant="contained" color="primary" onClick={handleGuardar} disabled={!periodo || guardando}>
                                        {guardando ? 'Guardando…' : 'Guardar'}
                                    </Button>
                                </Box>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            <Dialog
                open={pdfModalOpen}
                onClose={() => setPdfModalOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Confirmar superior antes de imprimir</DialogTitle>
                <DialogContent dividers>
                    {pdfLoadingData && <LinearProgress sx={{ mb: 2 }} />}
                    {pdfError && <Alert severity="warning" sx={{ mb: 2 }}>{pdfError}</Alert>}

                    <Alert severity="info" sx={{ mb: 2 }}>
                        Verifica o ajusta el nombre y el puesto que irán en el PDF.
                    </Alert>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Nombre del superior / responsable"
                                fullWidth
                                size="small"
                                value={respNombre}
                                onChange={(e) => setRespNombre(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Puesto"
                                fullWidth
                                size="small"
                                value={respPuesto}
                                onChange={(e) => setRespPuesto(e.target.value)}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setPdfModalOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={confirmarImprimir}
                    >
                        Generar PDF
                    </Button>
                </DialogActions>
            </Dialog>

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
        </Box>
    );
}

export default Anexo2Form;
