/**
 * @fileoverview 
 * Vista principal de administración por Dirección dentro del sistema.
 * 
 * Este componente funciona como el “hub” de administración para la dirección del
 * usuario autenticado.
 *
 * @module Riesgos/Admin F/Direccion/AdminDireccion.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useState, useEffect } from "react";
import { Stack, Typography, Box, Tabs, Tab } from "@mui/material";
import ResponablesMain from "./ResponsablesMain";
import RolesUsuarios from "./RolesUsuarios";
import apiClient from "api/apiClient";

/**
 * Vista principal de administración de colaboradores y roles por dirección.
 *
 * - Obtiene la unidad organizacional del usuario autenticado.
 * - Muestra pestañas para administración de colaboradores y asignación de roles.
 * - Conmuta entre vistas de usuarios y asignación de roles mediante Tabs.
 *
 * @component
 */
function AdminDireccion() {

    const [tabIndex, setTabIndex] = useState(0);
    const [unidad, setUnidad] = useState('')

    /**
     * Obtiene la unidad organizacional asociada al usuario autenticado y
     * la formatea para mostrarla en el encabezado.
     *
     * @async
     * @returns {Promise<void>} No retorna valor; actualiza el estado local `unidad`.
     */
    const obtenerUnidad = async () => {
        try {
            const res = await apiClient.get('/api/responsables-actualizados/obtener-mi-unidad');
            const u = res.data.data;
            setUnidad(u.NOMBRE + (u.SIGLAS ? ' (' + u.SIGLAS + ')' : ''));
        } catch { setUnidad(''); }
    };
    useEffect(() => {
        obtenerUnidad()
    }, [])

    /**
     * Maneja el cambio de pestaña en el componente Tabs.
     *
     * @param {React.SyntheticEvent} event - Evento originado por el cambio de pestaña.
     * @param {number} newValue - Índice de la nueva pestaña seleccionada.
     */
    const handleChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    return (
        <Box p={3}>
            <Stack spacing={2}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                    Administración {unidad}
                </Typography>
                <Tabs
                    value={tabIndex}
                    onChange={handleChange}
                    variant="fullWidth"
                    indicatorColor="primary"
                    textColor="inherit"
                >
                    <Tab
                        label="Usuarios / Colaboradores"
                        sx={{
                            '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2',
                            },
                            '&:hover': {
                                backgroundColor: '#f5f5f5',
                            }
                        }}
                    />
                    <Tab
                        label="Asignación de roles a colaboradores"
                        sx={{
                            '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2',
                            },
                            '&:hover': {
                                backgroundColor: '#f5f5f5',
                            }
                        }}
                    />
                </Tabs>
                {/* Contenido de cada tab */}
                {tabIndex === 0 && <ResponablesMain />}
                {tabIndex === 1 && <RolesUsuarios />}

            </Stack>
        </Box>
    );
}

export default AdminDireccion;
