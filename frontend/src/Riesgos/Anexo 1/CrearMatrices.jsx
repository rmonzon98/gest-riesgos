/**
 * @fileoverview
 * Asistente para crear y editar matrices que conforman el Anexo 1.
 *
 * @module Riesgos/Anexo 1/CrearMatrices.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import {
    Stepper, Step, StepLabel, Button, TextField, Stack, Box, Typography,
    IconButton, useMediaQuery, MobileStepper, Table, TableHead, TableRow, TableCell, TableBody, Divider, Tooltip,
    FormControl, InputLabel, Select, MenuItem, Chip, Alert, CircularProgress, Snackbar
} from '@mui/material';
import {
    Add, Close, KeyboardArrowLeft, KeyboardArrowRight, Delete
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const DEFAULT_HEADERS = ['Norma Específica', 'Presente', 'Funcionando', 'Vigente'];
const MIN_COLS = 1;
const MIN_ROWS = 0;

const nuevaTabla = () => ({
    id: undefined,
    titulo: '',
    headers: [...DEFAULT_HEADERS],
    rows: [],
    direcciones: [],
});

export default function CrearMatrices({
    periodo,
    onSaved,
    onCancelar,
    mode = 'create',
    version,
    initialTablas,
    fromVersion
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const isEditVersion = mode === 'editVersion';

    const [direccionesCat, setDireccionesCat] = useState([]);
    const [loadingDirs, setLoadingDirs] = useState(false);
    const [errorDirs, setErrorDirs] = useState('');

    const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

    const [tablas, setTablas] = useState(
        Array.isArray(initialTablas) && initialTablas.length > 0
            ? initialTablas.map(t => ({
                id: t.id,
                titulo: t.titulo ?? '',
                headers: Array.isArray(t.headers) ? t.headers : [...DEFAULT_HEADERS],
                rows: Array.isArray(t.rows) ? t.rows : [],
                direcciones: Array.isArray(t.direcciones) ? t.direcciones : []
            }))
            : [nuevaTabla()]
    );

    useEffect(() => {
        const loadDirecciones = async () => {
            try {
                setLoadingDirs(true);
                setErrorDirs('');
                const authH = { headers: { 'x-access-token': localStorage.getItem('token') } };
                const { data } = await axios.get('/api/direcciones-actualizados', authH);
                const list = Array.isArray(data?.result) ? data.result : [];
                const cat = list.map(d => ({
                    id: Number(d.CODIGO_ENTIDAD),
                    nombre: String(d.NOMBRE || ''),
                    siglas: String(d.SIGLAS || '')
                }));
                setDireccionesCat(cat);
            } catch (e) {
                console.error('Error cargando direcciones', e);
                setErrorDirs('No se pudieron cargar las direcciones.');
            } finally {
                setLoadingDirs(false);
            }
        };
        loadDirecciones();
    }, []);

    useEffect(() => {
        if (Array.isArray(initialTablas) && initialTablas.length > 0) {
            setTablas(initialTablas.map(t => ({
                id: t.id,
                titulo: t.titulo ?? '',
                headers: Array.isArray(t.headers) ? t.headers : [...DEFAULT_HEADERS],
                rows: Array.isArray(t.rows) ? t.rows : [],
                direcciones: Array.isArray(t.direcciones) ? t.direcciones : []
            })));
        }
    }, [initialTablas]);

    const [active, setActive] = useState(0);
    const tabla = tablas[active];

    const setTablaPatch = (patch) => {
        setTablas(prev => {
            const copy = [...prev];
            copy[active] = { ...copy[active], ...patch };
            return copy;
        });
    };

    const setHeader = (idx, value) => {
        setTablas(prev => {
            const copy = [...prev];
            const t = { ...copy[active] };
            const headers = [...t.headers];
            headers[idx] = value;
            t.headers = headers;
            copy[active] = t;
            return copy;
        });
    };

    const setCell = (rIdx, cIdx, value) => {
        setTablas(prev => {
            const copy = [...prev];
            const t = { ...copy[active] };
            const rows = t.rows.map((r, i) => (i === rIdx ? [...r] : r));
            rows[rIdx][cIdx] = value;
            t.rows = rows;
            copy[active] = t;
            return copy;
        });
    };

    const addColumn = () => {
        setTablas(prev => {
            const copy = [...prev];
            const t = { ...copy[active] };
            t.headers = [...t.headers, ''];
            t.rows = t.rows.map(r => [...r, '']);
            copy[active] = t;
            return copy;
        });
    };

    const addRow = () => {
        setTablas(prev => {
            const copy = [...prev];
            const t = { ...copy[active] };
            t.rows = [...t.rows, Array(t.headers.length).fill('')];
            copy[active] = t;
            return copy;
        });
    };

    const agregarTabla = () => {
        setTablas(prev => [...prev, nuevaTabla()]);
        setActive(tablas.length);
    };

    const eliminarTablaActual = () => {
        if (tablas.length === 1) return;
        setTablas(prev => {
            const copy = prev.filter((_, idx) => idx !== active);
            setActive(Math.max(0, active - 1));
            return copy;
        });
    };

    const removeColumn = (colIdx) => {
        setTablas(prev => {
            const copy = [...prev];
            const t = { ...copy[active] };

            if (t.headers.length <= MIN_COLS) return copy;
            if (colIdx < 0 || colIdx >= t.headers.length) return copy;

            t.headers = t.headers.filter((_, i) => i !== colIdx);
            t.rows = t.rows.map(r => r.filter((_, i) => i !== colIdx));

            copy[active] = t;
            return copy;
        });
    };

    const removeRow = (rowIdx) => {
        setTablas(prev => {
            const copy = [...prev];
            const t = { ...copy[active] };

            if (t.rows.length <= MIN_ROWS) return copy;
            if (rowIdx < 0 || rowIdx >= t.rows.length) return copy;

            t.rows = t.rows.filter((_, i) => i !== rowIdx);

            copy[active] = t;
            return copy;
        });
    };

    const tablaValida = useMemo(() => {
        if (!tabla) return false;
        if (!tabla.headers.length) return false;
        if (tabla.headers.some(h => !String(h).trim())) return false;
        if (tabla.rows.length > 0 && tabla.rows.some(r => !String(r?.[0] ?? '').trim())) return false;
        if (tabla.rows.some(r => r.length !== tabla.headers.length)) return false;
        return true;
    }, [tabla]);

    const todoValido = useMemo(() => {
        return tablas.every(t => {
            if (!t.headers.length || t.headers.some(h => !String(h).trim())) return false;
            if (t.rows.length > 0 && t.rows.some(r => !String(r?.[0] ?? '').trim())) return false;
            if (t.rows.some(r => r.length !== t.headers.length)) return false;
            return true;
        });
    }, [tablas]);

    const guardarTodo = async () => {
        try {
            const matrices = tablas.map(t => ({
                id: t.id,
                matrizId: t.id,
                titulo: t.titulo?.trim() || null,
                columnas: { headers: t.headers },
                filas: t.rows,
                direcciones: Array.isArray(t.direcciones) ? t.direcciones : []
            }));

            const authH = { headers: { 'x-access-token': localStorage.getItem('token') } };

            if (isEditVersion) {
                await axios.put(
                    '/api/primera-matriz-actualizados/editar-version',
                    { periodo, version, matrices },
                    authH
                );
            } else {
                await axios.post(
                    '/api/primera-matriz-actualizados',
                    { periodo, matrices },
                    authH
                );
            }

            setSnack({
                open: true,
                msg: isEditVersion ? 'Versión actualizada correctamente' : 'Matrices guardadas correctamente',
                sev: 'success'
            });

            onSaved?.();
            if (!isEditVersion) {
                setTablas([nuevaTabla()]);
                setActive(0);
            }
        } catch (err) {
            console.error('Error al guardar matrices', err);
            setSnack({
                open: true,
                msg: 'Error al guardar matrices',
                sev: 'error'
            });
        }
    };

    const selectedChips = (ids = []) => {
        const map = new Map(direccionesCat.map(d => [d.id, d]));
        return ids
            .map(id => map.get(id))
            .filter(Boolean)
            .map(d => d.siglas || d.nombre);
    };

    const handleCloseSnack = (_e, reason) => {
        if (reason === 'clickaway') return;
        setSnack(prev => ({ ...prev, open: false }));
    };

    return (
        <Box sx={{ mt: 2, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">
                    {isEditVersion
                        ? `Editar versión completa — período ${periodo}, versión ${version}`
                        : `Crear matrices — período ${periodo}`}
                </Typography>
                <IconButton onClick={onCancelar}><Close /></IconButton>
            </Stack>

            {fromVersion && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Creando a partir de la versión v{fromVersion}
                </Typography>
            )}

            {loadingDirs && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2">Cargando direcciones…</Typography>
                </Stack>
            )}
            {!!errorDirs && (
                <Alert severity="warning" sx={{ mt: 2 }}>{errorDirs}</Alert>
            )}

            {!isMobile ? (
                <Stepper activeStep={active} sx={{ my: 3 }}>
                    {tablas.map((_, idx) => (
                        <Step key={idx}><StepLabel /></Step>
                    ))}
                </Stepper>
            ) : (
                <MobileStepper
                    variant="dots"
                    steps={tablas.length}
                    position="static"
                    activeStep={active}
                    nextButton={
                        <Button
                            size="small"
                            onClick={() => setActive(Math.min(tablas.length - 1, active + 1))}
                            disabled={active === tablas.length - 1}
                        >
                            Siguiente
                            {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
                        </Button>
                    }
                    backButton={
                        <Button
                            size="small"
                            onClick={() => setActive(Math.max(0, active - 1))}
                            disabled={active === 0}
                        >
                            {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
                            Anterior
                        </Button>
                    }
                    sx={{ my: 2 }}
                />
            )}

            {tabla && (
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="Título de la tabla"
                        value={tabla.titulo}
                        onChange={e => setTablaPatch({ titulo: e.target.value })}
                        fullWidth
                    />

                    <FormControl fullWidth>
                        <InputLabel id="label-direcciones">Direcciones a las que aplica (opcional)</InputLabel>
                        <Select
                            labelId="label-direcciones"
                            multiple
                            value={tabla.direcciones || []}
                            label="Direcciones a las que aplica (opcional)"
                            onChange={(e) => setTablaPatch({ direcciones: e.target.value })}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selectedChips(selected).map((t, i) => (
                                        <Chip key={`${t}-${i}`} size="small" label={t} />
                                    ))}
                                </Box>
                            )}
                            disabled={loadingDirs || !!errorDirs}
                        >
                            {direccionesCat.map((d) => (
                                <MenuItem key={d.id} value={d.id}>
                                    {d.siglas ? `[${d.siglas}] ${d.nombre}` : d.nombre}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="outlined" startIcon={<Add />} onClick={addColumn}>
                            Agregar columna
                        </Button>
                    </Box>

                    <Table
                        size="small"
                        sx={{
                            width: '100%',
                            tableLayout: 'fixed',
                            borderCollapse: 'collapse',
                            '& th, & td': { borderRight: '1px solid rgba(0,0,0,0.12)' },
                            '& th:last-of-type, & td:last-of-type': { borderRight: 'none' },
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                {tabla.headers.map((h, i) => (
                                    <TableCell key={`h-${i}`} sx={{ fontWeight: 'bold' }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label={`Columna ${i + 1}`}
                                                value={h}
                                                onChange={(e) => setHeader(i, e.target.value)}
                                            />
                                            <Tooltip title="Eliminar columna">
                                                <span>
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => removeColumn(i)}
                                                        disabled={tabla.headers.length <= MIN_COLS}
                                                        size="small"
                                                    >
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {tabla.rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={tabla.headers.length || 1} align="center">
                                        Sin filas
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tablas[active].rows.map((row, rIdx) => (
                                    <TableRow key={`r-${rIdx}`}>
                                        {row.map((cell, cIdx) => (
                                            <TableCell key={`c-${rIdx}-${cIdx}`}>
                                                {cIdx === 0 ? (
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            label="Título de fila"
                                                            placeholder="Ingrese el nombre de la fila"
                                                            value={cell}
                                                            onChange={(e) => setCell(rIdx, cIdx, e.target.value)}
                                                        />
                                                        <Tooltip title="Eliminar fila">
                                                            <span>
                                                                <IconButton
                                                                    aria-label="Eliminar fila"
                                                                    color="error"
                                                                    onClick={() => removeRow(rIdx)}
                                                                    disabled={tabla.rows.length <= MIN_ROWS}
                                                                    size="small"
                                                                    sx={{ flexShrink: 0 }}
                                                                >
                                                                    <Delete fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>
                                                ) : (
                                                    <Box sx={{ minHeight: 40 }} />
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <Box>
                        <Button variant="outlined" startIcon={<Add />} onClick={addRow} sx={{ mt: 1 }}>
                            Agregar fila
                        </Button>
                    </Box>

                    <Divider />

                    <Stack direction={{ md: 'row', xs: 'column' }} spacing={2} sx={{ pt: 1 }}>
                        <Button
                            variant="outlined"
                            onClick={() => setActive(Math.max(0, active - 1))}
                            disabled={active === 0}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => setActive(Math.min(tablas.length - 1, active + 1))}
                            disabled={active === tablas.length - 1}
                        >
                            Siguiente
                        </Button>
                        <Button variant="text" color="error" onClick={eliminarTablaActual} disabled={tablas.length === 1}>
                            Eliminar esta tabla
                        </Button>
                        <Box sx={{ flex: 1 }} />
                        <Button variant="contained" startIcon={<Add />} onClick={agregarTabla}>
                            Agregar otra tabla
                        </Button>
                    </Stack>
                </Stack>
            )}

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button variant="outlined" onClick={onCancelar}>Cancelar</Button>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" onClick={guardarTodo} disabled={!todoValido || !tablaValida}>
                    {isEditVersion ? 'Guardar versión' : 'Finalizar y guardar'}
                </Button>
            </Stack>

            <Snackbar
                open={snack.open}
                autoHideDuration={6000}
                onClose={handleCloseSnack}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnack} severity={snack.sev} variant="filled" sx={{ width: '100%' }}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
