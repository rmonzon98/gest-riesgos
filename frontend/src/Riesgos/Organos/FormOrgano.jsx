import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
} from "@mui/material";
import axios from "axios";

const headers = () => ({ "x-access-token": localStorage.getItem("token") });

/**
 * FormOrgano
 * Props:
 * - showModal: boolean
 * - codigoOrgano?: number  (si viene, es edición)
 * - onClose: () => void
 * - onSuccess?: () => void
 * - onError?: () => void
 */
export default function FormOrgano({
    showModal,
    codigoOrgano,
    onClose,
    onSuccess,
    onError,
}) {
    const [nombre, setNombre] = useState("");
    const MAX_NOMBRE = 100;

    // Cargar datos en edición
    useEffect(() => {
        if (showModal && codigoOrgano) {
            axios
                .get("/api/organos/obtener-organo", {
                    headers: headers(),
                    params: { codigo_organo: Number(codigoOrgano) },
                })
                .then(({ data }) => {
                    const org = data?.organo || data?.result?.[0] || {};
                    setNombre(org.NOMBRE || "");
                })
                .catch((e) => {
                    console.error("Error cargando órgano:", e);
                    onError && onError();
                });
        } else if (showModal) {
            // Nuevo
            setNombre("");
        }
    }, [showModal, codigoOrgano]);

    const handleSubmit = async () => {
        try {
            if (!nombre.trim()) {
                return onError
                    ? onError()
                    : console.warn("El nombre es requerido.");
            }

            if (codigoOrgano) {
                // Update
                await axios.put(
                    "/api/organos",
                    { codigo_organo: Number(codigoOrgano), nombre: nombre.trim() },
                    { headers: headers() }
                );
            } else {
                // Create
                await axios.post(
                    "/api/organos",
                    { nombre: nombre.trim() },
                    { headers: headers() }
                );
            }

            if (onSuccess) onSuccess();
            else onClose();
        } catch (e) {
            console.error("Error guardando órgano:", e);
            onError && onError();
        }
    };

    return (
        <Dialog open={!!showModal} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{codigoOrgano ? "Editar órgano" : "Nuevo órgano"}</DialogTitle>
            <DialogContent>
                <Box mt={2}>
                    <TextField
                        fullWidth
                        label="Nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        inputProps={{ maxLength: MAX_NOMBRE }}
                        helperText={`${nombre.length}/${MAX_NOMBRE} caracteres`}
                        margin="normal"
                        autoFocus
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Cancelar
                </Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
