/**
 * @fileoverview 
 * Módulo del sistema de Gestión de Riesgos para el manejo de Alertas del sistema.
 *
 * @module Riesgos/Alerta F/AlertaMensaje.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React from 'react';
import { Alert, Snackbar } from '@mui/material';

/**
 * AlertaMensaje
 *
 * Componente principal del módulo.
 *
 * - Orquesta su estado interno y renderiza la UI del flujo correspondiente.
 *
 * @component
 * @returns {JSX.Element}
 */
const AlertaMensaje = ({ open, setOpen, tipo, mensaje, duracion = 4000 }) => {

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setOpen(false);
    };

    return (
        <Snackbar
            open={open}
            autoHideDuration={duracion}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
            <Alert onClose={handleClose} severity={tipo} sx={{ width: '100%' }} variant="filled">
                {mensaje}
            </Alert>
        </Snackbar>
    );
};

export default AlertaMensaje;
