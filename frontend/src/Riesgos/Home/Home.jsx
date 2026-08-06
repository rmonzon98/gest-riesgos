// home.jsx
import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, Paper, Stack, List, ListItem, ListItemIcon,
    ListItemText, Chip, Divider, Card, CardHeader, CardContent
} from '@mui/material';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutline';

import apiClient from 'api/apiClient';

const notificaciones = [
    { tipo: 'info', mensaje: 'Tu perfil ha sido actualizado correctamente.' },
    { tipo: 'warning', mensaje: 'Tienes tareas pendientes de revisión.' },
    { tipo: 'error', mensaje: 'Fallo al cargar el reporte de riesgos. Intente nuevamente.' },
    { tipo: 'success', mensaje: 'Último acceso registrado con éxito.' }
];

const SECCIONES = [
    { key: 'info', titulo: 'Información', icono: <InfoOutlinedIcon />, color: 'info.main' },
    { key: 'warning', titulo: 'Advertencias', icono: <WarningAmberOutlinedIcon />, color: 'warning.main' },
    { key: 'error', titulo: 'Errores', icono: <ErrorOutlineOutlinedIcon />, color: 'error.main' },
    { key: 'success', titulo: 'Éxitos/Confirmaciones', icono: <CheckCircleOutlineOutlinedIcon />, color: 'success.main' },
];

function MessageSection({ titulo, icono, color, items }) {
    return (
        <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardHeader
                avatar={<Box sx={{ color }}>{icono}</Box>}
                title={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6">{titulo}</Typography>
                        <Chip
                            label={items.length}
                            size="small"
                            sx={{ bgcolor: color, color: 'common.white' }}
                        />
                    </Stack>
                }
                sx={{ pb: 0 }}
            />

            <CardContent>
                {items.length === 0 ? (
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            borderStyle: 'dashed',
                            textAlign: 'center',
                            color: 'text.secondary'
                        }}
                    >
                        <Typography variant="body2">
                            Sin mensajes en esta sección.
                        </Typography>
                    </Paper>
                ) : (
                    <List dense>
                        {items.map((n, i) => (
                            <React.Fragment key={`${n.tipo}-${i}`}>
                                <ListItem alignItems="flex-start" disableGutters>
                                    <ListItemIcon sx={{ minWidth: 32, color }}>
                                        •
                                    </ListItemIcon>

                                    <ListItemText
                                        primary={n.mensaje}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                </ListItem>

                                {i < items.length - 1 && <Divider component="li" />}
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </CardContent>
        </Card>
    );
}

export default function Home() {
    const [correoSoporte, setCorreoSoporte] = useState('');

    const grupos = SECCIONES.reduce(
        (acc, s) => {
            acc[s.key] = notificaciones.filter((n) => n.tipo === s.key);
            return acc;
        },
        { info: [], warning: [], error: [], success: [] }
    );

    useEffect(() => {
        let activo = true;

        const obtenerGeneral = async () => {
            try {
                const resp = await apiClient.get('/api/administracion-actualizados/general');

                if (!activo) return;

                const data = resp.data?.result?.[0];

                if (data?.CORREO_SOPORTE) {
                    setCorreoSoporte(data.CORREO_SOPORTE);
                } else {
                    setCorreoSoporte('');
                }
            } catch (e) {
                if (!activo) return;

                console.error(
                    'No se pudo obtener el correo de soporte',
                    e?.response?.data?.message || e?.message || e
                );

                setCorreoSoporte('');
            }
        };

        obtenerGeneral();

        return () => {
            activo = false;
        };
    }, []);

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h3" gutterBottom>
                Bienvenido al sistema de evaluación y gestión de riesgos
            </Typography>

            <Typography variant="h6" color="text.secondary" gutterBottom>
                Utilice las opciones que tiene habilitado en el menú según los perfiles acreditados a su usuario.
            </Typography>

            {correoSoporte && (
                <Typography variant="body1" color="text.secondary">
                    Correo de soporte:{' '}
                    <Box component="span" sx={{ fontWeight: 600 }}>
                        {correoSoporte}
                    </Box>
                </Typography>
            )}
        </Box>
    );
}