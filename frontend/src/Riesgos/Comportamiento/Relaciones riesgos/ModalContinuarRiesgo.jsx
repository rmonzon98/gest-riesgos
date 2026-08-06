/**
 * @fileoverview
 * Modal para crear continuidad de un riesgo hacia el siguiente período.
 *
 * @module Riesgos/Comportamiento/Relaciones riesgos/ModalContinuarRiesgo.jsx
 * @version 1.1
 */

import { useState, useMemo } from "react";
import apiClient from "api/apiClient";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Alert,
    Stack,
    LinearProgress,
    Snackbar,
    Paper
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";

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

export default function ModalContinuarRiesgo({ open, onClose, riesgo, relacion }) {
    const [loading, setLoading] = useState(false);
    const [errorDetail, setErrorDetail] = useState("");

    const [snack, setSnack] = useState({
        open: false,
        msg: "",
        severity: "info",
        autoclose: 4000
    });

    const siguientes = useMemo(() => {
        if (Array.isArray(relacion?.siguientes)) return relacion.siguientes;
        if (relacion?.siguiente) return [relacion.siguiente];
        return [];
    }, [relacion]);

    const payload = useMemo(
        () => ({
            codigo_entidad: riesgo?.CODIGO_ENTIDAD ?? riesgo?.codigo_entidad ?? null,
            codigo_riesgo: getCodigoRiesgo(riesgo),
            codigo_periodo: riesgo?.Periodo ?? riesgo?.CODIGO_PERIODO ?? riesgo?.codigo_periodo ?? null
        }),
        [riesgo]
    );

    const faltanDatos =
        !payload.codigo_entidad || !payload.codigo_riesgo || !payload.codigo_periodo;

    const handleConfirmar = async () => {
        setErrorDetail("");
        setLoading(true);

        try {
            const resp = await apiClient.post(
                `${API_SEGUIMIENTOS}/copiar-riesgo-proximo-periodo`,
                payload,
                { validateStatus: () => true }
            );

            const status = resp.status;
            const msg =
                resp.data?.message ||
                resp.data?.mensaje ||
                resp.data?.error ||
                "Operación realizada.";

            if (status === 201 || (status >= 200 && status < 300)) {
                setSnack({ open: true, msg, severity: "success", autoclose: 1800 });
            } else if (status === 409) {
                setErrorDetail(msg || "Este riesgo ya tiene continuidad activa o existe duplicidad en el período destino.");
                setSnack({
                    open: true,
                    msg: msg || "No se puede crear la continuidad porque generaría duplicidad.",
                    severity: "warning",
                    autoclose: 5000
                });
            } else if (status >= 400) {
                setErrorDetail(msg || "No se pudo preparar el riesgo para el próximo período.");
                setSnack({
                    open: true,
                    msg: "Ocurrió un error al procesar la solicitud.",
                    severity: "error",
                    autoclose: 5000
                });
            } else {
                setSnack({ open: true, msg, severity: "success", autoclose: 1800 });
            }
        } catch (e) {
            console.error(e);
            setErrorDetail("No se pudo preparar el riesgo para el próximo período. Inténtelo de nuevo.");
            setSnack({ open: true, msg: "Error de red o del servidor.", severity: "error", autoclose: 5000 });
        } finally {
            setLoading(false);
        }
    };

    const handleSnackClose = () => {
        const fueExito = snack.severity === "success";

        setSnack((s) => ({ ...s, open: false }));

        if (fueExito) {
            onClose?.({ ok: true, payload });
        }
    };

    return (
        <>
            <Dialog open={open} onClose={() => !loading && onClose?.()} fullWidth maxWidth="sm">
                <DialogTitle>Continuar riesgo para el año siguiente</DialogTitle>

                <DialogContent dividers>
                    {loading && <LinearProgress sx={{ mb: 2 }} />}

                    <Alert severity="info" sx={{ mb: 2 }}>
                        Este proceso copiará únicamente el <b>Ref.</b>, <b>descripción del riesgo</b>, <b>tipo de objetivo</b>,
                        <b> objetivo</b> y <b>área evaluada</b> para preparar su registro en el año siguiente.
                        Luego deberá ingresar la información nueva correspondiente.
                    </Alert>

                    {siguientes.length > 0 && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Este riesgo ya tiene continuidad activa hacia el año siguiente. Si desea crear otra, primero debe quitar la relación existente.
                        </Alert>
                    )}

                    {!!errorDetail && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {errorDetail}
                        </Alert>
                    )}

                    <Stack spacing={1}>
                        <Typography>
                            <strong>Riesgo:</strong> {getRef(riesgo)}
                        </Typography>
                        <Typography color="text.secondary">
                            <strong>Descripción:</strong> {getDescripcion(riesgo)}
                        </Typography>
                        <Typography color="text.secondary">
                            <strong>Tipo de objetivo:</strong> {riesgo?.["Tipo de objetivo"] || "Sin descripción"}
                        </Typography>
                        <Typography color="text.secondary">
                            <strong>Objetivo:</strong> {riesgo?.["Objetivo"] || "Sin descripción"}
                        </Typography>
                        <Typography color="text.secondary">
                            <strong>Área evaluada:</strong> {riesgo?.["Área evaluada"] || "Sin descripción"}
                        </Typography>

                        {siguientes.length > 0 && (
                            <Paper variant="outlined" sx={{ p: 1.5, mt: 1, borderRadius: 2 }}>
                                <Typography sx={{ fontWeight: 800, mb: 1 }}>
                                    Continuidades existentes
                                </Typography>

                                <Stack spacing={1}>
                                    {siguientes.map((sig) => (
                                        <Typography key={`${sig.codigo_periodo}-${sig.codigo_riesgo}`} variant="body2" color="text.secondary">
                                            {sig.codigo_periodo} - Riesgo {sig.codigo_riesgo} | {sig.ref || "Sin referencia"} - {sig.descripcion || "Sin descripción"}
                                        </Typography>
                                    ))}
                                </Stack>
                            </Paper>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => onClose?.()} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleConfirmar}
                        disabled={loading || faltanDatos || siguientes.length > 0}
                    >
                        Confirmar continuación
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
