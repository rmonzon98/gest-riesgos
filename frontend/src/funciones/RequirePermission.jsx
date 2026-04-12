/**
 * @fileoverview
 * Componente de orden superior (HOC) que protege rutas de la aplicación
 * verificando permisos de acceso ante el backend. Redirige al usuario al login
 * si no cuenta con autorización.
 *
 * @module funciones/RequirePermission
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { Box, CircularProgress, Typography } from "@mui/material";

/**
 * Calcula la posición de un substring dentro de otro.
 * @param {string} string - Cadena principal.
 * @param {string} subString - Subcadena a buscar.
 * @param {number} index - Índice de ocurrencia.
 * @returns {number} Posición de la ocurrencia en la cadena.
 */
function getPosition(string, subString, index) {
    return string.split(subString, index).join(subString).length;
}

/**
 * Componente que valida permisos de acceso antes de renderizar contenido.
 *
 * @component
 * @param {object} props
 * @param {string} props.app - Código del módulo o aplicación.
 * @param {React.ReactNode} props.children - Contenido a renderizar si el acceso es permitido.
 *
 * @description
 * - Verifica el token JWT guardado en `localStorage`.
 * - Consulta al backend (`/api/general/auth/puede-acceder`) para validar permisos.
 * - Redirige al login si el token no existe o la validación falla.
 * - Muestra un loader mientras verifica.
 */
const RequirePermission = ({ app, children }) => {
    const token = localStorage.getItem("token");
    const [state, setState] = useState({
        checking: true,
        allowed: false,
        error: null,
    });

    useEffect(() => {
        let mounted = true;

        const verificarPermiso = async () => {
            try {
                if (!token) {
                    if (mounted) setState({ checking: false, allowed: false, error: null });
                    return;
                }

                const { data } = await axios.get(`/api/general/auth/puede-acceder`, {
                    params: { app },
                    headers: { "x-access-token": token },
                });

                const permitido = !!data?.permitido;

                if (mounted) setState({ checking: false, allowed: permitido, error: null });

            } catch (e) {
                if (e.response.status == 401) {
                    localStorage.clear();
                    window.location = String(window.location.href).substring(0, getPosition(window.location.href, '/', 3));
                }
                if (mounted)
                    setState({
                        checking: false,
                        allowed: false,
                        error: e?.response?.data?.msg || e?.message || "Error de verificación",
                    });
            }
        };

        verificarPermiso();
        return () => {
            mounted = false;
        };
    }, [app, token]);

    if (!token) return <Navigate to="/" replace />;

    if (state.checking) {
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
                <Typography variant="body2">Validando permisos…</Typography>
            </Box>
        );
    }

    if (!state.allowed) return <Navigate to="/" replace />;

    return children;
};

export default RequirePermission;
