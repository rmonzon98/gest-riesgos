/**
 * @fileoverview
 * Vista para consultar y actualizar el logo institucional del sistema.
 *
 * @module Riesgos/Admin F/General/CambiarLogo.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useState, useEffect, useRef } from 'react';
import Axios from 'axios';
import {
    Box,
    Button,
    Card,
    CardHeader,
    CardContent,
    Stack,
    Typography,
    Snackbar,
    Alert,
    LinearProgress
} from '@mui/material';

/**
 * Vista de administración del logo institucional.
 *
 * Gestiona lectura del logo actual, selección de archivo y envío al backend.
 *
 * @component
 */
function CambiarLogo() {
    const [path, setPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [snack, setSnack] = useState({ open: false, severity: 'info', message: '' });

    const [newFile, setNewFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    const fileInputRef = useRef(null);

    useEffect(() => {
        refreshLogo();
    }, []);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    /**
     * Obtiene desde el backend la ruta del logo actual y la guarda en estado.
     */
    const refreshLogo = async () => {
        try {
            setLoading(true);
            const resp = await Axios.get('/descargar/obtener-logo', {
                headers: { 'x-access-token': localStorage.getItem('token') }
            });
            setPath(resp.data.logo || '');
        } catch (e) {
            setSnack({ open: true, severity: 'error', message: 'No se pudo cargar el logo actual.' });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Maneja la selección de un nuevo archivo de imagen.
     *
     * Genera una URL temporal para previsualizar el logo y lo guarda en estado.
     */
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];

        if (!file) {
            setNewFile(null);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl('');
            }
            return;
        }

        if (!/^image\/(png|jpe?g)$/.test(file.type)) {
            setSnack({ open: true, severity: 'error', message: 'Formato inválido. Solo PNG o JPG.' });
            if (fileInputRef.current) fileInputRef.current.value = '';
            setNewFile(null);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl('');
            }
            return;
        }

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        const url = URL.createObjectURL(file);
        setNewFile(file);
        setPreviewUrl(url);
    };

    /**
     * Envía al backend el nuevo logo seleccionado.
     *
     * Construye un FormData, llama al endpoint de actualización y muestra el resultado.
     */
    const submitDocument = async () => {
        if (!newFile) {
            setSnack({ open: true, severity: 'error', message: 'Seleccione una imagen antes de cambiar.' });
            return;
        }

        const formData = new FormData();
        formData.append('logo', newFile);

        try {
            setLoading(true);
            const resp = await Axios.put('/descargar/update-image-logo', formData, {
                headers: {
                    'x-access-token': localStorage.getItem('token'),
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (resp.data?.error) {
                setSnack({ open: true, severity: 'error', message: resp.data.message || 'Error al subir el logo.' });
            } else {
                setSnack({ open: true, severity: 'success', message: 'Logo actualizado correctamente.' });

                await refreshLogo();

                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                }
                setPreviewUrl('');
                setNewFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch (e) {
            setSnack({ open: true, severity: 'error', message: 'Error al subir el logo.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Card variant="outlined">
                <CardHeader title="Logo para reportes" />
                {loading && <LinearProgress />}
                <CardContent>
                    <Stack spacing={2}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 3,
                                flexWrap: 'wrap'
                            }}
                        >
                            {path && (
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: 'block', mb: 0.5 }}
                                    >
                                        Logo actual
                                    </Typography>
                                    <Box
                                        sx={{
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            p: 1,
                                            display: 'inline-flex',
                                            backgroundColor: 'background.paper'
                                        }}
                                    >
                                        <img
                                            src={path}
                                            alt="Logo actual"
                                            style={{ maxWidth: 160, height: 'auto' }}
                                        />
                                    </Box>
                                </Box>
                            )}

                            {previewUrl && (
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography
                                        variant="caption"
                                        color="success.main"
                                        sx={{ display: 'block', mb: 0.5 }}
                                    >
                                        Nuevo logo (se aplicará al presionar &quot;Cambiar&quot;)
                                    </Typography>
                                    <Box
                                        sx={{
                                            borderRadius: 2,
                                            border: '2px solid',
                                            borderColor: 'success.main',
                                            p: 1,
                                            display: 'inline-flex',
                                            backgroundColor: 'rgba(76, 175, 80, 0.04)'
                                        }}
                                    >
                                        <img
                                            src={previewUrl}
                                            alt="Nuevo logo seleccionado"
                                            style={{ maxWidth: 160, height: 'auto' }}
                                        />
                                    </Box>
                                </Box>
                            )}
                        </Box>

                        {!path && !previewUrl && (
                            <Typography variant="body2" color="text.secondary">
                                No hay logo cargado aún.
                            </Typography>
                        )}

                        <Box>
                            <Button
                                variant="outlined"
                                component="label"
                                size="small"
                                disabled={loading}
                            >
                                Seleccionar imagen (PNG/JPG)
                                <input
                                    type="file"
                                    hidden
                                    ref={fileInputRef}
                                    accept="image/png, image/jpeg"
                                    onChange={handleFileChange}
                                />
                            </Button>
                        </Box>

                        <Box>
                            <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={submitDocument}
                                disabled={loading || !newFile}
                            >
                                Cambiar
                            </Button>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnack(s => ({ ...s, open: false }))}
                    severity={snack.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </>
    );
}

export default CambiarLogo;
