// src/.../Perfil.jsx
import React, { useState, useEffect } from "react";
import {
    Box,
    Card,
    CardHeader,
    CardContent,
    CircularProgress,
    Typography,
    Avatar,
    Grid,
    Tooltip,
    Stack,
    Divider,
    IconButton,
} from "@mui/material";

import { PersonRounded, EditRounded } from "@mui/icons-material";

import apiClient from "api/apiClient";
import CambiarContrasenaForm from "./CambiarContrasenaForm";
import Seguridad2FA from "./Seguridad2FA";
import ModificarSuperior from "./ModificarSuperior";

export default function Perfil() {
    const [user, setUser] = useState("");
    const [correo, setCorreo] = useState("");

    const [superiorInfo, setSuperiorInfo] = useState({
        nombreSuperior: "",
        puestoSuperior: "",
    });

    const [fotoUrl, setFotoUrl] = useState(null);
    const [fotoCargando, setFotoCargando] = useState(false);
    const [subiendoFoto, setSubiendoFoto] = useState(false);
    const [errorFoto, setErrorFoto] = useState("");

    const cargarDatos = async () => {
        try {
            const { data } = await apiClient.get(
                "/api/responsables-actualizados/obtener-superior-perfil"
            );

            const informacion = data.result?.[0]?.[0];

            if (informacion) {
                const nombreUsuario = [
                    informacion.PRIMER_NOMBRE,
                    informacion.SEGUNDO_NOMBRE,
                    informacion.TERCER_NOMBRE,
                    informacion.PRIMER_APELLIDO,
                    informacion.SEGUNDO_APELLIDO,
                    informacion.TERCER_APELLIDO,
                ]
                    .filter(Boolean)
                    .join(" ");

                setUser(nombreUsuario);
                setCorreo(informacion.CORREO_ELECTRONICO || "");
                setSuperiorInfo({
                    nombreSuperior: informacion.NOMBRE_SUPERIOR || "",
                    puestoSuperior: informacion.PUESTO_SUPERIOR || "",
                });
            }
        } catch (e) {
            console.error("No se pudieron cargar los datos del perfil:", e);
        }
    };

    const cargarFoto = async () => {
        try {
            setFotoCargando(true);
            setErrorFoto("");

            const resp = await apiClient.get("/descargar/obtener-foto-perfil");

            if (resp?.data?.foto) {
                setFotoUrl(resp.data.foto);
            } else {
                setFotoUrl(null);
            }
        } catch (e) {
            setFotoUrl(null);
        } finally {
            setFotoCargando(false);
        }
    };

    const handleCambiarFoto = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("foto-perfil", file);

        try {
            setSubiendoFoto(true);
            setErrorFoto("");

            await apiClient.put("/descargar/update-foto-perfil", formData);

            await cargarFoto();
        } catch (e) {
            console.error("No se pudo actualizar la foto de perfil:", e);
            setErrorFoto("No se pudo actualizar la foto de perfil.");
        } finally {
            setSubiendoFoto(false);
            event.target.value = "";
        }
    };

    useEffect(() => {
        cargarDatos();
        cargarFoto();
    }, []);

    const iniciales = (user || "U")
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const mostrandoLoading = fotoCargando || subiendoFoto;

    return (
        <Box
            sx={{
                px: { xs: 2, md: 4 },
                mt: 4,
                mb: 4,
                fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            }}
        >
            <Card
                variant="outlined"
                sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)',
                    overflow: 'visible',
                    background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)',
                }}
            >
                <Box
                    sx={{
                        height: 6,
                        borderRadius: '12px 12px 0 0',
                        background: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    }}
                />

                <CardHeader
                    sx={{
                        p: { xs: 3, md: 4 },
                        alignItems: 'flex-start',
                        '& .MuiCardHeader-content': { mt: 0.5 },
                    }}
                    avatar={
                        <Box sx={{ position: 'relative', display: 'inline-flex', mr: 1 }}>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: -3,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
                                    zIndex: 0,
                                }}
                            />
                            <Avatar
                                variant="circular"
                                src={fotoUrl || undefined}
                                sx={{
                                    width: 88,
                                    height: 88,
                                    fontSize: 30,
                                    fontWeight: 600,
                                    position: 'relative',
                                    zIndex: 1,
                                    border: '3px solid #fff',
                                    boxShadow: '0 4px 16px rgba(15,52,96,0.2)',
                                    bgcolor: '#1a1a2e',
                                    color: '#fff',
                                }}
                            >
                                {iniciales || <PersonRounded sx={{ fontSize: 44 }} />}
                            </Avatar>

                            {mostrandoLoading && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'rgba(0,0,0,0.55)',
                                        borderRadius: '50%',
                                        zIndex: 3,
                                    }}
                                >
                                    <CircularProgress size={28} sx={{ color: '#fff' }} />
                                </Box>
                            )}

                            <Tooltip title="Cambiar foto de perfil" placement="top">
                                <IconButton
                                    component="label"
                                    htmlFor="upload-foto-perfil"
                                    size="small"
                                    sx={{
                                        position: 'absolute',
                                        bottom: 2,
                                        right: 2,
                                        width: 28,
                                        height: 28,
                                        bgcolor: '#0f3460',
                                        color: '#fff',
                                        zIndex: 4,
                                        border: '2px solid #fff',
                                        boxShadow: '0 2px 8px rgba(15,52,96,0.35)',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: '#1a1a2e',
                                            transform: 'scale(1.1)',
                                        },
                                    }}
                                >
                                    <EditRounded sx={{ fontSize: 13 }} />
                                    <input
                                        id="upload-foto-perfil"
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={handleCambiarFoto}
                                    />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    }
                    title={
                        <Stack spacing={0.25}>
                            <Typography
                                variant="h5"
                                component="h2"
                                sx={{
                                    fontWeight: 700,
                                    fontSize: { xs: '1.25rem', md: '1.4rem' },
                                    color: '#0d1117',
                                    letterSpacing: '-0.3px',
                                    lineHeight: 1.3,
                                }}
                            >
                                {user || 'Usuario'}
                            </Typography>

                            <Stack direction="row" alignItems="center" spacing={0.75}>
                                <Box
                                    sx={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        bgcolor: '#22c55e',
                                        boxShadow: '0 0 0 2px rgba(34,197,94,0.25)',
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{ color: '#4b5563', fontWeight: 500, fontSize: '0.875rem' }}
                                >
                                    {correo || 'Perfil de usuario'}
                                </Typography>
                            </Stack>

                            <Typography
                                variant="caption"
                                sx={{
                                    color: '#9ca3af',
                                    fontSize: '0.72rem',
                                    letterSpacing: '0.01em',
                                }}
                            >
                                Haz clic en el ícono del lápiz para actualizar tu foto.
                            </Typography>
                        </Stack>
                    }
                />

                {errorFoto && (
                    <Box
                        sx={{
                            mx: { xs: 3, md: 4 },
                            mb: 2,
                            px: 2,
                            py: 1.25,
                            borderRadius: 1.5,
                            bgcolor: '#fff5f5',
                            border: '1px solid #fed7d7',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{ color: '#c53030', fontWeight: 500, fontSize: '0.8rem' }}
                        >
                            ⚠️ {errorFoto}
                        </Typography>
                    </Box>
                )}

                <Divider sx={{ borderColor: 'rgba(0,0,0,0.06)' }} />

                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Grid container spacing={3}>

                        {/* ── Columna Izquierda ── */}
                        <Grid item xs={12} md={6}>
                            <Stack spacing={2.5}>

                                {/* Superior */}
                                <Box
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        border: '1px solid rgba(0,0,0,0.07)',
                                        bgcolor: '#ffffff',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                        transition: 'box-shadow 0.2s',
                                        '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
                                    }}
                                >
                                    {/* Etiqueta de sección */}
                                    <Typography
                                        variant="overline"
                                        sx={{
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.12em',
                                            color: '#9ca3af',
                                            display: 'block',
                                            mb: 1.5,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Información de Reporte
                                    </Typography>
                                    <ModificarSuperior
                                        nombreSuperior={superiorInfo.nombreSuperior}
                                        puestoSuperior={superiorInfo.puestoSuperior}
                                        recargar={cargarDatos}
                                    />
                                </Box>

                                {/* Seguridad 2FA */}
                                <Box
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        border: '1px solid rgba(0,0,0,0.07)',
                                        bgcolor: '#ffffff',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                        transition: 'box-shadow 0.2s',
                                        '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
                                    }}
                                >
                                    <Typography
                                        variant="overline"
                                        sx={{
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.12em',
                                            color: '#9ca3af',
                                            display: 'block',
                                            mb: 1.5,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Seguridad
                                    </Typography>
                                    <Seguridad2FA />
                                </Box>
                            </Stack>
                        </Grid>

                        {/* ── Columna Derecha ── */}
                        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Box
                                sx={{
                                    p: 2.5,
                                    border: '1px solid rgba(0,0,0,0.07)',
                                    borderRadius: 2,
                                    bgcolor: '#ffffff',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                                    flex: 1,
                                    transition: 'box-shadow 0.2s',
                                    '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
                                }}
                            >
                                <Typography
                                    variant="overline"
                                    sx={{
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.12em',
                                        color: '#9ca3af',
                                        display: 'block',
                                        mb: 1.5,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Cambiar Contraseña
                                </Typography>
                                <CambiarContrasenaForm />
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
}