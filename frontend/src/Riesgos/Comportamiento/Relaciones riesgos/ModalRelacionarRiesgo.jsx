/**
 * @fileoverview
 * Modal para relacionar un riesgo actual con un riesgo del período anterior.
 *
 * Compatibilidad:
 * - Deshabilita riesgos anteriores que ya estén usados por otro riesgo del período actual.
 * - El servicio también valida esta regla para evitar duplicados en producción.
 *
 * @module Riesgos/Comportamiento/Relaciones riesgos/ModalRelacionarRiesgo.jsx
 * @version 1.1
 */

import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Checkbox,
    List,
    ListItem,
    ListItemText,
    LinearProgress,
    Alert,
    Typography,
    Snackbar,
    Chip,
    Stack,
    Box
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import apiClient from "api/apiClient";

const API_SEGUIMIENTOS = "/api/seguimientos-actualizados";

const getCodigoRiesgo = (riesgo) => {
    const valor =
        riesgo?.CODIGO_RIESGO ??
        riesgo?.codigo_riesgo ??
        riesgo?.codigo ??
        riesgo?.id ??
        null;

    const n = Number(valor);
    return Number.isInteger(n) ? n : null;
};

const getRef = (riesgo) => {
    return riesgo?.["Ref."] ?? riesgo?.REF ?? riesgo?.Ref ?? riesgo?.ref ?? "Sin referencia";
};

const getDescripcion = (riesgo) => {
    return riesgo?.["Descripción del riesgo"] ?? riesgo?.DESCRIPCION ?? riesgo?.descripcion ?? "Sin descripción";
};

