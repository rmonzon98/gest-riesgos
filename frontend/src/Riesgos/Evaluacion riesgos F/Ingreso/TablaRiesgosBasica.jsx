/**
 * @fileoverview 
 * Tabla básica de riesgos con filtros y acciones de mantenimiento.
 *
 * Permite:
 * - Listar riesgos registrados con sus campos principales.
 * - Filtrar por referencia, descripción, estado y comentario del supervisor.
 * - Ejecutar acciones de edición, eliminación lógica y restauración.
 *
 * @module Riesgos/Evaluacion riesgos F/Ingreso/TablaRiesgosBasica.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useMemo, useState } from "react";
import {
    Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, IconButton, Tooltip, Typography, Box, Select, MenuItem, Stack,
    Chip
} from "@mui/material";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import RestoreRounded from "@mui/icons-material/RestoreRounded";

const normalize = (str = "") =>
    str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();


/**
 * TablaRiesgosBasica
 *
 * Muestra en una tabla los riesgos básicos de evaluación, con filtros rápidos
 * y acciones de mantenimiento (editar, eliminar, restaurar).
 *
 * - Recibe un arreglo de riesgos (`rows`) desde el componente padre.
 * - Mantiene un estado local de filtros por referencia, descripción, comentario y estado.
 * - Aplica los filtros de forma memoizada para no recalcular innecesariamente.
 * - Renderiza la tabla con:
 *   - Fila de encabezados.
 *   - Fila de filtros (inputs y combo de estado).
 *   - Fila por riesgo con:
 *       - Botón de edición (`onEdit`).
 *       - Botón de eliminación lógica (`onDelete`) o restauración (`onRestore`) según `ELIMINADO`.
 * - Muestra un mensaje cuando no hay resultados para los filtros actuales.
 *
 * @component
 * @param {Array<Object>} props.rows Lista de riesgos a mostrar.
 * @param {Function} [props.onEdit] Handler de edición de riesgo.
 * @param {Function} [props.onDelete] Handler de eliminación lógica de riesgo.
 * @param {Function} [props.onRestore] Handler de restauración de riesgo eliminado.
 * @returns {JSX.Element}
 */
export default function TablaRiesgosBasica({ rows = [], onEdit, onDelete, onRestore }) {
    const [filters, setFilters] = useState({
        ref: "",
        descripcion: "",
        comentario: "",
        estado: ""
    });

    const filtered = useMemo(() => {
        const fRef = normalize(filters.ref);
        const fDesc = normalize(filters.descripcion);
        const fCom = normalize(filters.comentario);
        const fEstado = filters.estado;

        return (Array.isArray(rows) ? rows : []).filter((r) => {
            const ref = normalize(r.REF ?? "");
            const desc = normalize(r.DESCRIPCION ?? "");
            const com = normalize(r.COMENTARIO_SUPERVISOR ?? "");

            const okRef = !fRef || ref.includes(fRef);
            const okDesc = !fDesc || desc.includes(fDesc);
            const okCom = !fCom || com.includes(fCom);
            const okEstado = fEstado === "" || Number(r.ESTADO) === Number(fEstado);

            return okRef && okDesc && okCom && okEstado;
        });
    }, [rows, filters]);

    return (
        <Paper elevation={3} sx={{ borderRadius: 2 }}>
            <TableContainer sx={{ maxHeight: 520 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 140 }}>Acciones</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>Referencia</TableCell>
                            <TableCell sx={{ minWidth: 360 }}>Descripción</TableCell>
                            <TableCell sx={{ minWidth: 150 }}>Estado</TableCell>
                            <TableCell sx={{ minWidth: 240 }}>Comentario supervisor</TableCell>
                        </TableRow>

                        <TableRow>
                            <TableCell />
                            <TableCell>
                                <TextField
                                    fullWidth size="small" placeholder="Filtrar referencia"
                                    value={filters.ref}
                                    onChange={(e) => setFilters((s) => ({ ...s, ref: e.target.value }))}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    fullWidth size="small" placeholder="Filtrar descripción"
                                    value={filters.descripcion}
                                    onChange={(e) => setFilters((s) => ({ ...s, descripcion: e.target.value }))}
                                />
                            </TableCell>
                            <TableCell>
                                <Select
                                    fullWidth size="small" displayEmpty
                                    value={filters.estado}
                                    onChange={(e) => setFilters((s) => ({ ...s, estado: e.target.value }))}
                                >
                                    <MenuItem value=""><em>Todos</em></MenuItem>
                                    <MenuItem value={0}>Pendiente revisión</MenuItem>
                                    <MenuItem value={1}>Aprobado</MenuItem>
                                    <MenuItem value={2}>Rechazado</MenuItem>
                                </Select>
                            </TableCell>
                            <TableCell>
                                <TextField
                                    fullWidth size="small" placeholder="Filtrar comentario"
                                    value={filters.comentario}
                                    onChange={(e) => setFilters((s) => ({ ...s, comentario: e.target.value }))}
                                />
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {filtered.length ? (
                            filtered.map((r, i) => (
                                <TableRow
                                    key={`${r.CODIGO_RIESGO}-${i}`}
                                    hover
                                    sx={{
                                        cursor: "pointer",
                                        bgcolor: r.ELIMINADO ? "error.lighter" : "inherit",
                                        "&:nth-of-type(odd)": { bgcolor: r.ELIMINADO ? "error.lighter" : "action.hover" }
                                    }}
                                >
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5}>
                                            <Tooltip title="Editar">
                                                <IconButton size="small" onClick={() => onEdit?.(r)}>
                                                    <EditRounded fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {!r.ELIMINADO ? (
                                                <Tooltip title="Eliminar riesgo">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => onDelete?.(r)}
                                                    >
                                                        <DeleteRounded fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title="Restablecer riesgo">
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        onClick={() => onRestore?.(r)}
                                                    >
                                                        <RestoreRounded fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{r.REF}</TableCell>
                                    <TableCell>{r.DESCRIPCION}</TableCell>
                                    <TableCell>
                                        <Chip size="small" color={r.ESTADO === 1 ? 'success' : r.ESTADO === 0 ? 'info' : 'error'}
                                            label={r.ESTADO === 0 ? "Pendiente revisión" : r.ESTADO === 1 ? "Aprobado" : "Rechazado"} />
                                    </TableCell>
                                    <TableCell>{r.COMENTARIO_SUPERVISOR}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Box py={2}>
                                        <Typography variant="body2" color="text.secondary">
                                            No hay resultados con los filtros actuales.
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
