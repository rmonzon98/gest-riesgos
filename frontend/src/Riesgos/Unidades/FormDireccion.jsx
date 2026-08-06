import { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box
} from "@mui/material";
import apiClient from "api/apiClient";

function FormDireccion({ showModal, id, onClose, onSuccess, onError }) {
    const [descripcion, setDescripcion] = useState("");
    const [abreviatura, setAbreviatura] = useState("");

    const MAX_DESC = 200;
    const MAX_ABR = 10;

    useEffect(() => {
        const cargarDireccion = async () => {
            if (!id || !showModal) {
                setDescripcion("");
                setAbreviatura("");
                return;
            }

            try {
                const res = await apiClient.get("/api/direcciones-actualizados/obtener-direccion", {
                    params: { direccion: parseInt(id, 10) }
                });

                const data = res.data?.result?.[0] || {};
                setDescripcion(data.NOMBRE || "");
                setAbreviatura(data.SIGLAS || "");
            } catch (err) {
                console.error("Error al obtener dirección:", err);
                if (typeof onError === "function") onError();
            }
        };

        cargarDireccion();
    }, [id, showModal, onError]);

    const handleSubmit = async () => {
        const payload = {
            descripcion,
            abreviatura
        };

        if (id) payload.id = id;

        try {
            if (id) {
                await apiClient.put("/api/direcciones-actualizados", payload);
            } else {
                await apiClient.post("/api/direcciones-actualizados", payload);
            }

            if (typeof onSuccess === "function") {
                onSuccess();
            } else {
                onClose();
            }
        } catch (err) {
            console.error("Error guardando dirección:", err);
            if (typeof onError === "function") onError();
        }
    };

    return (
        <Dialog open={showModal} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{id ? "Editar dirección" : "Nueva dirección"}</DialogTitle>
            <DialogContent>
                <Box mt={2}>
                    <TextField
                        fullWidth
                        label="Descripción"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        inputProps={{ maxLength: MAX_DESC }}
                        helperText={`${descripcion.length}/${MAX_DESC} caracteres`}
                        margin="normal"
                        multiline
                    />

                    <TextField
                        fullWidth
                        label="Abreviatura"
                        value={abreviatura}
                        onChange={(e) => setAbreviatura(e.target.value)}
                        inputProps={{ maxLength: MAX_ABR }}
                        helperText={`${abreviatura.length}/${MAX_ABR} caracteres`}
                        margin="normal"
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

export default FormDireccion;
