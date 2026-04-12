/**
 * @fileoverview 
 * Pantalla de recuperación de contraseña del sistema de Gestión de Riesgos.
 * Permite solicitar una contraseña temporal enviándola al correo del usuario.
 *
 * @module RecuperarContra/PasswordRecovery
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useState } from "react";
import {
    Box, Container, Card, CardHeader, CardContent, TextField, Typography, Button, Alert, Stack, CircularProgress,
} from "@mui/material";
import LockResetRounded from "@mui/icons-material/LockResetRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * PasswordRecovery: Componente de UI para recuperar el acceso.
 *
 * - Valida un correo de entrada.
 * - Llama al backend para generar una contraseña temporal.
 * - Muestra mensajes de éxito/error y ofrece volver al login.
 *
 * @component
 * @param {object} props
 * @param {() => void} [props.onBack]     Callback para regresar a la pantalla anterior.
 * @param {string}   [props.initialEmail] Correo inicial a precargar en el formulario.
 * @returns {JSX.Element}
 */
export default function PasswordRecovery({ onBack, initialEmail = "" }) {
    const navigate = useNavigate();

    const [email, setEmail] = useState(initialEmail);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

  /**
   * Maneja el envío del formulario:
   * - Limpia mensajes previos.
   * - Valida el correo.
   * - Invoca el endpoint y muestra feedback según respuesta.
   * - Garantiza liberar el estado de carga en finally.
   *
   * @param {React.FormEvent<HTMLFormElement>} e
   * @returns {Promise<void>}
   */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMsg("");
        setErrorMsg("");

        const isValid = /.+@.+\..+/.test(email);
        if (!isValid) {
            setErrorMsg("Ingresa un correo válido.");
            return;
        }

        try {
            setLoading(true);

            const { data } = await axios.put(
                "/api/responsables-actualizados/actualizar-contrasena",
                { correo: email }
            );

            setSuccessMsg(
                data?.message ||
                "Generamos una contraseña temporal y la enviamos a tu correo. Inicia sesión y cámbiala de inmediato."
            );
        } catch (err) {
            setErrorMsg(
                err?.response?.data?.message ||
                "No se pudo generar la contraseña temporal. Inténtalo de nuevo."
            );
        } finally {
            setLoading(false);
        }
    };

  /**
   * Regresa a la vista anterior o, si no se provee `onBack`, redirige al inicio.
   */
    const handleBack = () => {
        if (typeof onBack === "function") onBack();
        else navigate("/");
    };

  // Render principal (layout centrado, encabezado, formulario y acciones)
    return (
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
            <Container maxWidth="sm">
                <Stack spacing={3} alignItems="center" sx={{ mb: 2 }}>
                    <Box
                        sx={{
                            display: "inline-flex",
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: (t) => t.palette.primary.main + "20",
                            color: "primary.main",
                        }}
                    >
                        <LockResetRounded fontSize="large" />
                    </Box>
                    <Box textAlign="center">
                        <Typography variant="h4" fontWeight={800}>
                            ¿Olvidaste tu contraseña?
                        </Typography>
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                            Generaremos una <strong>contraseña temporal</strong> y te la enviaremos por correo.
                        </Typography>
                    </Box>
                </Stack>

                <Card variant="outlined">
                    <CardHeader
                        sx={{ pb: 0 }}
                        titleTypographyProps={{ variant: "h6" }}
                        title="Recuperar acceso"
                    />
                    <CardContent>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Por seguridad, la contraseña anterior quedará inválida. Cámbiala inmediatamente después de iniciar sesión.
                        </Alert>

                        <Stack component="form" onSubmit={handleSubmit} spacing={2} noValidate>
                            <TextField
                                id="email"
                                label="Correo electrónico"
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                error={!!errorMsg}
                                helperText={errorMsg || ""}
                                disabled={loading}
                                fullWidth
                            />

                            {successMsg && (
                                <Alert severity="success" variant="outlined">
                                    {successMsg}
                                </Alert>
                            )}

                            <Button type="submit" variant="contained" size="large" disabled={loading}>
                                {loading ? (
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <CircularProgress size={20} />
                                        <span>Generando…</span>
                                    </Stack>
                                ) : (
                                    "Generar contraseña temporal"
                                )}
                            </Button>

                            <Typography variant="caption" color="text.secondary" textAlign="center">
                                Si no ves el correo, revisa tu carpeta de spam.
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>

                <Stack alignItems="center" sx={{ mt: 2 }}>
                    <Button
                        type="button"
                        color="primary"
                        onClick={handleBack}
                        startIcon={<ArrowBackRounded />}
                    >
                        Volver a iniciar sesión
                    </Button>
                </Stack>
            </Container>
        </Box>
    );
}
