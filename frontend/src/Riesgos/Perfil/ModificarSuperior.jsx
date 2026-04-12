import React, { useState, useEffect } from "react";
import {
    Box,
    Stack,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Snackbar,
    Alert,
    Divider,
} from "@mui/material";
import EditRounded from "@mui/icons-material/EditRounded";
import SaveRounded from "@mui/icons-material/SaveRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import axios from "axios";

export default function ModificarSuperior({
    nombreSuperior = "",
    puestoSuperior = "",
    recargar
}) {
    const [editando, setEditando] = useState(false);
    const [nombre, setNombre] = useState(nombreSuperior || "");
    const [puesto, setPuesto] = useState(puestoSuperior || "");
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({
        open: false,
        tipo: "info",
        mensaje: "",
    });

    // Si cambian las props desde el padre (ej. después de un refetch), actualizamos el formulario
    useEffect(() => {
        setNombre(nombreSuperior || "");
        setPuesto(puestoSuperior || "");
    }, [nombreSuperior, puestoSuperior]);

    const handleCancelar = () => {
        setEditando(false);
        setNombre(nombreSuperior || "");
        setPuesto(puestoSuperior || "");
    };

    const handleGuardar = async () => {
        if (!nombre.trim() || !puesto.trim()) {
            setSnack({
                open: true,
                tipo: "error",
                mensaje: "Completa nombre y puesto del superior.",
            });
            return;
        }

        try {
            setSaving(true);
            const headers = {
                "x-access-token": localStorage.getItem("token"),
            };

            const { data } = await axios.put(
                "/api/responsables-actualizados/actualizar-superior",
                {
                    nombre_superior: nombre.trim(),
                    puesto_superior: puesto.trim(),
                },
                { headers }
            );

            if (data?.ok) {
                setSnack({
                    open: true,
                    tipo: "success",
                    mensaje:
                        data.msg ||
                        "Información del superior actualizada correctamente.",
                });
                setEditando(false);
                recargar()
            } else {
                setSnack({
                    open: true,
                    tipo: "error",
                    mensaje:
                        data?.msg ||
                        "No se pudo actualizar la información del superior.",
                });
            }
        } catch (err) {
            const msg =
                err.response?.data?.msg ||
                "Error al actualizar la información del superior.";
            setSnack({ open: true, tipo: "error", mensaje: msg });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box>
            <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1 }}
            >
                Relación de supervisión
            </Typography>

            <Divider sx={{ mb: 1.5 }} />

            {/* Info del superior */}
            {!editando ? (
                <Stack spacing={0.6}>
                    <Typography variant="body2">
                        <strong>Superior actual:</strong>{" "}
                        {nombreSuperior
                            ? nombreSuperior
                            : "No registrado"}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Puesto:</strong>{" "}
                        {puestoSuperior
                            ? puestoSuperior
                            : "No registrado"}
                    </Typography>

                    <Box sx={{ mt: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditRounded />}
                            onClick={() => setEditando(true)}
                        >
                            Editar
                        </Button>
                    </Box>
                </Stack>
            ) : (
                <Stack spacing={1.2}>
                    <TextField
                        label="Nombre del superior"
                        value={nombre}
                        onChange={(e) =>
                            setNombre(e.target.value)
                        }
                        size="small"
                        fullWidth
                    />
                    <TextField
                        label="Puesto del superior"
                        value={puesto}
                        onChange={(e) =>
                            setPuesto(e.target.value)
                        }
                        size="small"
                        fullWidth
                    />
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ mt: 0.5 }}
                    >
                        <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={
                                !saving && <SaveRounded />
                            }
                            onClick={handleGuardar}
                            disabled={saving}
                        >
                            {saving ? (
                                <CircularProgress
                                    size={18}
                                    color="inherit"
                                />
                            ) : (
                                "Guardar"
                            )}
                        </Button>
                        <Button
                            variant="text"
                            color="inherit"
                            size="small"
                            startIcon={<CloseRounded />}
                            onClick={handleCancelar}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                    </Stack>
                </Stack>
            )}

            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() =>
                    setSnack((s) => ({ ...s, open: false }))
                }
                anchorOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
            >
                <Alert
                    onClose={() =>
                        setSnack((s) => ({ ...s, open: false }))
                    }
                    severity={snack.tipo}
                    sx={{ width: "100%" }}
                >
                    {snack.mensaje}
                </Alert>
            </Snackbar>
        </Box>
    );
}
