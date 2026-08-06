/**
 * @fileoverview
 * Componente de orden superior que protege rutas de la aplicación
 * verificando permisos de acceso contra el backend.
 *
 * Esta versión trabaja con el flujo nuevo de autenticación:
 *
 * - No lee token desde localStorage.
 * - Usa cookies HTTP-only administradas por el backend.
 * - Usa apiClient para solicitudes centralizadas.
 * - Usa AuthContext para conocer la sesión actual.
 * - Ejecuta logout centralizado si el backend responde 401.
 *
 * @module funciones/RequirePermission
 * @version 2.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Box, CircularProgress, Typography, Button, Paper } from "@mui/material";

import apiClient from "../api/apiClient";
import { useAuth } from "../context/AuthContext";

/**
 * Loader visual para indicar que se está validando la sesión o los permisos.
 *
 * @component
 * @param {object} props
 * @param {string} props.texto Texto mostrado debajo del loader.
 * @returns {JSX.Element}
 */
function LoadingPermisos({ texto = "Validando permisos…" }) {
    return (
        <Box
            sx={{
                minHeight: "60vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                flexDirection: "column",
            }}
        >
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
                {texto}
            </Typography>
        </Box>
    );
}

/**
 * Pantalla mostrada cuando el usuario está autenticado,
 * pero no tiene permiso para acceder al módulo solicitado.
 *
 * Se evita redirigir automáticamente al login porque, si el usuario sigue
 * autenticado, podría generarse un ciclo de redirección.
 *
 * @component
 * @returns {JSX.Element}
 */
function SinPermiso() {
    return (
        <Box
            sx={{
                minHeight: "60vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                px: 2,
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    p: 4,
                    maxWidth: 480,
                    width: "100%",
                    textAlign: "center",
                    borderRadius: 3,
                }}
            >
                <Typography variant="h6" fontWeight={700} gutterBottom>
                    Acceso no autorizado
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Tu usuario no tiene permiso para acceder a este módulo.
                </Typography>

                <Button
                    variant="contained"
                    onClick={() => {
                        window.location.href = "/";
                    }}
                >
                    Volver al inicio
                </Button>
            </Paper>
        </Box>
    );
}

/**
 * RequirePermission
 *
 * Valida si el usuario autenticado puede acceder a una aplicación o módulo.
 *
 * Flujo:
 *
 * 1. Espera a que AuthContext termine de validar la sesión.
 * 2. Si no hay sesión activa, redirige al login.
 * 3. Consulta `/api/general/auth/puede-acceder`.
 * 4. Si el backend permite el acceso, renderiza `children`.
 * 5. Si no tiene permiso, muestra pantalla de acceso no autorizado.
 * 6. Si recibe 401, ejecuta logout centralizado.
 *
 * @component
 * @param {object} props
 * @param {string} props.app Código del módulo o aplicación.
 * @param {React.ReactNode} props.children Contenido a renderizar si el acceso es permitido.
 * @returns {JSX.Element}
 */
const RequirePermission = ({ app, children }) => {
    const { autenticado, authLoading, logout } = useAuth();

    const [state, setState] = useState({
        checking: true,
        allowed: false,
        error: null,
    });

    useEffect(() => {
        let mounted = true;

        const verificarPermiso = async () => {
            if (authLoading) return;

            if (!autenticado) {
                if (mounted) {
                    setState({
                        checking: false,
                        allowed: false,
                        error: null,
                    });
                }

                return;
            }

            try {
                if (mounted) {
                    setState({
                        checking: true,
                        allowed: false,
                        error: null,
                    });
                }

                const { data } = await apiClient.get("/api/general/auth/puede-acceder", {
                    params: { app },
                });

                const permitido = Boolean(data?.permitido);

                if (mounted) {
                    setState({
                        checking: false,
                        allowed: permitido,
                        error: null,
                    });
                }
            } catch (err) {
                const status = err?.response?.status;

                if (status === 401) {
                    await logout();

                    if (mounted) {
                        setState({
                            checking: false,
                            allowed: false,
                            error: null,
                        });
                    }

                    return;
                }

                if (mounted) {
                    setState({
                        checking: false,
                        allowed: false,
                        error:
                            err?.response?.data?.msg ||
                            err?.response?.data?.message ||
                            err?.message ||
                            "Error de verificación",
                    });
                }
            }
        };

        verificarPermiso();

        return () => {
            mounted = false;
        };
    }, [app, autenticado, authLoading, logout]);

    if (authLoading) {
        return <LoadingPermisos texto="Validando sesión…" />;
    }

    if (!autenticado) {
        return <Navigate to="/" replace />;
    }

    if (state.checking) {
        return <LoadingPermisos texto="Validando permisos…" />;
    }

    if (!state.allowed) {
        return <SinPermiso error={state.error} />;
    }

    return children;
};

export default RequirePermission;