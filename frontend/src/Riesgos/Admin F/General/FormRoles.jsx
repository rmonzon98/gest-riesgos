/**
 * @fileoverview
 * Formulario modal para crear y editar roles generales del sistema.
 *
 * @module Riesgos/Admin F/General/FormRoles.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useState, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Grid, Autocomplete, Chip
} from "@mui/material";
import apiClient from "api/apiClient";

/**
 * Formulario modal controlado para crear o editar roles generales.
 *
 * @component
 */
function FormRoles({ showModal, id, onClose, onSuccess, onError, listaUrls }) {
    const [form, setForm] = useState({ nombre: "", urls: [] });

    /**
     * Efecto que, en modo edición, consulta los datos del rol y precarga
     * el nombre y las URLs asociadas.
     */
    useEffect(() => {
        if (id) {
            apiClient.get('/api/roles-actualizados/obtener-rol', {
                params: { id }
            })
                .then((response) => {
                    const { nombre, urls } = response.data;

                    const urlsAsignadas = listaUrls.filter((urlObj) =>
                        urls.some((u) => u.URL === urlObj.URL)
                    );

                    setForm({ nombre, urls: urlsAsignadas });
                })
                .catch((err) => {
                    console.error('Error al obtener rol:', err);
                    onError("No se pudo cargar la información del rol.");
                });
        } else {
            setForm({ nombre: "", urls: [] });
        }
    }, [id]);


    /**
     * Actualiza el nombre del rol conforme escribe el usuario.
     *
     * @param {React.ChangeEvent<HTMLInputElement>} e - Evento del campo de texto.
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    /**
     * Actualiza la lista de URLs seleccionadas para el rol.
     *
     * @param {React.SyntheticEvent} event - Evento del Autocomplete.
     * @param {Array} newValue - Nuevas URLs seleccionadas.
     */
    const handleUrlsChange = (event, newValue) => {
        setForm((prev) => ({ ...prev, urls: newValue }));
    };

    /**
     * Valida los datos del formulario y envía la definición de rol al backend.
     */
    const handleSubmit = async () => {
        if (!form.nombre || form.urls.length === 0) {
            onError("Debe ingresar un nombre y al menos una URL.");
            return;
        }

        const payload = {
            nombre: form.nombre,
            urls: form.urls.map(url => url.CODIGO_URL)
        };
        if (id) {
            payload.id = id
        }
        try {
            const method = id ? "put" : "post";
            const url = "/api/roles-actualizados";
            await apiClient({
                method,
                url,
                data: payload,
            });
            onSuccess();
        } catch (err) {
            console.error(err);
            onError("Error al guardar el rol.");
        }
    };

    /**
     * Restaura el formulario a su estado inicial y cierra el diálogo.
     */
    const handleClose = () => {
        setForm({ nombre: "", urls: [] });
        onClose();
    }

    return (
        <Dialog open={showModal} onClose={handleClose} maxWidth="lg" fullWidth>
            <DialogTitle>{id ? "Editar" : "Nuevo"} Rol</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} mt={1}>
                    <Grid item xs={12}>
                        <TextField
                            label="Nombre del rol"
                            name="nombre"
                            value={form.nombre}
                            onChange={handleChange}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Autocomplete
                            multiple
                            options={listaUrls}
                            getOptionLabel={(option) => option.NOMBRE}
                            value={form.urls}
                            onChange={handleUrlsChange}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        label={option.URL}
                                        {...getTagProps({ index })}
                                        key={option.CODIGO_URL}
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField {...params} label="URLs disponibles" placeholder="Selecciona URLs" />
                            )}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancelar</Button>
                <Button variant="contained" onClick={handleSubmit}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
}

export default FormRoles;
