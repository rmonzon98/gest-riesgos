import React, { useEffect, useState, useCallback, useMemo } from 'react';
import apiClient from 'api/apiClient';
import {
    Box,
    Card,
    CardHeader,
    CardContent,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Alert,
    Divider,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Chip,
    CircularProgress,
    Grid,
    Paper,
    Collapse
} from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded';
import { fmt } from 'funciones/Fechas';

const MAX_RAZON = 250;

const statusInfo = (estadoNum) => {
    const v = Number(estadoNum);
    if (v === 1) return { label: 'Recibido', color: 'success' };
    if (v === 2) return { label: 'Se necesita revisión', color: 'error' };
    return { label: 'Revisión pendiente', color: 'warning' };
};

const statusInfoSuperior = (estadoNum) => {
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

const parseExtrasToMap = (EXTRAS) => {
    if (!EXTRAS) return new Map();

    let parsed = EXTRAS;
    if (typeof EXTRAS === 'string') {
        try {
            parsed = JSON.parse(EXTRAS);
        } catch {
            return new Map();
        }
    }

    const map = new Map();

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !parsed.extras) {
        for (const [k, v] of Object.entries(parsed)) {
            map.set((k ?? '').toString(), v ?? '—');
        }
        return map;
    }

    if (parsed?.extras && Array.isArray(parsed.extras)) {
        parsed.extras.forEach((x) => {
            const k = (x?.propiedad ?? '').toString();
            if (k) map.set(k, x?.valor ?? '—');
        });
        return map;
    }

    return new Map();
};

const getTipoUpper = (tipo = '') => String(tipo || '').toUpperCase().trim();
const getTipoLower = (tipo = '') => String(tipo || '').toLowerCase().trim();

const getEstadoSuperior = (r, tipo) => {
    const tU = getTipoUpper(tipo);
    const tL = getTipoLower(tipo);

    return (
        r?.ESTADO_SUPERIOR ??
        r?.estado_superior ??
        r?.[`ESTADO_${tU}_SUPERIOR`] ??
        r?.[`estado_${tL}_superior`] ??
        r?.[`ESTADO`] ??
        0
    );
};

const getExtrasRiesgo = (r, tipo) => {
    const tU = getTipoUpper(tipo);
    const tL = getTipoLower(tipo);

    return (
        r?.EXTRAS ??
        r?.extras ??
        r?.[`EXTRAS_${tU}`] ??
        r?.[`extras_${tL}`] ??
        null
    );
};

