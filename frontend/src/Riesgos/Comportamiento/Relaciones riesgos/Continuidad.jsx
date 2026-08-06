/**
 * @fileoverview
 * Gestión de continuidad de riesgos entre períodos.
 *
 * Permite:
 * - Ver relación con riesgo del año anterior.
 * - Ver continuidad hacia el año siguiente.
 * - Detectar relaciones duplicadas ya existentes en producción.
 * - Relacionar con el año anterior.
 * - Continuar hacia el año siguiente.
 * - Quitar relaciones anterior/siguiente.
 *
 * @module Riesgos/Comportamiento/Relaciones riesgos/Continuidad.jsx
 * @version 1.1
 */

import { useEffect, useMemo, useState } from "react";
import apiClient from "api/apiClient";
import {
    Box,
    Card,
    CardHeader,
    CardContent,
    Typography,
    Select,
    MenuItem,
    Stack,
    LinearProgress,
    Alert,
    Divider,
    Chip,
    Collapse,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress
} from "@mui/material";

import LinkIcon from "@mui/icons-material/Link";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import ModalRelacionarRiesgo from "./ModalRelacionarRiesgo";
import ModalContinuarRiesgo from "./ModalContinuarRiesgo";

const API_SEGUIMIENTOS = "/api/seguimientos-actualizados";

const limpiarExtras = (obj) => {
    return Object.fromEntries(
        Object.entries(obj || {}).filter(([, value]) => value !== null && value !== undefined && value !== "")
    );
};

const obtenerMensajeError = (err, fallback = "Ocurrió un error al procesar la solicitud.") => {
    return (
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.msg ||
        err?.message ||
        fallback
    );
};

const getCodigoRiesgo = (riesgo) => {
    const valor =
        riesgo?.CODIGO_RIESGO ??
        riesgo?.codigo_riesgo ??
        riesgo?.["CODIGO_RIESGO"] ??
        riesgo?.["Código riesgo"] ??
        riesgo?.["Codigo riesgo"] ??
        riesgo?.codigo ??
        riesgo?.id ??
        null;

    const numero = Number(valor);
    return Number.isInteger(numero) ? numero : null;
};

const getPeriodoRiesgo = (riesgo, fallback = null) => {
    const valor =
        riesgo?.CODIGO_PERIODO ??
        riesgo?.codigo_periodo ??
        riesgo?.Periodo ??
        riesgo?.periodo ??
        fallback;

    const numero = Number(valor);
    return Number.isInteger(numero) ? numero : fallback;
};

const getRefRiesgo = (riesgo) => {
    return (
        riesgo?.["Ref."] ??
        riesgo?.REF ??
        riesgo?.Ref ??
        riesgo?.ref ??
        "Sin referencia"
    );
};

const getDescripcionRiesgo = (riesgo) => {
    return (
        riesgo?.["Descripción del riesgo"] ??
        riesgo?.DESCRIPCION ??
        riesgo?.Descripcion ??
        riesgo?.descripcion ??
        "Sin descripción"
    );
};

const textoRiesgo = (riesgo) => {
    if (!riesgo) return "Sin información";

    const codigo = getCodigoRiesgo(riesgo) ?? riesgo?.codigo_riesgo ?? "—";
    const periodo = getPeriodoRiesgo(riesgo, riesgo?.codigo_periodo ?? "—");
    const ref = getRefRiesgo(riesgo);
    const descripcion = getDescripcionRiesgo(riesgo);

    return `${periodo} - Riesgo ${codigo} | ${ref} - ${descripcion}`;
};

const obtenerRelacionesNormalizadas = (relacion) => {
    const anterior = relacion?.anterior ? relacion.anterior : null;

    const siguientes = Array.isArray(relacion?.siguientes)
        ? relacion.siguientes
        : relacion?.siguiente
            ? [relacion.siguiente]
            : [];

    return {
        anterior,
        siguientes,
        tiene_conflicto_siguiente:
            Boolean(relacion?.tiene_conflicto_siguiente) || siguientes.length > 1
    };
};

