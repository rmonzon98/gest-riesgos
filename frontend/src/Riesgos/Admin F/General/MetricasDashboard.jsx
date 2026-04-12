// src/Administracion/MetricasDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    MenuItem,
    Chip,
    Stack,
    LinearProgress,
    Divider,
    CircularProgress,
    Snackbar,
    Alert,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
} from "@mui/material";

import {
    PieChart,
    Pie,
    Cell,
    Legend,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import CancelRounded from "@mui/icons-material/CancelRounded";

const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#AA66CC",
    "#FF5252",
    "#4CAF50",
    "#7E57C2",
    "#26C6DA",
];

function MetricasDashboard() {
    // === Snackbar global ===
    const [snackbar, setSnackbar] = useState({
        open: false,
        severity: "info",
        message: "",
    });

    const mostrarSnackbar = (severity, message) => {
        setSnackbar({ open: true, severity, message });
    };

    const handleCloseSnackbar = (_, reason) => {
        if (reason === "clickaway") return;
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    // === Datos ===
    const [metricas, setMetricas] = useState({
        riesgos: [],
        primeraMatriz: [],
        segundaMatriz: [],
        seguimientos: [],
    });

    const [direcciones, setDirecciones] = useState([]);
    const [loading, setLoading] = useState(false);

    // === Filtros ===
    const [entidadesSeleccionadas, setEntidadesSeleccionadas] = useState([]);
    const [periodoSeleccionado, setPeriodoSeleccionado] = useState("");

    // ==== Carga inicial de datos ====
    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token") || "";

                const [metricasRes, direccionesRes] = await Promise.all([
                    axios.get(
                        "/api/administracion-actualizados/obtener-metricas",
                        {
                            headers: {
                                "x-access-token": token,
                            },
                        }
                    ),
                    axios.get("/api/direcciones-actualizados", {
                        headers: {
                            "x-access-token": token,
                        },
                    }),
                ]);

                const m = metricasRes.data || {};
                setMetricas({
                    riesgos: m.riesgos || [],
                    primeraMatriz: m.primeraMatriz || [],
                    segundaMatriz: m.segundaMatriz || [],
                    seguimientos: m.seguimientos || [],
                });

                const dirs = direccionesRes.data?.result || [];
                setDirecciones(dirs);

                const noHayMetricas =
                    !(m.riesgos || []).length &&
                    !(m.primeraMatriz || []).length &&
                    !(m.segundaMatriz || []).length &&
                    !(m.seguimientos || []).length;

                if (noHayMetricas) {
                    mostrarSnackbar(
                        "info",
                        "No se encontraron métricas para mostrar."
                    );
                } else {
                    mostrarSnackbar("success", "Métricas cargadas correctamente.");
                }
            } catch (error) {
                console.error("Error al cargar métricas:", error);
                const msg =
                    error.response?.data?.msg ||
                    error.response?.data?.error ||
                    error.message ||
                    "Error inesperado al obtener métricas.";
                mostrarSnackbar("error", msg);
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();
    }, []);

    // === Helpers de nombres ===
    const getNombreEntidad = (codigoEntidad) => {
        const dir = direcciones.find(
            (d) => Number(d.CODIGO_ENTIDAD) === Number(codigoEntidad)
        );
        if (!dir) return `Entidad ${codigoEntidad}`;
        const siglas = dir.SIGLAS ? `${dir.SIGLAS} - ` : "";
        return `${siglas}${dir.NOMBRE}`;
    };

    // === Periodos disponibles ===
    const periodosDisponibles = useMemo(() => {
        const set = new Set();

        (metricas.riesgos || []).forEach((r) => {
            if (r.codigo_periodo != null) set.add(r.codigo_periodo);
        });
        (metricas.primeraMatriz || []).forEach((r) => {
            if (r.codigo_periodo != null) set.add(r.codigo_periodo);
        });
        (metricas.segundaMatriz || []).forEach((r) => {
            if (r.codigo_periodo != null) set.add(r.codigo_periodo);
        });
        (metricas.seguimientos || []).forEach((r) => {
            if (r.codigo_periodo != null) set.add(r.codigo_periodo);
        });

        return Array.from(set).sort((a, b) => Number(a) - Number(b));
    }, [metricas]);

    // === Lista base de entidades (TODAS las direcciones del catálogo) ===
    const entidadesBase = useMemo(() => {
        if (!direcciones || direcciones.length === 0) return [];
        const ordenadas = [...direcciones].sort((a, b) =>
            a.NOMBRE.localeCompare(b.NOMBRE, "es", { sensitivity: "base" })
        );
        return ordenadas.map((d) => Number(d.CODIGO_ENTIDAD));
    }, [direcciones]);

    // === Aplicar filtros de entidades (sobre TODAS las direcciones) ===
    const entidadesFiltradas = useMemo(() => {
        if (!entidadesBase.length) return [];
        if (entidadesSeleccionadas.length > 0) {
            const setSel = new Set(entidadesSeleccionadas.map(Number));
            return entidadesBase.filter((cod) => setSel.has(Number(cod)));
        }
        return entidadesBase;
    }, [entidadesBase, entidadesSeleccionadas]);

    // === Helper para obtener métricas por entidad (dirección) ===
    const getMetricsForEntidad = (codigoEntidad) => {
        const cod = Number(codigoEntidad);

        const filtrarPorEntidadPeriodo = (lista) =>
            (lista || []).filter(
                (item) =>
                    Number(item.codigo_entidad) === cod &&
                    (periodoSeleccionado === "" ||
                        Number(item.codigo_periodo) ===
                        Number(periodoSeleccionado))
            );

        const riesgosEntidad = filtrarPorEntidadPeriodo(metricas.riesgos);
        const totalRiesgos = riesgosEntidad.length;

        const tienePrimera =
            filtrarPorEntidadPeriodo(metricas.primeraMatriz).length > 0;

        const tieneSegunda =
            filtrarPorEntidadPeriodo(metricas.segundaMatriz).length > 0;

        const segEntidad = filtrarPorEntidadPeriodo(metricas.seguimientos);
        const mesesSet = new Set(segEntidad.map((s) => s.mes));
        const mesesConSeguimiento = mesesSet.size; // 0-12

        return {
            totalRiesgos,
            tienePrimera,
            tieneSegunda,
            mesesConSeguimiento,
        };
    };

    // === Resumen global (sobre TODAS las direcciones filtradas) ===
    const resumenGlobal = useMemo(() => {
        if (!entidadesFiltradas.length) {
            return {
                totalRiesgos: 0,
                entidadesConPrimera: 0,
                entidadesConSegunda: 0,
                promedioMesesSeguimiento: 0,
                direccionesSinRiesgos: 0,
                direccionesSinPrimera: 0,
                direccionesSinSegunda: 0,
            };
        }

        let totalRiesgos = 0;
        let entidadesConPrimera = 0;
        let entidadesConSegunda = 0;
        let sumaMesesSeguimiento = 0;
        let direccionesSinRiesgos = 0;
        let direccionesSinPrimera = 0;
        let direccionesSinSegunda = 0;

        entidadesFiltradas.forEach((cod) => {
            const metrics = getMetricsForEntidad(cod);
            totalRiesgos += metrics.totalRiesgos;

            if (metrics.tienePrimera) entidadesConPrimera += 1;
            if (metrics.tieneSegunda) entidadesConSegunda += 1;

            sumaMesesSeguimiento += metrics.mesesConSeguimiento;

            if (metrics.totalRiesgos === 0) direccionesSinRiesgos += 1;
            if (!metrics.tienePrimera) direccionesSinPrimera += 1;
            if (!metrics.tieneSegunda) direccionesSinSegunda += 1;
        });

        const promedioMesesSeguimiento =
            sumaMesesSeguimiento / entidadesFiltradas.length;

        return {
            totalRiesgos,
            entidadesConPrimera,
            entidadesConSegunda,
            promedioMesesSeguimiento,
            direccionesSinRiesgos,
            direccionesSinPrimera,
            direccionesSinSegunda,
        };
    }, [entidadesFiltradas, metricas, periodoSeleccionado]);

    // === Pie data por tipo de objetivo (con filtros) ===
    const pieDataTipoObjetivo = useMemo(() => {
        if (!metricas.riesgos || metricas.riesgos.length === 0) return [];

        const entidadesSet = new Set(entidadesFiltradas.map(Number));

        const riesgosFiltrados = (metricas.riesgos || []).filter((r) => {
            const codEnt = Number(r.codigo_entidad);
            const entraEntidad = entidadesFiltradas.length
                ? entidadesSet.has(codEnt)
                : true;
            const entraPeriodo =
                periodoSeleccionado === "" ||
                Number(r.codigo_periodo) === Number(periodoSeleccionado);
            return entraEntidad && entraPeriodo;
        });

        if (!riesgosFiltrados.length) return [];

        const mapa = new Map();

        riesgosFiltrados.forEach((r) => {
            const tipo = r.codigo_tipo_objetivo ?? "SIN_TIPO";
            const label =
                r.codigo_tipo_objetivo != null
                    ? `Tipo ${r.codigo_tipo_objetivo}`
                    : "Sin tipo de objetivo";

            if (!mapa.has(tipo)) {
                mapa.set(tipo, {
                    name: label,
                    value: 0,
                    codigo: tipo,
                });
            }
            const obj = mapa.get(tipo);
            obj.value += 1;
        });

        return Array.from(mapa.values());
    }, [metricas.riesgos, entidadesFiltradas, periodoSeleccionado]);

    // === Render ===
    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                Dashboard de métricas de riesgo
            </Typography>

            {/* Filtros */}
            <Paper sx={{ p: 2, mb: 3 }} elevation={3}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            select
                            label="Direcciones"
                            fullWidth
                            size="small"
                            value={entidadesSeleccionadas}
                            onChange={(e) => {
                                const value = e.target.value;
                                const arr =
                                    typeof value === "string"
                                        ? value.split(",").map(Number)
                                        : value.map(Number);
                                setEntidadesSeleccionadas(arr);
                            }}
                            SelectProps={{
                                multiple: true,
                                renderValue: (selected) => {
                                    if (!selected.length) {
                                        return "Todas las direcciones";
                                    }

                                    return (
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: 0.5,
                                            }}
                                        >
                                            {selected.map((value) => (
                                                <Chip
                                                    key={value}
                                                    label={getNombreEntidad(
                                                        value
                                                    )}
                                                    size="small"
                                                />
                                            ))}
                                        </Box>
                                    );
                                },
                            }}
                        >
                            {direcciones.length === 0 && (
                                <MenuItem disabled>
                                    No hay direcciones configuradas.
                                </MenuItem>
                            )}

                            {direcciones
                                .slice()
                                .sort((a, b) =>
                                    a.NOMBRE.localeCompare(b.NOMBRE, "es", {
                                        sensitivity: "base",
                                    })
                                )
                                .map((dir) => (
                                    <MenuItem
                                        key={dir.CODIGO_ENTIDAD}
                                        value={Number(dir.CODIGO_ENTIDAD)}
                                    >
                                        {getNombreEntidad(dir.CODIGO_ENTIDAD)}
                                    </MenuItem>
                                ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <TextField
                            select
                            label="Período"
                            fullWidth
                            size="small"
                            value={periodoSeleccionado}
                            onChange={(e) =>
                                setPeriodoSeleccionado(e.target.value)
                            }
                        >
                            <MenuItem value="">Todos los períodos</MenuItem>
                            {periodosDisponibles.map((p) => (
                                <MenuItem key={p} value={p}>
                                    {p}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Box
                            sx={{
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                {entidadesFiltradas.length
                                    ? `${entidadesFiltradas.length} dirección(es) filtrada(s)`
                                    : "Sin direcciones para mostrar"}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Loading */}
            {loading && (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 200,
                    }}
                >
                    <CircularProgress />
                </Box>
            )}

            {!loading && direcciones.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    No hay direcciones configuradas.
                </Typography>
            )}

            {!loading && direcciones.length > 0 && (
                <>
                    {/* Resumen global */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={3}>
                            <Paper sx={{ p: 2 }} elevation={3}>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                >
                                    Total de riesgos
                                </Typography>
                                <Typography
                                    variant="h5"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {resumenGlobal.totalRiesgos}
                                </Typography>
                                <Typography variant="caption">
                                    Suma de riesgos en las direcciones
                                    filtradas.
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Paper sx={{ p: 2 }} elevation={3}>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                >
                                    Direcciones con 1ra matriz
                                </Typography>
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {resumenGlobal.entidadesConPrimera} /{" "}
                                    {entidadesFiltradas.length || 0}
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={
                                            entidadesFiltradas.length
                                                ? (resumenGlobal.entidadesConPrimera /
                                                    entidadesFiltradas.length) *
                                                100
                                                : 0
                                        }
                                    />
                                </Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Sin 1ra matriz:{" "}
                                    {resumenGlobal.direccionesSinPrimera}
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Paper sx={{ p: 2 }} elevation={3}>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                >
                                    Direcciones con 2da matriz
                                </Typography>
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {resumenGlobal.entidadesConSegunda} /{" "}
                                    {entidadesFiltradas.length || 0}
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={
                                            entidadesFiltradas.length
                                                ? (resumenGlobal.entidadesConSegunda /
                                                    entidadesFiltradas.length) *
                                                100
                                                : 0
                                        }
                                    />
                                </Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Sin 2da matriz:{" "}
                                    {resumenGlobal.direccionesSinSegunda}
                                </Typography>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Paper sx={{ p: 2 }} elevation={3}>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                >
                                    Meses con seguimiento (promedio)
                                </Typography>
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 700 }}
                                >
                                    {resumenGlobal.promedioMesesSeguimiento.toFixed(
                                        1
                                    )}{" "}
                                    / 12
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={
                                            (resumenGlobal.promedioMesesSeguimiento /
                                                12) *
                                            100
                                        }
                                    />
                                </Box>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Direcciones sin riesgos:{" "}
                                    {resumenGlobal.direccionesSinRiesgos}
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Gráfico por tipo de objetivo */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={6}>
                            <Paper
                                sx={{
                                    p: 2,
                                    height: 320,
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                                elevation={3}
                            >
                                <Typography
                                    variant="subtitle1"
                                    sx={{ mb: 1, fontWeight: 600 }}
                                >
                                    Distribución de riesgos por tipo de objetivo
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 1 }}
                                >
                                    Se muestran solo los riesgos que cumplen con
                                    los filtros de dirección y período.
                                </Typography>

                                {pieDataTipoObjetivo.length === 0 ? (
                                    <Box
                                        sx={{
                                            flex: 1,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            No hay riesgos para graficar con los
                                            filtros actuales.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ flex: 1 }}>
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={pieDataTipoObjetivo}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    outerRadius={100}
                                                    label={(entry) =>
                                                        `${entry.name} (${entry.value})`
                                                    }
                                                >
                                                    {pieDataTipoObjetivo.map(
                                                        (entry, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={
                                                                    COLORS[
                                                                    index %
                                                                    COLORS.length
                                                                    ]
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    <Divider sx={{ mb: 2 }} />

                    {/* Tabla por dirección (TODAS las direcciones filtradas) */}
                    <Paper elevation={3}>
                        <Box sx={{ p: 2 }}>
                            <Typography
                                variant="subtitle1"
                                sx={{ mb: 1, fontWeight: 600 }}
                            >
                                Detalle por dirección
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 2 }}
                            >
                                Se listan todas las direcciones (según el
                                catálogo), mostrando si tienen riesgos,
                                primera/segunda matriz y cuántos riesgos
                                registrados tienen con los filtros actuales.
                            </Typography>

                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            <strong>Dirección</strong>
                                        </TableCell>
                                        <TableCell align="right">
                                            <strong>Cantidad de riesgos</strong>
                                        </TableCell>
                                        <TableCell align="center">
                                            <strong>1ra matriz</strong>
                                        </TableCell>
                                        <TableCell align="center">
                                            <strong>2da matriz</strong>
                                        </TableCell>
                                        <TableCell align="center">
                                            <strong>
                                                Meses con seguimiento
                                            </strong>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {entidadesFiltradas.map((cod) => {
                                        const metrics =
                                            getMetricsForEntidad(cod);
                                        const {
                                            totalRiesgos,
                                            tienePrimera,
                                            tieneSegunda,
                                            mesesConSeguimiento,
                                        } = metrics;

                                        return (
                                            <TableRow key={cod}>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {getNombreEntidad(cod)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="body2">
                                                        {totalRiesgos}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    {tienePrimera ? (
                                                        <CheckCircleOutlineRounded
                                                            fontSize="small"
                                                            color="success"
                                                        />
                                                    ) : (
                                                        <CancelRounded
                                                            fontSize="small"
                                                            color="disabled"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {tieneSegunda ? (
                                                        <CheckCircleOutlineRounded
                                                            fontSize="small"
                                                            color="success"
                                                        />
                                                    ) : (
                                                        <CancelRounded
                                                            fontSize="small"
                                                            color="disabled"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box sx={{ minWidth: 160 }}>
                                                        <Typography
                                                            variant="caption"
                                                            sx={{ mb: 0.5 }}
                                                            display="block"
                                                        >
                                                            {mesesConSeguimiento}{" "}
                                                            / 12 meses
                                                        </Typography>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={
                                                                (mesesConSeguimiento /
                                                                    12) *
                                                                100
                                                            }
                                                        />
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}

                                    {entidadesFiltradas.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5}>
                                                <Typography
                                                    variant="body2"
                                                    align="center"
                                                    sx={{ py: 2 }}
                                                >
                                                    No hay direcciones para
                                                    mostrar con los filtros
                                                    actuales.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Box>
                    </Paper>
                </>
            )}

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default MetricasDashboard;