const limpiarExtras = (obj) =>
    Object.fromEntries(
        Object.entries(obj || {}).filter(
            ([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)
        )
    );

export default function ModalRelacionarRiesgo({
    open,
    onClose,
    riesgo,
    periodo,
    relacionesDetalle = []
}) {
    const [riesgosPasados, setRiesgosPasados] = useState([]);
    const [seleccionado, setSeleccionado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [snack, setSnack] = useState({
        open: false,
        msg: "",
        severity: "success",
        autoclose: 3000
    });

    const codigoRiesgoActual = getCodigoRiesgo(riesgo);

    const periodoAnterior = useMemo(() => {
        const p = parseInt(periodo, 10);
        return Number.isInteger(p) ? p - 1 : null;
    }, [periodo]);

    const riesgosAnterioresUsados = useMemo(() => {
        const usados = new Map();

        relacionesDetalle.forEach((item) => {
            const anterior = item?.anterior;
            if (!anterior?.codigo_riesgo) return;

            const codigoAnterior = Number(anterior.codigo_riesgo);
            const codigoActualRelacionado = Number(item.codigo_riesgo);

            if (!usados.has(codigoAnterior)) {
                usados.set(codigoAnterior, []);
            }

            usados.get(codigoAnterior).push({
                codigo_riesgo: codigoActualRelacionado,
                ref: item.ref,
                descripcion: item.descripcion
            });
        });

        return usados;
    }, [relacionesDetalle]);

    const fetchRiesgosPasados = async () => {
        if (!periodoAnterior || periodoAnterior <= 0) {
            setError("No se pudo determinar el período anterior.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const { data } = await apiClient.get(
                "/api/riesgos-variables-actualizados/obtener-lista-riesgos-detalle",
                { params: { periodo: periodoAnterior } }
            );

            const lista = Array.isArray(data?.valores) ? data.valores : [];

            const normalizados = lista.map((r) => ({
                ...r,
                ...(limpiarExtras(r.EXTRAS_ME)),
                ...(limpiarExtras(r.EXTRAS_MCE)),
                ...(limpiarExtras(r.EXTRAS_MC))
            }));

            setRiesgosPasados(normalizados);

            const relacionActual = relacionesDetalle.find(
                (item) => Number(item?.codigo_riesgo) === Number(codigoRiesgoActual)
            );

            if (relacionActual?.anterior?.codigo_riesgo) {
                setSeleccionado(Number(relacionActual.anterior.codigo_riesgo));
            } else {
                setSeleccionado(null);
            }
        } catch (err) {
            console.error(err);
            setError("No se pudieron cargar los riesgos del año pasado.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && periodo) {
            setSeleccionado(null);
            setError("");
            fetchRiesgosPasados();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, periodo, codigoRiesgoActual]);

    const getUsoAnterior = (codigoAnterior) => {
        const lista = riesgosAnterioresUsados.get(Number(codigoAnterior)) || [];
        return lista.filter((x) => Number(x.codigo_riesgo) !== Number(codigoRiesgoActual));
    };

    const handleGuardar = async () => {
        try {
            setLoading(true);
            setError("");

            const riesgoAnteriorSel = riesgosPasados.find(
                (r) => Number(getCodigoRiesgo(r)) === Number(seleccionado)
            );

            const usos = getUsoAnterior(seleccionado);
            if (usos.length > 0) {
                setError("Este riesgo del año anterior ya está relacionado con otro riesgo del período actual.");
                return;
            }

            const payload = {
                codigo_entidad: riesgo?.CODIGO_ENTIDAD ?? riesgo?.codigo_entidad ?? null,
                codigo_periodo_actual: Number(periodo) || null,
                riesgo_actual: {
                    codigo_riesgo: codigoRiesgoActual,
                    ref: getRef(riesgo),
                    descripcion: getDescripcion(riesgo)
                },
                riesgo_anterior: {
                    codigo_riesgo: getCodigoRiesgo(riesgoAnteriorSel),
                    ref: getRef(riesgoAnteriorSel),
                    descripcion: getDescripcion(riesgoAnteriorSel),
                    codigo_periodo: periodoAnterior
                }
            };

            if (
                !payload.codigo_entidad ||
                !payload.codigo_periodo_actual ||
                !payload.riesgo_actual.codigo_riesgo ||
                !payload.riesgo_anterior.codigo_riesgo
            ) {
                setError("Faltan datos para guardar la relación.");
                return;
            }

            const resp = await apiClient.put(
                `${API_SEGUIMIENTOS}/relacionar-riesgo-anterior-periodo`,
                payload,
                { validateStatus: () => true }
            );

            const msg =
                resp.data?.message ||
                resp.data?.mensaje ||
                resp.data?.error ||
                "Operación realizada.";

            if (resp.status >= 200 && resp.status < 300) {
                setSnack({
                    open: true,
                    msg: msg || "Riesgo relacionado correctamente.",
                    severity: "success",
                    autoclose: 1800
                });
                return;
            }

            if (resp.status === 409) {
                setError(msg || "La relación no se puede guardar porque genera duplicidad.");
                setSnack({
                    open: true,
                    msg: msg || "La relación no se puede guardar porque genera duplicidad.",
                    severity: "warning",
                    autoclose: 5000
                });
                return;
            }

            setError(msg || "No se pudo guardar la relación.");
            setSnack({
                open: true,
                msg: "Ocurrió un error al guardar la relación.",
                severity: "error",
                autoclose: 5000
            });
        } catch (err) {
            console.error(err);
            setError("No se pudo guardar la relación.");
            setSnack({
                open: true,
                msg: "Error de red o del servidor.",
                severity: "error",
                autoclose: 5000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSnackClose = () => {
        const fueExito = snack.severity === "success";

        setSnack((s) => ({ ...s, open: false }));

        if (fueExito) {
            onClose?.({ ok: true });
        }
    };

    return (
        <>
            <Dialog open={open} onClose={() => !loading && onClose?.()} fullWidth maxWidth="md">
                <DialogTitle>Relacionar con riesgo del año anterior</DialogTitle>

                <DialogContent dividers>
                    {loading && <LinearProgress sx={{ mb: 2 }} />}

                    <Alert severity="info" sx={{ mb: 2 }}>
                        Seleccione el riesgo del período <strong>{periodoAnterior ?? "—"}</strong> que será la continuidad anterior del riesgo actual.
                        Un riesgo del año anterior no puede quedar relacionado con dos riesgos activos del período actual.
                    </Alert>

                    {riesgo && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                Riesgo actual
                            </Typography>
                            <Typography variant="body2">
                                {getRef(riesgo)} - {getDescripcion(riesgo)}
                            </Typography>
                        </Alert>
                    )}

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Typography sx={{ mb: 1, fontWeight: 700 }}>
                        Riesgos disponibles del año {periodoAnterior ?? "—"}
                    </Typography>

                    <List dense>
                        {riesgosPasados.map((r, idx) => {
                            const codigoAnterior = getCodigoRiesgo(r);
                            const usos = getUsoAnterior(codigoAnterior);
                            const ocupado = usos.length > 0;
                            const checked = Number(seleccionado) === Number(codigoAnterior);

                            return (
                                <ListItem
                                    key={`${codigoAnterior || idx}-${getRef(r)}`}
                                    sx={{
                                        border: "1px solid",
                                        borderColor: checked ? "primary.main" : "divider",
                                        borderRadius: 2,
                                        mb: 1,
                                        opacity: ocupado ? 0.65 : 1
                                    }}
                                    secondaryAction={
                                        <Checkbox
                                            edge="end"
                                            checked={checked}
                                            disabled={ocupado || loading}
                                            onChange={() => setSeleccionado(codigoAnterior)}
                                        />
                                    }
                                >
                                    <ListItemText
                                        primary={
                                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                                <Typography sx={{ fontWeight: 700 }}>
                                                    {getRef(r)}
                                                </Typography>

                                                {ocupado && (
                                                    <Chip
                                                        size="small"
                                                        color="warning"
                                                        label={`Ya usado por: ${usos.map((x) => x.ref || `Riesgo ${x.codigo_riesgo}`).join(", ")}`}
                                                    />
                                                )}
                                            </Stack>
                                        }
                                        secondary={
                                            <Box component="span">
                                                {getDescripcion(r)}
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            );
                        })}

                        {!loading && riesgosPasados.length === 0 && (
                            <Typography color="text.secondary">
                                No hay riesgos registrados para el año anterior.
                            </Typography>
                        )}
                    </List>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => onClose?.()} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        disabled={!seleccionado || loading || getUsoAnterior(seleccionado).length > 0}
                        onClick={handleGuardar}
                    >
                        Guardar relación
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snack.open}
                autoHideDuration={snack.autoclose}
                onClose={handleSnackClose}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <MuiAlert
                    onClose={handleSnackClose}
                    severity={snack.severity}
                    elevation={6}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {snack.msg}
                </MuiAlert>
            </Snackbar>
        </>
    );
}