export default function Continuidad() {
    const [entidad, setEntidad] = useState("");
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState("");

    const [loadingInicial, setLoadingInicial] = useState(false);
    const [loadingPeriodo, setLoadingPeriodo] = useState(false);
    const [loadingAccion, setLoadingAccion] = useState(false);

    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const [riesgos, setRiesgos] = useState([]);
    const [relaciones, setRelaciones] = useState({});
    const [relacionesDetalle, setRelacionesDetalle] = useState([]);

    const [openIdx, setOpenIdx] = useState(null);

    const [openRelacionar, setOpenRelacionar] = useState(false);
    const [openContinuar, setOpenContinuar] = useState(false);
    const [riesgoSeleccionado, setRiesgoSeleccionado] = useState(null);

    const [confirmacion, setConfirmacion] = useState({
        open: false,
        tipo: "",
        riesgo: null,
        relacion: null
    });

    const loading = loadingInicial || loadingPeriodo;

    const nivelColor = (valor) => {
        const n = Number(valor);
        if (Number.isNaN(n)) return "transparent";
        if (n >= 15) return "#f44336";
        if (n >= 10) return "#ff9800";
        if (n >= 5) return "#4caf50";
        return "#81c784";
    };

    useEffect(() => {
        const fetchInfoInicial = async () => {
            try {
                setLoadingInicial(true);
                setError("");

                const { data } = await apiClient.get(
                    "/api/riesgos-variables-actualizados/obtener-info-inicial-vista-riesgos"
                );

                const { userInfo, periodos } = data || {};

                if (userInfo) {
                    setEntidad(`${userInfo.NOMBRE ?? ""}${userInfo.SIGLAS ? ` (${userInfo.SIGLAS})` : ""}`);
                }

                setPeriodos(Array.isArray(periodos) ? periodos : []);
            } catch (err) {
                console.error(err);
                setError("No se pudo cargar la información inicial.");
            } finally {
                setLoadingInicial(false);
            }
        };

        fetchInfoInicial();
    }, []);

    const fetchRiesgosPeriodo = async () => {
        const { data } = await apiClient.get(
            "/api/riesgos-variables-actualizados/obtener-lista-riesgos-detalle",
            { params: { periodo } }
        );

        const lista = Array.isArray(data?.valores) ? data.valores : [];

        const normalizados = lista.map((r) => ({
            ...r,
            ...(limpiarExtras(r.EXTRAS_ME)),
            ...(limpiarExtras(r.EXTRAS_MCE)),
            ...(limpiarExtras(r.EXTRAS_MC))
        }));

        setRiesgos(normalizados);
    };

    const fetchRelacionesPeriodo = async () => {
        const { data } = await apiClient.get(
            `${API_SEGUIMIENTOS}/relaciones-continuidad`,
            {
                params: {
                    codigo_periodo: Number(periodo)
                }
            }
        );

        const mapa = data?.relaciones && typeof data.relaciones === "object"
            ? data.relaciones
            : {};

        const detalle = Array.isArray(data?.data) ? data.data : [];

        setRelaciones(mapa);
        setRelacionesDetalle(detalle);
    };

    const fetchDatosPeriodo = async () => {
        if (!periodo) {
            setRiesgos([]);
            setRelaciones({});
            setRelacionesDetalle([]);
            setOpenIdx(null);
            return;
        }

        try {
            setLoadingPeriodo(true);
            setError("");
            setMensaje("");

            await Promise.all([
                fetchRiesgosPeriodo(),
                fetchRelacionesPeriodo()
            ]);

            setOpenIdx(null);
        } catch (err) {
            console.error(err);
            setError(obtenerMensajeError(err, "No se pudo cargar la información de continuidad."));
        } finally {
            setLoadingPeriodo(false);
        }
    };

    useEffect(() => {
        fetchDatosPeriodo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodo]);

    const conflictosContinuidad = useMemo(() => {
        const gruposAnterior = {};
        const conflictosSiguiente = [];

        relacionesDetalle.forEach((item) => {
            if (item?.anterior?.codigo_riesgo && item?.anterior?.codigo_periodo) {
                const key = `${item.anterior.codigo_periodo}-${item.anterior.codigo_riesgo}`;

                if (!gruposAnterior[key]) {
                    gruposAnterior[key] = {
                        anterior: item.anterior,
                        riesgos: []
                    };
                }

                gruposAnterior[key].riesgos.push({
                    codigo_riesgo: item.codigo_riesgo,
                    codigo_periodo: item.codigo_periodo,
                    ref: item.ref,
                    descripcion: item.descripcion
                });
            }

            const siguientes = Array.isArray(item?.siguientes) ? item.siguientes : [];

            if (siguientes.length > 1) {
                conflictosSiguiente.push({
                    riesgo: {
                        codigo_riesgo: item.codigo_riesgo,
                        codigo_periodo: item.codigo_periodo,
                        ref: item.ref,
                        descripcion: item.descripcion
                    },
                    siguientes
                });
            }
        });

        const duplicadosAnterior = Object.values(gruposAnterior).filter(
            (grupo) => grupo.riesgos.length > 1
        );

        return {
            duplicadosAnterior,
            conflictosSiguiente,
            total: duplicadosAnterior.length + conflictosSiguiente.length
        };
    }, [relacionesDetalle]);

    const handleAbrirRelacionar = (r) => {
        setRiesgoSeleccionado(r);
        setOpenRelacionar(true);
    };

    const handleAbrirContinuar = (r) => {
        setRiesgoSeleccionado(r);
        setOpenContinuar(true);
    };

    const handleCerrarRelacionar = async (resultado) => {
        setOpenRelacionar(false);
        setRiesgoSeleccionado(null);

        if (resultado?.ok) {
            setMensaje("Relación con el año anterior guardada correctamente.");
        }

        await fetchDatosPeriodo();
    };

    const handleCerrarContinuar = async (resultado) => {
        setOpenContinuar(false);
        setRiesgoSeleccionado(null);

        if (resultado?.ok) {
            setMensaje("Continuidad hacia el año siguiente creada correctamente.");
        }

        await fetchDatosPeriodo();
    };

    const abrirConfirmacionQuitarAnterior = (riesgo, relacion) => {
        setConfirmacion({
            open: true,
            tipo: "anterior",
            riesgo,
            relacion
        });
    };

    const abrirConfirmacionQuitarSiguiente = (riesgo, relacion) => {
        setConfirmacion({
            open: true,
            tipo: "siguiente",
            riesgo,
            relacion
        });
    };

    const cerrarConfirmacion = () => {
        if (loadingAccion) return;

        setConfirmacion({
            open: false,
            tipo: "",
            riesgo: null,
            relacion: null
        });
    };

    const confirmarQuitarRelacion = async () => {
        const { tipo, riesgo, relacion } = confirmacion;
        const codigoRiesgo = getCodigoRiesgo(riesgo);

        if (!periodo || !codigoRiesgo) {
            setError("No se pudo identificar el riesgo seleccionado.");
            cerrarConfirmacion();
            return;
        }

        try {
            setLoadingAccion(true);
            setError("");
            setMensaje("");

            if (tipo === "anterior") {
                await apiClient.put(`${API_SEGUIMIENTOS}/quitar-relacion-anterior-periodo`, {
                    codigo_entidad: riesgo?.CODIGO_ENTIDAD ?? riesgo?.codigo_entidad,
                    codigo_periodo_actual: Number(periodo),
                    codigo_riesgo: codigoRiesgo
                });

                setMensaje("Relación con el año anterior eliminada correctamente.");
            }

            if (tipo === "siguiente") {
                await apiClient.put(`${API_SEGUIMIENTOS}/quitar-relacion-siguiente-periodo`, {
                    codigo_entidad: riesgo?.CODIGO_ENTIDAD ?? riesgo?.codigo_entidad,
                    codigo_periodo_actual: Number(periodo),
                    codigo_riesgo_actual: codigoRiesgo,
                    codigo_riesgo_siguiente: relacion?.codigo_riesgo
                });

                setMensaje("Relación con el año siguiente eliminada correctamente.");
            }

            setConfirmacion({
                open: false,
                tipo: "",
                riesgo: null,
                relacion: null
            });

            await fetchDatosPeriodo();
        } catch (err) {
            console.error(err);
            setError(obtenerMensajeError(err, "No se pudo quitar la relación."));
        } finally {
            setLoadingAccion(false);
        }
    };

    const renderAlertaConflictos = () => {
        if (!periodo || conflictosContinuidad.total === 0) return null;

        return (
            <Alert
                severity="warning"
                icon={<WarningAmberIcon />}
                sx={{ mb: 3, borderRadius: 2 }}
            >
                <Stack spacing={1.5}>
                    <Box>
                        <Typography sx={{ fontWeight: 800 }}>
                            Se encontraron relaciones de continuidad duplicadas.
                        </Typography>
                        <Typography variant="body2">
                            El sistema permitirá visualizar y corregir estas relaciones. Al crear relaciones nuevas, el servicio ya no permitirá que dos riesgos apunten al mismo riesgo del período relacionado.
                        </Typography>
                    </Box>

                    {conflictosContinuidad.duplicadosAnterior.length > 0 && (
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.5 }}>
                                Riesgos que comparten el mismo riesgo del año anterior:
                            </Typography>

                            <Stack spacing={1}>
                                {conflictosContinuidad.duplicadosAnterior.map((grupo, idx) => (
                                    <Paper
                                        key={`dup-ant-${idx}`}
                                        variant="outlined"
                                        sx={{ p: 1.25, borderRadius: 2, bgcolor: "rgba(255, 193, 7, 0.08)" }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                            Año anterior: {textoRiesgo(grupo.anterior)}
                                        </Typography>

                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                            {grupo.riesgos.map((riesgo) => (
                                                <Chip
                                                    key={`${riesgo.codigo_periodo}-${riesgo.codigo_riesgo}`}
                                                    size="small"
                                                    color="warning"
                                                    variant="outlined"
                                                    label={`Actual: ${textoRiesgo(riesgo)}`}
                                                />
                                            ))}
                                        </Stack>
                                    </Paper>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {conflictosContinuidad.conflictosSiguiente.length > 0 && (
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.5 }}>
                                Riesgos que tienen más de una continuidad hacia el año siguiente:
                            </Typography>

                            <Stack spacing={1}>
                                {conflictosContinuidad.conflictosSiguiente.map((grupo, idx) => (
                                    <Paper
                                        key={`dup-sig-${idx}`}
                                        variant="outlined"
                                        sx={{ p: 1.25, borderRadius: 2, bgcolor: "rgba(255, 193, 7, 0.08)" }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                            Riesgo actual: {textoRiesgo(grupo.riesgo)}
                                        </Typography>

                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                            {grupo.siguientes.map((riesgo) => (
                                                <Chip
                                                    key={`${riesgo.codigo_periodo}-${riesgo.codigo_riesgo}`}
                                                    size="small"
                                                    color="warning"
                                                    variant="outlined"
                                                    label={`Siguiente: ${textoRiesgo(riesgo)}`}
                                                />
                                            ))}
                                        </Stack>
                                    </Paper>
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Stack>
            </Alert>
        );
    };

    const renderRelacionAnterior = (r, relacionNormalizada) => {
        const anterior = relacionNormalizada.anterior;

        return (
            <Paper
                variant="outlined"
                sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: anterior ? "rgba(23, 165, 137, 0.08)" : "rgba(0, 0, 0, 0.02)"
                }}
            >
                <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <InfoOutlinedIcon fontSize="small" color={anterior ? "success" : "disabled"} />
                        <Typography sx={{ fontWeight: 800 }}>
                            Relación con año anterior
                        </Typography>
                    </Stack>

                    {anterior ? (
                        <Paper
                            variant="outlined"
                            sx={{ p: 1, borderRadius: 2, bgcolor: "background.paper" }}
                        >
                            <Stack spacing={1}>
                                <Typography variant="body2">
                                    {textoRiesgo(anterior)}
                                </Typography>

                                <Box>
                                    <Button
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        startIcon={<DeleteOutlineIcon />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            abrirConfirmacionQuitarAnterior(r, anterior);
                                        }}
                                        disabled={loadingAccion}
                                    >
                                        Quitar relación anterior
                                    </Button>
                                </Box>
                            </Stack>
                        </Paper>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Este riesgo no tiene una relación registrada con el año anterior.
                        </Typography>
                    )}
                </Stack>
            </Paper>
        );
    };

    const renderRelacionSiguiente = (r, relacionNormalizada) => {
        const siguientes = relacionNormalizada.siguientes;

        return (
            <Paper
                variant="outlined"
                sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: siguientes.length > 0 ? "rgba(23, 165, 137, 0.08)" : "rgba(0, 0, 0, 0.02)"
                }}
            >
                <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <ArrowForwardIcon fontSize="small" color={siguientes.length > 0 ? "success" : "disabled"} />
                        <Typography sx={{ fontWeight: 800 }}>
                            Relación con año siguiente
                        </Typography>

                        {siguientes.length > 1 && (
                            <Chip
                                size="small"
                                color="warning"
                                label="Conflicto"
                                icon={<WarningAmberIcon />}
                            />
                        )}
                    </Stack>

                    {siguientes.length > 0 ? (
                        <Stack spacing={1}>
                            {siguientes.map((siguiente) => (
                                <Paper
                                    key={`${siguiente.codigo_periodo}-${siguiente.codigo_riesgo}`}
                                    variant="outlined"
                                    sx={{ p: 1, borderRadius: 2, bgcolor: "background.paper" }}
                                >
                                    <Stack spacing={1}>
                                        <Typography variant="body2">
                                            {textoRiesgo(siguiente)}
                                        </Typography>

                                        <Box>
                                            <Button
                                                size="small"
                                                color="error"
                                                variant="outlined"
                                                startIcon={<DeleteOutlineIcon />}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    abrirConfirmacionQuitarSiguiente(r, siguiente);
                                                }}
                                                disabled={loadingAccion}
                                            >
                                                Quitar relación siguiente
                                            </Button>
                                        </Box>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            Este riesgo no tiene una continuidad registrada hacia el año siguiente.
                        </Typography>
                    )}
                </Stack>
            </Paper>
        );
    };

    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
                Continuidad
            </Typography>

            <Card sx={{ borderRadius: 2, mb: 3 }}>
                <CardHeader
                    title={entidad || "Unidad no identificada"}
                    subheader="Seleccione el período de continuidad"
                    titleTypographyProps={{ sx: { fontWeight: 700 } }}
                />

                <CardContent>
                    <Stack spacing={2}>
                        <Select
                            fullWidth
                            size="small"
                            value={periodo}
                            displayEmpty
                            onChange={(e) => setPeriodo(e.target.value)}
                            disabled={loading}
                        >
                            <MenuItem value="">
                                <em>Seleccione un período</em>
                            </MenuItem>

                            {periodos.map((p) => (
                                <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                                    {p.FECINI} - {p.FECFIN} del {p.CODIGO_PERIODO}
                                </MenuItem>
                            ))}
                        </Select>

                        {loadingInicial && <LinearProgress />}

                        {error && (
                            <Alert severity="error" onClose={() => setError("")}>
                                {error}
                            </Alert>
                        )}

                        {mensaje && (
                            <Alert severity="success" onClose={() => setMensaje("")}>
                                {mensaje}
                            </Alert>
                        )}
                    </Stack>
                </CardContent>
            </Card>

            {renderAlertaConflictos()}

            <Card sx={{ borderRadius: 2 }}>
                <CardHeader
                    title="Riesgos del período"
                    titleTypographyProps={{ sx: { fontWeight: 700 } }}
                />

                <CardContent>
                    {!periodo && (
                        <Typography color="text.secondary">
                            Seleccione un período para ver los riesgos registrados.
                        </Typography>
                    )}

                    {loadingPeriodo && <LinearProgress sx={{ mt: 1 }} />}

                    {!loadingPeriodo && periodo && riesgos.length === 0 && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                            No hay riesgos registrados para este período.
                        </Alert>
                    )}

                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {riesgos.map((r, idx) => {
                            const codigoRiesgo = getCodigoRiesgo(r);
                            const relacion = relaciones[String(codigoRiesgo)] || {};
                            const relacionNormalizada = obtenerRelacionesNormalizadas(relacion);

                            const tieneAnterior = Boolean(relacionNormalizada.anterior);
                            const tieneSiguiente = relacionNormalizada.siguientes.length > 0;
                            const tieneConflicto = relacionNormalizada.tiene_conflicto_siguiente;

                            return (
                                <Card
                                    key={codigoRiesgo || idx}
                                    variant="outlined"
                                    onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                                    sx={{
                                        borderLeft: tieneConflicto
                                            ? "6px solid #ff9800"
                                            : "6px solid #17a589",
                                        borderRadius: 2,
                                        cursor: "pointer",
                                        "&:hover": { boxShadow: 3 }
                                    }}
                                >
                                    <CardContent sx={{ pb: 1.5 }}>
                                        <Stack
                                            direction={{ xs: "column", md: "row" }}
                                            alignItems={{ xs: "flex-start", md: "center" }}
                                            justifyContent="space-between"
                                            spacing={1}
                                        >
                                            <Box>
                                                <Typography sx={{ fontWeight: 800 }}>
                                                    {getRefRiesgo(r)}
                                                </Typography>

                                                <Typography sx={{ mb: 1 }}>
                                                    {getDescripcionRiesgo(r)}
                                                </Typography>
                                            </Box>

                                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                {tieneAnterior && (
                                                    <Chip
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        label="Tiene año anterior"
                                                    />
                                                )}

                                                {tieneSiguiente && (
                                                    <Chip
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        label="Tiene año siguiente"
                                                    />
                                                )}

                                                {tieneConflicto && (
                                                    <Chip
                                                        size="small"
                                                        color="warning"
                                                        variant="outlined"
                                                        icon={<WarningAmberIcon />}
                                                        label="Revisar continuidad"
                                                    />
                                                )}
                                            </Stack>
                                        </Stack>

                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography sx={{ fontWeight: 700 }}>
                                                Riesgo Residual:
                                            </Typography>

                                            <Chip
                                                size="small"
                                                label={r["Riesgo residual"] ?? "—"}
                                                color={
                                                    r["Riesgo residual"] >= 15
                                                        ? "error"
                                                        : r["Riesgo residual"] >= 10
                                                            ? "warning"
                                                            : "success"
                                                }
                                            />
                                        </Stack>
                                    </CardContent>

                                    <Collapse in={openIdx === idx} timeout="auto" unmountOnExit>
                                        <Divider sx={{ my: 1 }} />

                                        <CardContent>
                                            <TableContainer component={Paper} sx={{ mb: 2 }}>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            {[
                                                                "Probabilidad",
                                                                "Severidad",
                                                                "Riesgo inherente",
                                                                "A mitigar",
                                                                "Capacidad de mitigación",
                                                                "Probabilidad ajustada",
                                                                "Severidad ajustada",
                                                                "Riesgo residual"
                                                            ].map((h) => (
                                                                <TableCell
                                                                    key={h}
                                                                    sx={{ fontWeight: 700, textAlign: "center" }}
                                                                >
                                                                    {h}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    </TableHead>

                                                    <TableBody>
                                                        <TableRow>
                                                            <TableCell align="center">{r.Probabilidad ?? "—"}</TableCell>
                                                            <TableCell align="center">{r.Severidad ?? "—"}</TableCell>

                                                            <TableCell
                                                                align="center"
                                                                sx={{ backgroundColor: nivelColor(r["Riesgo Inherente"]) }}
                                                            >
                                                                {r["Riesgo Inherente"] ?? "—"}
                                                            </TableCell>

                                                            <TableCell align="center">{r["A mitigar"] ?? "—"}</TableCell>
                                                            <TableCell align="center">{r["Eficiencia del mitigador"] ?? "—"}</TableCell>
                                                            <TableCell align="center">{r["Probabilidad ajustada"] ?? "—"}</TableCell>
                                                            <TableCell align="center">{r["Severidad ajustada"] ?? "—"}</TableCell>

                                                            <TableCell
                                                                align="center"
                                                                sx={{ backgroundColor: nivelColor(r["Riesgo residual"]) }}
                                                            >
                                                                {r["Riesgo residual"] ?? "—"}
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>

                                            <Stack spacing={1.5} sx={{ mb: 2 }}>
                                                {renderRelacionAnterior(r, relacionNormalizada)}
                                                {renderRelacionSiguiente(r, relacionNormalizada)}
                                            </Stack>

                                            <Stack
                                                direction={{ xs: "column", sm: "row" }}
                                                justifyContent="flex-end"
                                                spacing={1}
                                                sx={{ mt: 2 }}
                                            >
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<LinkIcon />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAbrirRelacionar(r);
                                                    }}
                                                    disabled={loadingAccion}
                                                >
                                                    Relacionar con un riesgo del año pasado
                                                </Button>

                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    color="success"
                                                    startIcon={<ArrowForwardIcon />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAbrirContinuar(r);
                                                    }}
                                                    disabled={loadingAccion}
                                                >
                                                    Continuar para el año siguiente
                                                </Button>

                                                <Button
                                                    variant="text"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenIdx(null);
                                                    }}
                                                >
                                                    Cerrar
                                                </Button>
                                            </Stack>
                                        </CardContent>
                                    </Collapse>
                                </Card>
                            );
                        })}
                    </Stack>
                </CardContent>
            </Card>

            <ModalRelacionarRiesgo
                open={openRelacionar}
                onClose={handleCerrarRelacionar}
                riesgo={riesgoSeleccionado}
                periodo={periodo}
                relacionesDetalle={relacionesDetalle}
            />

            <ModalContinuarRiesgo
                open={openContinuar}
                onClose={handleCerrarContinuar}
                riesgo={riesgoSeleccionado}
                relacion={riesgoSeleccionado ? relaciones[String(getCodigoRiesgo(riesgoSeleccionado))] : null}
            />

            <Dialog
                open={confirmacion.open}
                onClose={cerrarConfirmacion}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {confirmacion.tipo === "anterior"
                        ? "Quitar relación con año anterior"
                        : "Quitar relación con año siguiente"}
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Typography>
                            Esta acción quitará únicamente el vínculo de continuidad. No eliminará el riesgo.
                        </Typography>

                        <Alert severity="warning">
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                Riesgo seleccionado:
                            </Typography>
                            <Typography variant="body2">
                                {textoRiesgo(confirmacion.riesgo)}
                            </Typography>
                        </Alert>

                        {confirmacion.relacion && (
                            <Alert severity="info">
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    Relación que se quitará:
                                </Typography>
                                <Typography variant="body2">
                                    {textoRiesgo(confirmacion.relacion)}
                                </Typography>
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={cerrarConfirmacion}
                        disabled={loadingAccion}
                    >
                        Cancelar
                    </Button>

                    <Button
                        color="error"
                        variant="contained"
                        onClick={confirmarQuitarRelacion}
                        disabled={loadingAccion}
                        startIcon={
                            loadingAccion
                                ? <CircularProgress size={16} color="inherit" />
                                : <DeleteOutlineIcon />
                        }
                    >
                        Quitar relación
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
