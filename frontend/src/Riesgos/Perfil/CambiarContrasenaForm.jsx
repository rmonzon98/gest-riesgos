import React, { useState } from "react";
import { Box, TextField, Button, Stack, CircularProgress, Snackbar, Alert, Typography, Divider } from "@mui/material";
import LockRounded from "@mui/icons-material/LockRounded";
import axios from "axios";

export default function CambiarContrasenaForm() {
    const [form, setForm] = useState({
        actual: "",
        nueva: "",
        repetir: "",
    });
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        tipo: "success",
        mensaje: "",
    });

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const validar = () => {
        if (!form.actual || !form.nueva || !form.repetir)
            return "Por favor completa todos los campos.";
        if (form.nueva.length < 6)
            return "La nueva contraseña debe tener al menos 6 caracteres.";
        if (form.nueva !== form.repetir)
            return "Las contraseñas nuevas no coinciden.";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const error = validar();
        if (error) {
            setSnackbar({ open: true, tipo: "error", mensaje: error });
            return;
        }

        try {
            setLoading(true);
            const headers = { "x-access-token": localStorage.getItem("token") };

            const { data } = await axios.put(
                "/api/responsables-actualizados/actualizar-contrasena-perfil",
                {
                    vieja: form.actual,
                    nueva: form.nueva,
                },
                { headers }
            );

            if (data.ok) {
                setSnackbar({
                    open: true,
                    tipo: "success",
                    mensaje:
                        data.msg || "Contraseña actualizada correctamente.",
                });
                setForm({ actual: "", nueva: "", repetir: "" });
            } else {
                setSnackbar({
                    open: true,
                    tipo: "error",
                    mensaje:
                        data.msg ||
                        "No se pudo actualizar la contraseña.",
                });
            }
        } catch (err) {
            const msg =
                err.response?.data?.msg ||
                "Error al actualizar la contraseña. Intenta de nuevo.";
            setSnackbar({ open: true, tipo: "error", mensaje: msg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1 }}
            >
                Desde aquí puedes actualizar la
                contraseña de tu cuenta.
            </Typography>

            <Divider sx={{ mb: 2 }} />
            <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                    <TextField
                        type="password"
                        label="Contraseña actual"
                        name="actual"
                        value={form.actual}
                        onChange={handleChange}
                        fullWidth
                        required
                    />
                    <TextField
                        type="password"
                        label="Nueva contraseña"
                        name="nueva"
                        value={form.nueva}
                        onChange={handleChange}
                        fullWidth
                        required
                    />
                    <TextField
                        type="password"
                        label="Repetir nueva contraseña"
                        name="repetir"
                        value={form.repetir}
                        onChange={handleChange}
                        fullWidth
                        required
                        error={
                            Boolean(form.repetir) &&
                            form.nueva !== form.repetir
                        }
                        helperText={
                            form.repetir && form.nueva !== form.repetir
                                ? "Las contraseñas no coinciden."
                                : ""
                        }
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={loading}
                        startIcon={!loading && <LockRounded />}
                    >
                        {loading ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : (
                            "Actualizar contraseña"
                        )}
                    </Button>
                </Stack>
            </Box>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() =>
                    setSnackbar((s) => ({ ...s, open: false }))
                }
                anchorOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
            >
                <Alert
                    onClose={() =>
                        setSnackbar((s) => ({ ...s, open: false }))
                    }
                    severity={snackbar.tipo}
                    sx={{ width: "100%" }}
                >
                    {snackbar.mensaje}
                </Alert>
            </Snackbar>
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 2, textAlign: "center" }}
            >
                Por seguridad, usa una contraseña
                única y difícil de adivinar.
            </Typography>
        </>
    );
}
