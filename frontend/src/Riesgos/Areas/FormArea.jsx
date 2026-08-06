/**
 * @fileoverview
 * Formulario modal para crear y editar áreas de trabajo del sistema.
 *
 * @module Riesgos/Areas/FormArea.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box
} from '@mui/material';
import apiClient from "api/apiClient";

/**
 * Formulario modal controlado para alta y edición de áreas.
 *
 * @component
 */
function FormArea({ showModal, id, onClose, onSuccess }) {
    const [descripcion, setDescripcion] = useState('');
    const [abreviatura, setAbreviatura] = useState('');

    const MAX_DESC = 250;
    const MAX_ABR = 20;

    // Cargar datos si es edición
    useEffect(() => {
        if (id && showModal) {
            apiClient.get(`/api/areas-actualizados/obtener-area`, {
                params: { area: parseInt(id) }
            }).then((res) => {
                const area = res.data.result[0];
                setDescripcion(area.DESCRIPCION || '');
                setAbreviatura(area.ABREVIATURA || '');
            }).catch(() => {
            });
        } else {
            setDescripcion('');
            setAbreviatura('');
        }
    }, [id, showModal]);

    /**
     * Valida los campos requeridos y envía los datos del área al backend.
     */
    const handleSubmit = async () => {
        const payload = {
            descripcion,
            abreviatura,

        };
        if (id) {
            payload.id = id
        }
        try {
            if (id) {
                await apiClient.put(`/api/areas-actualizados/`, payload);
            } else {
                await apiClient.post(`/api/areas-actualizados`, payload);
            }

            if (onSuccess) {
                onSuccess();
            } else {
                onClose();
            }
        } catch (err) {
            console.error('Error guardando área:', err);
        }
    };

    return (
        <Dialog open={showModal} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{id ? 'Editar área' : 'Nueva área'}</DialogTitle>
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

export default FormArea;
