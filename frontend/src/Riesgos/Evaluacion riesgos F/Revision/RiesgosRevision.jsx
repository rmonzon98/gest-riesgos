/**
 * @fileoverview 
 *
 * Pantalla de revisión de riesgos por unidad y período. 
 * 
 * Permite:
 * - Cargar unidades (entidades/direcciones) y períodos.
 * - Listar riesgos agrupados por "Área evaluada".
 * - Visualizar detalles numéricos y narrativos del riesgo.
 * - Aprobar o rechazar riesgos, registrando comentario en caso de rechazo.
 *
 * @module Riesgos/Evaluacion riesgos F/Revision/RiesgosRevision.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Card, CardHeader, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, Stack, Alert,
    Table, TableHead, TableRow, TableCell, TableBody, Divider, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Chip, CircularProgress, Grid, Paper, Collapse
} from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded';
import { fmt } from 'funciones/Fechas';

/**
 * Obtiene el identificador numérico de una unidad (entidad/dirección).
 *
 * @param {Object} e Objeto de unidad proveniente del backend.
 * @returns {number} Identificador numérico de la unidad.
 */
const getUnidadId = (e) => Number(e?.CODIGO_ENTIDAD ?? e?.CODIGO_DIRECCION ?? e?.ID);


/**
 * Obtiene la descripción legible de una unidad.
 *
 * @param {Object} e Objeto de unidad proveniente del backend.
 * @returns {string} Descripción de la unidad.
 */
const getUnidadDesc = (e) => e?.DESCRIPCION ?? e?.NOMBRE ?? `Unidad ${getUnidadId(e)}`;

const MAX_RAZON = 250;
const headers = { 'x-access-token': localStorage.getItem('token') };

const statusInfo = (estadoNum) => {
    const v = Number(estadoNum);
    if (v === 1) return { label: 'Aprobado', color: 'success' };
    if (v === 2) return { label: 'Rechazado', color: 'error' };
    return { label: 'Revisión pendiente', color: 'warning' };
};

const cellRiskStyle = (score) => {
    const s = Number(score) || 0;
    if (s >= 16) return { bgcolor: '#e74c3c', color: '#fff' };
    if (s >= 12) return { bgcolor: '#f39c12', color: '#000' };
    return { bgcolor: '#2ecc71', color: '#000' };
};

// === Helpers de propiedades ===
const buildPredefSet = (propsArr) =>
    new Set(
        (Array.isArray(propsArr) ? propsArr : [])
            .filter((p) => (p?.source ?? '').toLowerCase() === 'predefinida')
            .map((p) => (p?.label ?? '').toString().trim())
            .filter(Boolean)
    );

const getExtraLabels = (propsArr) =>
    (Array.isArray(propsArr) ? propsArr : [])
        .filter((p) => (p?.source ?? '').toLowerCase() === 'extra')
        .map((p) => (p?.label ?? '').toString().trim())
        .filter(Boolean);

const hasLabel = (predefSet, label) => predefSet.has(label);
const safeGet = (obj, label) => (obj && label in obj ? obj[label] : undefined);

/**
 * Normaliza el campo EXTRAS a un Map<label, valor>.
 *
 * @param {Object|string|null} EXTRAS Campo EXTRAS devuelto por el backend.
 * @returns {Map<string, any>} Mapa de propiedades adicionales.
 */
const parseExtrasToMap = (EXTRAS) => {
    if (!EXTRAS) return new Map();
    let parsed = EXTRAS;
    if (typeof EXTRAS === 'string') {
        try { parsed = JSON.parse(EXTRAS); } catch { return new Map(); }
    }
    const map = new Map();

    // Objeto plano
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !parsed.extras) {
        for (const [k, v] of Object.entries(parsed)) map.set((k ?? '').toString(), v ?? '—');
        return map;
    }
    // Legacy { extras: [ { propiedad, valor } ] }
    if (parsed?.extras && Array.isArray(parsed.extras)) {
        parsed.extras.forEach((x) => {
            const k = (x?.propiedad ?? '').toString();
            if (k) map.set(k, x?.valor ?? '—');
        });
        return map;
    }
    return new Map();
};

