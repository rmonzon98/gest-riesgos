import { useEffect, useState } from "react";
import axios from "axios";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid
} from "@mui/material";

function FormPeriodo({ showModal, id, onClose, onSuccess, onError }) {
    const [form, setForm] = useState({ codigo: "", inicio: "", final: "" });

    const obtenerUno = async () => {
        try {
            const res = await axios.get("/api/periodos-actualizados/obtener-periodo", {
                params: { codigo: id },
                headers: { "x-access-token": localStorage.getItem("token") }
            });
            const data = res.data.result?.[0];
            if (data) {
                setForm({
                    codigo: data.CODIGO_PERIODO,
                    inicio: data.PERIODO_INICIAL.split("T")[0],
                    final: data.PERIODO_FINAL.split("T")[0]
                });
            }
        } catch (err) {
            console.error("Error:", err);
            onError("Error al obtener el período");
        }
    };

    useEffect(() => {
        if (id) obtenerUno();
        else setForm({ codigo: "", inicio: "", final: "" });
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleSubmit = async () => {
        const { inicio, final } = form;

        if (!inicio || !final) {
            onError("Las fechas no pueden estar vacías.");
            return;
        }

        const dateInicio = new Date(`${inicio}T00:00:00`);
        const dateFinal = new Date(`${final}T00:00:00`);
        const yearInicio = dateInicio.getFullYear();
        const yearFinal = dateFinal.getFullYear();

        if (dateFinal < dateInicio) {
            onError("La fecha final no puede ser anterior a la fecha inicial.");
            return;
        }

        if (yearInicio !== yearFinal) {
            onError("Ambas fechas deben pertenecer al mismo año.");
            return;
        }

        const payload = {
            codigo: yearInicio,
            inicio,
            final
        };

        try {
            const method = id ? "put" : "post";
            const url = "/api/periodos-actualizados";
            await axios({
                method,
                url,
                data: payload,
                headers: { "x-access-token": localStorage.getItem("token") }
            });
            onSuccess();
        } catch (err) {
            console.error(err);
            onError("Error al guardar el período.");
        }
    };

    return (
        <Dialog open={showModal} onClose={onClose}>
            <DialogTitle>{id ? "Editar" : "Nuevo"} Período</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} mt={1}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Fecha inicial"
                            name="inicio"
                            type="date"
                            value={form.inicio}
                            onChange={handleChange}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            label="Fecha final"
                            name="final"
                            type="date"
                            value={form.final}
                            onChange={handleChange}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button variant="contained" onClick={handleSubmit}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
}

export default FormPeriodo;
