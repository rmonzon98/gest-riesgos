import React, { useEffect, useState } from "react";
import {
    Box,
    Stack,
    Typography,
    Button,
    CircularProgress,
    Snackbar,
    Alert,
    Divider,
    Chip,
    TextField,
    Card,
    CardContent,
    Grid,
    Paper,
    Tooltip,
    IconButton,
} from "@mui/material";

import SecurityRounded from "@mui/icons-material/SecurityRounded";
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import VerifiedUserRounded from "@mui/icons-material/VerifiedUserRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import SmartphoneRounded from "@mui/icons-material/SmartphoneRounded";
import LockOpenRounded from "@mui/icons-material/LockOpenRounded";

import { authApi } from "api/apiClient";

export default function Seguridad2FA() {
    const [loadingEstado, setLoadingEstado] = useState(true);
    const [loadingSetup, setLoadingSetup] = useState(false);
    const [loadingConfirmar, setLoadingConfirmar] = useState(false);
    const [loadingDesactivar, setLoadingDesactivar] = useState(false);

    const [activo, setActivo] = useState(false);
    const [setup, setSetup] = useState(null);
    const [codigoConfirmacion, setCodigoConfirmacion] = useState("");
    const [codigoDesactivar, setCodigoDesactivar] = useState("");
    const [recoveryCodes, setRecoveryCodes] = useState([]);

    const [snack, setSnack] = useState({
        open: false,
        tipo: "info",
        mensaje: "",
    });

    const mostrarSnack = (tipo, mensaje) => {
        setSnack({
            open: true,
            tipo,
            mensaje,
        });
    };

    const cerrarSnack = () => {
        setSnack((prev) => ({
            ...prev,
            open: false,
        }));
    };

    const cargarEstado = async () => {
        try {
            setLoadingEstado(true);

            const { data } = await authApi.me();

            const tiene2FA = Number(data?.user?.TOTP_ACTIVO || 0) === 1;

            setActivo(tiene2FA);
        } catch (err) {
            console.error("No se pudo cargar el estado 2FA:", err);
            mostrarSnack(
                "error",
                err?.response?.data?.message || "No se pudo cargar el estado de seguridad."
            );
        } finally {
            setLoadingEstado(false);
        }
    };

    useEffect(() => {
        cargarEstado();
    }, []);

    const iniciarConfiguracion = async () => {
        try {
            setLoadingSetup(true);
            setRecoveryCodes([]);
            setCodigoConfirmacion("");

            const { data } = await authApi.setupTOTP();

            if (!data?.ok) {
                mostrarSnack("error", data?.message || "No se pudo iniciar la configuración 2FA.");
                return;
            }

            setSetup({
                qrDataUrl: data.qrDataUrl,
                otpauthUrl: data.otpauthUrl,
                secretoManual: data.secretoManual,
            });

            mostrarSnack("info", data.message || "Escanee el QR con su aplicación autenticadora.");
        } catch (err) {
            console.error("Error iniciando configuración 2FA:", err);
            mostrarSnack(
                "error",
                err?.response?.data?.message || "No se pudo generar el QR de autenticación."
            );
        } finally {
            setLoadingSetup(false);
        }
    };

    const confirmarActivacion = async () => {
        if (!codigoConfirmacion.trim()) {
            mostrarSnack("warning", "Ingrese el código de 6 dígitos de su aplicación autenticadora.");
            return;
        }

        try {
            setLoadingConfirmar(true);

            const { data } = await authApi.confirmarTOTP({
                codigo: codigoConfirmacion.trim(),
            });

            if (!data?.ok) {
                mostrarSnack("error", data?.message || "No se pudo activar 2FA.");
                return;
            }

            setActivo(true);
            setSetup(null);
            setCodigoConfirmacion("");
            setRecoveryCodes(Array.isArray(data.recoveryCodes) ? data.recoveryCodes : []);

            mostrarSnack("success", data.message || "2FA activado correctamente.");
        } catch (err) {
            console.error("Error confirmando 2FA:", err);
            mostrarSnack(
                "error",
                err?.response?.data?.message || "Código inválido. Intente con el código actual de la app."
            );
        } finally {
            setLoadingConfirmar(false);
        }
    };

    const desactivar2FA = async () => {
        if (!codigoDesactivar.trim()) {
            mostrarSnack(
                "warning",
                "Ingrese un código de la app autenticadora o un código de recuperación."
            );
            return;
        }

        try {
            setLoadingDesactivar(true);

            const { data } = await authApi.desactivarTOTP({
                codigo: codigoDesactivar.trim(),
            });

            if (!data?.ok) {
                mostrarSnack("error", data?.message || "No se pudo desactivar 2FA.");
                return;
            }

            setActivo(false);
            setSetup(null);
            setRecoveryCodes([]);
            setCodigoConfirmacion("");
            setCodigoDesactivar("");

            mostrarSnack("success", data.message || "2FA desactivado correctamente.");
        } catch (err) {
            console.error("Error desactivando 2FA:", err);
            mostrarSnack(
                "error",
                err?.response?.data?.message || "No se pudo desactivar 2FA."
            );
        } finally {
            setLoadingDesactivar(false);
        }
    };

    const copiarTexto = async (texto, mensaje = "Copiado al portapapeles.") => {
        try {
            await navigator.clipboard.writeText(texto);
            mostrarSnack("success", mensaje);
        } catch (_err) {
            mostrarSnack("warning", "No se pudo copiar automáticamente.");
        }
    };

    const copiarRecoveryCodes = async () => {
        if (!recoveryCodes.length) return;

        await copiarTexto(
            recoveryCodes.join("\n"),
            "Códigos de recuperación copiados."
        );
    };

    if (loadingEstado) {
        return (
            <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    return (
        <Box>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={2}
                sx={{ mb: 1 }}
            >
                <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                        Seguridad de la cuenta
                    </Typography>

                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Autenticación en dos pasos
                    </Typography>
                </Box>

                <Chip
                    icon={activo ? <VerifiedUserRounded /> : <WarningAmberRounded />}
                    label={activo ? "Activa" : "Inactiva"}
                    color={activo ? "success" : "warning"}
                    variant={activo ? "filled" : "outlined"}
                />
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Alert severity={activo ? "success" : "info"} sx={{ mb: 2 }}>
                {activo
                    ? "Tu cuenta tiene autenticación en dos pasos activa. Al iniciar sesión, deberás ingresar el código generado por tu app autenticadora."
                    : "Agrega una capa extra de seguridad usando Google Authenticator, Microsoft Authenticator, Authy u otra app compatible."}
            </Alert>

            {!activo && !setup && (
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Para activarla, el sistema generará un código QR. Deberás escanearlo con
                            tu app autenticadora y confirmar el código de 6 dígitos.
                        </Typography>
                    </Box>

                    <Button
                        variant="contained"
                        startIcon={!loadingSetup && <SecurityRounded />}
                        onClick={iniciarConfiguracion}
                        disabled={loadingSetup}
                    >
                        {loadingSetup ? (
                            <CircularProgress size={22} color="inherit" />
                        ) : (
                            "Activar autenticación en dos pasos"
                        )}
                    </Button>
                </Stack>
            )}

            {!activo && setup && (
                <Stack spacing={2}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={5}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Stack spacing={1.5} alignItems="center">
                                        <QrCode2Rounded color="primary" />

                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                            Escanee este QR
                                        </Typography>

                                        {setup.qrDataUrl ? (
                                            <Box
                                                component="img"
                                                src={setup.qrDataUrl}
                                                alt="QR para activar autenticación en dos pasos"
                                                sx={{
                                                    width: "100%",
                                                    maxWidth: 240,
                                                    borderRadius: 2,
                                                    border: "1px solid",
                                                    borderColor: "divider",
                                                    p: 1,
                                                    bgcolor: "white",
                                                }}
                                            />
                                        ) : (
                                            <Alert severity="warning">
                                                No se recibió el QR desde el backend.
                                            </Alert>
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={7}>
                            <Stack spacing={2}>
                                <Alert severity="info" icon={<SmartphoneRounded />}>
                                    Abre tu app autenticadora, selecciona agregar cuenta y escanea
                                    el QR. Luego escribe el código de 6 dígitos que aparece en la app.
                                </Alert>

                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                        Configuración manual
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        Si no puedes escanear el QR, usa este secreto manual.
                                    </Typography>

                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 1.2,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            bgcolor: "grey.50",
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontFamily: "monospace",
                                                wordBreak: "break-all",
                                                flex: 1,
                                            }}
                                        >
                                            {setup.secretoManual}
                                        </Typography>

                                        <Tooltip title="Copiar secreto">
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    copiarTexto(
                                                        setup.secretoManual,
                                                        "Secreto manual copiado."
                                                    )
                                                }
                                            >
                                                <ContentCopyRounded fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Paper>
                                </Box>

                                <TextField
                                    label="Código de 6 dígitos"
                                    value={codigoConfirmacion}
                                    onChange={(e) => setCodigoConfirmacion(e.target.value)}
                                    placeholder="123456"
                                    fullWidth
                                    inputProps={{
                                        inputMode: "numeric",
                                        maxLength: 6,
                                    }}
                                    helperText="Ingrese el código actual generado por la app autenticadora."
                                />

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                    <Button
                                        variant="contained"
                                        onClick={confirmarActivacion}
                                        disabled={loadingConfirmar}
                                        startIcon={!loadingConfirmar && <VerifiedUserRounded />}
                                    >
                                        {loadingConfirmar ? (
                                            <CircularProgress size={22} color="inherit" />
                                        ) : (
                                            "Confirmar activación"
                                        )}
                                    </Button>

                                    <Button
                                        variant="text"
                                        color="inherit"
                                        disabled={loadingConfirmar}
                                        onClick={() => {
                                            setSetup(null);
                                            setCodigoConfirmacion("");
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                </Stack>
                            </Stack>
                        </Grid>
                    </Grid>
                </Stack>
            )}

            {activo && (
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        Para desactivar la autenticación en dos pasos, ingresa un código actual de
                        tu app autenticadora o uno de tus códigos de recuperación.
                    </Typography>

                    <TextField
                        label="Código de app o recuperación"
                        value={codigoDesactivar}
                        onChange={(e) => setCodigoDesactivar(e.target.value)}
                        placeholder="123456 o ABCDE-12345"
                        fullWidth
                        helperText="Esta acción quitará la protección adicional de tu cuenta."
                    />

                    <Button
                        variant="outlined"
                        color="warning"
                        onClick={desactivar2FA}
                        disabled={loadingDesactivar}
                        startIcon={!loadingDesactivar && <LockOpenRounded />}
                    >
                        {loadingDesactivar ? (
                            <CircularProgress size={22} color="inherit" />
                        ) : (
                            "Desactivar autenticación en dos pasos"
                        )}
                    </Button>
                </Stack>
            )}

            {recoveryCodes.length > 0 && (
                <Alert severity="warning" sx={{ mt: 3 }}>
                    <Stack spacing={1.5}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Guarda tus códigos de recuperación
                        </Typography>

                        <Typography variant="body2">
                            Estos códigos solo se muestran una vez. Úsalos si pierdes acceso a tu
                            teléfono o a tu app autenticadora.
                        </Typography>

                        <Grid container spacing={1}>
                            {recoveryCodes.map((code) => (
                                <Grid item xs={12} sm={6} md={4} key={code}>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            px: 1.2,
                                            py: 0.8,
                                            fontFamily: "monospace",
                                            fontWeight: 700,
                                            textAlign: "center",
                                            bgcolor: "background.paper",
                                        }}
                                    >
                                        {code}
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>

                        <Button
                            variant="contained"
                            color="warning"
                            size="small"
                            startIcon={<ContentCopyRounded />}
                            onClick={copiarRecoveryCodes}
                            sx={{ alignSelf: "flex-start" }}
                        >
                            Copiar códigos
                        </Button>
                    </Stack>
                </Alert>
            )}

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={cerrarSnack}
                anchorOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
            >
                <Alert
                    onClose={cerrarSnack}
                    severity={snack.tipo}
                    sx={{ width: "100%" }}
                >
                    {snack.mensaje}
                </Alert>
            </Snackbar>
        </Box>
    );
}