/**
 * @fileoverview
 * Vista de consulta y reporte del Anexo 2 por entidad / área supervisada.
 *
 * @module Riesgos/Anexo 2/Anexo2Sup.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useMemo, useState } from 'react';
import apiClient from 'api/apiClient';
import {
    Box, Card, CardHeader, CardContent, Typography,
    FormControl, InputLabel, Select, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
    Stepper, Step, StepButton, MobileStepper,
    Button, Stack, Alert, Chip, Divider, TextField, Switch, FormControlLabel,
    Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress, Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { safefmt as fmt, fechaLarga } from 'funciones/Fechas';
import { GenerarReporteAnexo2DesdeUltimo } from '../Reportes F/Matrices/ReportesAnexo2';

const API = '/api/segunda-matriz-actualizados';
/**
 * Anexo2Sup
 *
 * Vista de supervisión del Anexo 2 por entidad.
 *
 * - Permite seleccionar entidad/periodo, revisar historial y generar reportes.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function Anexo2Sup() {
    const [nombreEntidad, setNombreEntidad] = useState('');
    const [entidades, setEntidades] = useState([]);
    const [periodos, setPeriodos] = useState([]);
    const [entidad, setEntidad] = useState('');
    const [periodo, setPeriodo] = useState('');

    const [matrices, setMatrices] = useState([]);
    const [active, setActive] = useState(0);

    const [alerta, setAlerta] = useState(null);
    const [guardando, setGuardando] = useState(false);

    // Supervisión
    const [observacion, setObservacion] = useState('');
    const [estado, setEstado] = useState('A'); // 'A'|'R'

    // Historial y estado derivado
    const [historial, setHistorial] = useState([]);
    const [cargandoEstado, setCargandoEstado] = useState(false);
    const [estadoActual, setEstadoActual] = useState(null);
    const [estadoActualInfo, setEstadoActualInfo] = useState({ FECHA_CREACION: null, FECHA_MODIFICACION: null });

    const [histIdSel, setHistIdSel] = useState('');
    const histSel = useMemo(
        () => historial.find(h => String(h.CODIGO_HISTORIAL) === String(histIdSel)),
        [historial, histIdSel]
    );
    const comentarioBloqueado = useMemo(() => {
        const c = histSel?.COMENTARIO_SUPERVISOR;
        return typeof c === 'string' && c.trim() !== '';
    }, [histSel]);

    // Controles de impresión
    const [printFilter, setPrintFilter] = useState('all'); // 'all' | 'complete' | 'indices'
    const [indicesTxt, setIndicesTxt] = useState('');      // "1,3,5-7"
    const [includeEmpty, setIncludeEmpty] = useState(true);
    const [logoBase64, setLogoBase64] = useState(null);
    const [printOptsCache, setPrintOptsCache] = useState(null);

    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [pdfLoadingData, setPdfLoadingData] = useState(false);
    const [pdfError, setPdfError] = useState('');
    const [respNombre, setRespNombre] = useState('');
    const [respPuesto, setRespPuesto] = useState('');

    const theme = useTheme();
    const isMobile = useMemo(
        () => window.matchMedia(`(max-width: ${theme.breakpoints.values.md}px)`).matches,
        [theme]
    );

    /**
     * Devuelve un Chip que representa el estado del formulario de Anexo 2.
     */
    const chipDeEstado = (v) => {
        const map = {
            A: { label: 'Recibido', color: 'success' },
            R: { label: 'Se necesita revisión', color: 'error' },
            P: { label: 'Pendiente', color: 'warning' },
            M: { label: 'Modificado', color: 'info' },
            I: { label: 'Ingresado', color: 'info' },
            null: { label: 'Sin datos', color: 'default' }
        };
        const meta = map[v] || map.null;
        return <Chip label={meta.label} color={meta.color} size="small" />;
    };

    const chipDeEstadoSuperior = (v) => {
        const map = {
            A: { label: 'Aceptado', color: 'success' },
            R: { label: 'Rechazado', color: 'error' },
            P: { label: 'Pendiente', color: 'warning' },
            M: { label: 'Modificado', color: 'info' },
            I: { label: 'Ingresado', color: 'info' },
            null: { label: 'Sin datos', color: 'default' }
        };
        const meta = map[v] || map.null;
        return <Chip label={meta.label} color={meta.color} size="small" />;
    };

    // Logo (base64) para PDF
    async function cargarLogoBase64() {
        if (logoBase64 !== null) return logoBase64; // puede ser string o null
        try {
            const { data } = await apiClient.get('/api/reportes-actualizados/obtener-logo');
            const base64 = data?.logo ? `data:image/png;base64,${data.logo}` : null;
            setLogoBase64(base64);
            return base64;
        } catch {
            setLogoBase64(null);
            return null;
        }
    }

    useEffect(() => {
        (async () => {
            try {
                const [entRes, perRes] = await Promise.all([
                    apiClient.get('/api/direcciones-actualizados'),
                    apiClient.get('/api/periodos-actualizados')
                ]);
                setEntidades(entRes.data.result ?? entRes.data ?? []);
                setPeriodos(perRes.data.result ?? perRes.data ?? []);
            } catch (e) {
                console.error('Error cargando catálogos', e);
                setAlerta('No se pudieron cargar unidades o períodos.');
            }
        })();
    }, []);

    /**
     * Carga el historial de estados del Anexo 2 para la entidad y periodo elegidos.
     */
    const cargarEstadoHistorial = async (selEntidad, selPeriodo) => {
        if (!selEntidad || !selPeriodo) return;
        setCargandoEstado(true);
        try {
            const { data } = await apiClient.get(`${API}/estado-historial`, {
                params: { periodo: selPeriodo, entidad: selEntidad }
            });

            const lista = Array.isArray(data?.historial) ? data.historial : [];
            setHistorial(lista);

            const ultimo = lista[0] || null;
            setEstadoActual(ultimo?.ESTADO ?? null);
            setEstadoActualInfo({
                FECHA_CREACION: ultimo?.FECHA_CREACION ?? null,
                FECHA_MODIFICACION: ultimo?.FECHA_MODIFICACION ?? null
            });

            const sinComent = lista.filter(h => !h.COMENTARIO_SUPERVISOR || String(h.COMENTARIO_SUPERVISOR).trim() === '');
            const elegido = (sinComent[0] ?? lista[0]) || null;

            setHistIdSel(elegido ? elegido.CODIGO_HISTORIAL : '');
            setObservacion(elegido?.COMENTARIO_SUPERVISOR ?? '');
            setEstado(elegido?.ESTADO === 'R' ? 'R' : 'A');

            const mats = elegido?.RESPUESTA?.matrices;
            if (Array.isArray(mats)) {
                setMatrices(mats);
                setActive(0);
                setAlerta(null);
            } else {
                setMatrices([]);
                setActive(0);
                setAlerta('No se encontró una respuesta para esa combinación.');
            }
        } catch (e) {
            console.error('Error cargando historial Anexo 2', e);
            setHistorial([]); setHistIdSel(''); setMatrices([]); setActive(0);
            setObservacion(''); setEstadoActual(null); setEstadoActualInfo({ FECHA_CREACION: null, FECHA_MODIFICACION: null });
            setAlerta('No se pudo cargar el historial.');
        } finally {
            setCargandoEstado(false);
        }
    };

    useEffect(() => {
        cargarEstadoHistorial(entidad, periodo);
    }, [entidad, periodo]);

    const next = () => setActive(a => Math.min(a + 1, Math.max(0, matrices.length - 1)));
    const prev = () => setActive(a => Math.max(a - 1, 0));

    const handleElegirHistPorFila = (h) => {
        setHistIdSel(h.CODIGO_HISTORIAL);
        const mats = h?.RESPUESTA?.matrices;
        setMatrices(Array.isArray(mats) ? mats : []);
        setActive(0);
        setObservacion(h?.COMENTARIO_SUPERVISOR ?? '');
        setEstado(h?.ESTADO === 'R' ? 'R' : 'A');
    };

    const handleGuardarDecision = async () => {
        if (!entidad || !periodo) { setAlerta('Seleccione unidad y período antes de guardar.'); return; }
        if (!histIdSel) { setAlerta('Seleccione una versión del historial.'); return; }
        if (estado === 'R' && !(observacion || '').trim()) { setAlerta('Ingrese comentario si Se necesita revisión.'); return; }

        try {
            setGuardando(true);
            await apiClient.put(
                `${API}/estado-actualizar`,
                {
                    entidad,
                    periodo,
                    codigo_historial: histIdSel,
                    estado,
                    comentario: comentarioBloqueado
                        ? (histSel?.COMENTARIO_SUPERVISOR ?? null)
                        : ((observacion || '').trim() || null)
                }
            );
            setAlerta(`Decisión guardada para #${histIdSel}: ${estado === 'R' ? 'Rechazado' : 'Aceptado'}.`);
            await cargarEstadoHistorial(entidad, periodo);
        } catch (e) {
            console.error('Error guardando decisión (Anexo 2)', e);
            setAlerta('Ocurrió un error al guardar la decisión. Intente de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    const parseIndices = (txt) => {
        if (!txt) return [];
        const parts = String(txt).split(',').map(s => s.trim()).filter(Boolean);
        const set = new Set();
        for (const p of parts) {
            if (/^\d+$/.test(p)) { set.add(Number(p)); continue; }
            const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
            if (m) {
                let a = Number(m[1]), b = Number(m[2]);
                if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
                if (a > b) [a, b] = [b, a];
                for (let i = a; i <= b; i++) set.add(i);
            }
        }
        return Array.from(set).sort((x, y) => x - y);
    };

    const openPdfModal = async (opts) => {
        if (!histSel) { setAlerta('No hay historial seleccionado para imprimir.'); return; }
        setPrintOptsCache(opts || { filter: 'all', includeEmpty: true });
        setPdfError('');
        setPdfModalOpen(true);
        setPdfLoadingData(true);
        try {
            const { data } = await apiClient.get('/api/reportes-actualizados/obtener-superior', {
                params: { periodo, entidad }
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

    const confirmarImprimir = async () => {
        if (!histSel) return;
        const opts = printOptsCache || { filter: 'all', includeEmpty: true };
        const indices =
            opts.filter === 'indices' && typeof opts.indices === 'string'
                ? parseIndices(opts.indices)
                : opts.indices;

        const finalOpts = {
            ...opts,
            ...(opts.filter === 'indices' ? { indices } : {}),
            responsable: {
                nombre: respNombre || '',
                puesto: respPuesto || ''
            }
        };

        const logo = await cargarLogoBase64(); // puede ser null
        try {
            GenerarReporteAnexo2DesdeUltimo(
                histSel,
                periodo,
                logo,
                nombreEntidad || '—',
                finalOpts
            );
        } catch (e) {
            console.error('Error al generar el PDF de Anexo 2', e);
            setAlerta('No fue posible generar el PDF. Intenta nuevamente.');
        } finally {
            setPdfModalOpen(false);
        }
    };

    const handleImprimir = async () => {
        const opts = { filter: printFilter, includeEmpty };
        if (printFilter === 'indices') {
            const arr = parseIndices(indicesTxt);
            if (arr.length === 0) {
                setAlerta('Ingresa al menos un índice válido (ej.: 1,3,5 o rangos 2-4).');
                return;
            }
            opts.indices = arr; // 1-based
        }
        openPdfModal(opts);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Revisión de riesgos de fraude o corrupción
            </Typography>

            {/* Filtros */}
            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader title="Seleccione una unidad y período" />
                <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel id="entidad-label">Unidad</InputLabel>
                            <Select
                                labelId="entidad-label"
                                label="Unidad"
                                value={entidad}
                                onChange={(e) => {
                                    const selected = entidades.find(ent => {
                                        const id = ent.CODIGO_ENTIDAD ?? ent.codigo_entidad ?? ent.CODIGO_DIRECCION ?? ent.ID;
                                        return id === e.target.value;
                                    });
                                    setEntidad(e.target.value);
                                    setNombreEntidad(
                                        selected?.DESCRIPCION ?? selected?.descripcion ?? selected?.NOMBRE ?? selected?.nombre ?? `Entidad ${e.target.value}`
                                    );
                                }}
                            >
                                {entidades.map((e) => {
                                    const id = e.CODIGO_ENTIDAD ?? e.codigo_entidad ?? e.CODIGO_DIRECCION ?? e.ID;
                                    const desc = e.DESCRIPCION ?? e.descripcion ?? e.NOMBRE ?? e.nombre ?? `Entidad ${id}`;
                                    return (<MenuItem key={id} value={id}>{desc}</MenuItem>);
                                })}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel id="periodo-label">Periodo</InputLabel>
                            <Select
                                labelId="periodo-label"
                                label="Periodo"
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
                    </Stack>
                </CardContent>
            </Card>

            {/* Estado actual + último historial */}
            {entidad && periodo && (
                <Card sx={{ borderRadius: 2, mb: 2 }}>
                    <CardHeader title="Estado e historial de la respuesta" />
                    <CardContent>
                        <Stack spacing={2}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                                <Typography variant="subtitle2" sx={{ minWidth: 160 }}>Estado actual:</Typography>
                                {cargandoEstado
                                    ? <Typography variant="body2" color="text.secondary">Cargando…</Typography>
                                    : chipDeEstado(estadoActual ?? null)}
                                {(estadoActualInfo.FECHA_MODIFICACION || estadoActualInfo.FECHA_CREACION) && (
                                    <Typography variant="subtitle2" sx={{ minWidth: 160 }}>
                                        {estadoActualInfo.FECHA_MODIFICACION
                                            ? fechaLarga(estadoActualInfo.FECHA_MODIFICACION)
                                            : fechaLarga(estadoActualInfo.FECHA_CREACION)}
                                    </Typography>
                                )}
                            </Stack>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>Historial (último):</Typography>
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
                                            {(historial && historial.length) ? historial.slice(0, 1).map((h, i) => {
                                                const seleccionado = String(h.CODIGO_HISTORIAL) === String(histIdSel);
                                                return (
                                                    <TableRow
                                                        key={h.CODIGO_HISTORIAL ?? i}
                                                        selected={seleccionado}
                                                        hover
                                                        sx={{ cursor: 'pointer' }}
                                                        onClick={() => handleElegirHistPorFila(h)}
                                                    >
                                                        <TableCell>{h.NOMBRE_USUARIO_CREACION ?? '—'}</TableCell>
                                                        <TableCell>{h.FECHA_CREACION ? new Date(h.FECHA_CREACION).toLocaleString() : '—'}</TableCell>                                                       
                                                        <TableCell>{chipDeEstadoSuperior(h.ESTADO_SUPERIOR ?? null)}</TableCell>
                                                        <TableCell>{h.NOMBRE_USUARIO_SUPERIOR ?? '—'}</TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                                {h.COMENTARIO_SUPERIOR ?? '—'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>{chipDeEstado(h.ESTADO ?? null)}</TableCell>
                                                        <TableCell>{h.NOMBRE_USUARIO_MODIFICACION ?? '—'}</TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                                {h.COMENTARIO_SUPERVISOR ?? '—'}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            }) : (
                                                <TableRow><TableCell colSpan={5} align="center">Sin movimientos</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* MATRICES */}
            {entidad && periodo && (
                <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                        {matrices.length === 0 ? (
                            <Typography variant="body2">No hay respuesta guardada para esta unidad y período.</Typography>
                        ) : (
                            <>
                                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                    <InputLabel id="matriz-trabajar-label">Matriz a visualizar</InputLabel>
                                    <Select
                                        labelId="matriz-trabajar-label"
                                        label="Matriz a visualizar"
                                        value={String(active)}
                                        onChange={(e) => setActive(Number(e.target.value))}
                                        disabled={matrices.length === 0}
                                    >
                                        {matrices.map((m, i) => (
                                            <MenuItem key={i} value={String(i)}>
                                                {m?.titulo ?? m?.TITULO ?? `Tabla #${m?.matriz ?? m?.MATRIZ ?? i + 1}`}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Typography variant="body2" sx={{ mb: 2, color: 'error.main' }}>
                                    Tabla obligatoria
                                </Typography>
                                {(() => {
                                    const matriz = matrices[active] || null;
                                    const headersArr = (matriz?.columnas?.headers) || (matriz?.COLUMNAS?.HEADERS) || [];
                                    const colCount = headersArr.length;
                                    const comentarioTabla = (matriz?.comentario_tabla ?? matriz?.COMENTARIO_TABLA ?? '').toString().trim();

                                    return matriz ? (
                                        <Box sx={{ p: 1, border: '1px dashed', borderRadius: 2, mb: 2 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                                {matriz.titulo || matriz.TITULO || `Tabla #${matriz.matriz || matriz.MATRIZ}`}
                                            </Typography>

                                            <TableContainer component={Box} sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                                <Table
                                                    stickyHeader
                                                    size="small"
                                                    sx={{
                                                        tableLayout: 'fixed',
                                                        minWidth: 900,
                                                        '& th, & td': { wordBreak: 'break-word', whiteSpace: 'normal', verticalAlign: 'top' }
                                                    }}
                                                >
                                                    <TableHead>
                                                        <TableRow>
                                                            {headersArr.map((h, i) => (
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
                                                        {Array.isArray(matriz.filas ?? matriz.FILAS) && (matriz.filas ?? matriz.FILAS).length > 0 ? (
                                                            (matriz.filas ?? matriz.FILAS).map((fila, rIdx) => {
                                                                const arr = Array.isArray(fila) ? fila : [];
                                                                const padded = arr.length < colCount ? [...arr, ...Array(colCount - arr.length).fill(null)] : arr.slice(0, colCount);
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
                                                                            const val = (celda === null || celda === undefined) ? '' : String(celda);
                                                                            return (
                                                                                <TableCell key={cIdx} sx={{ minWidth: 220 }}>
                                                                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                                                        {val}
                                                                                    </Typography>
                                                                                </TableCell>
                                                                            );
                                                                        })}
                                                                    </TableRow>
                                                                );
                                                            })
                                                        ) : (
                                                            <TableRow><TableCell colSpan={colCount || 1} align="center">No hay filas</TableCell></TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                            {!!comentarioTabla && (
                                                <Alert severity="info" sx={{ mt: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Comentario de la tabla</Typography>
                                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                        {comentarioTabla}
                                                    </Typography>
                                                </Alert>
                                            )}

                                            {!isMobile ? (
                                                <Stepper nonLinear activeStep={active} sx={{ mb: 1, mt: 2 }}>
                                                    {matrices.map((_, i) => (
                                                        <Step key={i} sx={{ px: 0.5 }}>
                                                            <StepButton
                                                                onClick={() => setActive(i)}
                                                                disableRipple
                                                                sx={{
                                                                    '&:hover': { backgroundColor: 'transparent' },
                                                                    '&.Mui-focusVisible': { backgroundColor: 'transparent' },
                                                                    '& .MuiTouchRipple-root': { display: 'none' },
                                                                }}
                                                            />
                                                        </Step>
                                                    ))}
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
                                {
                                    (estadoActual !== 'A' && estadoActual !== 'R') &&
                                    (
                                        <>
                                            <Box sx={{ mt: 3 }}>
                                                <FormControl fullWidth>
                                                    <InputLabel id="estado-label">Decisión</InputLabel>
                                                    <Select
                                                        labelId="estado-label"
                                                        label="Decisión"
                                                        value={estado}
                                                        onChange={(e) => setEstado(e.target.value)}
                                                    >
                                                        <MenuItem value="A">Recibir</MenuItem>
                                                        <MenuItem value="R">Se necesita revisión</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Box>

                                            <Box sx={{ mt: 2 }}>
                                                <TextField
                                                    label="Comentario de revisión"
                                                    placeholder="Opcional. Deja tus observaciones para la unidad."
                                                    multiline
                                                    minRows={3}
                                                    fullWidth
                                                    value={observacion}
                                                    onChange={(e) => setObservacion(e.target.value)}
                                                />
                                            </Box>

                                            <Box sx={{ mt: 2 }}>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={handleGuardarDecision}
                                                    disabled={!entidad || !periodo || guardando}
                                                >
                                                    {guardando ? 'Guardando…' : 'Guardar revisión'}
                                                </Button>
                                            </Box>
                                            {alerta && (
                                                <Alert
                                                    severity="info"
                                                    sx={{ mt: 2 }}
                                                    onClose={() => setAlerta(null)}
                                                >
                                                    {alerta}
                                                </Alert>
                                            )}
                                        </>
                                    )
                                }
                                <Divider sx={{ mt: 2 }} />
                                {/* Controles de impresión */}
                                <Card variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 2, mt: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                        Generar reporte (PDF)
                                    </Typography>
                                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
                                        <FormControl fullWidth>
                                            <InputLabel id="print-filter-label">Contenido</InputLabel>
                                            <Select
                                                labelId="print-filter-label"
                                                label="Contenido"
                                                value={printFilter}
                                                onChange={(e) => {
                                                    setPrintFilter(e.target.value)
                                                    setIncludeEmpty(true)
                                                }}
                                            >
                                                <MenuItem value="all">Todas las tablas</MenuItem>
                                                <MenuItem value="indices">Por índice(s)</MenuItem>
                                            </Select>
                                        </FormControl>

                                        {
                                            printFilter === "indices" && (
                                                <TextField
                                                    label="Índices (1,2,3)"
                                                    placeholder="Ej: 1,3"
                                                    value={indicesTxt}
                                                    onChange={(e) => setIndicesTxt(e.target.value)}
                                                    disabled={printFilter !== 'indices'}
                                                    fullWidth
                                                />
                                            )
                                        }

                                        {
                                            printFilter !== "indices" && (
                                                <FormControlLabel
                                                    control={<Switch checked={includeEmpty} onChange={(e) => setIncludeEmpty(e.target.checked)} />}
                                                    label="Incluir vacías"
                                                />
                                            )
                                        }

                                        <Button variant="contained" color="primary" onClick={handleImprimir}>
                                            Imprimir PDF
                                        </Button>
                                    </Stack>
                                </Card>

                            </>
                        )}
                    </CardContent>
                </Card>
            )}
            {/* Modal de confirmación antes de imprimir */}
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
                        onClick={confirmarImprimir}
                    >
                        Generar PDF
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