function RiesgosRevisionSuperior({ tipo = '', titulo = 'Revisión superior de riesgos' }) {
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState('');
    const [miUnidad, setMiUnidad] = useState(null);

    const [alerta, setAlerta] = useState(null);
    const [alertaTipo, setAlertaTipo] = useState('info');

    const [cargandoInicial, setCargandoInicial] = useState(true);
    const [cargandoRiesgos, setCargandoRiesgos] = useState(false);
    const [riesgos, setRiesgos] = useState([]);
    const [propiedades, setPropiedades] = useState([]);

    const [expandIds, setExpandIds] = useState(new Set());

    const [rechazoOpen, setRechazoOpen] = useState(false);
    const [razon, setRazon] = useState('');
    const [procesandoAccion, setProcesandoAccion] = useState(false);
    const [seleccionAccion, setSeleccionAccion] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                setCargandoInicial(true);

                const [perRes, unidadRes] = await Promise.all([
                    apiClient.get('/api/periodos-actualizados'),
                    apiClient.get('/api/responsables-actualizados/obtener-mi-unidad')
                ]);

                const perArr = Array.isArray(perRes.data?.result)
                    ? perRes.data.result
                    : (perRes.data ?? []);

                setPeriodos(perArr);
                setMiUnidad(unidadRes.data?.data ?? null);
            } catch {
                setAlertaTipo('error');
                setAlerta('No se pudieron cargar los períodos o la unidad del usuario.');
            } finally {
                setCargandoInicial(false);
            }
        })();
    }, []);

    const fetchRiesgos = useCallback(async () => {
        if (!periodo) return;

        setCargandoRiesgos(true);
        setAlerta(null);

        try {
            const { data } = await apiClient.get('/api/riesgos-variables-actualizados/unidad-periodo-superior', {
                params: { periodo, tipo }
            });

            const arr = Array.isArray(data?.riesgos) ? data.riesgos : [];
            const props = Array.isArray(data?.propiedades) ? data.propiedades : [];

            setRiesgos(arr);
            setPropiedades(props);
            setExpandIds(new Set());
        } catch {
            setRiesgos([]);
            setPropiedades([]);
            setAlertaTipo('error');
            setAlerta('No fue posible obtener los riesgos del período seleccionado.');
        } finally {
            setCargandoRiesgos(false);
        }
    }, [periodo, tipo]);

    useEffect(() => {
        fetchRiesgos();
    }, [fetchRiesgos]);

    const grupos = useMemo(() => {
        const areasMap = new Map();

        riesgos.forEach((r) => {
            const nombreArea = r?.['Área evaluada'] || 'Sin área';

            if (!areasMap.has(nombreArea)) {
                areasMap.set(nombreArea, []);
            }

            areasMap.get(nombreArea).push(r);
        });

        return Array.from(areasMap.entries())
            .map(([nombre_area, items]) => ({ nombre_area, items }))
            .sort((a, b) => (a.nombre_area || '').localeCompare(b.nombre_area || ''));
    }, [riesgos]);

    const toggleExpand = (riskKey) => {
        setExpandIds((prev) => {
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

    const enviarRevisionSuperior = async ({ riesgo, estado, comentario }) => {
        await apiClient.put(
            '/api/riesgos-variables-actualizados/revision-superior',
            {
                comentario: comentario ?? '',
                codigo_riesgo: Number(riesgo.CODIGO_RIESGO),
                estado: Number(estado),
                periodo: Number(periodo),
                codigo_entidad: Number(riesgo.CODIGO_ENTIDAD),
                tipo
            },
        );
    };

    const aprobar = async (r) => {
        if (!r) return;

        try {
            setProcesandoAccion(true);
            await enviarRevisionSuperior({ riesgo: r, estado: 1, comentario: '' });
            setAlertaTipo('success');
            setAlerta('Riesgo marcado como aprobado por revisión superior.');
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
            await enviarRevisionSuperior({ riesgo: r, estado: 2, comentario: texto });
            setRechazoOpen(false);
            setSeleccionAccion(null);
            setAlertaTipo('success');
            setAlerta('Riesgo rechazado por revisión superior.');
            await fetchRiesgos();
        } catch {
            setAlertaTipo('error');
            setAlerta('No fue posible rechazar el riesgo.');
        } finally {
            setProcesandoAccion(false);
        }
    };

    const predefSet = buildPredefSet(propiedades);
    const extraLabels = getExtraLabels(propiedades);

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {titulo}
            </Typography>

            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader title={miUnidad?.NOMBRE + (miUnidad?.SIGLAS ? ` (${miUnidad.SIGLAS})` : '') || '—'} />
                <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <FormControl fullWidth disabled={cargandoInicial}>
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

            {periodo && (
                <Card sx={{ borderRadius: 2 }}>
                    <CardHeader
                        title="Riesgos del período"
                        subheader={cargandoRiesgos ? 'Cargando…' : `${riesgos.length} registro(s)`}
                        action={cargandoRiesgos ? <CircularProgress size={20} sx={{ mr: 2 }} /> : null}
                    />
                    <CardContent>
                        {grupos.length === 0 && !cargandoRiesgos && (
                            <Typography variant="body2">
                                No hay riesgos para la selección actual.
                            </Typography>
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
                                        const riskKey = `${g.nombre_area}-${r.CODIGO_ENTIDAD}-${r.CODIGO_RIESGO ?? idx}`;
                                        const estado = getEstadoSuperior(r, tipo);
                                        const ss = statusInfoSuperior(estado);
                                        const si = statusInfo(r.ESTADO_SUPERVISOR ?? 0);
                                        const expanded = expandIds.has(riskKey);

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
                                                        <Box
                                                            sx={{
                                                                display: 'inline-block',
                                                                px: 1.2,
                                                                py: 0.5,
                                                                borderRadius: 1,
                                                                fontWeight: 700,
                                                                ...cellRiskStyle(v)
                                                            }}
                                                        >
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
                                                        <Box
                                                            sx={{
                                                                display: 'inline-block',
                                                                px: 1.2,
                                                                py: 0.5,
                                                                borderRadius: 1,
                                                                fontWeight: 700,
                                                                ...cellRiskStyle(v)
                                                            }}
                                                        >
                                                            {v ?? '—'}
                                                        </Box>
                                                    );
                                                }
                                            }
                                        ].filter((c) => hasLabel(predefSet, c.label));
                                        const extrasMap = parseExtrasToMap(getExtrasRiesgo(r, tipo));

                                        const idRiesgo = Number(
                                            Object.keys(riesgos).find(
                                                id => safeGet(riesgos[id], 'Ref.') === safeGet(r, 'Ref.')
                                            )
                                        );

                                        const comentarioSupervisor = safeGet(riesgos[idRiesgo], 'Comentario supervisor')
                                        const comentarioSuperior = safeGet(riesgos[idRiesgo], 'Comentario superior')


                                        return (
                                            <Paper
                                                key={riskKey}
                                                variant="outlined"
                                                sx={{
                                                    p: 1.25,
                                                    borderRadius: 2,
                                                    cursor: 'pointer',
                                                    '&:hover': { boxShadow: 2 }
                                                }}
                                                onClick={() => toggleExpand(riskKey)}
                                            >
                                                {/* Header compacto */}
                                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                    <Stack direction="row" alignItems="center" spacing={2}>

                                                        {/* Ref */}
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                            {safeGet(r, 'Ref.') || '—'}
                                                        </Typography>

                                                        {/* Estado Superior */}
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <Typography variant="body2">
                                                                Estado Superior
                                                            </Typography>
                                                            <Chip size="small" color={ss.color} label={ss.label} />
                                                        </Stack>

                                                        {/* Estado Supervisor */}
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <Typography variant="body2">
                                                                Estado Supervisor
                                                            </Typography>
                                                            <Chip size="small" color={si.color} label={si.label} />
                                                        </Stack>

                                                    </Stack>

                                                    <Tooltip title={expanded ? 'Ocultar detalles' : 'Ver detalles'}>
                                                        <IconButton size="small">
                                                            {expanded ? <ExpandLessRounded fontSize="small" /> : <ExpandMoreRounded fontSize="small" />}
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>

                                                <Collapse in={expanded} timeout="auto" unmountOnExit>
                                                    <Divider sx={{ my: 1 }} />

                                                    <Grid container spacing={1}>
                                                        <Grid item xs={12}>
                                                            <Typography variant="caption">Dirección</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: 0.5 }}>
                                                                {r?.Dirección || r?.DIRECCION || '—'}
                                                            </Paper>
                                                        </Grid>

                                                        {hasLabel(predefSet, 'Área evaluada') && (
                                                            <Grid item xs={12}>
                                                                <Typography variant="caption">Área evaluada</Typography>
                                                                <Paper variant="outlined" sx={{ p: 1.2, mt: 0.5 }}>
                                                                    {safeGet(r, 'Área evaluada') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}

                                                        {hasLabel(predefSet, 'Tipo de objetivo') && (
                                                            <Grid item xs={12} md={3}>
                                                                <Typography variant="caption">Tipo de objetivo</Typography>
                                                                <Paper variant="outlined" sx={{ p: 1.2, mt: 0.5 }}>
                                                                    {safeGet(r, 'Tipo de objetivo') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}

                                                        {hasLabel(predefSet, 'Objetivo') && (
                                                            <Grid item xs={12} md={9}>
                                                                <Typography variant="caption">Objetivo</Typography>
                                                                <Paper
                                                                    variant="outlined"
                                                                    sx={{ p: 1.2, mt: 0.5, whiteSpace: 'pre-wrap' }}
                                                                >
                                                                    {safeGet(r, 'Objetivo') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}

                                                        {hasLabel(predefSet, 'Descripción del riesgo') && (
                                                            <Grid item xs={12}>
                                                                <Typography variant="caption">Descripción del riesgo</Typography>
                                                                <Paper
                                                                    variant="outlined"
                                                                    sx={{ p: 1.2, mt: 0.5, whiteSpace: 'pre-wrap' }}
                                                                >
                                                                    {safeGet(r, 'Descripción del riesgo') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}

                                                        {colDefs.map((c) => (
                                                            <Grid item xs={12} md={3} key={c.label}>
                                                                <Typography variant="caption">{c.label}</Typography>
                                                                <Paper variant="outlined" sx={{ p: 1.2, mt: 0.5 }}>
                                                                    {c.render()}
                                                                </Paper>
                                                            </Grid>
                                                        ))}

                                                        {hasLabel(predefSet, 'Observaciones') && (
                                                            <Grid item xs={12}>
                                                                <Typography variant="caption">Observaciones</Typography>
                                                                <Paper
                                                                    variant="outlined"
                                                                    sx={{ p: 1.2, mt: 0.5, whiteSpace: 'pre-wrap' }}
                                                                >
                                                                    {safeGet(r, 'Observaciones') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}

                                                        {hasLabel(predefSet, 'Evento') && (
                                                            <Grid item xs={12} md={4}>
                                                                <Typography variant="caption">Evento</Typography>
                                                                <Paper
                                                                    variant="outlined"
                                                                    sx={{ p: 1.2, mt: 0.5, whiteSpace: 'pre-wrap' }}
                                                                >
                                                                    {safeGet(r, 'Evento') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}

                                                        {hasLabel(predefSet, 'Control interno para mitigar') && (
                                                            <Grid item xs={12} md={4}>
                                                                <Typography variant="caption">Control interno para mitigar</Typography>
                                                                <Paper
                                                                    variant="outlined"
                                                                    sx={{ p: 1.2, mt: 0.5, whiteSpace: 'pre-wrap' }}
                                                                >
                                                                    {safeGet(r, 'Control interno para mitigar') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}

                                                        {hasLabel(predefSet, 'Método de monitoreo') && (
                                                            <Grid item xs={12} md={4}>
                                                                <Typography variant="caption">Método de monitoreo</Typography>
                                                                <Paper
                                                                    variant="outlined"
                                                                    sx={{ p: 1.2, mt: 0.5, whiteSpace: 'pre-wrap' }}
                                                                >
                                                                    {safeGet(r, 'Método de monitoreo') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}

                                                        {hasLabel(predefSet, 'Frecuencia') && (
                                                            <Grid item xs={12} md={6}>
                                                                <Typography variant="caption">Frecuencia</Typography>
                                                                <Paper variant="outlined" sx={{ p: 1.2, mt: 0.5 }}>
                                                                    {safeGet(r, 'Frecuencia') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}

                                                        {hasLabel(predefSet, 'Responsable') && (
                                                            <Grid item xs={12} md={6}>
                                                                <Typography variant="caption">Responsable</Typography>
                                                                <Paper
                                                                    variant="outlined"
                                                                    sx={{ p: 1.2, mt: 0.5, whiteSpace: 'pre-wrap' }}
                                                                >
                                                                    {safeGet(r, 'Responsable') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}

                                                        {hasLabel(predefSet, 'Severidad (narración)') && (
                                                            <Grid item xs={12}>
                                                                <Typography variant="caption">Severidad (narración)</Typography>
                                                                <Paper
                                                                    variant="outlined"
                                                                    sx={{ p: 1.2, mt: 0.5, whiteSpace: 'pre-wrap' }}
                                                                >
                                                                    {safeGet(r, 'Severidad (narración)') || '—'}
                                                                </Paper>
                                                            </Grid>
                                                        )}

                                                        {extraLabels.length > 0 && (
                                                            <Grid item xs={12}>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
                                                                    Propiedades adicionales
                                                                </Typography>
                                                                <Grid container spacing={1} sx={{ mt: 0.25 }}>
                                                                    {extraLabels.map((label) => (
                                                                        <Grid item xs={12} md={4} key={label}>
                                                                            <Typography variant="caption">{label}</Typography>
                                                                            <Paper
                                                                                variant="outlined"
                                                                                sx={{ p: 1.2, mt: 0.5, whiteSpace: 'pre-wrap' }}
                                                                            >
                                                                                {extrasMap.get(label) ?? '—'}
                                                                            </Paper>
                                                                        </Grid>
                                                                    ))}
                                                                </Grid>
                                                            </Grid>
                                                        )}

                                                        <Grid container spacing={2} mt={2} ml={1}>
                                                            {(comentarioSuperior || comentarioSupervisor) && <Grid item xs={12}>
                                                                <Divider sx={{ mb: 2 }}>
                                                                    <Typography variant="subtitle2" color="text.secondary">
                                                                        Observaciones y comentarios
                                                                    </Typography>
                                                                </Divider>
                                                            </Grid>}
                                                            
                                                            {comentarioSuperior &&
                                                                <Grid item xs={12} md={4}>
                                                                    <Typography variant="caption">Comentario Superior</Typography>
                                                                    <Paper
                                                                        variant="outlined"
                                                                        sx={{ p: 1.2, mt: 0.5, whiteSpace: 'pre-wrap' }}
                                                                    >
                                                                        {comentarioSuperior ?? '—'}
                                                                    </Paper>
                                                                </Grid>
                                                            }

                                                            {comentarioSupervisor &&
                                                                <Grid item xs={12} md={4}>
                                                                    <Typography variant="caption">Comentario Supervisor</Typography>
                                                                    <Paper
                                                                        variant="outlined"
                                                                        sx={{ p: 1.2, mt: 0.5, whiteSpace: 'pre-wrap' }}
                                                                    >
                                                                        {comentarioSupervisor ?? '—'}
                                                                    </Paper>
                                                                </Grid>
                                                            }
                                                        </Grid>


                                                        <Grid item xs={12}>
                                                            <Stack
                                                                direction={{ xs: 'column', sm: 'row' }}
                                                                spacing={1}
                                                                justifyContent="flex-end"
                                                                sx={{ mt: 1 }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Button
                                                                    variant="contained"
                                                                    color="success"
                                                                    disabled={procesandoAccion}
                                                                    onClick={() => aprobar(r)}
                                                                >
                                                                    Aprobar
                                                                </Button>
                                                                <Button
                                                                    variant="contained"
                                                                    color="error"
                                                                    disabled={procesandoAccion}
                                                                    onClick={() => solicitarRechazo(r)}
                                                                >
                                                                    Rechazar
                                                                </Button>
                                                            </Stack>
                                                        </Grid>
                                                    </Grid>
                                                </Collapse>
                                            </Paper>
                                        );
                                    })}
                                </Stack>
                            </Box>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Dialog
                open={rechazoOpen}
                onClose={() => !procesandoAccion && setRechazoOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Rechazar riesgo</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={8}
                        margin="dense"
                        label="Comentario"
                        value={razon}
                        onChange={(e) => setRazon(e.target.value.slice(0, MAX_RAZON))}
                        helperText={`${razon.length}/${MAX_RAZON} caracteres`}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setRechazoOpen(false)}
                        disabled={procesandoAccion}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={procesandoAccion || razon.trim().length === 0}
                        onClick={confirmarRechazo}
                    >
                        Confirmar rechazo
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default RiesgosRevisionSuperior;