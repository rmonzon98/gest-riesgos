/**
 * @fileoverview
 * Formulario principal para captura y edición del Anexo 1 a nivel de unidad.
 *
 * @module Riesgos/Anexo 1/Anexo1Form.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useState } from 'react';
import apiClient from 'api/apiClient';
import {
    Box, Card, CardHeader, CardContent, Typography, FormControl, InputLabel, Select, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Stepper, Step,
    MobileStepper, Button, Stack, TextField, Alert, Chip, Snackbar, useMediaQuery, useTheme, StepButton,
    Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, Grid, TablePagination
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { GenerarReporteAnexo1 } from '../Reportes F/Matrices/ReportesAnexo1';
import { safefmt as fmt } from "funciones/Fechas";
import Anexo1ExcelIO from './Anexo1ExcelIO';
import CargaArchivos from 'Riesgos/Carga Documentos/CargaArchivos';

/**
 * Formulario de captura/edición del Anexo 1 para la unidad del usuario.
 *
 * Permite registrar, actualizar y visualizar el estado del formulario enviado.
 *
 * @component
 */
function Anexo1Form() {
    const handleCloseAlerta = (_e, reason) => { if (reason === 'clickaway') return; setAlerta(null); };

    const [unidad, setUnidad] = useState('');
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState('');

    const [historial, setHistorial] = useState([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [sel, setSel] = useState(null);

    const [matrices, setMatrices] = useState([]);
    const [active, setActive] = useState(0);

    const [alerta, setAlerta] = useState(null);
    const [cargandoDefecto, setCargandoDefecto] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [logo, setLogo] = useState('');
    const [superior, setSuperior] = useState({ nombre: '', puesto: '' });

    const [printFilter, setPrintFilter] = useState('all');
    const [printIncludeEmpty, setPrintIncludeEmpty] = useState(true);
    const [printIndices, setPrintIndices] = useState('');

    // ===== Modal previo a generar PDF =====
    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [pdfLoadingData, setPdfLoadingData] = useState(false);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [pdfError, setPdfError] = useState('');
    // contexto: 'general' | 'single'
    const [pdfContext, setPdfContext] = useState(null);
    const [pdfSelectedMatrix, setPdfSelectedMatrix] = useState(null);
    const [respNombre, setRespNombre] = useState('');
    const [respPuesto, setRespPuesto] = useState('');

    // Snackbar de éxito
    const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });
    const handleCloseSnack = (_e, reason) => {
        if (reason === 'clickaway') return;
        setSnack((prev) => ({ ...prev, open: false }));
    };

    // ===== Paginación (máximo 5 por página) =====
    const [page, setPage] = useState(0);
    const rowsPerPage = 5;
    const handleChangePage = (_e, newPage) => setPage(newPage);
    useEffect(() => { setPage(0); }, [historial]);

    const theme = useTheme();
    const isMobile = useMediaQuery(`(max-width:${theme.breakpoints.values.md}px)`);

    /**
     * Carga la unidad organizacional del usuario autenticado.
     */
    const obtenerUnidad = async () => {
        try {
            const res = await apiClient.get('/api/responsables-actualizados/obtener-mi-unidad');
            const u = res.data.data;
            setUnidad(u.NOMBRE + (u.SIGLAS ? ' (' + u.SIGLAS + ')' : ''));
        } catch { setUnidad(''); }
    };

    /**
     * Recupera el catálogo de periodos disponibles para el Anexo 1.
     */
    const obtenerPeriodos = async () => {
        try {
            const { data } = await apiClient.get('/api/periodos-actualizados');
            setPeriodos(data.result ?? data ?? []);
        } catch { setPeriodos([]); }
    };

    /**
     * Consulta el logo institucional a incluir en los reportes PDF.
     */
    const obtenerLogo = async () => {
        try {
            const { data } = await apiClient.get('/api/reportes-actualizados/obtener-logo');
            setLogo('data:image/png;base64,' + (data.logo ?? ''));
        } catch { setLogo(''); }
    };

    /**
     * Obtiene del backend los datos del superior inmediato del usuario.
     */
    const obtenerSuperior = async () => {
        try {
            const { data } = await apiClient.get('/api/responsables-actualizados/obtener-superior');
            setSuperior({ nombre: data.data.NOMBRE_SUPERIOR, puesto: data.data.PUESTO_SUPERIOR });
            // prellenamos también los campos del modal
            setRespNombre(data.data.NOMBRE_SUPERIOR || '');
            setRespPuesto(data.data.PUESTO_SUPERIOR || '');
        } catch {
            setSuperior({ nombre: '', puesto: '' });
            setRespNombre('');
            setRespPuesto('');
        }
    };

    useEffect(() => {
        obtenerPeriodos();
        obtenerUnidad();
        obtenerLogo();
        obtenerSuperior();
    }, []);

    /**
     * Devuelve un Chip de MUI que representa visualmente el estado del formulario.
     */
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

    /**
     * Consulta el historial de envíos del Anexo 1 para la unidad seleccionada.
     */
    const obtenerHistorial = async () => {
        setCargandoHistorial(true);
        setHistorial([]); setSel(null); setMatrices([]); setActive(0); setAlerta(null);
        try {
            const { data } = await apiClient.get('/api/primera-matriz-actualizados/estado-historial', { params: { periodo } });
            const lista = Array.isArray(data?.historial) ? data.historial : [];
            if (lista.length === 0) {
                handleCargarDefecto();
            } else {
                setHistorial(lista);
                const primero = lista[0] || null;
                setSel(primero || null);
                const mats = (primero?.RESPUESTA?.matrices ?? []).map(m => ({ ...m, observaciones: (m?.observaciones ?? m?.OBSERVACIONES ?? '') }));
                setMatrices(mats);
                setActive(0);
            }
            if (data?.defecto === "N") setAlerta("Está trabajando sobre una versión antigua de la matriz, cargue la versión por defecto para actualizar y llenar nuevamente la información");
        } catch {
            setHistorial([]); setSel(null); setMatrices([]); setActive(0);
        } finally { setCargandoHistorial(false); }
    };

    useEffect(() => {
        if (!periodo) { setHistorial([]); setSel(null); setMatrices([]); setActive(0); setAlerta(null); return; }
        obtenerHistorial();
    }, [periodo]);

    const getMatProp = (m, key) => m?.[key] ?? m?.[key.toUpperCase()];
    const matriz = matrices[active] || null;
    const headersArr = getMatProp(getMatProp(matriz, 'columnas'), 'headers') || [];
    const colCount = headersArr.length;

    const next = () => setActive(a => Math.min(a + 1, Math.max(0, matrices.length - 1)));
    const prev = () => setActive(a => Math.max(a - 1, 0));

    const handleCellChange = (rowIdx, colIdx, value) => {
        if (!matriz || colIdx === 0) return;
        setMatrices(prev => {
            const copy = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
            const m = copy[active];
            const filas = getMatProp(m, 'filas');
            if (!Array.isArray(filas[rowIdx])) filas[rowIdx] = [];
            while (filas[rowIdx].length < colCount) filas[rowIdx].push(null);
            filas[rowIdx][colIdx] = value;
            return copy;
        });
    };

    const handleObsChange = (value) => {
        setMatrices(prev => {
            const copy = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
            if (!copy[active]) return prev;
            copy[active].observaciones = value;
            return copy;
        });
    };

    const hayVacios = () => {
        for (let i = 0; i < matrices.length; i++) {
            const m = matrices[i];
            const headersLen = (getMatProp(getMatProp(m, 'columnas'), 'headers') || []).length;
            const filas = getMatProp(m, 'filas') || [];
            for (let r = 0; r < filas.length; r++) {
                const fila = Array.isArray(filas[r]) ? filas[r] : [];
                const padded = fila.length < headersLen ? [...fila, ...Array(headersLen - fila.length).fill(null)] : fila.slice(0, headersLen);
                for (let c = 1; c < headersLen; c++) if ((padded[c] ?? '').toString().trim() === '') return true;
            }
        }
        return false;
    };

    const isMatrixComplete = (m) => {
        if (!m) return false;
        const headers = (m?.columnas?.headers) || (m?.COLUMNAS?.HEADERS) || [];
        const filas = (m?.filas ?? m?.FILAS) || [];
        const headersLen = headers.length;
        if (headersLen <= 1) return false;
        for (let r = 0; r < filas.length; r++) {
            const fila = Array.isArray(filas[r]) ? filas[r] : [];
            const padded = fila.length < headersLen ? [...fila, ...Array(headersLen - fila.length).fill(null)] : fila.slice(0, headersLen);
            for (let c = 1; c < headersLen; c++) if ((padded[c] ?? '').toString().trim() === '') return false;
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

    const ColorDot = ({ color }) => (<Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, display: 'inline-block', mr: 1 }} />);

    const handleCargarDefecto = async () => {
        if (!periodo) return;
        try {
            setCargandoDefecto(true);
            const { data } = await apiClient.get('/api/primera-matriz-actualizados/matriz-defecto', { params: { periodo } });
            const arr = Array.isArray(data?.matrices) ? data.matrices : [];
            setMatrices(arr.map(m => ({ ...m, observaciones: (m?.observaciones ?? m?.OBSERVACIONES ?? '') })));
            setActive(0); setAlerta(null);
        } catch {
            setAlerta('No fue posible cargar la matriz por defecto del período seleccionado.');
            setMatrices([]); setActive(0);
        } finally { setCargandoDefecto(false); }
    };

    const handleElegirHistorial = (h) => {
        setSel(h || null);
        const mats = (h?.RESPUESTA?.matrices ?? []).map(m => ({ ...m, observaciones: (m?.observaciones ?? m?.OBSERVACIONES ?? '') }));
        setMatrices(Array.isArray(mats) ? mats : []);
        setActive(0); setAlerta(null);
    };

    const handleGuardar = async () => {
        if (hayVacios()) setAlerta('Hay campos vacíos, pero de igual forma se guardará su avance.');
        else setAlerta(null);
        const payload = {
            periodo,
            matrices: matrices.map(m => ({
                matriz: m?.matriz ?? m?.MATRIZ,
                titulo: m?.titulo ?? m?.TITULO ?? null,
                columnas: m?.columnas ?? m?.COLUMNAS,
                filas: m?.filas ?? m?.FILAS,
                observaciones: m?.observaciones ?? m?.OBSERVACIONES ?? '',
                obligatorio: (() => {
                    const v = m?.obligatorio ?? m?.OBLIGATORIO;
                    return (v === 1 || v === '1' || v === true) ? 1 : 0;
                })()
            }))
        };
        try {
            setGuardando(true);
            await apiClient.post('/api/primera-matriz-actualizados/guardar-respuesta', payload);
            // Snackbar de éxito
            setSnack({ open: true, msg: 'Guardado exitoso', sev: 'success' });
            obtenerHistorial();
        } catch {
            setAlerta('Ocurrió un error al guardar. Intenta de nuevo.');
        } finally { setGuardando(false); }
    };

    /**
     * Abre el visor de PDF para mostrar una vista previa del reporte del Anexo 1.
     *
     * @param {('general'|'responsable')} context - Tipo de reporte a mostrar.
     * @param {object|null} selected - Registro seleccionado en caso de detalle.
     */
    const openPdfModal = (context = 'general', selected = null) => {
        setPdfError('');
        setPdfContext(context);
        setPdfSelectedMatrix(selected);
        setRespNombre(superior?.nombre || '');
        setRespPuesto(superior?.puesto || '');
        setPdfModalOpen(true);
    };

    /**
     * Construye el PDF del Anexo 1 incluyendo la información del responsable.
     *
     * @param {boolean} useEditedFields - Indica si se usan los campos editados en pantalla.
     */
    const generarPDFConResponsable = (useEditedFields = true) => {
        if (!periodo) return;
        const responsable = {
            nombre: useEditedFields ? respNombre : (superior?.nombre || ''),
            puesto: useEditedFields ? respPuesto : (superior?.puesto || '')
        };

        let commonOpts = {
            periodo,
            logoBase64: logo,
            unidad,
            filter: printFilter,
            indices: [],
            includeEmpty: printIncludeEmpty,
            responsable
        };
        if (printFilter === 'indices') {
            commonOpts.indices = (printFilter === 'indices'
                ? printIndices.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n) && n > 0)
                : [])
        }

        if (pdfContext === 'single') {
            const cur = pdfSelectedMatrix;
            if (!cur) return;
            GenerarReporteAnexo1({
                matrices: [cur],
                nombreArchivo: `Matriz_${(cur?.matriz ?? cur?.MATRIZ ?? active + 1)}_${periodo}.pdf`,
                ...commonOpts
            });
        } else {
            console.log({
                matrices,
                nombreArchivo: `Matrices_Anexo1_${periodo}.pdf`,
                filter: printFilter,
                indices: (printFilter === 'indices'
                    ? printIndices.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n) && n > 0)
                    : []),
                includeEmpty: printIncludeEmpty,
                ...commonOpts
            })
            GenerarReporteAnexo1({
                matrices,
                nombreArchivo: `Matrices_Anexo1_${periodo}.pdf`,
                filter: printFilter,
                indices: (printFilter === 'indices'
                    ? printIndices.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n) && n > 0)
                    : []),
                includeEmpty: printIncludeEmpty,
                ...commonOpts
            });
        }
        setPdfModalOpen(false);
        setPdfContext(null);
        setPdfSelectedMatrix(null);
    };

    const generarReporteGeneral = () => {
        if (!periodo || matrices.length === 0) return;
        openPdfModal('general', null);
    };

    const totalHistorial = Array.isArray(historial) ? historial.length : 0;
    const pageStart = page * rowsPerPage;
    const pageEnd = Math.min(pageStart + rowsPerPage, totalHistorial);
    const historialPage = (historial || []).slice(pageStart, pageEnd);
    const HIST_COLSPAN = 8;

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Entrada de evaluación de la eficiencia del control interno y gobernanza
            </Typography>

            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader title={unidad} />
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
                                    onChange={(e) => setPeriodo(e.target.value)}
                                >
                                    {periodos.map(p => (
                                        <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                                            {fmt(p.PERIODO_INICIAL)} - {fmt(p.PERIODO_FINAL)} del {p.CODIGO_PERIODO}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                <Button variant="outlined" onClick={handleCargarDefecto} disabled={!periodo || cargandoDefecto}>
                                    {cargandoDefecto ? 'Cargando…' : 'Matriz por defecto'}
                                </Button>

                                <Anexo1ExcelIO
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

            {periodo && <CargaArchivos flag={1} periodo={periodo} />}

            {periodo && (
                <Card sx={{ borderRadius: 2, mt: 2, mb: 2 }}>
                    <CardHeader title="Información ingresada del formulario" />
                    <CardContent>
                        <Stack spacing={2}>
                            <TableContainer component={Box} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflowX: 'auto' }}>
                                <Table size="small" stickyHeader sx={{ minWidth: 700 }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell colSpan={2}></TableCell>
                                            <TableCell
                                                align="center"
                                                colSpan={3}
                                                style={{ fontWeight: 700, backgroundColor: "#f5f5f5" }}
                                            >
                                                Superior
                                            </TableCell>
                                            <TableCell
                                                align="center"
                                                colSpan={3}
                                                style={{ fontWeight: 700, backgroundColor: "#f5f5f5" }}
                                            >
                                                Encargado de supervisar
                                            </TableCell>
                                        </TableRow>

                                        <TableRow>
                                            <TableCell style={{ fontWeight: 700 }}>
                                                Usuario que ingresó información
                                            </TableCell>
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
                                            <TableRow><TableCell colSpan={HIST_COLSPAN}>Cargando…</TableCell></TableRow>
                                        ) : (totalHistorial > 0) ? (
                                            historialPage.map((h, i) => {
                                                const seleccionado = sel && String(h.CODIGO_HISTORIAL) === String(sel.CODIGO_HISTORIAL);
                                                return (
                                                    <TableRow
                                                        key={h.CODIGO_HISTORIAL ?? `${pageStart + i}`}
                                                        hover
                                                        selected={!!seleccionado}
                                                        sx={{ cursor: 'pointer' }}
                                                        onClick={() => handleElegirHistorial(h)}
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
                                            <TableRow><TableCell colSpan={HIST_COLSPAN} align="center">Sin versiones</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Paginación (fija a 5 por página) */}
                            <TablePagination
                                component="div"
                                count={totalHistorial}
                                page={page}
                                onPageChange={handleChangePage}
                                rowsPerPage={rowsPerPage}
                                rowsPerPageOptions={[5]}
                            />

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mt: 1 }}>
                                <FormControl size="small" sx={{ minWidth: 220 }}>
                                    <InputLabel id="print-filter-label">Qué imprimir</InputLabel>
                                    <Select
                                        labelId="print-filter-label"
                                        label="Qué imprimir"
                                        value={printFilter}
                                        onChange={(e) => {
                                            setPrintFilter(e.target.value)
                                            setPrintIncludeEmpty(true)
                                        }}
                                    >
                                        <MenuItem value="all">Todas</MenuItem>
                                        <MenuItem value="indices">Por índice…</MenuItem>
                                    </Select>
                                </FormControl>

                                {printFilter === 'indices' && (
                                    <TextField
                                        size="small"
                                        label="Índices (1,3,5)"
                                        placeholder="Ej. 1,3,5"
                                        value={printIndices}
                                        onChange={(e) => setPrintIndices(e.target.value)}
                                        sx={{ minWidth: 220 }}
                                    />
                                )}

                                {printFilter !== 'indices' && (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="body2">Incluir tablas vacías</Typography>
                                        <Button
                                            variant={printIncludeEmpty ? 'contained' : 'outlined'}
                                            onClick={() => setPrintIncludeEmpty(v => !v)}
                                            size="small"
                                        >
                                            {printIncludeEmpty ? 'Sí' : 'No'}
                                        </Button>
                                    </Stack>
                                )}



                                <Box sx={{ flex: 1 }} />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PictureAsPdfIcon />}
                                    disabled={!periodo || matrices.length === 0}
                                    onClick={generarReporteGeneral}
                                >
                                    Generar reporte general
                                </Button>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {periodo && (
                <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                        {matrices.length === 0 ? (
                            <Typography variant="body2">Cargue matriz por defecto.</Typography>
                        ) : (
                            <>
                                <FormControl fullWidth size="small" sx={{ mb: 0.5 }}>
                                    <InputLabel id="matriz-trabajar-label">Matriz a trabajar</InputLabel>
                                    <Select
                                        labelId="matriz-trabajar-label"
                                        label="Matriz a trabajar"
                                        value={String(active)}
                                        onChange={(e) => setActive(Number(e.target.value))}
                                        disabled={matrices.length === 0}
                                    >
                                        {matrices.map((m, i) => {
                                            const nombre = m?.titulo ?? m?.TITULO ?? `Tabla #${m?.matriz ?? m?.MATRIZ ?? i + 1}`;
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

                                {(() => {
                                    const m = matrices[active];
                                    const st = m ? getMatrixStatus(m) : null;
                                    return (
                                        <Typography variant="body2" sx={{ mb: 2, color: st?.obligatorio ? 'error.main' : 'warning.main' }}>
                                            {st?.obligatorio ? 'Tabla obligatoria' : 'Tabla opcional'}
                                        </Typography>
                                    );
                                })()}

                                {(() => {
                                    const m = matrices[active] || null;
                                    const headersM = (m?.columnas?.headers) || (m?.COLUMNAS?.HEADERS) || [];
                                    const len = headersM.length;

                                    return m ? (
                                        <Box sx={{ p: 2, border: '1px dashed', borderRadius: 2 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                                {m.titulo || m.TITULO || `Tabla #${m.matriz || m.MATRIZ}`}
                                            </Typography>

                                            <TableContainer component={Box} sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                                <Table stickyHeader size="small" sx={{ tableLayout: 'fixed', minWidth: 900, '& th, & td': { wordBreak: 'break-word', whiteSpace: 'normal', verticalAlign: 'top' } }}>
                                                    <TableHead>
                                                        <TableRow>
                                                            {headersM.map((h, i) => (
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
                                                        {Array.isArray(m.filas ?? m.FILAS) && (m.filas ?? m.FILAS).length > 0 ? (
                                                            (m.filas ?? m.FILAS).map((fila, rIdx) => {
                                                                const arr = Array.isArray(fila) ? fila : [];
                                                                const padded = arr.length < len ? [...arr, ...Array(len - arr.length).fill(null)] : arr.slice(0, len);
                                                                return (
                                                                    <TableRow key={rIdx}>
                                                                        {padded.map((celda, cIdx) => {
                                                                            if (cIdx === 0) {
                                                                                return (
                                                                                    <TableCell key={cIdx} sx={{ fontWeight: 500, position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'background.paper', minWidth: 200, maxWidth: 260 }}>
                                                                                        {celda ?? ''}
                                                                                    </TableCell>
                                                                                );
                                                                            }
                                                                            const isNull = celda === null || celda === undefined;
                                                                            return (
                                                                                <TableCell key={cIdx} sx={{ minWidth: 220 }}>
                                                                                    <TextField
                                                                                        fullWidth
                                                                                        multiline
                                                                                        rows={isMobile ? 2 : 3}
                                                                                        size="small"
                                                                                        value={isNull ? '' : celda}
                                                                                        placeholder="Escriba aquí"
                                                                                        onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                                                                        inputProps={{ style: { lineHeight: 1.3 } }}
                                                                                    />
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

                                            <Box sx={{ mt: 2 }}>
                                                <TextField
                                                    label="Observaciones de la tabla"
                                                    placeholder="Anote consideraciones, aclaraciones o información adicional relevante para esta tabla…"
                                                    value={m?.observaciones ?? ''}
                                                    onChange={(e) => handleObsChange(e.target.value)}
                                                    multiline
                                                    minRows={3}
                                                    fullWidth
                                                />
                                            </Box>

                                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<PictureAsPdfIcon />}
                                                    onClick={() => {
                                                        const cur = matrices[active]; if (!cur) return;
                                                        openPdfModal('single', cur);
                                                    }}
                                                >
                                                    Imprimir solamente esta tabla
                                                </Button>
                                            </Box>

                                            {!isMobile ? (
                                                <Stepper nonLinear activeStep={active} sx={{ mb: 1, mt: 2 }}>
                                                    {matrices.map((mm, i) => {
                                                        const st = getMatrixStatus(mm);
                                                        return (
                                                            <Step key={i} completed={st.complete}
                                                                sx={{ px: '3px', '& .MuiStepIcon-root': { color: st.color }, '& .Mui-active .MuiStepIcon-root': { color: st.color } }}>
                                                                <StepButton onClick={() => setActive(i)} disableRipple sx={{ '&:hover': { backgroundColor: 'transparent' }, '&.Mui-focusVisible': { backgroundColor: 'transparent' }, '& .MuiTouchRipple-root': { display: 'none' } }} />
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
                                    ) : null;
                                })()}

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

            {/* Snackbar de advertencias / mensajes de alerta */}
            <Snackbar
                open={Boolean(alerta)}
                autoHideDuration={9000}
                onClose={handleCloseAlerta}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseAlerta} severity="warning" variant="filled" sx={{ width: '100%' }}>
                    {alerta}
                </Alert>
            </Snackbar>

            {/* Snackbar de éxito al guardar */}
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

            <Dialog
                open={pdfModalOpen}
                onClose={() => !pdfGenerating && setPdfModalOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Confirmar responsable para la firma</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Verifica o ajusta el nombre y el puesto que irán en el PDF.
                    </Alert>
                    {pdfError && <Alert severity="error" sx={{ mb: 2 }}>{pdfError}</Alert>}
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Nombre del responsable"
                                fullWidth
                                size="small"
                                value={respNombre}
                                onChange={(e) => setRespNombre(e.target.value)}
                                disabled={pdfGenerating}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Puesto del responsable"
                                fullWidth
                                size="small"
                                value={respPuesto}
                                onChange={(e) => setRespPuesto(e.target.value)}
                                disabled={pdfGenerating}
                            />
                        </Grid>
                    </Grid>
                    {pdfGenerating && <LinearProgress sx={{ mt: 2 }} />}
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setPdfModalOpen(false)} disabled={pdfGenerating}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => generarPDFConResponsable(true)}
                        disabled={pdfGenerating}
                    >
                        {pdfGenerating ? 'Generando…' : 'Confirmar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Anexo1Form;
