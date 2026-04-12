/**
 * @fileoverview
 * Formulario para consultar y actualizar el nombre, tipo y correo de soporte de la institución.
 *
 * @module Riesgos/Admin F/General/GeneralDetalle.jsx
 * @version 1.1
 * @author Equipo de Desarrollo
 */

import { useState, useEffect } from "react";
import {
    Stack,
    Box,
    Button,
    Card,
    CardHeader,
    CardContent,
    TextField,
    Snackbar,
    Alert,
} from "@mui/material";
import axios from "axios";

/**
 * Formulario controlado para editar nombre, tipo e información de contacto de la institución.
 *
 * @component
 */
function GeneralDetalle() {

    const [nombre, setNombre] = useState("");
    const [tipo, setTipo] = useState("");
    const [correoSoporte, setCorreoSoporte] = useState("");
    const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });

    /**
     * Envía la actualización de la información general al backend.
     *
     * Valida que todos los campos estén completos antes de llamar al servicio.
     */
    const handleSubmit = async () => {

        if (!tipo || !nombre || !correoSoporte) {
            setSnack({
                open: true,
                severity: "warning",
                message: "Llene todos los campos",
            });
        } else {
            try {
                await axios.put(
                    "/api/administracion-actualizados/general",
                    { nombre, tipo, correo: correoSoporte },
                    {
                        headers: {
                            "x-access-token": localStorage.getItem("token"),
                        },
                    }
                );
                setSnack({
                    open: true,
                    severity: "success",
                    message: "Información actualizada correctamente",
                });
            } catch (e) {
                setSnack({
                    open: true,
                    severity: "error",
                    message: "Error al actualizar la información general.",
                });
            }
        }
    };

    /**
     * Carga desde el backend los valores actuales de nombre, tipo y correo de soporte.
     */
    const obtenerGeneral = async () => {
        try {
            const resp = await axios.get("/api/administracion-actualizados/general", {
                headers: { "x-access-token": localStorage.getItem("token") },
            });
            const data = resp.data.result[0];
            setNombre(data.NOMBRE || "");
            setTipo(data.TIPO || "");
            setCorreoSoporte(data.CORREO_SOPORTE || "");
        } catch (e) {
            setSnack({
                open: true,
                severity: "error",
                message: "No se pudo cargar la información general.",
            });
        }
    };

    useEffect(() => {
        obtenerGeneral();
    }, []);

    return (
        <>
            <Card variant="outlined">
                <CardHeader title="Información general" />
                <CardContent>
                    <Stack spacing={2}>
                        <TextField
                            label="Nombre de la institución"
                            variant="outlined"
                            fullWidth
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                        />
                        <TextField
                            label="Tipo"
                            variant="outlined"
                            fullWidth
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                        />
                        <TextField
                            label="Correo de soporte"
                            variant="outlined"
                            fullWidth
                            type="email"
                            value={correoSoporte}
                            onChange={(e) => setCorreoSoporte(e.target.value)}
                        />
                        <Box>
                            <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={handleSubmit}
                            >
                                Actualizar
                            </Button>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setSnack((s) => ({ ...s, open: false }))}
                    severity={snack.severity}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </>
    );
}

export default GeneralDetalle;
