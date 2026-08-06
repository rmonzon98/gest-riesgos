/**
 * @fileoverview
 * Mantenimiento de versiones y definición de matrices del Anexo 1.
 *
 * @module Riesgos/Anexo 1/Anexo1Mant.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useEffect, useMemo, useState } from 'react';
import apiClient from 'api/apiClient';
import {
    Box, FormControl, InputLabel, Select, MenuItem,
    Typography, Card, CardHeader, CardContent,
    TableCell, TableRow, Table, TableHead, TableBody,
    Stack, Button, Stepper, Step, StepLabel, useMediaQuery, MobileStepper, Chip, Alert, CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { fmt } from 'funciones/Fechas';
import CrearMatrices from './CrearMatrices';
import anexo1DefaultSistema from './anexo1DefaultSistema.json';

/**
 * Mantenimiento de versiones del Anexo 1 y sus matrices base.
 *
 * Permite crear versiones, elegir una por defecto y gestionar sus tablas.
 *
 * @component
 */
function Anexo1Mant() {

    const [periodos, setPeriodos] = useState([]);
    const [periodo, setPeriodo] = useState('');

    const [versiones, setVersiones] = useState([]);
    const [version, setVersion] = useState('');

    // [{MATRIZ, TITULO, COLUMNAS(json), FILAS(json), OBLIGATORIO: number[]}]
    const [matrices, setMatrices] = useState([]);
    const [mostrarCrear, setMostrarCrear] = useState(false);

    // crear nueva versión tomando otra como base
    const [mostrarBasado, setMostrarBasado] = useState(false);
    const [basadoConfig, setBasadoConfig] = useState(null); // { version, initialTablas }

    // índice de la matriz que se está previsualizando
    const [activePreview, setActivePreview] = useState(0);

    // catálogo de direcciones
    const [direccionesCat, setDireccionesCat] = useState([]); // [{id, nombre, siglas}]
    const [loadingDirs, setLoadingDirs] = useState(false);
    const [errorDirs, setErrorDirs] = useState('');

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));


    // helper: parsea JSON si viene como string
    const parseJSON = (val) => {
        if (val == null) return null;
        try {
            return typeof val === 'string' ? JSON.parse(val) : val;
        } catch {
            return null;
        }
    };

    // mapa id->dir para mostrar chips rápidamente
    const dirById = useMemo(() => {
        const m = new Map();
        for (const d of direccionesCat) m.set(Number(d.id), d);
        return m;
    }, [direccionesCat]);

    useEffect(() => {
        /**
         * Obtiene el catálogo de direcciones disponible para configurar matrices.
         */
        const fetchDirecciones = async () => {
            try {
                setLoadingDirs(true);
                setErrorDirs('');
                const { data } = await apiClient.get('/api/direcciones-actualizados');
                const list = Array.isArray(data?.result) ? data.result : [];
                const cat = list.map(d => ({
                    id: Number(d.CODIGO_ENTIDAD),
                    nombre: String(d.NOMBRE || ''),
                    siglas: String(d.SIGLAS || '')
                }));
                setDireccionesCat(cat);
            } catch (err) {
                console.error('Error al cargar direcciones', err);
                setErrorDirs('No se pudieron cargar las direcciones.');
            } finally {
                setLoadingDirs(false);
            }
        };
        fetchDirecciones();
    }, []);

    useEffect(() => {
        /**
         * Carga el listado de periodos disponibles para definir versiones del Anexo 1.
         */
        const fetchPeriodos = async () => {
            try {
                const { data } = await apiClient.get('/api/periodos-actualizados');
                setPeriodos(data.result ?? data);
            } catch (err) {
                console.error('Error al cargar periodos', err);
            }
        };
        fetchPeriodos();
    }, []);

    useEffect(() => {
        /**
         * Consulta las versiones del Anexo 1 configuradas para el periodo seleccionado.
         */
        const fetchVersiones = async () => {
            if (!periodo) return;
            try {
                const { data } = await apiClient.get('/api/primera-matriz-actualizados', {
                                        params: { periodo }
                });
                setVersiones(data || []);
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

    /**
     * Carga las matrices asociadas a una combinación periodo/versión.
     */
    const loadMatrices = async (pPeriodo = periodo, pVersion = version) => {
        if (!pPeriodo || !pVersion) return;
        try {
            const { data } = await apiClient.get('/api/primera-matriz-actualizados/obtener-unico', {
                                params: { periodo: pPeriodo, version: pVersion }
            });
            setMatrices(Array.isArray(data.matrices) ? data.matrices : []);
            setActivePreview(0);
        } catch (err) {
            console.error('Error al cargar matrices de la versión', err);
        }
    };

    useEffect(() => {
        loadMatrices();
    }, [version, periodo]);

    const reloadVersiones = async () => {
        if (!periodo) return;
        try {
            const { data } = await apiClient.get('/api/primera-matriz-actualizados', {
                params: { periodo }
            });
            setVersiones(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    /**
     * Marca la versión seleccionada como configuración por defecto del sistema.
     */
    const handleSetDefault = async () => {
        if (!periodo || !version) return;
        try {
            await apiClient.put(
                '/api/primera-matriz-actualizados/establecer-defecto',
                { periodo, version }
            );
        } catch (err) {
            console.error('Error al establecer matriz por defecto', err);
        }
    };

    const matrizActiva = matrices[activePreview] || null;
    const colsJson = matrizActiva ? parseJSON(matrizActiva.COLUMNAS) : null; // { headers: [...] }
    const filasJson = matrizActiva ? parseJSON(matrizActiva.FILAS) : null;   // [[tituloFila, ...celdas], ...]
    const dirsOblig = Array.isArray(matrizActiva?.OBLIGATORIO) ? matrizActiva.OBLIGATORIO.map(Number) : [];

    const nextPreview = () => setActivePreview((prev) => Math.min(prev + 1, Math.max(0, matrices.length - 1)));
    const prevPreview = () => setActivePreview((prev) => Math.max(prev - 1, 0));

    const colCount = Array.isArray(colsJson?.headers) ? colsJson.headers.length : 0;

    /**
     * Recupera y carga en pantalla la configuración de matrices marcada como defecto.
     */
    const handleLoadSystemDefault = async () => {
        if (!periodo) return;
        try {
            await apiClient.post(
                `/api/primera-matriz-actualizados`,
                { periodo, matrices: anexo1DefaultSistema }
            );
            await reloadVersiones();
        } catch (err) {
            console.error('Error al cargar matriz por defecto del sistema', err);
        }
    };

    /**
     * Prepara la creación de una nueva versión basada en la versión actual.
     */
    const handleTomarComoBase = () => {
        if (!version || matrices.length === 0) return;

        const initialTablas = matrices.map((m) => {
            const h = parseJSON(m.COLUMNAS)?.headers ?? [];
            const f = parseJSON(m.FILAS) ?? [];
            const direcciones = Array.isArray(m.OBLIGATORIO)
                ? m.OBLIGATORIO.map(Number)
                : [];

            return {
                titulo: m.TITULO || '',
                headers: Array.isArray(h) ? h : [],
                rows: Array.isArray(f) ? f : [],
                direcciones
            };
        });

        setBasadoConfig({
            version, 
            initialTablas
        });
        setMostrarCrear(false);
        setMostrarBasado(true);
    };

    const renderChipsOblig = (ids = []) => {
        if (!ids?.length) {
            return <Typography variant="body2" color="text.secondary">Tabla opcional (sin direcciones obligatorias)</Typography>;
        }
        return (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Tabla obligatoria para:</Typography>
                {ids.map((id) => {
                    const d = dirById.get(Number(id));
                    const label = d?.siglas || d?.nombre || `Entidad ${id}`;
                    return <Chip key={id} size="small" label={label} />;
                })}
            </Stack>
        );
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Mantenimiento de evaluación de la eficiencia del control interno y gobernanza
            </Typography>

            {/* Estado de carga/errores de direcciones */}
            {loadingDirs && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2">Cargando direcciones…</Typography>
                </Stack>
            )}
            {!!errorDirs && <Alert severity="warning" sx={{ mb: 2 }}>{errorDirs}</Alert>}

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
                <Card sx={{ borderRadius: '16px', mb: 2 }}>
                    <CardHeader title="Seleccione una versión" />
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {versiones.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                No hay elementos aún registrados.
                            </Typography>
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
                                        {matrices.map((_, idx) => (
                                            <Step key={idx}>
                                                <StepLabel />
                                            </Step>
                                        ))}
                                    </Stepper>
                                ) : (
                                    <MobileStepper
                                        variant="dots"
                                        steps={matrices.length}
                                        position="static"
                                        activeStep={activePreview}
                                        nextButton={
                                            <Button
                                                size="small"
                                                onClick={nextPreview}
                                                disabled={activePreview === matrices.length - 1}
                                            >
                                                Siguiente
                                                {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
                                            </Button>
                                        }
                                        backButton={
                                            <Button
                                                size="small"
                                                onClick={prevPreview}
                                                disabled={activePreview === 0}
                                            >
                                                {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
                                                Anterior
                                            </Button>
                                        }
                                        sx={{ mb: 2 }}
                                    />
                                )}

                                {/* Vista previa de la matriz activa */}
                                {matrizActiva && (
                                    <Box sx={{ p: 1, border: '1px dashed', borderRadius: 2 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                            {matrizActiva.TITULO || 'Sin título'}
                                        </Typography>

                                        {renderChipsOblig(dirsOblig)}

                                        <Table
                                            size="small"
                                            sx={{
                                                borderCollapse: 'collapse',
                                                '& th, & td': {
                                                    borderRight: '1px solid rgba(0,0,0,0.12)',
                                                },
                                                '& th:last-of-type, & td:last-of-type': {
                                                    borderRight: 'none',
                                                }
                                            }}
                                        >
                                            <TableHead>
                                                <TableRow>
                                                    {colsJson?.headers?.map((h, i) => (
                                                        <TableCell key={i} sx={{ fontWeight: 'bold' }}>
                                                            {h}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {Array.isArray(filasJson) && filasJson.length > 0 ? (
                                                    filasJson.map((fila, idx) => {
                                                        const values = Array.isArray(fila) ? fila : [];
                                                        const padded = colCount > 0 && values.length < colCount
                                                            ? [...values, ...Array(colCount - values.length).fill(null)]
                                                            : (colCount > 0 ? values.slice(0, colCount) : values);

                                                        return (
                                                            <TableRow key={idx}>
                                                                {padded.map((celda, ci) => (
                                                                    <TableCell key={ci}>{celda ?? ''}</TableCell>
                                                                ))}
                                                            </TableRow>
                                                        );
                                                    })
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={colCount || 1} align="center">
                                                            No hay filas
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                )}

                                {/* Botones inferiores */}
                                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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

                                    <Box sx={{ flex: 1 }} />

                                    <Button
                                        variant="outlined"
                                        onClick={handleSetDefault}
                                        disabled={!version}
                                    >
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

            {/* Card de acciones inferiores con botón Crear (oculta mientras se usa "Tomar como base") */}
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
                                    color="info"
                                    disabled={!periodo}
                                    onClick={handleLoadSystemDefault}
                                >
                                    Matriz por defecto del sistema
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    disabled={!periodo}
                                    onClick={async () => {
                                        try {
                                            await apiClient.post(
                                                '/api/primera-matriz-actualizados/copiar-defecto-anio-pasado',
                                                { periodo }
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
                                    onSaved={async () => {
                                        setMostrarCrear(false);
                                        await reloadVersiones();
                                    }}
                                    onCancelar={() => setMostrarCrear(false)}
                                />
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* Editor de nueva versión basada en otra */}
            {mostrarBasado && basadoConfig && (
                <Card sx={{ borderRadius: '16px', mt: 2 }}>
                    <CardHeader title={`Crear nueva versión (base v${basadoConfig.version})`} />
                    <CardContent>
                        <CrearMatrices
                            periodo={periodo}
                            initialTablas={basadoConfig.initialTablas}
                            fromVersion={basadoConfig.version}
                            onSaved={async () => {
                                setMostrarBasado(false);
                                setBasadoConfig(null);
                                await reloadVersiones();
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

export default Anexo1Mant;
