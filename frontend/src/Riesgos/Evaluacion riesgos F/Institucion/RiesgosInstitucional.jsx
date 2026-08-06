/**
 * @fileoverview 
 * Selección y visualización de riesgos institucionales por período y dirección.
 *
 * Permite:
 * - Consultar todos los riesgos del período a nivel institucional.
 * - Filtrar por dirección y por bandera “Solo General”.
 * - Marcar qué riesgos se muestran en el reporte institucional general.
 * - Visualizar detalle completo del riesgo, incluyendo propiedades extra (ME, MC, MCE).
 *
 * @module Riesgos/Evaluacion riesgos F/Institucion/RiesgosInstitucional.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useState, useCallback } from 'react';
import apiClient from 'api/apiClient';
import {
    Box, Card, CardHeader, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, Stack, Alert,
    Table, TableHead, TableRow, TableCell, TableBody, Divider, IconButton, Tooltip,
    Chip, CircularProgress, Grid, Paper, Collapse, Switch, FormControlLabel
} from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded';
import { fmt } from 'funciones/Fechas';


/* ======= Helpers ======= */
const statusInfo = (estadoNum) => {
    const v = Number(estadoNum);
    if (v === 1) return { label: 'Recibido', color: 'success' };
    if (v === 2) return { label: 'Rechazado', color: 'error' };
    return { label: 'Revisión pendiente', color: 'warning' };
};

const cellRiskStyle = (score) => {
    const s = Number(score) || 0;
    if (s >= 16) return { bgcolor: '#e74c3c', color: '#fff' };
    if (s >= 12) return { bgcolor: '#f39c12', color: '#000' };
    return { bgcolor: '#2ecc71', color: '#000' };
};

const safe = (v, d = '—') => (v == null || v === '' ? d : v);

const parseMaybeJsonObject = (val) => {
    if (val == null) return {};
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }
    if (typeof val === 'object' && !Array.isArray(val)) return val;
    return {};
};

/**
 * ExtrasSection
 *
 * Muestra en bloque las propiedades adicionales (extras) de un riesgo
 * para una matriz específica (ME, MC o MCE).
 *
 * - Recibe un objeto de pares { nombrePropiedad: valor }.
 * - Muestra cada propiedad en formato etiqueta + valor, en un grid de 2 columnas.
 * - Opcionalmente muestra el estado asociado (aprobado/rechazado/pendiente) en un Chip.
 *
 * @component
 * @param {string} props.title Título de la sección (ej. "Propiedades ME").
 * @param {Object} props.extrasObj Objeto con propiedades extra a mostrar.
 * @param {number} [props.estado] Estado de revisión de la sección (0, 1, 2).
 * @returns {JSX.Element}
 */