/**
 * Componente principal de revisión de riesgos.
 *
 * Flujo general:
 * - Carga inicial de entidades (unidades) y períodos disponibles.
 * - El usuario selecciona unidad y período.
 * - Se consultan los riesgos con sus propiedades y se agrupan por "Área evaluada".
 * - Cada riesgo puede expandirse para ver detalles numéricos/narrativos y propiedades extra.
 * - Desde el panel de detalle se puede aprobar o rechazar el riesgo (con comentario obligatorio en el rechazo).
 *
 * @param {Object} props Propiedades del componente.
 * @param {string} props.tipo Tipo de riesgo a consultar (se envía al backend).
 * @param {string} props.titulo Título mostrado en la parte superior de la pantalla.
 * @returns {JSX.Element} JSX del módulo de revisión de riesgos.
 */
function RiesgosRevision({ tipo = '', titulo = '' }) {
    const [entidades, setEntidades] = useState([]);
    const [periodos, setPeriodos] = useState([]);
    const [entidad, setEntidad] = useState('');
    const [periodo, setPeriodo] = useState('');

    const [alerta, setAlerta] = useState(null);
    const [alertaTipo, setAlertaTipo] = useState('info');

    const [cargandoRiesgos, setCargandoRiesgos] = useState(false);
    const [riesgos, setRiesgos] = useState([]);
    const [propiedades, setPropiedades] = useState([]);

    const [expandIds, setExpandIds] = useState(new Set());

    const [rechazoOpen, setRechazoOpen] = useState(false);
    const [razon, setRazon] = useState('');
    const [procesandoAccion, setProcesandoAccion] = useState(false);
    const [seleccionAccion, setSeleccionAccion] = useState(null);

    /**
     * - Llama en paralelo a /api/direcciones-actualizados y /api/periodos-actualizados.
     * - Normaliza el resultado en arreglos para los Select de unidad y período.
     * - En caso de error, muestra alerta de tipo error.
     */
    useEffect(() => {
        (async () => {
            try {
                const [entRes, perRes] = await Promise.all([
                    axios.get('/api/direcciones-actualizados', { headers }),
                    axios.get('/api/periodos-actualizados', { headers })
                ]);
                const entArr = Array.isArray(entRes.data?.result) ? entRes.data.result : (entRes.data ?? []);
                const perArr = Array.isArray(perRes.data?.result) ? perRes.data.result : (perRes.data ?? []);
                setEntidades(entArr);
                setPeriodos(perArr);
            } catch {
                setAlertaTipo('error');
                setAlerta('No se pudieron cargar unidades o períodos.');
            }
        })();
    }, []);

    /**
     * Consulta los riesgos para la unidad y período seleccionados.
     *
     * - Parámetros: { codigo_entidad, periodo, tipo }.
     * - Muestra alerta de error si la consulta falla.
     */
    const fetchRiesgos = useCallback(async () => {
        if (!entidad || !periodo) return;
        setCargandoRiesgos(true);
        setAlerta(null);
        try {
            const { data } = await axios.get('/api/riesgos-variables-actualizados/unidad-periodo', {
                headers,
                params: { codigo_entidad: entidad, periodo, tipo: tipo }
            });
            const arr = Array.isArray(data?.riesgos) ? data.riesgos : [];
            setRiesgos(arr);
            setPropiedades(Array.isArray(data?.propiedades) ? data.propiedades : []);
            setExpandIds(new Set());
        } catch {
            setRiesgos([]);
            setPropiedades([]);
            setAlertaTipo('error');
            setAlerta('No fue posible obtener los riesgos de la unidad/período seleccionado.');
        } finally {
            setCargandoRiesgos(false);
        }
    }, [entidad, periodo, tipo]);

    useEffect(() => { fetchRiesgos(); }, [fetchRiesgos]);

    // Agrupar por "Área evaluada"
    const grupos = (() => {
        const map = new Map();
        riesgos.forEach((r) => {
            const nombre_area = r['Área evaluada'] || 'Sin área';
            if (!map.has(nombre_area)) map.set(nombre_area, []);
            map.get(nombre_area).push(r);
        });
        return Array.from(map.entries())
            .map(([nombre_area, items]) => ({ nombre_area, items }))
            .sort((a, b) => (a.nombre_area || '').localeCompare(b.nombre_area || ''));
    })();

    const toggleExpand = (riskKey) => {
        setExpandIds(prev => {
            const next = new Set(prev);
            if (next.has(riskKey)) next.delete(riskKey);
            else next.add(riskKey);
            return next;
        });
    };

    const solicitarRechazo = (r) => {
        setSeleccionAccion(r);
        setRazon('');
        setRechazoOpen(true);
    };

    const enviarRevision = async ({ riesgo, estado, comentario }) => {
        await axios.put('/api/riesgos-variables-actualizados/revision', {
            comentario: comentario ?? "",
            codigo_riesgo: Number(riesgo.CODIGO_RIESGO),
            estado: Number(estado),
            periodo: Number(periodo),
            codigo_entidad: Number(entidad),
            tipo: tipo
        }, { headers });
    };

    /**
     * Marca un riesgo como aprobado.
     *
     * - Llama a enviarRevision con estado = 1 y comentario vacío.
     * - Muestra alerta de éxito o error según resultado.
     * - Refresca la lista de riesgos al finalizar.
     *
     * @param {Object} r Riesgo que se desea aprobar.
     */
    const aprobar = async (r) => {
        if (!r) return;
        try {
            setProcesandoAccion(true);
            await enviarRevision({ riesgo: r, estado: 1, comentario: "" });
            setAlertaTipo('success');
            setAlerta('Riesgo marcado como aprobado.');
            await fetchRiesgos();
        } catch {
            setAlertaTipo('error');
            setAlerta('No fue posible marcar como aprobado.');
        } finally {
            setProcesandoAccion(false);
        }
    };

    const confirmarRechazo = async () => {
        const r = seleccionAccion;
        if (!r) return;
        const texto = razon.trim();
        if (texto.length === 0 || texto.length > MAX_RAZON) return;
        try {
            setProcesandoAccion(true);
            await enviarRevision({ riesgo: r, estado: 2, comentario: texto });
            setRechazoOpen(false);
            setSeleccionAccion(null);
            setAlertaTipo('success');
            setAlerta('Riesgo rechazado.');
            await fetchRiesgos();
        } catch {
            setAlertaTipo('error');
            setAlerta('No fue posible rechazar el riesgo.');
        } finally {
            setProcesandoAccion(false);
        }
    };

    // Sets de labels configurados desde el backend
    const predefSet = buildPredefSet(propiedades);
    const extraLabels = getExtraLabels(propiedades);

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                {titulo}
            </Typography>

            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader title="Seleccione una unidad y período" />
                <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel id="entidad-label">Unidad</InputLabel>
                            <Select
                                labelId="entidad-label"
                                value={entidad ?? ''}
                                label="Unidad"
                                onChange={(e) => setEntidad(Number(e.target.value))}
                            >
                                {entidades
                                    .map((e) => ({ id: getUnidadId(e), desc: getUnidadDesc(e) }))
                                    .filter(({ id }) => Number.isFinite(id))
                                    .map(({ id, desc }) => (
                                        <MenuItem key={id} value={id}>{desc}</MenuItem>
                                    ))
                                }
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel id="periodo-label">Periodo</InputLabel>
                            <Select
                                labelId="periodo-label"
                                value={periodo}
                                label="Periodo"
                                onChange={(e) => setPeriodo(e.target.value)}
                            >
                                {periodos.map((p) => (
                                    <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                                        {fmt(p.PERIODO_INICIAL)} - {fmt(p.PERIODO_FINAL)} del {p.CODIGO_PERIODO}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>

                    {alerta && (
                        <Alert severity={alertaTipo} sx={{ mt: 2 }} onClose={() => setAlerta(null)}>
                            {alerta}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {entidad && periodo && (
                <Card sx={{ borderRadius: 2 }}>
                    <CardHeader
                        title="Riesgos de la unidad"
                        subheader={cargandoRiesgos ? 'Cargando…' : `${riesgos.length} registro(s)`}
                        action={cargandoRiesgos ? <CircularProgress size={20} sx={{ mr: 2 }} /> : null}
                    />
                    <CardContent>
                        {grupos.length === 0 && !cargandoRiesgos && (
                            <Typography variant="body2">No hay riesgos para la selección actual.</Typography>
                        )}

                        {grupos.map((g, gi) => (
                            <Box key={`${g.nombre_area}-${gi}`} sx={{ mb: 3 }}>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                        {g.nombre_area || 'Sin área'}
                                    </Typography>
                                    <Chip size="small" label={`${g.items.length}`} />
                                </Stack>

                                <Stack spacing={1.25}>
                                    {g.items.map((r, idx) => {
                                        const riskKey = `${g.nombre_area}-${r.CODIGO_RIESGO ?? idx}`;
                                        const estado = r.ESTADO ?? 0;
                                        const si = statusInfo(estado);
                                        const expanded = expandIds.has(riskKey);

                                        // Tabla (predefinidas numéricas)
                                        const colDefs = [
                                            { label: 'Probabilidad', render: () => safeGet(r, 'Probabilidad') ?? '—' },
                                            { label: 'Severidad', render: () => safeGet(r, 'Severidad') ?? '—' },
                                            { label: 'A mitigar', render: () => safeGet(r, 'A mitigar') ?? '—' },
                                            { label: 'Eficiencia del mitigador', render: () => safeGet(r, 'Eficiencia del mitigador') ?? '—' },
                                            {
                                                label: 'Riesgo Inherente',
                                                render: () => {
                                                    const v = safeGet(r, 'Riesgo Inherente');
                                                    return (
                                                        <Box sx={{ display: 'inline-block', px: 1.2, py: .5, borderRadius: 1, fontWeight: 700, ...cellRiskStyle(v) }}>
                                                            {v ?? '—'}
                                                        </Box>
                                                    );
                                                }
                                            },
                                            { label: 'Probabilidad ajustada', render: () => safeGet(r, 'Probabilidad ajustada') ?? '—' },
                                            { label: 'Severidad ajustada', render: () => safeGet(r, 'Severidad ajustada') ?? '—' },
                                            {
                                                label: 'Riesgo residual',
                                                render: () => {
                                                    const v = safeGet(r, 'Riesgo residual');
                                                    return (
                                                        <Box sx={{ display: 'inline-block', px: 1.2, py: .5, borderRadius: 1, fontWeight: 700, ...cellRiskStyle(v) }}>
                                                            {v ?? '—'}
                                                        </Box>
                                                    );
                                                }
                                            }
                                        ].filter(c => hasLabel(predefSet, c.label));

                                        const extrasMap = parseExtrasToMap(r.EXTRAS);
                                        const showAdicionales = extraLabels.length > 0;

                                        return (
                                            <Paper
                                                key={riskKey}
                                                variant="outlined"
                                                sx={{ p: 1.25, borderRadius: 2, cursor: 'pointer', '&:hover': { boxShadow: 2 } }}
                                                onClick={() => toggleExpand(riskKey)}
                                            >
                                                {/* Header compacto */}
                                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                            {safeGet(r, 'Ref.') || '—'}
                                                        </Typography>
                                                        <Chip size="small" color={si.color} label={si.label} />
                                                    </Stack>
                                                    <Tooltip title={expanded ? 'Ocultar detalles' : 'Ver detalles'}>
                                                        <IconButton size="small">
                                                            {expanded ? <ExpandLessRounded fontSize="small" /> : <ExpandMoreRounded fontSize="small" />}
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>

                                                {/* Detalle */}
                                                <Collapse in={expanded} timeout="auto" unmountOnExit>
                                                    <Divider sx={{ my: 1 }} />

                                                    {/* Resumen superior */}
                                                    <Grid container spacing={1}>
                                                        {hasLabel(predefSet, 'Área evaluada') && (
                                                            <Grid item xs={12}>
                                                                <Typography variant="caption">Área evaluada</Typography>
                                                                <Paper variant="outlined" sx={{ p: 1.2, mt: .5 }}>{safeGet(r, 'Área evaluada') || '—'}</Paper>
                                                            </Grid>
                                                        )}
                                                        {hasLabel(predefSet, 'Tipo de objetivo') && (
                                                            <Grid item xs={12} md={3}>
                                                                <Typography variant="caption">Tipo de objetivo</Typography>
                                                                <Paper variant="outlined" sx={{ p: 1.2, mt: .5 }}>{safeGet(r, 'Tipo de objetivo') || '—'}</Paper>
                                                            </Grid>
                                                        )}
                                                        {hasLabel(predefSet, 'Objetivo') && (
                                                            <Grid item xs={12} md={9}>
                                                                <Typography variant="caption">Objetivo</Typography>
                                                                <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                    {safeGet(r, 'Objetivo') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}
                                                        {hasLabel(predefSet, 'Descripción del riesgo') && (
                                                            <Grid item xs={12}>
                                                                <Typography variant="caption">Descripción del riesgo</Typography>
                                                                <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                    {safeGet(r, 'Descripción del riesgo') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}
                                                    </Grid>

                                                    {/* Tabla numérica */}
                                                    {colDefs.length > 0 && (
                                                        <Box sx={{ mt: 1.5 }}>
                                                            <Table size="small">
                                                                <TableHead>
                                                                    <TableRow>
                                                                        {colDefs.map((c) => <TableCell key={c.label}>{c.label}</TableCell>)}
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    <TableRow>
                                                                        {colDefs.map((c) => <TableCell key={c.label}>{c.render()}</TableCell>)}
                                                                    </TableRow>
                                                                </TableBody>
                                                            </Table>
                                                        </Box>
                                                    )}

                                                    {/* Campos narrativos SIEMPRE visibles si están en propiedades */}
                                                    {hasLabel(predefSet, 'Tolerancia') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Tolerancia</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safeGet(r, 'Tolerancia') ?? '—'}
                                                            </Paper>
                                                        </Box>
                                                    )}

                                                    {hasLabel(predefSet, 'Frecuencia') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Frecuencia</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safeGet(r, 'Frecuencia') ?? '—'}
                                                            </Paper>
                                                        </Box>
                                                    )}

                                                    {hasLabel(predefSet, 'Severidad (narración)') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Severidad (narración)</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safeGet(r, 'Severidad (narración)') ?? '—'}
                                                            </Paper>
                                                        </Box>
                                                    )}

                                                    {hasLabel(predefSet, 'Evento') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Evento</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safeGet(r, 'Evento') ?? '—'}
                                                            </Paper>
                                                        </Box>
                                                    )}

                                                    {hasLabel(predefSet, 'Control interno para mitigar') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Control interno para mitigar</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safeGet(r, 'Control interno para mitigar') ?? '—'}
                                                            </Paper>
                                                        </Box>
                                                    )}

                                                    {hasLabel(predefSet, 'Método de monitoreo') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Método de monitoreo</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safeGet(r, 'Método de monitoreo') ?? '—'}
                                                            </Paper>
                                                        </Box>
                                                    )}

                                                    {hasLabel(predefSet, 'Observaciones') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Observaciones</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safeGet(r, 'Observaciones') ?? '—'}
                                                            </Paper>
                                                        </Box>
                                                    )}

                                                    {hasLabel(predefSet, 'Responsable') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Responsable</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safeGet(r, 'Responsable') ?? '—'}
                                                            </Paper>
                                                        </Box>
                                                    )}

                                                    {/* Propiedades adicionales */}
                                                    {showAdicionales ? (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Grid container spacing={1} sx={{ mt: 0.5 }}>
                                                                {extraLabels.map((label, i) => {
                                                                    const value = extrasMap.has(label) ? extrasMap.get(label) : '—';
                                                                    return (
                                                                        <Grid key={`${label}-${i}`} item xs={12} md={6}>
                                                                            <Typography variant="caption">{label}</Typography>
                                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                                {value ?? '—'}
                                                                            </Paper>
                                                                        </Grid>
                                                                    );
                                                                })}
                                                            </Grid>
                                                        </Box>
                                                    ) : (
                                                        <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
                                                            No hay propiedades adicionales configuradas.
                                                        </Alert>
                                                    )}

                                                    {/* Acciones */}
                                                    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                                                        <Button
                                                            variant="outlined"
                                                            color="error"
                                                            size="small"
                                                            onClick={(e) => { e.stopPropagation(); solicitarRechazo(r); }}
                                                            disabled={procesandoAccion}
                                                        >
                                                            Rechazar
                                                        </Button>
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            onClick={(e) => { e.stopPropagation(); aprobar(r); }}
                                                            disabled={procesandoAccion}
                                                        >
                                                            {procesandoAccion ? 'Procesando…' : 'Marcar como aprobado'}
                                                        </Button>
                                                    </Stack>
                                                </Collapse>
                                            </Paper>
                                        );
                                    })}
                                </Stack>

                                <Divider sx={{ mt: 2 }} />
                            </Box>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Modal de rechazo */}
            <Dialog open={rechazoOpen} onClose={() => setRechazoOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Motivo de rechazo</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        label="Escribe la razón (máx. 250)"
                        value={razon}
                        onChange={(e) => setRazon(e.target.value.slice(0, MAX_RAZON + 1))}
                        fullWidth
                        multiline
                        minRows={3}
                        inputProps={{ maxLength: MAX_RAZON }}
                        helperText={`${Math.min(razon.length, MAX_RAZON)}/${MAX_RAZON} caracteres`}
                        error={razon.length > MAX_RAZON || (razon.trim().length === 0 && procesandoAccion)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRechazoOpen(false)} disabled={procesandoAccion}>Cancelar</Button>
                    <Button
                        onClick={confirmarRechazo}
                        variant="contained"
                        color="error"
                        disabled={procesandoAccion || razon.trim().length === 0 || razon.trim().length > MAX_RAZON}
                    >
                        {procesandoAccion ? 'Procesando…' : 'Rechazar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default RiesgosRevision;
