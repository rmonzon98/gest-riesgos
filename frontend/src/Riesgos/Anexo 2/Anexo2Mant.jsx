/**
 * @fileoverview
 * Mantenimiento de versiones y definición de matrices del Anexo 2.
 *
 * @module Riesgos/Anexo 2/Anexo2Mant.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Box, FormControl, InputLabel, Select, MenuItem,
    Typography, Card, CardHeader, CardContent,
    TableCell, TableRow, Table, TableHead, TableBody,
    Stack, Button, Stepper, Step, StepLabel, useMediaQuery, MobileStepper,
    TableContainer
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { fmt } from 'funciones/Fechas';
import CrearMatrices from './CrearMatrices';
import anexo2DefaultSistema from './anexo2DefaultSistema.json';

const FIXED_TAIL = ['Aplica', 'Comentario'];

/**
 * Mantenimiento de versiones de configuración del Anexo 2.
 *
 * Gestiona periodos, versiones y matrices base que se aplican al formulario.
 *
 * @component
 */
function Anexo2Mant({ apiBase = '/api/segunda-matriz-actualizados' }) {
    const [loadingSysDefault, setLoadingSysDefault] = useState(false);
    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState('');

    const [versiones, setVersiones] = useState([]);
    const [version, setVersion] = useState('');

    const [matrices, setMatrices] = useState([]);
    const [mostrarCrear, setMostrarCrear] = useState(false);

    const [mostrarBasado, setMostrarBasado] = useState(false);
    const [basadoConfig, setBasadoConfig] = useState(null);

    const [activePreview, setActivePreview] = useState(0);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const headersAuth = { 'x-access-token': localStorage.getItem('token') };

    const parseJSON = (val) => {
        if (val == null) return null;
        try {
            return typeof val === 'string' ? JSON.parse(val) : val;
        } catch {
            return null;
        }
    };

        /**
         * Obtiene el catálogo de periodos con versiones de Anexo 2.
         */
    useEffect(() => {
        const fetchPeriodos = async () => {
            try {
                const { data } = await axios.get('/api/periodos-actualizados', { headers: headersAuth });
                setPeriodos(data.result ?? data);
            } catch (err) {
                console.error('Error al cargar periodos', err);
            }
        };
        fetchPeriodos();
    }, []);

        /**
         * Carga las versiones existentes para el periodo seleccionado.
         */
    useEffect(() => {
        const fetchVersiones = async () => {
            if (!periodo) return;
            try {
                const { data } = await axios.get(apiBase, {
                    headers: headersAuth,
                    params: { periodo }
                });
                setVersiones(Array.isArray(data) ? data : (data?.versiones ?? []));
                setVersion('');
                setMatrices([]);
                setActivePreview(0);
            } catch (err) {
                console.error('Error al cargar versiones', err);
            }
        };
        if (mostrarCrear) setMostrarCrear(false);
        if (mostrarBasado) {
            setMostrarBasado(false);
            setBasadoConfig(null);
        }
        fetchVersiones();
    }, [periodo]);

    useEffect(() => {
        const fetchMonitoreo = async () => {
            if (!periodo || !version) return;
            try {
                const { data } = await axios.get(`${apiBase}/obtener-unico`, {
                    headers: headersAuth,
                    params: { periodo, version }
                });
                setMatrices(data.matrices ?? []);
                setActivePreview(0);
            } catch (err) {
                console.error('Error al cargar matrices de la versión', err);
            }
        };
        fetchMonitoreo();
    }, [version, periodo]);

    const reloadVersiones = async () => {
        if (!periodo) return;
        try {
            const { data } = await axios.get(apiBase, { headers: headersAuth, params: { periodo } });
            setVersiones(Array.isArray(data) ? data : (data?.versiones ?? []));
        } catch (err) {
            console.error(err);
        }
    };

    /**
     * Marca una versión de Anexo 2 como configuración por defecto del sistema.
     */
    const handleSetDefault = async () => {
        if (!periodo || !version) return;
        try {
            await axios.put(
                `${apiBase}/establecer-defecto`,
                { periodo, version },
                { headers: headersAuth }
            );
            reloadVersiones();
        } catch (err) {
            console.error('Error al establecer matriz por defecto', err);
        }
    };

    const matrizActiva = matrices[activePreview] || null;
    const colsJson = matrizActiva ? parseJSON(matrizActiva.COLUMNAS) : null;
    const filasJson = matrizActiva ? parseJSON(matrizActiva.FILAS) : null; 
    const colCount = Array.isArray(colsJson?.headers) ? colsJson.headers.length : 0;

    const nextPreview = () => setActivePreview((p) => Math.min(p + 1, Math.max(0, matrices.length - 1)));
    const prevPreview = () => setActivePreview((p) => Math.max(p - 1, 0));

    /**
     * Recupera la configuración marcada como defecto y la carga en la interfaz.
     */
    const handleLoadSystemDefault = async () => {
        if (!periodo) return;
        try {
            setLoadingSysDefault(true);
            await axios.post(
                `${apiBase}`,
                { periodo, matrices: anexo2DefaultSistema },
                { headers: headersAuth }
            );
            await reloadVersiones();
        } catch (err) {
            console.error('Error al cargar matriz por defecto del sistema', err);
        } finally {
            setLoadingSysDefault(false);
        }
    };

    /**
     * Prepara la creación de una nueva versión reutilizando la estructura de otra.
     */
    const handleTomarComoBase = () => {
        if (!version || matrices.length === 0) return;

        const initialTablas = matrices.map((m) => {
            const h = parseJSON(m.COLUMNAS)?.headers ?? [];
            const f = parseJSON(m.FILAS) ?? [];

            return {
                titulo: m.TITULO || '',
                headers: Array.isArray(h) ? h : [],
                rows: Array.isArray(f) ? f : []
            };
        });

        setBasadoConfig({
            version,
            initialTablas
        });
        setMostrarCrear(false);
        setMostrarBasado(true);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Mantenimiento de Riesgos de fraude o corrupción
            </Typography>

            {/* Período */}
            <Card sx={{ borderRadius: '16px', mb: 2 }}>
                <CardHeader title="Seleccione un período" />
                <CardContent>
                    {periodos.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">No hay elementos aún registrados.</Typography>
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

            {/* Versiones */}
            {periodo && (
                <Card sx={{ borderRadius: '16px', mt: 2, mb: 2 }}>
                    <CardHeader title="Seleccione una versión" />
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {versiones.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">No hay elementos aún registrados.</Typography>
                        ) : (
                            <FormControl fullWidth>
                                <InputLabel id="version-label">Versión</InputLabel>
                                <Select
                                    labelId="version-label"
                                    label="Versión"
                                    value={version}
                                    onChange={(e) => setVersion(e.target.value)}
                                >
                                    {versiones.map((v) => (
                                        <MenuItem key={v.VERSION} value={v.VERSION}>
                                            Versión {v.VERSION} {v.NUM_MATRICES != null ? `(${v.NUM_MATRICES} matrices)` : ''}{v.ESTADO === 'S' && ' - Matriz por defecto'}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Previsualización */}
            {version && !mostrarBasado && (
                <Card sx={{ borderRadius: '16px', mb: 2 }}>
                    <CardHeader title={`Matrices de la versión ${version}`} />
                    <CardContent>
                        {matrices.length === 0 ? (
                            <Typography variant="body2">No hay matrices para esta versión.</Typography>
                        ) : (
                            <>
                                {!isMobile ? (
                                    <Stepper activeStep={activePreview} sx={{ mb: 2 }}>
                                        {matrices.map((_, idx) => (<Step key={idx}><StepLabel /></Step>))}
                                    </Stepper>
                                ) : (
                                    <MobileStepper
                                        variant="dots"
                                        steps={matrices.length}
                                        position="static"
                                        activeStep={activePreview}
                                        nextButton={
                                            <Button size="small" onClick={nextPreview} disabled={activePreview === matrices.length - 1}>
                                                Siguiente {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
                                            </Button>
                                        }
                                        backButton={
                                            <Button size="small" onClick={prevPreview} disabled={activePreview === 0}>
                                                {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />} Anterior
                                            </Button>
                                        }
                                        sx={{ mb: 2 }}
                                    />
                                )}

                                {matrizActiva && (
                                    <Box sx={{ p: 1, border: '1px dashed', borderRadius: 2 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                            {matrizActiva.TITULO || 'Sin título'}
                                        </Typography>
                                        <TableContainer sx={{ overflowX: 'auto' }}>
                                            <Table
                                                size="small"
                                                sx={{
                                                    borderCollapse: 'collapse',
                                                    '& th, & td': {
                                                        borderRight: '1px solid rgba(0,0,0,0.12)',
                                                        whiteSpace: 'pre-line',
                                                        wordBreak: 'break-word',
                                                        verticalAlign: 'top'
                                                    },
                                                    '& th:last-of-type, & td:last-of-type': { borderRight: 'none' },
                                                }}
                                            >
                                                <TableHead>
                                                    <TableRow>
                                                        {colsJson?.headers?.map((h, i) => (
                                                            <TableCell key={i} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {Array.isArray(filasJson) && filasJson.length > 0 ? (
                                                        filasJson.map((fila, idx) => {
                                                            const values = Array.isArray(fila) ? fila : [];
                                                            const padded = values.length < colCount
                                                                ? [...values, ...Array(colCount - values.length).fill(null)]
                                                                : values.slice(0, colCount);
                                                            return (
                                                                <TableRow key={idx}>
                                                                    {padded.map((celda, ci) => (
                                                                        <TableCell key={ci} sx={{ minWidth: '250px' }}>{celda ?? ''}</TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            );
                                                        })
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={colCount || 1} align="center">No hay filas</TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                        {!isMobile && matrices.length > 1 && (
                                            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                                <Button
                                                    variant="outlined"
                                                    onClick={prevPreview}
                                                    disabled={activePreview === 0}
                                                    startIcon={<KeyboardArrowLeft />}
                                                >
                                                    Anterior
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    onClick={nextPreview}
                                                    disabled={activePreview === matrices.length - 1}
                                                    endIcon={<KeyboardArrowRight />}
                                                >
                                                    Siguiente
                                                </Button>
                                            </Stack>
                                        )}
                                    </Box>
                                )}

                                {/* Acciones bajo la previsualización */}
                                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Button variant="outlined" onClick={handleSetDefault} disabled={!version}>
                                        Establecer como matriz por defecto
                                    </Button>

                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleTomarComoBase}
                                        disabled={!version || matrices.length === 0}
                                    >
                                        Tomar como base
                                    </Button>
                                </Box>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {!mostrarBasado && (
                <Card sx={{ borderRadius: '16px' }}>
                    <CardHeader title="Acciones" />
                    <CardContent>
                        <Stack direction="column" spacing={2}>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained"
                                    onClick={() => {
                                        setMostrarBasado(false);
                                        setMostrarCrear(true);
                                    }}
                                    disabled={!periodo}
                                >
                                    Crear
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    disabled={!periodo || loadingSysDefault}
                                    onClick={handleLoadSystemDefault}
                                >
                                    {loadingSysDefault ? 'Cargando…' : 'Matriz por defecto del sistema'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    disabled={!periodo}
                                    onClick={async () => {
                                        try {
                                            await axios.post(
                                                `${apiBase}/copiar-defecto-anio-pasado`,
                                                { periodo },
                                                { headers: headersAuth }
                                            );
                                            reloadVersiones();
                                        } catch (err) {
                                            console.error('Error al copiar matriz por defecto del año pasado', err);
                                        }
                                    }}
                                >
                                    Copiar matriz por defecto del año pasado
                                </Button>
                            </Box>

                            {mostrarCrear && (
                                <CrearMatrices
                                    periodo={periodo}
                                    apiBase={apiBase}
                                    onSaved={() => {
                                        setMostrarCrear(false);
                                        reloadVersiones();
                                    }}
                                    onCancelar={() => setMostrarCrear(false)}
                                />
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {mostrarBasado && basadoConfig && (
                <Card sx={{ borderRadius: '16px', mt: 2 }}>
                    <CardHeader title={`Crear nueva versión (base v${basadoConfig.version})`} />
                    <CardContent>
                        <CrearMatrices
                            periodo={periodo}
                            apiBase={apiBase}
                            initialTablas={basadoConfig.initialTablas}
                            fromVersion={basadoConfig.version}
                            onSaved={() => {
                                setMostrarBasado(false);
                                setBasadoConfig(null);
                                reloadVersiones();
                            }}
                            onCancelar={() => {
                                setMostrarBasado(false);
                                setBasadoConfig(null);
                            }}
                        />
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}

export default Anexo2Mant;
