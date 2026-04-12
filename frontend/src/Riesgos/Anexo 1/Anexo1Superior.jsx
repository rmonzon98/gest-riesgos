/**
 * @fileoverview
 * Vista de consulta y reporte del Anexo 1 para nivel superior / jerárquico.
 *
 * @module Riesgos/Anexo 1/Anexo1Superior.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
    Box, Card, CardHeader, CardContent, Typography,
    FormControl, InputLabel, Select, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
    Stepper, Step, MobileStepper, Button, Stack, TextField, Alert, Chip, Divider,
    StepButton, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, LinearProgress, Switch, FormControlLabel
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { KeyboardArrowLeft, KeyboardArrowRight, PictureAsPdf as PictureAsPdfIcon } from '@mui/icons-material';
import { safefmt as fmt, fechaLarga } from 'funciones/Fechas';
import { GenerarReporteAnexo1 } from '../Reportes F/Matrices/ReportesAnexo1';

/**
 * Vista de Anexo 1 para nivel superior (por ejemplo, órgano rector).
 *
 * Permite revisar matrices por periodo y generar reportes consolidados.
 *
 * @component
 */
function Anexo1Sup() {
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState('');

    const [matrices, setMatrices] = useState([]);
    const [active, setActive] = useState(0);

    const [alerta, setAlerta] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const [observacion, setObservacion] = useState('');
    const [estado, setEstado] = useState('A'); // 'A'|'R'

    const [historial, setHistorial] = useState([]);
    const [cargandoEstado, setCargandoEstado] = useState(false);
    const [estadoActual, setEstadoActual] = useState(null);
    const [estadoActualInfo, setEstadoActualInfo] = useState({ FECHA_CREACION: null, FECHA_SUPERIOR: null });

    const [histIdSel, setHistIdSel] = useState('');
    const histSel = useMemo(
        () => historial.find(h => String(h.CODIGO_HISTORIAL) === String(histIdSel)),
        [historial, histIdSel]
    );

    const comentarioBloqueado = useMemo(() => {
        const c = histSel?.COMENTARIO_SUPERIOR;
        return typeof c === 'string' && c.trim() !== '';
    }, [histSel]);

    const [logo, setLogo] = useState('');

    const [printFilter, setPrintFilter] = useState('all');   // 'all' | 'complete' | 'indices'
    const [printIndices, setPrintIndices] = useState('');
    const [printIncludeEmpty, setPrintIncludeEmpty] = useState(true);

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
    const headers = { 'x-access-token': localStorage.getItem('token') };

    /**
     * Devuelve un Chip que representa el estado del formulario en nivel superior.
     */
    const chipDeEstado = (v) => {
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
                if (celda === null || celda === undefined || String(celda).trim() === '') {
                    return false;
                }
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

    /**
     * Indicador circular de color para resaltar estados o condiciones.
     */
    const ColorDot = ({ color }) => (
        <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, display: 'inline-block', mr: 1 }} />
    );

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get('/api/periodos-actualizados', { headers });
                setPeriodos(data.result ?? data ?? []);
            } catch (e) {
                console.error('Error cargando periodos', e);
                setAlerta('No se pudieron cargar periodos.');
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get('/api/reportes-actualizados/obtener-logo', { headers });
                setLogo('data:image/png;base64,' + (data.logo ?? ''));
            } catch (e) {
                console.error('Error cargando logo', e);
                setLogo('');
            }
        })();
    }, []);

    /**
     * Recupera del backend el historial del Anexo 1 para el periodo seleccionado.
     */
    const cargarEstadoHistorial = async (selPeriodo) => {
        if (!selPeriodo) return;
        setCargandoEstado(true);
        try {
            const { data } = await axios.get('/api/primera-matriz-actualizados/estado-historial', {
                headers, params: { periodo: selPeriodo }
            });

            const lista = Array.isArray(data?.historial) ? data.historial : [];
            setHistorial(lista);

            const ultimo = lista[0] || null;
            setEstadoActual(ultimo?.ESTADO_SUPERIOR ?? null);
            setEstadoActualInfo({
                FECHA_CREACION: ultimo?.FECHA_CREACION ?? null,
                FECHA_SUPERIOR: ultimo?.FECHA_SUPERIOR ?? null
            });

            const sinComent = lista.filter(h => !h.COMENTARIO_SUPERIOR || String(h.COMENTARIO_SUPERIOR).trim() === '');
            const elegido = (sinComent[0] ?? lista[0]) || null;

            setHistIdSel(elegido ? elegido.CODIGO_HISTORIAL : '');
            setObservacion(elegido?.COMENTARIO_SUPERIOR ?? '');
            setEstado(elegido?.ESTADO === 'R' ? 'R' : 'A');

            const mats = elegido?.RESPUESTA?.matrices;
            if (Array.isArray(mats)) {
                setMatrices(mats.map(m => ({ ...m, observaciones: (m?.observaciones ?? m?.OBSERVACIONES ?? '') })));
                setActive(0);
                setAlerta(null);
            } else {
                setAlerta('No se encontró una respuesta/matriz para ese periodo.');
                setHistorial([]); setHistIdSel(''); setMatrices([]); setActive(0);
                setObservacion(''); setEstadoActual(null);
                setEstadoActualInfo({ FECHA_CREACION: null, FECHA_SUPERIOR: null });
            }
        } catch (e) {
            console.error('Error cargando historial', e);
            setHistorial([]); setHistIdSel(''); setMatrices([]); setActive(0);
            setObservacion(''); setEstadoActual(null);
            setEstadoActualInfo({ FECHA_CREACION: null, FECHA_SUPERIOR: null });
            setAlerta('No se pudo cargar el historial.');
        } finally {
            setCargandoEstado(false);
        }
    };

    useEffect(() => {
        cargarEstadoHistorial(periodo);
    }, [periodo]);

    const next = () => setActive(a => Math.min(a + 1, Math.max(0, matrices.length - 1)));
    const prev = () => setActive(a => Math.max(a - 1, 0));

    const handleElegirHistPorFila = (h) => {
        setHistIdSel(h.CODIGO_HISTORIAL);
        const mats = h?.RESPUESTA?.matrices;
        setMatrices(Array.isArray(mats) ? mats.map(m => ({ ...m, observaciones: (m?.observaciones ?? m?.OBSERVACIONES ?? '') })) : []);
        setActive(0);
        setObservacion(h?.COMENTARIO_SUPERIOR ?? '');
        setEstado(h?.ESTADO === 'R' ? 'R' : 'A');
    };

    const handleGuardarDecision = async () => {
        if (!periodo) { setAlerta('Seleccione periodo antes de guardar.'); return; }
        if (!histIdSel) { setAlerta('Seleccione una versión del historial.'); return; }

        if (estado === 'R' && !(observacion || '').trim()) { setAlerta('Ingrese comentario si rechazará.'); return; }

        try {
            setGuardando(true);
            await axios.put(
                '/api/primera-matriz-actualizados/estado-actualizar',
                {
                    periodo,
                    codigo_historial: histIdSel,
                    estado,
                    comentario: comentarioBloqueado
                        ? (histSel?.COMENTARIO_SUPERIOR ?? null)
                        : ((observacion || '').trim() || null),
                    superior: true
                },
                { headers }
            );

            setAlerta(`Decisión guardada para #${histIdSel}: ${estado === 'R' ? 'Rechazado' : 'Aceptado'}.`);
            await cargarEstadoHistorial(periodo);
        } catch (e) {
            console.error('Error guardando decisión', e);
            setAlerta('Ocurrió un error al guardar la decisión. Intente de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    /**
     * Abre el visor PDF para mostrar el reporte del Anexo 1 a nivel superior.
     */
    const openPdfModal = async () => {
        if (!periodo || matrices.length === 0) return;
        setPdfError('');
        setPdfModalOpen(true);
        setPdfLoadingData(true);
        try {
            const { data } = await axios.get('/api/reportes-actualizados/obtener-superior', {
                headers,
                params: { periodo }
            });
            const sup = data?.data ?? data ?? {};
            setRespNombre(sup.NOMBRE_SUPERIOR ?? sup.nombre ?? sup.NOMBRE ?? '');
            setRespPuesto(sup.PUESTO_SUPERIOR ?? sup.puesto ?? sup.CARGO ?? '');
        } catch (e) {
            setPdfError('No fue posible obtener la información del superior. Puedes editar manualmente.');
            setRespNombre('');
            setRespPuesto('');
        } finally {
            setPdfLoadingData(false);
        }
    };

    const generarPDF = () => {
        if (!periodo || matrices.length === 0) return;

        const indices = (printFilter === 'indices')
            ? String(printIndices).split(',')
                .map(s => parseInt(s.trim(), 10))
                .filter(n => Number.isFinite(n) && n > 0)
            : [];

        GenerarReporteAnexo1({
            matrices,
            nombreArchivo: `Matrices_Anexo1_${periodo}.pdf`,
            periodo,
            logoBase64: logo,
            unidad: '',
            filter: printFilter,
            indices,
            includeEmpty: printIncludeEmpty,
            responsable: {
                nombre: respNombre || '',
                puesto: respPuesto || ''
            }
        });

        setPdfModalOpen(false);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Revisión de superior de evaluación de la eficiencia del control interno y gobernanza
            </Typography>

            {/* Filtros */}
            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader title="Seleccione periodo" />
                <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
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

            {/* Estado actual + Historial */}
            {periodo && (
                <Card sx={{ borderRadius: 2, mb: 2 }}>
                    <CardHeader title="Estado e historial de la respuesta" />
                    <CardContent>
                        <Stack spacing={2}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                                <Typography variant="subtitle2" sx={{ minWidth: 160 }}>Estado actual:</Typography>
                                {cargandoEstado
                                    ? <Typography variant="body2" color="text.secondary">Cargando…</Typography>
                                    : chipDeEstado(estadoActual ?? null)}
                                {(estadoActualInfo.FECHA_SUPERIOR || estadoActualInfo.FECHA_CREACION) && (
                                    <Typography variant="subtitle2" sx={{ minWidth: 160 }}>
                                        {estadoActualInfo.FECHA_SUPERIOR
                                            ? fechaLarga(estadoActualInfo.FECHA_SUPERIOR)
                                            : fechaLarga(estadoActualInfo.FECHA_CREACION)}
                                    </Typography>
                                )}
                            </Stack>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>Historial completo:</Typography>
                                <TableContainer component={Box} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflowX: 'auto' }}>
                                    <Table size="small" stickyHeader sx={{ minWidth: 700 }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell style={{ fontWeight: 700 }}>Usuario que ingresó</TableCell>
                                                <TableCell style={{ fontWeight: 700 }}>Fecha</TableCell>
                                                <TableCell style={{ fontWeight: 700 }}>Usuario que revisó</TableCell>
                                                <TableCell style={{ fontWeight: 700 }}>Comentario revisión</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(historial && historial.length) ? historial.map((h, i) => {
                                                if (i === 0) {
                                                    const fechaH = fechaLarga(h.FECHA_CREACION);
                                                    const usrH = (typeof h.NOMBRE_USUARIO_CREACION === 'string' && h.NOMBRE_USUARIO_CREACION.trim())
                                                        ? h.NOMBRE_USUARIO_CREACION.trim()
                                                        : null;
                                                    const seleccionado = String(h.CODIGO_HISTORIAL) === String(histIdSel);
                                                    return (
                                                        <TableRow
                                                            key={h.CODIGO_HISTORIAL ?? i}
                                                            selected={seleccionado}
                                                            hover
                                                            sx={{ cursor: 'pointer' }}
                                                            onClick={() => handleElegirHistPorFila(h)}
                                                        >
                                                            <TableCell>{usrH || '—'}</TableCell>
                                                            <TableCell>{fechaH || '—'}</TableCell>
                                                            <TableCell>{h.NOMBRE_USUARIO_SUPERIOR ?? '—'}</TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                                    {h.COMENTARIO_SUPERIOR ?? '—'}
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                }
                                                return null;
                                            }) : (
                                                <TableRow><TableCell colSpan={5} align="center">Sin movimientos</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>

                            {/* Controles de impresión */}
                            <Card variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                    Generar reporte (PDF)
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                    <FormControl size="small" sx={{ minWidth: 220 }}>
                                        <InputLabel id="print-filter-label">Qué imprimir</InputLabel>
                                        <Select
                                            labelId="print-filter-label"
                                            label="Qué imprimir"
                                            value={printFilter}
                                            onChange={(e) => setPrintFilter(e.target.value)}
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

                                    <Box sx={{ flex: 1 }} />

                                    <Button
                                        variant="contained"
                                        startIcon={<PictureAsPdfIcon />}
                                        onClick={openPdfModal}
                                        disabled={!periodo || matrices.length === 0}
                                    >
                                        Generar PDF (revisión)
                                    </Button>
                                </Stack>
                            </Card>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* MATRICES */}
            {periodo && (
                <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                        {cargando ? (
                            <Typography variant="body2" color="text.secondary">Cargando respuesta…</Typography>
                        ) : matrices.length === 0 ? (
                            <Typography variant="body2">No hay respuesta guardada para este periodo.</Typography>
                        ) : (
                            <>
                                <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                                    <InputLabel id="matriz-trabajar-label">Matriz a visualizar</InputLabel>
                                    <Select
                                        labelId="matriz-trabajar-label"
                                        label="Matriz a visualizar"
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

                                {/* Leyenda obligatoria/opcional con color */}
                                {(() => {
                                    const m = matrices[active];
                                    const st = m ? getMatrixStatus(m) : null;
                                    return (
                                        <Typography
                                            variant="body2"
                                            sx={{ mb: 2, color: st?.obligatorio ? (st.complete ? 'success.main' : 'error.main') : (st?.complete ? 'success.main' : 'warning.main') }}
                                        >
                                            {st?.obligatorio
                                                ? (st.complete ? 'Tabla obligatoria — Completa' : 'Tabla obligatoria — Incompleta')
                                                : (st?.complete ? 'Tabla opcional — Completa' : 'Tabla opcional — Incompleta')}
                                        </Typography>
                                    );
                                })()}

                                {(() => {
                                    const matriz = matrices[active] || null;
                                    const headersArr = (matriz?.columnas?.headers) || (matriz?.COLUMNAS?.HEADERS) || [];
                                    const colCount = headersArr.length;

                                    return matriz ? (
                                        <Box sx={{ p: 1, border: '1px dashed', borderRadius: 2, mb: 2 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                                {matriz.titulo || matriz.TITULO || `Tabla #${matriz.matriz || matriz.MATRIZ}`}
                                            </Typography>

                                            <TableContainer component={Box} sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                                <Table stickyHeader size="small" sx={{ tableLayout: 'fixed', minWidth: 900, '& th, & td': { wordBreak: 'break-word', whiteSpace: 'normal', verticalAlign: 'top' } }}>
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

                                            {(() => {
                                                const obs = matriz?.observaciones ?? matriz?.OBSERVACIONES ?? '';
                                                return (String(obs).trim() !== '') ? (
                                                    <Box sx={{ mt: 1 }}>
                                                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Observaciones</Typography>
                                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{obs}</Typography>
                                                    </Box>
                                                ) : null;
                                            })()}

                                            {!isMobile ? (
                                                <Stepper nonLinear activeStep={active} sx={{ mb: 1, mt: 2 }}>
                                                    {matrices.map((mm, i) => {
                                                        const st = getMatrixStatus(mm);
                                                        return (
                                                            <Step
                                                                key={i}
                                                                completed={st.complete}
                                                                sx={{
                                                                    px: '3px',
                                                                    '& .MuiStepIcon-root': { color: st.color },
                                                                    '& .Mui-active .MuiStepIcon-root': { color: st.color }
                                                                }}
                                                            >
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
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {periodo && histIdSel && (estadoActual !== 'A' && estadoActual !== 'R') && (
                <Card sx={{ borderRadius: 2, mt: 2 }}>
                    <CardHeader title="Registrar decisión del superior" />
                    <CardContent>
                        <Stack spacing={2}>
                            <FormControl size="small" sx={{ maxWidth: 240 }}>
                                <InputLabel id="estado-rev-label">Estado</InputLabel>
                                <Select
                                    labelId="estado-rev-label"
                                    label="Estado"
                                    value={estado}
                                    onChange={(e) => setEstado(e.target.value)}
                                >
                                    <MenuItem value="A">Aceptar</MenuItem>
                                    <MenuItem value="R">Rechazar</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                label="Comentario del superior"
                                placeholder="Explique el motivo de aceptación/rechazo…"
                                value={observacion}
                                onChange={(e) => setObservacion(e.target.value)}
                                multiline
                                minRows={3}
                                fullWidth
                            />

                            <Box>
                                <Button variant="contained" onClick={handleGuardarDecision} disabled={guardando}>
                                    {guardando ? 'Guardando…' : 'Guardar decisión'}
                                </Button>
                            </Box>

                            {alerta && <Alert severity="warning" onClose={() => setAlerta(null)}>{alerta}</Alert>}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            <Dialog open={pdfModalOpen} onClose={() => setPdfModalOpen(false)} maxWidth="sm" fullWidth>
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
                    <Button variant="contained" onClick={generarPDF}>
                        Generar PDF
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Anexo1Sup;
