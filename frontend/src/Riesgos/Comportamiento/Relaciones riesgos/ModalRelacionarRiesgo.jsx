/**
 * @fileoverview
 * Modal para relacionar riesgos entre sí y gestionar dependencias.
 *
 * @module Riesgos/Comportamiento/Relaciones riesgos/ModalRelacionarRiesgo.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useMemo, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Checkbox, List, ListItem, ListItemText,
    LinearProgress, Alert, Typography, Snackbar
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import axios from "axios";

/**
 * Se utiliza para relacionar un riesgo con otros riesgos.
 *
 * Se utiliza para gestionar dependencias y agrupar riesgos relacionados.
 *
 * @component
 */
export default function ModalRelacionarRiesgo({ open, onClose, riesgo, periodo }) {
    const [riesgosPasados, setRiesgosPasados] = useState([]);
    const [seleccionado, setSeleccionado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [snack, setSnack] = useState({
        open: false,
        msg: "",
        severity: /** @type {"success" | "warning" | "error" | "info"} */ ("success"),
        autoclose: 3000
    });

    const headers = () => ({ "x-access-token": localStorage.getItem("token") });
    const periodoAnterior = useMemo(() => {
        const p = parseInt(periodo, 10);
        return isNaN(p) ? null : p - 1;
    }, [periodo]);

    /* ===== Cargar riesgos del período anterior ===== */
    const fetchRiesgosPasados = async () => {
        if (!periodoAnterior || periodoAnterior <= 0) {
            setError("No se pudo determinar el período anterior.");
            return;
        }
        try {
            setLoading(true);
            setError("");

            const { data } = await axios.get(
                "/api/riesgos-variables-actualizados/obtener-lista-riesgos-detalle",
                { params: { periodo: periodoAnterior }, headers: headers() }
            );

            const lista = Array.isArray(data?.valores) ? data.valores : [];

            const limpiar = (obj) =>
                Object.fromEntries(
                    Object.entries(obj || {}).filter(
                        ([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)
                    )
                );

            const normalizados = lista.map((r) => ({
                ...r,
                ...(limpiar(r.EXTRAS_ME)),
                ...(limpiar(r.EXTRAS_MCE)),
                ...(limpiar(r.EXTRAS_MC))
            }));

            setRiesgosPasados(normalizados);
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
            fetchRiesgosPasados();
        }
    }, [open, periodo]);

    const handleGuardar = async () => {
        try {
            setLoading(true);
            setError("");

            const riesgoAnteriorSel = riesgosPasados.find(
                (r) => r["CODIGO_RIESGO"] === seleccionado
            );

            const payload = {
                codigo_entidad: riesgo?.CODIGO_ENTIDAD ?? null,
                codigo_periodo_actual: Number(periodo) || null,
                riesgo_actual: {
                    codigo_riesgo: riesgo?.CODIGO_RIESGO ?? null,
                    ref: riesgo?.["Ref."] ?? null,
                    descripcion: riesgo?.["Descripción del riesgo"] ?? null
                },
                riesgo_anterior: {
                    codigo_riesgo: riesgoAnteriorSel?.["CODIGO_RIESGO"] ?? null,
                    ref: riesgoAnteriorSel?.["Ref."] ?? null,
                    descripcion: riesgoAnteriorSel?.["Descripción del riesgo"] ?? null,
                    codigo_periodo: periodoAnterior
                }
            };

            // Validaciones mínimas
            if (
                !payload.codigo_entidad ||
                !payload.codigo_periodo_actual ||
                !payload.riesgo_actual.codigo_riesgo ||
                !payload.riesgo_anterior.codigo_riesgo ||
                !payload.riesgo_anterior.codigo_periodo
            ) {
                setSnack({
                    open: true,
                    msg: "Faltan datos para realizar la relación.",
                    severity: "warning",
                    autoclose: 4000
                });
                setLoading(false);
                return;
            }

            const resp = await axios.put(
                "/api/seguimientos-actualizados/relacionar-riesgo-anterior-periodo",
                payload,
                { headers: headers(), validateStatus: () => true }
            );

            // Respuestas del backend
            if (resp.status === 200 && resp.data?.mensaje === "Riesgo actualizado correctamente") {
                setSnack({
                    open: true,
                    msg: resp.data.mensaje,
                    severity: "success",
                    autoclose: 2000
                });
            } else if (resp.status === 404 && resp.data?.error === "Riesgo no encontrado") {
                setError(resp.data.error);
                setSnack({
                    open: true,
                    msg: "Riesgo no encontrado.",
                    severity: "warning",
                    autoclose: 4000
                });
            } else if (resp.status >= 400) {
                const msg = resp.data?.error || "Error al actualizar riesgo";
                setError(msg);
                setSnack({
                    open: true,
                    msg: "Ocurrió un error al guardar.",
                    severity: "error",
                    autoclose: 4000
                });
            } else {
                setSnack({
                    open: true,
                    msg: resp.data?.mensaje || "Relación guardada.",
                    severity: "success",
                    autoclose: 2000
                });
            }
        } catch (err) {
            console.error(err);
            setError("Error de red o del servidor.");
            setSnack({
                open: true,
                msg: "No se pudo contactar al servidor.",
                severity: "error",
                autoclose: 4000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSnackClose = () => {
        if (snack.severity === "success") {
            setSnack((s) => ({ ...s, open: false }));
            onClose?.({ ok: true });
        } else {
            setSnack((s) => ({ ...s, open: false }));
        }
    };

    return (
        <>
            <Dialog open={open} onClose={() => !loading && onClose?.()} fullWidth maxWidth="sm">
                <DialogTitle>Relacionar con un riesgo del año pasado</DialogTitle>

                <DialogContent>
                    {loading && <LinearProgress sx={{ mb: 2 }} />}
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Typography sx={{ mb: 1 }}>
                        Seleccione el riesgo del año <strong>{periodoAnterior ?? "—"}</strong> que desea vincular:
                    </Typography>

                    <List dense>
                        {riesgosPasados.map((r, idx) => (
                            <ListItem
                                key={idx}
                                secondaryAction={
                                    <Checkbox
                                        edge="end"
                                        checked={seleccionado === r["CODIGO_RIESGO"]}
                                        onChange={() => setSeleccionado(r["CODIGO_RIESGO"])}
                                    />
                                }
                            >
                                <ListItemText
                                    primary={r["Ref."] || "Sin referencia"}
                                    secondary={r["Descripción del riesgo"] || "Sin descripción"}
                                />
                            </ListItem>
                        ))}

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
                        disabled={!seleccionado || loading}
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
                <MuiAlert onClose={handleSnackClose} severity={snack.severity} elevation={6} variant="filled" sx={{ width: "100%" }}>
                    {snack.msg}
                </MuiAlert>
            </Snackbar>
        </>
    );
}
