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
} from "@mui/material";
import PersonRounded from "@mui/icons-material/PersonRounded";
import axios from "axios";
import CambiarContrasenaForm from "./CambiarContrasenaForm";
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
        const headers = { "x-access-token": localStorage.getItem("token") };

        try {
            const { data } = await axios.get(
                "/api/responsables-actualizados/obtener-superior-perfil",
                { headers }
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
            // Si falla, dejamos los datos como están
        }
    };

    const cargarFoto = async () => {
        const headers = { "x-access-token": localStorage.getItem("token") };

        try {
            setFotoCargando(true);
            setErrorFoto("");

            // Ya NO pedimos blob, viene como JSON:
            const resp = await axios.get("/descargar/obtener-foto-perfil", {
                headers,
            });

            if (resp?.data?.foto) {
                // resp.data.foto es algo como: "data:image/jpeg;base64,...."
                setFotoUrl(resp.data.foto);
            } else {
                setFotoUrl(null);
            }
        } catch (e) {
            // Si no hay foto o falla, usamos solo iniciales
            setFotoUrl(null);
        } finally {
            setFotoCargando(false);
        }
    };

    const handleCambiarFoto = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const headers = {
            "x-access-token": localStorage.getItem("token"),
            "Content-Type": "multipart/form-data",
        };

        const formData = new FormData();
        // 🔴 Debe coincidir con upload.single('foto-perfil')
        formData.append("foto-perfil", file);

        try {
            setSubiendoFoto(true);
            setErrorFoto("");
            await axios.put("/descargar/update-foto-perfil", formData, {
                headers,
            });

            // Recargar la foto desde el backend (que ya la devolverá en base64 si quieres)
            await cargarFoto();
        } catch (e) {
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
        <Box sx={{ px: 2, mt: 6 }}>
            <Card variant="outlined">
                <CardHeader
                    avatar={
                        <Box sx={{ position: "relative", display: "inline-flex" }}>
                            <Avatar
                                variant="circular"
                                src={fotoUrl || undefined}
                                sx={{
                                    width: 96,
                                    height: 96,
                                    fontSize: 32,
                                }}
                            >
                                {iniciales || <PersonRounded />}
                            </Avatar>

                            {mostrandoLoading && (
                                <Box
                                    sx={{
                                        position: "absolute",
                                        inset: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        bgcolor: "rgba(0,0,0,0.4)",
                                        borderRadius: "50%",
                                    }}
                                >
                                    <CircularProgress size={36} />
                                </Box>
                            )}

                            <Tooltip title="Cambiar foto de perfil">
                                <label
                                    htmlFor="upload-foto-perfil"
                                    style={{ cursor: "pointer" }}
                                >
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            bottom: 0,
                                            right: 0,
                                            width: 30,
                                            height: 30,
                                            borderRadius: "50%",
                                            bgcolor: "primary.main",
                                            color: "primary.contrastText",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            boxShadow: 2,
                                            fontSize: 16,
                                            zIndex: 2,
                                        }}
                                    >
                                        ✎
                                    </Box>
                                </label>
                            </Tooltip>

                            <input
                                id="upload-foto-perfil"
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={handleCambiarFoto}
                            />
                        </Box>
                    }
                    title={user || "Usuario"}
                    subheader={
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                {correo || "Perfil de usuario"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Haz clic en el icono para cambiar tu foto.
                            </Typography>
                        </Box>
                    }
                />

                {errorFoto && (
                    <Box sx={{ px: 2, pb: 1 }}>
                        <Typography variant="caption" color="error">
                            {errorFoto}
                        </Typography>
                    </Box>
                )}

                <CardContent>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <ModificarSuperior
                                nombreSuperior={superiorInfo.nombreSuperior}
                                puestoSuperior={superiorInfo.puestoSuperior}
                                recargar={cargarDatos}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <CambiarContrasenaForm />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
}
