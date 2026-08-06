/**
 * @fileoverview 
 * Pantalla principal de mantenimiento de evaluación de riesgos por período.
 *
 * Permite:
 * - Cargar los períodos disponibles.
 * - Seleccionar un período de trabajo.
 * - Navegar entre las pestañas de:
 *   - Mantenimiento de propiedades extra de riesgos.
 *   - Mantenimiento de reportes asociados a la evaluación de riesgos.
 *
 * @module Riesgos/Evaluacion riesgos F/Mantenimiento/MantenimientoRiesgosMain.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useState } from 'react';
import apiClient from 'api/apiClient';
import {
    Box, Typography, Card, CardHeader, CardContent, FormControl, InputLabel, Select, MenuItem, Tabs, Tab
} from '@mui/material';
import { fmt } from 'funciones/Fechas';

// Importa los nuevos componentes
import MantenimientoRiesgosPropiedades from './MantenimientoRiesgosPropiedades';
import MantenimientoReportes from './MantenimientoReportes';

/**
 * TabPanel
 *
 * Componente auxiliar para mostrar el contenido de cada tab.
 *
 * - Recibe el índice activo (`value`) y el índice propio (`index`).
 * - Solo renderiza su contenido cuando `value === index`.
 *
 * @component
 */
function TabPanel({ children, value, index }) {
    if (value !== index) return null;
    return <Box sx={{ mt: 2 }}>{children}</Box>;
}

/**
 * MantenimientoRiesgosMain
 *
 * Es la pantalla principal de configuración de la evaluación de riesgos por período.
 *
 * - Consulta la lista de períodos disponibles desde el backend.
 * - Permite seleccionar un período y, a partir de él:
 *   - Acceder al mantenimiento de propiedades extra de riesgos.
 *   - Acceder al mantenimiento de reportes asociados.
 * - Gestiona la selección de pestañas (tabs) y pasa el período seleccionado a los submódulos.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function MantenimientoRiesgosMain() {
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState('');
    const [tab, setTab] = useState(0);
    useEffect(() => {
        (async () => {
            try {
                const { data } = await apiClient.get('/api/periodos-actualizados');
                setPeriodos(data.result ?? data ?? []);
            } catch (err) {
                console.error('Error al cargar periodos', err);
            }
        })();
    }, []);

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Mantenimiento de evaluación de riesgos
            </Typography>

            {/* Selección de período */}
            <Card sx={{ borderRadius: '16px', mb: 2 }}>
                <CardHeader title="Seleccione un período" />
                <CardContent>
                    {periodos.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No hay elementos aún registrados.
                        </Typography>
                    ) : (
                        <FormControl fullWidth>
                            <InputLabel id="periodo-label">Periodo</InputLabel>
                            <Select
                                labelId="periodo-label"
                                label="Periodo"
                                value={periodo}
                                onChange={(e) => setPeriodo(e.target.value)}
                            >
                                {periodos.map((p) => (
                                    <MenuItem key={p.CODIGO_PERIODO} value={p.CODIGO_PERIODO}>
                                        {fmt(p.PERIODO_INICIAL)} - {fmt(p.PERIODO_FINAL)} del {p.CODIGO_PERIODO}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </CardContent>
            </Card>

            {periodo && (
                <Card sx={{ borderRadius: '16px' }}>
                    <CardHeader title="Configuración por período" subheader={`Período ${periodo}`} />
                    <CardContent>
                        <Tabs
                            value={tab}
                            onChange={(_, v) => setTab(v)}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            <Tab label="Mantenimiento de propiedades extra de riesgos" />
                            <Tab label="Mantenimiento de reportes" />
                        </Tabs>

                        <TabPanel value={tab} index={0}>
                            <MantenimientoRiesgosPropiedades periodo={periodo} />
                        </TabPanel>

                        <TabPanel value={tab} index={1}>
                            <MantenimientoReportes periodo={periodo} />
                        </TabPanel>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}
