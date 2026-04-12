/**
 * @fileoverview
 * Modal para definir cómo continúa un riesgo en el siguiente periodo.
 *
 * @module Riesgos/Comportamiento/Relaciones riesgos/ModalContinuarRiesgo.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useState, useMemo } from "react";
import axios from "axios";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Alert, Stack, LinearProgress, Snackbar
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";

const headers = () => ({ "x-access-token": localStorage.getItem("token") });

/**
 * Modal para definir la continuidad de un riesgo.
 *
 * Permite seleccionar el tipo de continuidad y registrar observaciones.
 *
 * @component
 */
export default function ModalContinuarRiesgo({ open, onClose, riesgo }) {
    const [loading, setLoading] = useState(false);
    const [errorDetail, setErrorDetail] = useState("");

    const [snack, setSnack] = useState({
        open: false,
        msg: "",
        severity: /** @type {"success"|"warning"|"error"|"info"} */ ("info"),
        autoclose: 4000
    });

    const payload = useMemo(
        () => ({
            codigo_entidad: riesgo?.CODIGO_ENTIDAD ?? null,
            codigo_riesgo: riesgo?.CODIGO_RIESGO ?? null,
            codigo_periodo: riesgo?.Periodo ?? null
        }),
        [riesgo]
    );

    const faltanDatos =
        !payload.codigo_entidad || !payload.codigo_riesgo || !payload.codigo_periodo;

    const handleConfirmar = async () => {
        setErrorDetail("");
        setLoading(true);
        try {
            const resp = await axios.post(
                "/api/seguimientos-actualizados/copiar-riesgo-proximo-periodo",
                payload,
                { headers: headers(), validateStatus: () => true } 
            );

            const status = resp.status;
            const msg = resp.data?.message || "Operación realizada.";

            if (status === 201) {
                setSnack({ open: true, msg, severity: "success", autoclose: 2000 });
            } else if (status === 409) {
                setSnack({
                    open: true,
                    msg: msg || "Ya existe un riesgo con la misma referencia en el periodo destino.",
                    severity: "warning",
                    autoclose: 5000
                });
            } else if (status >= 400) {
                setErrorDetail(msg || "No se pudo preparar el riesgo para el próximo periodo.");
                setSnack({
                    open: true,
                    msg: "Ocurrió un error al procesar la solicitud.",
                    severity: "error",
                    autoclose: 5000
                });
            } else {
                setSnack({ open: true, msg, severity: "success", autoclose: 2000 });
            }
        } catch (e) {
            console.error(e);
            setErrorDetail("No se pudo preparar el riesgo para el próximo periodo. Inténtalo de nuevo.");
            setSnack({ open: true, msg: "Error de red o del servidor.", severity: "error", autoclose: 5000 });
        } finally {
            setLoading(false);
        }
    };

    const handleSnackClose = () => {
        // Si fue éxito, se cierra el modal y notifica al main
        if (snack.severity === "success") {
            setSnack((s) => ({ ...s, open: false }));
            onClose?.({ ok: true, payload });
        } else {
            setSnack((s) => ({ ...s, open: false }));
        }
    };

    return (
        <>
            <Dialog open={open} onClose={() => !loading && onClose?.()} fullWidth maxWidth="sm">
                <DialogTitle>Continuar riesgo para el año siguiente</DialogTitle>

                <DialogContent>
                    {loading && <LinearProgress sx={{ mb: 2 }} />}
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Este proceso copiará únicamente el <b>Ref.</b>, <b>descripción del riesgo</b>, <b>tipo de objetivo</b>,
                        <b> objetivo</b> y <b>área evaluada</b> para preparar su registro en el año siguiente. Luego deberá
                        ingresar la información nueva correspondiente.
                    </Alert>

                    {!!errorDetail && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {errorDetail}
                        </Alert>
                    )}

                    <Stack spacing={1}>
                        <Typography>
                            <strong>Riesgo:</strong> {riesgo?.["Ref."] || "Sin referencia"}
                        </Typography>
                        <Typography color="text.secondary">
                            <strong>Descripción:</strong> {riesgo?.["Descripción del riesgo"] || "Sin descripción"}
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
                        disabled={loading || faltanDatos}
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
                <MuiAlert onClose={handleSnackClose} severity={snack.severity} elevation={6} variant="filled" sx={{ width: "100%" }}>
                    {snack.msg}
                </MuiAlert>
            </Snackbar>
        </>
    );
}
