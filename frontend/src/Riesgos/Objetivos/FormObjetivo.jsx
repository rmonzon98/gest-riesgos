import React, { useEffect, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Stack
} from "@mui/material";
import axios from "axios";

function FormObjetivo({ open, onClose, onSuccess, tipo, id }) {
    const [formData, setFormData] = useState({
        descripcion: "",
        abreviatura: ""
    });

    useEffect(() => {
        if (id) {
            const fetchData = async () => {
                try {
                    const res = await axios.get("/api/objetivos-actualizados/obtener-objetivo", {
                        params: { tipoObjetivo: tipo, id },
                        headers: { "x-access-token": localStorage.getItem("token") }
                    });

                    const objetivo = res.data?.result?.[0];
                    if (objetivo) {
                        setFormData({
                            descripcion: objetivo.DESCRIPCION || "",
                            abreviatura: objetivo.ABREVIATURA || ""
                        });
                    }
                } catch (error) {
                    console.error("Error al obtener objetivo:", error);
                }
            };
            fetchData();
        } else {
            setFormData({
                descripcion: "",
                abreviatura: ""
            });
        }
    }, [id, tipo]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        const payload = {
            tipo,
            descripcion: formData.descripcion,
            abreviatura: formData.abreviatura,
            ...(id && { id })
        };

        try {
            const endpoint = id
                ? "/api/objetivos-actualizados"
                : "/api/objetivos-actualizados";
            const method = id ? "put" : "post";

            await axios[method](endpoint, payload, {
                headers: { "x-access-token": localStorage.getItem("token") }
            });

            onSuccess();
        } catch (err) {
            console.error("Error al guardar objetivo:", err);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{id ? "Editar Objetivo" : "Nuevo Objetivo"}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} mt={1}>
                    <TextField
                        label="Descripción"
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleChange}
                        fullWidth
                        required
                    />
                    <TextField
                        label="Abreviatura"
                        name="abreviatura"
                        value={formData.abreviatura}
                        onChange={handleChange}
                        fullWidth
                        required
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default FormObjetivo;
