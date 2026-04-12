/**
 * @fileoverview
 * Contenedor de administración general por pestañas del sistema de Gestión de Riesgos.
 *
 * @module Riesgos/Admin F/General/AdminView.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useState } from "react";
import { Stack, Typography, Box, Tabs, Tab } from "@mui/material";
import RolesViews from "./RolesViews";
import ResponablesMain from "./ResponsablesMain";
import RolesUsuarios from "./RolesUsuarios";
import General from "./General";

/**
 * Vista contenedora de administración general basada en pestañas.
 *
 * @component
 */
function AdminView() {

    const [tabIndex, setTabIndex] = useState(0);

    /**
     * Maneja el cambio de pestaña seleccionada.
     *
     * @param {React.SyntheticEvent} event - Evento disparado por Tabs.
     * @param {number} newValue - Índice de la nueva pestaña activa.
     */
    const handleChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    return (
        <Box p={3}>
            <Stack spacing={2}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                    Administración
                </Typography>
                <Tabs
                    value={tabIndex}
                    onChange={handleChange}
                    variant="fullWidth"
                    indicatorColor="primary"
                    textColor="inherit"
                >
                    <Tab
                        label="General"
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
                        label="Mantenimiento de Roles"
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
                {tabIndex === 0 && <General />}
                {tabIndex === 1 && <ResponablesMain />}
                {tabIndex === 2 && <RolesViews />}
                {tabIndex === 3 && <RolesUsuarios />}

            </Stack>
        </Box>
    );
}

export default AdminView;
