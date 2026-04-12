/**
 * @fileoverview
 * Formulario modal para alta y edición de colaboradores generales.
 *
 * @module Riesgos/Admin F/General/FormResponsable.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Grid, MenuItem,
    Divider,
    Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import axios from "axios";
import { apiErrorMessage } from "funciones/errors";

/**
 * Formulario modal controlado para gestionar colaboradores generales.
 *
 * Decide entre modo creación o edición en función de la prop `colaborador`.
 *
 * @component
 */
function FormResponsable({ showModal, onClose, onSuccess, onError, colaborador, entidades, mostrarTemporalmente }) {
    const [formData, setFormData] = useState({
        primer_nombre: "",
        segundo_nombre: "",
        tercer_nombre: "",
        primer_apellido: "",
        segundo_apellido: "",
        tercer_apellido: "",
        correo: "",
        codigo_entidad: "",
        nombre_superior: "",
        puesto_superior: "",
    });

    /**
     * Carga los datos de un colaborador desde el backend cuando se está en modo edición.
     */
    const fetchResponsable = async () => {
        try {
            const res = await axios.get("/api/responsables-actualizados/obtener-responsable", {
                headers: { "x-access-token": localStorage.getItem("token") },
                params: { codigo: colaborador }
            });

            const responsable = res.data.data;

            if (responsable) {
                setFormData({
                    primer_nombre: responsable.PRIMER_NOMBRE || "",
                    segundo_nombre: responsable.SEGUNDO_NOMBRE || "",
                    tercer_nombre: responsable.TERCER_NOMBRE || "",
                    primer_apellido: responsable.PRIMER_APELLIDO || "",
                    segundo_apellido: responsable.SEGUNDO_APELLIDO || "",
                    tercer_apellido: responsable.TERCER_APELLIDO || "",
                    correo: responsable.CORREO_ELECTRONICO || "",
                    codigo_entidad: responsable.CODIGO_ENTIDAD || "",
                    codigo_colaborador: colaborador || '',
                    nombre_superior: responsable.NOMBRE_SUPERIOR || '',
                    puesto_superior: responsable.PUESTO_SUPERIOR || '',
                });
            }
        } catch (error) {
            onError("Error al cargar el responsable");
        }
    };

    useEffect(() => {
        if (showModal && colaborador) {
            fetchResponsable();
        }
    }, [showModal]);

    /**
     * Actualiza el estado del formulario al cambiar cualquier campo de texto.
     *
     * @param {React.ChangeEvent<HTMLInputElement>} e - Evento de cambio del input.
     */
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    /**
     * Limpia los campos del formulario y cierra el diálogo.
     */
    const clear = () => {
        setFormData({
            primer_nombre: "",
            segundo_nombre: "",
            tercer_nombre: "",
            primer_apellido: "",
            segundo_apellido: "",
            tercer_apellido: "",
            correo: "",
            codigo_entidad: "",
            nombre_superior: "",
            puesto_superior: "",
        })
        onClose()
    }

    const handleSubmit = async () => {
        const camposObligatorios = [
            { nombre: "primer_nombre", etiqueta: "Primer nombre" },
            { nombre: "primer_apellido", etiqueta: "Primer apellido" },
            { nombre: "correo", etiqueta: "Correo electrónico" },
            { nombre: "codigo_entidad", etiqueta: "Unidad" },
        ];
        for (let campo of camposObligatorios) {
            if (!formData[campo.nombre] || formData[campo.nombre].toString().trim() === "") {
                onError(`El campo '${campo.etiqueta}' es obligatorio`);
                return;
            }
        }
        try {
            const endpoint = "/api/responsables-actualizados";
            const method = colaborador ? "put" : "post";
            const result = await axios[method](endpoint, formData, {
                headers: { "x-access-token": localStorage.getItem("token") }
            });
            if (result.data.contra) {
                mostrarTemporalmente(result.data.contra)
            }
            onSuccess();
            clear();
        } catch (err) {
            console.error(err);
            onError?.(apiErrorMessage(err));
        }
    };

    return (
        <Dialog open={showModal} onClose={clear} maxWidth="md" fullWidth>
            <DialogTitle>{colaborador ? "Editar colaborador" : "Nuevo colaborador"}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    {/* Nombres */}
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Primer nombre" name="primer_nombre" value={formData.primer_nombre} onChange={handleChange} inputProps={{ maxLength: 50 }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Segundo nombre" name="segundo_nombre" value={formData.segundo_nombre} onChange={handleChange} inputProps={{ maxLength: 50 }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Tercer nombre" name="tercer_nombre" value={formData.tercer_nombre} onChange={handleChange} inputProps={{ maxLength: 50 }} />
                    </Grid>

                    {/* Apellidos */}
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Primer apellido" name="primer_apellido" value={formData.primer_apellido} onChange={handleChange} inputProps={{ maxLength: 50 }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Segundo apellido" name="segundo_apellido" value={formData.segundo_apellido} onChange={handleChange} inputProps={{ maxLength: 50 }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Tercer apellido" name="tercer_apellido" value={formData.tercer_apellido} onChange={handleChange} inputProps={{ maxLength: 50 }} />
                    </Grid>

                    {/* Correo */}
                    <Grid item xs={12}>
                        <TextField disabled={colaborador} fullWidth label="Correo electrónico" name="correo" type="email" value={formData.correo} onChange={handleChange} />
                    </Grid>

                    {/* Unidad */}
                    <Grid item xs={12} sm={6}>
                        <TextField
                            select fullWidth label="Unidad"
                            name="codigo_entidad"
                            value={formData.codigo_entidad}
                            onChange={handleChange}
                        >
                            {entidades.map(entidad => (
                                <MenuItem key={entidad.CODIGO_ENTIDAD} value={entidad.CODIGO_ENTIDAD}>
                                    {entidad.SIGLAS} - {entidad.NOMBRE}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={12}>
                        <Divider />
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="subtitle" sx={{ mt: 2 }}>
                            Superior
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Nombre de superior" name="nombre_superior" value={formData.nombre_superior} onChange={handleChange} inputProps={{ maxLength: 100 }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Puesto de superior" name="puesto_superior" value={formData.puesto_superior} onChange={handleChange} inputProps={{ maxLength: 100 }} />
                    </Grid>

                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={clear}>Cancelar</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">
                    {colaborador ? "Guardar cambios" : "Crear"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default FormResponsable;
