/**
 * @fileoverview
 * Asistente para crear y editar matrices que conforman el Anexo 2.
 *
 * @module Riesgos/Anexo 2/CrearMatrices.jsx
 * @version 1.1
 * @author Equipo
 */

import React, { useMemo, useState, useEffect } from 'react';
import apiClient from 'api/apiClient';
import {
    Stepper, Step, StepLabel, Button, TextField, Stack, Box, Typography,
    IconButton, useMediaQuery, MobileStepper, Table, TableHead, TableRow, TableCell,
    TableBody, Divider, Tooltip, TableContainer, Snackbar, Alert
} from '@mui/material';
import { Add, Close, KeyboardArrowLeft, KeyboardArrowRight, Delete } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const FIXED_TAIL = ['Aplica', 'Comentario'];
const DEFAULT_FREE_HEADERS = ['Fuentes de eventos', 'Evento', 'Riesgo', 'Indicadores claves de riesgo'];
const MIN_FREE_COLS = 1;
const MIN_ROWS = 0;
const TIPO_MATRIZ = 2;

const buildHeaders = (free = DEFAULT_FREE_HEADERS) => [...free, ...FIXED_TAIL];

/**
 * Crea una estructura de tabla vacía para iniciar la definición de una matriz.
 */
const nuevaTabla = () => ({
    titulo: '',
    headers: buildHeaders(),
    rows: [],
});

