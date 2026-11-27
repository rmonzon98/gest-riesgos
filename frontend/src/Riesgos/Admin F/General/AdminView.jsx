/**
 * @fileoverview
 * Contenedor de administración general por pestañas del sistema de Gestión de Riesgos.
 *
 * @module Riesgos/Admin F/General/AdminView.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useCallback, useEffect, useState } from "react";
import { Alert, Stack, Typography, Box, Tabs, Tab } from "@mui/material";
import apiClient from "api/apiClient";
import { safefmt } from "funciones/Fechas";
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
    const [licencia, setLicencia] = useState(null);
    const [errorLicencia, setErrorLicencia] = useState(false);
    const actualizarLicencia = useCallback(async () => {
        try {
            const { data } = await apiClient.get('/api/responsables-actualizados/licencia');
            setLicencia(data.result);
            setErrorLicencia(false);
        } catch {
            setErrorLicencia(true);
        }
    }, []);
    useEffect(() => { actualizarLicencia(); }, [actualizarLicencia, tabIndex]);

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
                <Box>
                    <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>Administración</Typography>
                    {licencia && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {licencia.limite == null ? `${licencia.usados} usuarios · sin límite` :
                            `${licencia.usados} de ${licencia.limite} usuarios`}
                        {(licencia.desde || licencia.hasta) && ` · vigente del ${safefmt(licencia.desde) || 'sin fecha de inicio'} al ${safefmt(licencia.hasta) || 'sin fecha de fin'}`}
                    </Typography>}
                </Box>
                {errorLicencia && <Alert severity="warning">No se pudo consultar el uso de la licencia.</Alert>}
                {licencia?.fueraDeVigencia && <Alert severity="warning">La licencia de la aplicación está fuera de vigencia.</Alert>}
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
                {tabIndex === 1 && <ResponablesMain licencia={licencia} actualizarLicencia={actualizarLicencia} />}
                {tabIndex === 2 && <RolesViews />}
                {tabIndex === 3 && <RolesUsuarios actualizarLicencia={actualizarLicencia} />}

            </Stack>
        </Box>
    );
}

export default AdminView;
