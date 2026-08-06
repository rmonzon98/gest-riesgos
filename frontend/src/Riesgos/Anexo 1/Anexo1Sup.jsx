/**
 * @fileoverview
 * Vista de consulta y reporte del Anexo 1 por entidad / área supervisada.
 *
 * @module Riesgos/Anexo 1/Anexo1Sup.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useMemo, useState } from 'react';
import apiClient from 'api/apiClient';
import {
    Box, Card, CardHeader, CardContent, Typography,
    FormControl, InputLabel, Select, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
    Stepper, Step, MobileStepper, Button, Stack, TextField, Alert, Chip, Divider,
    StepButton, Dialog, DialogTitle, DialogContent, DialogActions, Grid, LinearProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { KeyboardArrowLeft, KeyboardArrowRight, PictureAsPdf } from '@mui/icons-material';
import { safefmt as fmt, fechaLarga } from 'funciones/Fechas';
import { GenerarReporteAnexo1 } from '../Reportes F/Matrices/ReportesAnexo1';

/**
 * Vista de supervisión del Anexo 1 por entidad.
 *
 * Permite seleccionar entidad y periodo, revisar estados y emitir reportes.
 *
 * @component
 */
function Anexo1Sup() {
    const [nombreEntidad, setNombreEntidad] = useState('');
    const [entidades, setEntidades] = useState([]);
    const [periodos, setPeriodos] = useState([]);
    const [entidad, setEntidad] = useState('');
    const [periodo, setPeriodo] = useState('');

    const [matrices, setMatrices] = useState([]);
    const [active, setActive] = useState(0);

    const [alerta, setAlerta] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const [observacion, setObservacion] = useState('');
    const [estado, setEstado] = useState('A'); // 'A'|'R'

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

    const [logo, setLogo] = useState('');

    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [pdfError, setPdfError] = useState('');
    const [respNombre, setRespNombre] = useState('');
    const [respPuesto, setRespPuesto] = useState('');

    const theme = useTheme();
    const isMobile = useMemo(
        () => window.matchMedia(`(max-width: ${theme.breakpoints.values.md}px)`).matches,
        [theme]
    );

    /**
     * Mapea el estado del formulario de Anexo 1 a un Chip con color y etiqueta.
     */
    const chipDeEstado = (v) => {
        const map = {
            A: { label: 'Recibido', color: 'success' },
            R: { label: 'Se necesita revisión', color: 'error' },
            P: { label: 'Pendiente', color: 'warning' },
            I: { label: 'Ingresado', color: 'info' },
            M: { label: 'Modificado', color: 'info' },
            null: { label: 'Sin datos', color: 'default' }
        };
        const meta = map[v] || map.null;
        return <Chip label={meta.label} color={meta.color} size="small" />;
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

    const [printFilter, setPrintFilter] = useState('all');   // 'all' | 'complete' | 'indices'
    const [printIndices, setPrintIndices] = useState('');    // "1,3,5"

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
        // Verde si completa; Rojo si obligatoria e incompleta; Amarillo si opcional e incompleta
        if (complete) return { color: 'success.main', obligatorio, complete };
        if (obligatorio) return { color: 'error.main', obligatorio, complete };
        return { color: 'warning.main', obligatorio, complete };
    };

    /**
     * Punto de color utilizado como indicador visual de estado en listados.
     */
    const ColorDot = ({ color }) => (
        <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, display: 'inline-block', mr: 1 }} />
    );


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
                setAlerta('No se pudieron cargar entidades o periodos.');
            }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await apiClient.get('/api/reportes-actualizados/obtener-logo');
                setLogo('data:image/png;base64,' + (data.logo ?? ''));
            } catch (e) {
                console.error('Error cargando logo', e);
                setLogo('');
            }
        })();
    }, []);

    const prefillResponsable = async (unidadId) => {
        setRespNombre('');
        setRespPuesto('');
        if (!unidadId) return;
        try {
            const { data } = await apiClient.get('/api/responsables-actualizados/obtener-superior', {
                                params: { entidad: unidadId }
            });
            const nom = data?.data?.NOMBRE_SUPERIOR || '';
            const pue = data?.data?.PUESTO_SUPERIOR || '';
            setRespNombre(nom);
            setRespPuesto(pue);
        } catch (e) {
            setRespNombre('');
            setRespPuesto('');
        }
    };

    /**
     * Carga el historial de formularios de Anexo 1 para una entidad y periodo.
     */
    const cargarEstadoHistorial = async (selEntidad, selPeriodo) => {
        if (!selEntidad || !selPeriodo) return;
        setCargandoEstado(true);
        try {
            const { data } = await apiClient.get('/api/primera-matriz-actualizados/estado-historial', {
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
                setMatrices(mats.map(m => ({ ...m, observaciones: (m?.observaciones ?? m?.OBSERVACIONES ?? '') })));
                setActive(0);
                setAlerta(null);
            } else {
                setAlerta('No se encontró una respuesta/matriz para esa combinación.');
                setHistorial([]);
                setHistIdSel('');
                setMatrices([]);
                setActive(0);
                setObservacion('');
                setEstadoActual(null);
                setEstadoActualInfo({ FECHA_CREACION: null, FECHA_MODIFICACION: null });
            }
        } catch (e) {
            console.error('Error cargando historial', e);
            setHistorial([]);
            setHistIdSel('');
            setMatrices([]);
            setActive(0);
            setObservacion('');
            setEstadoActual(null);
            setEstadoActualInfo({ FECHA_CREACION: null, FECHA_MODIFICACION: null });
            setAlerta('No se pudo cargar el historial.');
        } finally {
            setCargandoEstado(false);
        }
    };

    useEffect(() => {
        cargarEstadoHistorial(entidad, periodo);
        if (entidad) prefillResponsable(entidad);
    }, [entidad, periodo]);

    const next = () => setActive(a => Math.min(a + 1, Math.max(0, matrices.length - 1)));
    const prev = () => setActive(a => Math.max(a - 1, 0));

    const handleElegirHistPorFila = (h) => {
        setHistIdSel(h.CODIGO_HISTORIAL);
        const mats = h?.RESPUESTA?.matrices;
        setMatrices(Array.isArray(mats) ? mats.map(m => ({ ...m, observaciones: (m?.observaciones ?? m?.OBSERVACIONES ?? '') })) : []);
        setActive(0);
        setObservacion(h?.COMENTARIO_SUPERVISOR ?? '');
        setEstado(h?.ESTADO === 'R' ? 'R' : 'A');
    };

    const handleGuardarDecision = async () => {
        if (!entidad || !periodo) { setAlerta('Seleccione entidad y periodo antes de guardar.'); return; }
        if (!histIdSel) { setAlerta('Seleccione una versión del historial.'); return; }

        if (estado === 'R' && !(observacion || '').trim()) { setAlerta('Ingrese comentario si Se necesita revisión.'); return; }

        try {
            setGuardando(true);
            await apiClient.put(
                '/api/primera-matriz-actualizados/estado-actualizar',
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
            console.error('Error guardando decisión', e);
            setAlerta('Ocurrió un error al guardar la decisión. Intente de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    /**
     * Abre el modal de vista previa en PDF para el formulario seleccionado.
     */
    const abrirModalPDF = () => {
        setPdfError('');
        setPdfModalOpen(true);
    };

    const generarPDFConResponsable = (usarEditados = true) => {
        let indices = [];
        if (printFilter === 'indices') {
            indices = printIndices
                .split(',')
                .map(s => parseInt(s.trim(), 10))
                .filter(n => !Number.isNaN(n) && n > 0);
        }

        const responsable = {
            nombre: usarEditados ? (respNombre || '') : (respNombre || ''), // si quieres forzar el precargado, usa un estado aparte
            puesto: usarEditados ? (respPuesto || '') : (respPuesto || '')
        };

        setPdfGenerating(true);
        try {
            GenerarReporteAnexo1({
                matrices,
                periodo,
                logoBase64: logo,
                unidad: nombreEntidad || '—',
                nombreArchivo: `Matrices_Anexo1_${periodo || '—'}.pdf`,
                filter: printFilter,
                indices,
                includeEmpty: true,
                responsable
            });
            setPdfModalOpen(false);
        } catch (e) {
            console.error('Error generando PDF', e);
            setPdfError('Ocurrió un error al generar el PDF. Revise la consola.');
        } finally {
            setPdfGenerating(false);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Revisión de evaluación de la eficiencia del control interno y gobernanza
            </Typography>

            {/* Filtros */}
            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader title="Seleccione una unidad y periodo" />
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

            {/* Estado actual + Historial */}
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
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>Historial completo:</Typography>
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
                                                <TableCell style={{ fontWeight: 700 }}>Usuario que ingresó</TableCell>
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
                                                            <TableCell>
                                                                {
                                                                    chipEstadoForm(h.ESTADO_SUPERIOR)
                                                                }
                                                            </TableCell>
                                                            <TableCell>{h.NOMBRE_USUARIO_SUPERIOR ?? '—'}</TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2">
                                                                    {h.COMENTARIO_SUPERIOR ?? '—'}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell>
                                                                {
                                                                    chipEstadoFormConsolidador(h.ESTADO)
                                                                }
                                                            </TableCell>
                                                            <TableCell>{h.NOMBRE_USUARIO_MODIFICACION ?? '—'}</TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                                    {h.COMENTARIO_SUPERVISOR ?? '—'}
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

                            {/* Controles de impresión (usa ReportesAnexo1) */}
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
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
                                    startIcon={<PictureAsPdf />}
                                    onClick={abrirModalPDF}
                                    disabled={!periodo || matrices.length === 0}
                                >
                                    Generar PDF (revisión)
                                </Button>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* MATRICES */}
            {entidad && periodo && (
                <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                        {matrices.length === 0 ? (
                            <Typography variant="body2">No hay respuesta guardada para esta entidad y periodo.</Typography>
                        ) : (
                            <>
                                {/* SELECT con semáforo */}
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
                                            sx={{ mb: 2, color: st?.obligatorio ? (st.complete ? 'success.main' : 'error.main') : (st.complete ? 'success.main' : 'warning.main') }}
                                        >
                                            {st?.obligatorio ? (st.complete ? 'Tabla obligatoria — Completa' : 'Tabla obligatoria — Incompleta') : (st?.complete ? 'Tabla opcional — Completa' : 'Tabla opcional — Incompleta')}
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

            {entidad && periodo && histIdSel && (estadoActual !== 'A' && estadoActual !== 'R') && (
                <Card sx={{ borderRadius: 2, mt: 2 }}>
                    <CardHeader title="Registrar decisión del revisor" />
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
                                    <MenuItem value="A">Recibir</MenuItem>
                                    <MenuItem value="R">Se necesita revisión</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                label="Comentario del revisor"
                                placeholder="Explique el motivo de recepción o si necesita revisión…"
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

export default Anexo1Sup;