/**
 * CrearMatrices
 *
 * Componente principal del módulo.
 *
 * - Orquesta su estado interno y renderiza la UI del flujo correspondiente.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function CrearMatrices({
    periodo,
    apiBase = '/api/segunda-matriz-actualizados',
    onSaved,
    onCancelar,
    initialTablas,
    fromVersion
}) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [active, setActive] = useState(0);
    const [tablas, setTablas] = useState(
        Array.isArray(initialTablas) && initialTablas.length > 0
            ? initialTablas.map(t => ({
                titulo: t.titulo ?? '',
                headers: Array.isArray(t.headers) ? t.headers : buildHeaders(),
                rows: Array.isArray(t.rows) ? t.rows : [],
            }))
            : [nuevaTabla()]
    );

    const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

    useEffect(() => {
        if (Array.isArray(initialTablas) && initialTablas.length > 0) {
            setTablas(initialTablas.map(t => ({
                titulo: t.titulo ?? '',
                headers: Array.isArray(t.headers) ? t.headers : buildHeaders(),
                rows: Array.isArray(t.rows) ? t.rows : [],
            })));
            setActive(0);
        }
    }, [initialTablas]);

    const handleCloseSnack = (_e, reason) => {
        if (reason === 'clickaway') return;
        setSnack(prev => ({ ...prev, open: false }));
    };

    const tabla = tablas[active];

    // Helpers
    const isFixedCol = (headers, idx) => {
        const tailStart = headers.length - FIXED_TAIL.length;
        return idx >= tailStart;
    };

    const getFreeHeaders = (headers) => headers.slice(0, headers.length - FIXED_TAIL.length);

    /**
     * Actualiza parcialmente la tabla activa sin perder el resto de propiedades.
     */
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
            if (isFixedCol(t.headers, idx)) return copy;
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
            if (isFixedCol(t.headers, cIdx)) return copy; // Aplica / Comentario no se editan aquí

            const rows = t.rows.map((r, i) => (i === rIdx ? [...r] : r));
            rows[rIdx][cIdx] = value;
            t.rows = rows;
            copy[active] = t;
            return copy;
        });
    };

    /**
     * Agrega una nueva columna a la tabla en edición.
     */
    const addColumn = () => {
        setTablas(prev => {
            const copy = [...prev];
            const t = { ...copy[active] };
            const free = getFreeHeaders(t.headers);

            const newHeaders = [...free, '', ...FIXED_TAIL];
            const tailLen = FIXED_TAIL.length;
            const insertIdx = newHeaders.length - tailLen - 1;

            const newRows = t.rows.map(r => {
                const nr = [...r];
                nr.splice(insertIdx, 0, '');
                return nr;
            });

            t.headers = newHeaders;
            t.rows = newRows;
            copy[active] = t;
            return copy;
        });
    };

    const removeColumn = (colIdx) => {
        setTablas(prev => {
            const copy = [...prev];
            const t = { ...copy[active] };
            if (isFixedCol(t.headers, colIdx)) return copy;

            const free = getFreeHeaders(t.headers);
            if (free.length <= MIN_FREE_COLS) return copy;

            t.headers = t.headers.filter((_, i) => i !== colIdx);
            t.rows = t.rows.map(r => r.filter((_, i) => i !== colIdx));

            copy[active] = t;
            return copy;
        });
    };

    /**
     * Agrega una nueva fila al final de la tabla en edición.
     */
    const addRow = () => {
        setTablas(prev => {
            const copy = [...prev];
            const t = { ...copy[active] };
            t.rows = [...t.rows, Array(t.headers.length).fill('')];
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

    const agregarTabla = () => {
        setTablas(prev => {
            const next = [...prev, nuevaTabla()];
            setActive(next.length - 1);
            return next;
        });
    };

    const eliminarTablaActual = () => {
        if (tablas.length === 1) return;
        setTablas(prev => {
            const next = prev.filter((_, idx) => idx !== active);
            const newActive = Math.max(0, Math.min(active, next.length - 1));
            setActive(newActive);
            return next;
        });
    };

    // Validaciones
    const tablaValida = useMemo(() => {
        if (!tabla) return false;
        if (!tabla.headers.length) return false;

        const free = getFreeHeaders(tabla.headers);
        if (free.length < MIN_FREE_COLS) return false;
        if (free.some(h => !String(h).trim())) return false;

        if (tabla.rows.some(r => r.length !== tabla.headers.length)) return false;
        return true;
    }, [tabla]);

    const todoValido = useMemo(() => {
        if (!periodo) return false;
        return tablas.every(t => {
            if (!t.headers.length) return false;
            const free = getFreeHeaders(t.headers);
            if (free.length < MIN_FREE_COLS) return false;
            if (free.some(h => !String(h).trim())) return false;
            if (t.rows.some(r => r.length !== t.headers.length)) return false;
            return true;
        });
    }, [tablas, periodo]);

    /**
     * Ensambla todas las tablas definidas en un arreglo de matrices y lo envía al backend.
     */
    const guardarTodo = async () => {
        if (!periodo) {
            setSnack({ open: true, msg: 'Seleccione un período válido antes de guardar.', sev: 'warning' });
            return;
        }
        if (!todoValido) {
            setSnack({ open: true, msg: 'Revise los encabezados y las filas antes de guardar.', sev: 'warning' });
            return;
        }

        try {
            const sanitizeRow = (headers, row) => {
                const tailStart = headers.length - FIXED_TAIL.length;
                return row.map((v, idx) => (idx >= tailStart ? '' : v));
            };

            const matrices = tablas.map((t, idx) => ({
                matriz: idx + 1, // índice de tabla (1-based)
                titulo: t.titulo?.trim() || null,
                columnas: { headers: t.headers },
                filas: t.rows.map(r => sanitizeRow(t.headers, r)),
                obligatorio: 1
            }));

            const { data } = await apiClient.post(
                apiBase,
                { periodo, tipo: TIPO_MATRIZ, matrices }
            );

            setSnack({ open: true, msg: 'Matrices guardadas correctamente.', sev: 'success' });
            onSaved?.(data);

            // Opcional: limpiar el formulario después de guardar
            setTablas([nuevaTabla()]);
            setActive(0);
        } catch (err) {
            console.error('Error al guardar matrices Anexo 2', err);
            setSnack({ open: true, msg: 'Error al guardar matrices Anexo 2. Intenta de nuevo.', sev: 'error' });
        }
    };

    return (
        <Box sx={{ mt: 2, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">
                    Crear matrices (Anexo 2) — período {periodo}
                </Typography>
                <IconButton onClick={onCancelar}>
                    <Close />
                </IconButton>
            </Stack>

            {fromVersion && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Creando a partir de la versión v{fromVersion}
                </Typography>
            )}

            {!isMobile ? (
                <Stepper activeStep={active} sx={{ my: 3 }}>
                    {tablas.map((t, idx) => (
                        <Step key={idx}>
                            <StepLabel>
                                {t.titulo?.trim()
                                    ? `Tabla ${idx + 1}`
                                    : `Tabla ${idx + 1}`}
                            </StepLabel>
                        </Step>
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

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="outlined" startIcon={<Add />} onClick={addColumn}>
                            Agregar columna
                        </Button>
                    </Box>

                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table
                            size="small"
                            sx={{
                                width: '100%',
                                tableLayout: 'fixed',
                                borderCollapse: 'collapse',
                                minWidth: 600,
                                '& th, & td': { borderRight: '1px solid rgba(0,0,0,0.12)' },
                                '& th:last-of-type, & td:last-of-type': { borderRight: 'none' },
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    {tabla.headers.map((h, i) => (
                                        <TableCell key={`h-${i}`} sx={{ fontWeight: 'bold', width: '400px' }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                {isFixedCol(tabla.headers, i) ? (
                                                    <TextField
                                                        fullWidth
                                                        size="small"
                                                        value={h}
                                                        label={`Columna ${i + 1}`}
                                                        InputProps={{ readOnly: true }}
                                                    />
                                                ) : (
                                                    <TextField
                                                        fullWidth
                                                        size="small"
                                                        label={`Columna ${i + 1}`}
                                                        value={h}
                                                        onChange={(e) => setHeader(i, e.target.value)}
                                                    />
                                                )}
                                                <Tooltip title="Eliminar columna">
                                                    <span>
                                                        <IconButton
                                                            color="error"
                                                            onClick={() => removeColumn(i)}
                                                            disabled={
                                                                isFixedCol(tabla.headers, i) ||
                                                                getFreeHeaders(tabla.headers).length <= MIN_FREE_COLS
                                                            }
                                                            size="small"
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    ))}
                                    {/* Columna de acciones */}
                                    <TableCell sx={{ fontWeight: 'bold', width: 80 }}>
                                        Acciones
                                    </TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {tabla.rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={(tabla.headers.length || 1) + 1}
                                            align="center"
                                        >
                                            Sin filas
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tabla.rows.map((row, rIdx) => (
                                        <TableRow key={`r-${rIdx}`}>
                                            {row.map((cell, cIdx) => (
                                                <TableCell key={`c-${rIdx}-${cIdx}`}>
                                                    {isFixedCol(tabla.headers, cIdx) ? (
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            value=""
                                                            placeholder="(auto / no editable)"
                                                            InputProps={{ readOnly: true }}
                                                        />
                                                    ) : (
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            multiline
                                                            maxRows={3}
                                                            value={cell}
                                                            onChange={(e) => setCell(rIdx, cIdx, e.target.value)}
                                                        />
                                                    )}
                                                </TableCell>
                                            ))}
                                            <TableCell sx={{ width: 80 }}>
                                                <Tooltip title="Eliminar fila">
                                                    <span>
                                                        <IconButton
                                                            color="error"
                                                            onClick={() => removeRow(rIdx)}
                                                            disabled={tabla.rows.length <= MIN_ROWS}
                                                            size="small"
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

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
                        <Button
                            variant="text"
                            color="error"
                            onClick={eliminarTablaActual}
                            disabled={tablas.length === 1}
                        >
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
                <Button variant="outlined" onClick={onCancelar}>
                    Cancelar
                </Button>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" onClick={guardarTodo} disabled={!todoValido}>
                    Finalizar y guardar
                </Button>
            </Stack>

            <Snackbar
                open={snack.open}
                autoHideDuration={6000}
                onClose={handleCloseSnack}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnack}
                    severity={snack.sev}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
