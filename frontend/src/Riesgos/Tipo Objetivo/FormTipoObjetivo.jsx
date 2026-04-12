import { useState, useEffect } from "react";
import axios from "axios";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button
} from "@mui/material";

function FormTipoObjetivo({ showModal, id, onClose, onSuccess, onError }) {
    const [form, setForm] = useState({ codigo: "", descripcion: "" });

    const obtenerUno = async () => {
        try {
            const res = await axios.get("/api/tipo-objetivo-actualizados/obtener-tipo", {
                params: { codigo: id },
                headers: { "x-access-token": localStorage.getItem("token") }
            });
            const data = res.data.result?.[0];
            if (data) {
                setForm({
                    codigo: data.CODIGO_TIPO_OBJETIVO,
                    descripcion: data.DESCRIPCION
                });
            }
        } catch (err) {
            console.error("Error:", err);
        }
    };

    useEffect(() => {
        if (id) obtenerUno();
        else setForm({ codigo: "", descripcion: "" });
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "codigo" && value.length > 3) return;
        if (name === "descripcion" && value.length > 200) return;

        setForm({ ...form, [name]: value });
    };

    const handleSubmit = async () => {
        try {
            const endpoint = id
                ? "/api/tipo-objetivo-actualizados"
                : "/api/tipo-objetivo-actualizados";
            const payload = { ...form };
            const method = id ? "put" : "post";
            await axios({
                method,
                url: endpoint,
                data: payload,
                headers: {
                    "x-access-token": localStorage.getItem("token")
                }
            });
            onSuccess();
        } catch (err) {
            onError()
            console.error("Error:", err);
        }
    };

    return (
        <Dialog open={showModal} onClose={onClose}>
            <DialogTitle>{id ? "Editar" : "Nuevo"} Tipo de Objetivo</DialogTitle>
            <DialogContent>
                <TextField
                    margin="dense"
                    name="codigo"
                    label="Código"
                    value={form.codigo}
                    onChange={handleChange}
                    fullWidth
                    disabled={!!id}
                    helperText="Máximo 3 caracteres"
                    inputProps={{ maxLength: 3 }}
                />
                <TextField
                    margin="dense"
                    name="descripcion"
                    label="Descripción"
                    value={form.descripcion}
                    onChange={handleChange}
                    fullWidth
                    helperText="Máximo 200 caracteres"
                    inputProps={{ maxLength: 200 }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={handleSubmit}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
}

export default FormTipoObjetivo;