const ExtrasSection = ({ title, extrasObj, estado }) => {
    const entries = Object.entries(extrasObj ?? {});
    return (
        <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
                {estado != null && (
                    <Chip
                        size="small"
                        label={`Estado: ${estado === 0 ? 'Pendiente revisión' : estado === 1 ? 'Recibido' : 'Rechazado'}`}
                        color={Number(estado) === 1 ? 'success' : Number(estado) === 2 ? 'error' : 'default'}
                        variant="outlined"
                    />
                )}
            </Stack>

            {entries.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 1.2, borderStyle: 'dashed', opacity: 0.7 }}>
                    No hay propiedades definidas.
                </Paper>
            ) : (
                <Grid container spacing={1}>
                    {entries.map(([k, v], i) => (
                        <Grid key={`${title}-${i}`} item xs={12} md={6}>
                            <Typography variant="caption">{safe(k)}</Typography>
                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                {safe(
                                    typeof v === 'object' ? JSON.stringify(v, null, 2) : v
                                )}
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};


/**
 * RiesgosInstitucional
 *
 * Gestiona la selección y visualización de riesgos institucionales
 * para el reporte general, a partir de los riesgos aprobados por área/dirección.
 *
 * - Carga los períodos disponibles y permite seleccionar uno.
 * - Consulta todos los riesgos del período a nivel institucional.
 * - Ofrece filtros:
 *   - Por dirección (todas o una específica).
 *   - “Solo General”: mostrar únicamente los riesgos marcados como generales.
 * - Permite marcar/desmarcar cada riesgo con la bandera "Mostrar en reporte general"
 *   (persistiendo el cambio en backend).
 * - Muestra el detalle completo del riesgo, incluyendo:
 *   - Datos de área, objetivo, descripción, probabilidades, severidades.
 *   - Cálculos de riesgo inherente/residual (con semáforo de colores).
 *   - Narrativas y metadatos (tolerancia, frecuencia, evento, controles, monitoreo, etc.).
 *   - Propiedades adicionales ME, MC y MCE (ExtrasSection).
 *
 * @component
 * @returns {JSX.Element}
 */
export default function RiesgosInstitucional() {
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState('');

    const [alerta, setAlerta] = useState(null);
    const [alertaTipo, setAlertaTipo] = useState('info');

    const [cargando, setCargando] = useState(false);
    const [rows, setRows] = useState([]);

    // Filtro por Dirección
    const [direcciones, setDirecciones] = useState([]);
    const [direccionFiltro, setDireccionFiltro] = useState('TODAS');

    // Filtro “Solo General”
    const [soloGeneral, setSoloGeneral] = useState(false);

    // Expand/collapse por fila
    const [expandIds, setExpandIds] = useState(new Set());

    const [mostrarGeneral, setMostrarGeneral] = useState({});

    /* ---------- Cargar períodos ---------- */
    useEffect(() => {
        (async () => {
            try {
                const { data } = await apiClient.get('/api/periodos-actualizados');
                const arr = Array.isArray(data?.result) ? data.result : (data ?? []);
                setPeriodos(arr);
            } catch {
                setAlertaTipo('error');
                setAlerta('No se pudieron cargar los períodos.');
            }
        })();
    }, []);

    /* ---------- Riesgos por período ---------- */
    const fetchRiesgosPeriodo = useCallback(async () => {
        if (!periodo) return;
        setCargando(true);
        setAlerta(null);
        try {
            const { data } = await apiClient.get(
                '/api/riesgos-variables-actualizados/obtener-riesgos-periodo',
                { params: { periodo } }
            );
            const arr = Array.isArray(data?.rows) ? data.rows : (Array.isArray(data?.data) ? data.data : (data?.result ?? []));
            setRows(arr);

            const setDir = new Set();
            arr.forEach(r => setDir.add(String(r?.DIRECCION_NOMBRE ?? r?.Dirección ?? '—')));
            setDirecciones(Array.from(setDir).sort((a, b) => a.localeCompare(b)));

            setDireccionFiltro('TODAS');
            setExpandIds(new Set());

            const mg = {};
            arr.forEach((r, idx) => {
                const raw = r.MOSTRAR_GENERAL ?? r.mostrar_general;
                const val = raw ? String(raw).toUpperCase() : 'N';
                mg[idx] = val === 'S' ? 'S' : 'N';
            });
            setMostrarGeneral(mg);
        } catch {
            setRows([]);
            setDirecciones([]);
            setDireccionFiltro('TODAS');
            setExpandIds(new Set());
            setMostrarGeneral({});
            setAlertaTipo('error');
            setAlerta('No fue posible obtener los riesgos del período seleccionado.');
        } finally {
            setCargando(false);
        }
    }, [periodo]);

    useEffect(() => { fetchRiesgosPeriodo(); }, [fetchRiesgosPeriodo]);

    const persistirMostrarGeneral = async ({ r, nextSN }) => {
        await apiClient.put('/api/riesgos-variables-actualizados/mostrar-general', {
            codigo_riesgo: Number(r.CODIGO_RIESGO),
            codigo_area: Number(r.CODIGO_AREA),
            codigo_entidad: Number(r.CODIGO_ENTIDAD),
            codigo_periodo: Number(periodo),
            mostrar_general: nextSN
        });
    };

    const handleToggleMostrarGeneral = async (checked, idx, r) => {
        const prev = mostrarGeneral[idx] ?? 'N';
        const next = checked ? 'S' : 'N';
        setMostrarGeneral({ ...mostrarGeneral, [idx]: next });
        try {
            await persistirMostrarGeneral({ r, nextSN: next });
        } catch {
            setMostrarGeneral({ ...mostrarGeneral, [idx]: prev });
            setAlertaTipo('error');
            setAlerta('No se pudo actualizar el indicador “mostrar en reporte general”.');
        }
    };

    const toggleExpand = (idx) => {
        setExpandIds(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const isRowGeneral = (r) => {
        const idxGlobal = rows.indexOf(r);
        // Prioriza el estado local (optimista) si existe
        const local = mostrarGeneral[idxGlobal];
        if (local) return local === 'S';
        // Si no, usa el valor que viene del backend
        const raw = r.MOSTRAR_GENERAL ?? r.mostrar_general;
        const val = raw ? String(raw).toUpperCase() : 'N';
        return val === 'S';
    };

    const rowsFiltrados = rows.filter(r => {
        const dirNombre = String(r.DIRECCION_NOMBRE ?? r.Dirección ?? '—');
        const pasaDireccion = (direccionFiltro === 'TODAS') ? true : dirNombre === String(direccionFiltro);
        const pasaGeneral = soloGeneral ? isRowGeneral(r) : true;
        return pasaDireccion && pasaGeneral;
    });

    const grupos = (() => {
        const map = new Map();
        rowsFiltrados.forEach((r) => {
            const dir = r.DIRECCION_NOMBRE ?? r.Dirección ?? '—';
            if (!map.has(dir)) map.set(dir, []);
            const idxGlobal = rows.indexOf(r);
            map.get(dir).push({ idxGlobal, r });
        });
        return Array.from(map.entries())
            .map(([nombre_direccion, items]) => ({ nombre_direccion, items }))
            .sort((a, b) => (a.nombre_direccion || '').localeCompare(b.nombre_direccion || ''));
    })();

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Selección de riesgos institucionales
            </Typography>

            {/* Selección de período y filtro por Dirección */}
            <Card sx={{ borderRadius: 2, mb: 2 }}>
                <CardHeader title="Seleccione período y dirección" />
                <CardContent>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
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

                        <FormControl fullWidth disabled={!periodo || direcciones.length === 0}>
                            <InputLabel id="direccion-label">Dirección</InputLabel>
                            <Select
                                labelId="direccion-label"
                                value={direccionFiltro}
                                label="Dirección"
                                onChange={(e) => setDireccionFiltro(e.target.value)}
                            >
                                <MenuItem value="TODAS">Todas las direcciones</MenuItem>
                                {direcciones.map((d) => (
                                    <MenuItem key={d} value={d}>{d}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            sx={{ ml: { md: 1 } }}
                            control={
                                <Switch
                                    checked={soloGeneral}
                                    onChange={(e) => setSoloGeneral(e.target.checked)}
                                    disabled={!periodo}
                                />
                            }
                            label="Solo General"
                        />
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
                        title="Riesgos por dirección"
                        subheader={cargando ? 'Cargando…' : `${rowsFiltrados.length} registro(s)`}
                        action={cargando ? <CircularProgress size={20} sx={{ mr: 2 }} /> : null}
                    />
                    <CardContent>
                        {grupos.length === 0 && !cargando && (
                            <Typography variant="body2">No hay riesgos para los filtros seleccionados.</Typography>
                        )}

                        {grupos.map((g) => (
                            <Box key={g.nombre_direccion} sx={{ mb: 3 }}>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                        {g.nombre_direccion || '—'}
                                    </Typography>
                                    <Chip size="small" label={`${g.items.length}`} />
                                </Stack>

                                <Stack spacing={1.25}>
                                    {g.items.map(({ idxGlobal, r }, shownIndex) => {
                                        const expanded = expandIds.has(idxGlobal);
                                        const mg = mostrarGeneral[idxGlobal] ?? 'N';

                                        const extrasME = parseMaybeJsonObject(r.EXTRAS_ME ?? r.extras_me);
                                        const extrasMC = parseMaybeJsonObject(r.EXTRAS_MC ?? r.extras_mc);
                                        const extrasMCE = parseMaybeJsonObject(r.EXTRAS_MCE ?? r.extras_mce);

                                        return (
                                            <Paper
                                                key={`${g.nombre_direccion}-${r.CODIGO_RIESGO ?? shownIndex}`}
                                                variant="outlined"
                                                sx={{ p: 1.25, borderRadius: 2, '&:hover': { boxShadow: 2 } }}
                                            >
                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    justifyContent="space-between"
                                                    sx={{ cursor: 'pointer' }}
                                                    onClick={() => toggleExpand(idxGlobal)}
                                                >
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                            {safe(r['Ref.'] ?? r.REF)}
                                                        </Typography>

                                                        <Tooltip title="Mostrar en reporte general">
                                                            <Chip
                                                                size="small"
                                                                label={mg === 'S' ? 'General: Sí' : 'General: No'}
                                                                color={mg === 'S' ? 'success' : 'default'}
                                                                variant={mg === 'S' ? 'filled' : 'outlined'}
                                                            />
                                                        </Tooltip>

                                                    </Stack>

                                                    <Tooltip title={expanded ? 'Ocultar detalles' : 'Ver detalles'}>
                                                        <IconButton size="small">
                                                            {expanded ? <ExpandLessRounded fontSize="small" /> : <ExpandMoreRounded fontSize="small" />}
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>

                                                <Collapse in={expanded} timeout="auto" unmountOnExit>
                                                    <Divider sx={{ my: 1 }} />

                                                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Mostrar en reporte general</Typography>
                                                        <Switch
                                                            checked={mg === 'S'}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleMostrarGeneral(e.target.checked, idxGlobal, r);
                                                            }}
                                                        />
                                                        <Chip size="small" label={mg === 'S' ? 'S' : 'N'} />
                                                    </Stack>

                                                    <Grid container spacing={1}>
                                                        <Grid item xs={12}>
                                                            <Typography variant="caption">Área de evaluación</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5 }}>{safe(r['Área evaluada'] ?? r.NOMBRE_AREA)}</Paper>
                                                        </Grid>
                                                        <Grid item xs={12} md={3}>
                                                            <Typography variant="caption">Tipo objetivo</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5 }}>{safe(r['Tipo de objetivo'] ?? r.TIPO_OBJETIVO_NOMBRE)}</Paper>
                                                        </Grid>
                                                        <Grid item xs={12} md={9}>
                                                            <Typography variant="caption">Objetivo</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5 }}>{safe(r['Objetivo'] ?? r.OBJETIVO_NOMBRE)}</Paper>
                                                        </Grid>

                                                        <Grid item xs={12}>
                                                            <Typography variant="caption">Descripción del riesgo</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safe(r['Descripción del riesgo'] ?? r.DESCRIPCION_RIESGO)}
                                                            </Paper>
                                                        </Grid>
                                                    </Grid>

                                                    {/* Tabla con nombres y cálculos */}
                                                    <Box sx={{ mt: 1.5 }}>
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Probabilidad</TableCell>
                                                                    <TableCell>Severidad</TableCell>
                                                                    <TableCell>A mitigar</TableCell>
                                                                    <TableCell>Capacidad de mitigación</TableCell>
                                                                    <TableCell>Riesgo inherente</TableCell>
                                                                    <TableCell>Probabilidad ajustada</TableCell>
                                                                    <TableCell>Severidad ajustada</TableCell>
                                                                    <TableCell>Riesgo residual</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                <TableRow>
                                                                    <TableCell>{safe((r['Probabilidad'] ?? '').split(' - ')[0] ?? r.CODIGO_PROBABILIDAD)} ({safe((r['Probabilidad'] ?? '').split(' - ')[1] ?? r.PROBABILIDAD_NOMBRE)})</TableCell>
                                                                    <TableCell>{safe((r['Severidad'] ?? '').split(' - ')[0] ?? r.CODIGO_SEVERIDAD)} ({safe((r['Severidad'] ?? '').split(' - ')[1] ?? r.SEVERIDAD_NOMBRE)})</TableCell>
                                                                    <TableCell>{safe(r['A mitigar'] ?? r.VARIABLE_MITIGACION)}</TableCell>
                                                                    <TableCell>{safe((r['Eficiencia del mitigador'] ?? '').split(' - ')[0] ?? r.CODIGO_MITIGACION)} ({safe((r['Eficiencia del mitigador'] ?? '').split(' - ')[1] ?? r.MITIGACION_NOMBRE)})</TableCell>
                                                                    <TableCell>
                                                                        <Box sx={{ display: 'inline-block', px: 1.2, py: .5, borderRadius: 1, fontWeight: 700, ...cellRiskStyle(r['Riesgo Inherente'] ?? r.RIESGO_INHERENTE) }}>
                                                                            {safe(r['Riesgo Inherente'] ?? r.RIESGO_INHERENTE)}
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell>{safe(r['Probabilidad ajustada'] ?? r.PROBABILIDAD_AJUSTADA)}</TableCell>
                                                                    <TableCell>{safe(r['Severidad ajustada'] ?? r.SEVERIDAD_AJUSTADA)}</TableCell>
                                                                    <TableCell>
                                                                        <Box sx={{ display: 'inline-block', px: 1.2, py: .5, borderRadius: 1, fontWeight: 700, ...cellRiskStyle(r['Riesgo residual'] ?? r.RIESGO_RESIDUAL) }}>
                                                                            {safe(r['Riesgo residual'] ?? r.RIESGO_RESIDUAL)}
                                                                        </Box>
                                                                    </TableCell>
                                                                </TableRow>
                                                            </TableBody>
                                                        </Table>
                                                    </Box>

                                                    <Grid container spacing={1} sx={{ mt: 0.5 }}>
                                                        {safe(r['Tolerancia'] ?? r.TOLERANCIA_NOMBRE, '') && (
                                                            <Grid item xs={12}>
                                                                <Typography variant="caption">Tolerancia</Typography>
                                                                <Paper variant="outlined" sx={{ p: 1.2, mt: .5 }}>{safe(r['Tolerancia'] ?? r.TOLERANCIA_NOMBRE)}</Paper>
                                                            </Grid>
                                                        )}
                                                        {safe(r['Frecuencia'] ?? r.FRECUENCIA_NOMBRE, '') && (
                                                            <Grid item xs={12}>
                                                                <Typography variant="caption">Frecuencia</Typography>
                                                                <Paper variant="outlined" sx={{ p: 1.2, mt: .5 }}>{safe(r['Frecuencia'] ?? r.FRECUENCIA_NOMBRE)}</Paper>
                                                            </Grid>
                                                        )}
                                                    </Grid>

                                                    {safe(r['Severidad (narración)'] ?? r.SEVERIDAD_NARRACION, '') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Severidad (narración)</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safe(r['Severidad (narración)'] ?? r.SEVERIDAD_NARRACION)}
                                                            </Paper>
                                                        </Box>
                                                    )}
                                                    {safe(r['Evento'] ?? r.EVENTO, '') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Evento</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safe(r['Evento'] ?? r.EVENTO)}
                                                            </Paper>
                                                        </Box>
                                                    )}
                                                    {safe(r['Control interno para mitigar'] ?? r.CONTROL, '') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Control interno para mitigar</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safe(r['Control interno para mitigar'] ?? r.CONTROL)}
                                                            </Paper>
                                                        </Box>
                                                    )}
                                                    {safe(r['Método de monitoreo'] ?? r.MONITOREO, '') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Método de monitoreo</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safe(r['Método de monitoreo'] ?? r.MONITOREO)}
                                                            </Paper>
                                                        </Box>
                                                    )}
                                                    {safe(r['Observaciones'] ?? r.OBSERVACIONES, '') && (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">Observaciones</Typography>
                                                            <Paper variant="outlined" sx={{ p: 1.2, mt: .5, whiteSpace: 'pre-wrap' }}>
                                                                {safe(r['Observaciones'] ?? r.OBSERVACIONES)}
                                                            </Paper>
                                                        </Box>
                                                    )}

                                                    <ExtrasSection
                                                        title="Propiedades ME"
                                                        extrasObj={extrasME}
                                                        estado={r.ESTADO_ME ?? r.estado_me}
                                                    />
                                                    <ExtrasSection
                                                        title="Propiedades MC"
                                                        extrasObj={extrasMC}
                                                        estado={r.ESTADO_MC ?? r.estado_mc}
                                                    />
                                                    <ExtrasSection
                                                        title="Propiedades MCE"
                                                        extrasObj={extrasMCE}
                                                        estado={r.ESTADO_MCE ?? r.estado_mce}
                                                    />
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
        </Box>
    );
}
