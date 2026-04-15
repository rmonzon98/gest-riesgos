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

export default function TablaRiesgosBasica({ rows = [], onEdit, onDelete, onRestore }) {
    const [filters, setFilters] = useState({
        ref: "",
        descripcion: "",
        comentario: "",
        estado: "",
        estadoSuperior: "",
        comentarioSuperior: ""
    });

    const filtered = useMemo(() => {
        const fRef = normalize(filters.ref);
        const fDesc = normalize(filters.descripcion);
        const fCom = normalize(filters.comentario);
        const fEstado = filters.estado;
        const fEstadoSuperior = filters.estadoSuperior;
        const fComentarioSuperior = normalize(filters.comentarioSuperior);

        return (Array.isArray(rows) ? rows : []).filter((r) => {
            const ref = normalize(r.REF ?? "");
            const desc = normalize(r.DESCRIPCION ?? "");
            const com = normalize(r.COMENTARIO_SUPERVISOR ?? "");
            const comSuperior = normalize(r.COMENTARIO_SUPERIOR ?? "");

            const okRef = !fRef || ref.includes(fRef);
            const okDesc = !fDesc || desc.includes(fDesc);
            const okCom = !fCom || com.includes(fCom);
            const okEstado = fEstado === "" || Number(r.ESTADO) === Number(fEstado);
            const okEstadoSuperior =
                fEstadoSuperior === "" || Number(r.ESTADO_SUPERIOR) === Number(fEstadoSuperior);
            const okComentarioSuperior =
                !fComentarioSuperior || comSuperior.includes(fComentarioSuperior);

            return (
                okRef &&
                okDesc &&
                okCom &&
                okEstado &&
                okEstadoSuperior &&
                okComentarioSuperior
            );
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
                            <TableCell sx={{ minWidth: 150 }}>Estado supervisor</TableCell>
                            <TableCell sx={{ minWidth: 240 }}>Comentario supervisor</TableCell>
                            <TableCell sx={{ minWidth: 240 }}>Estado superior</TableCell>
                            <TableCell sx={{ minWidth: 240 }}>Comentario superior</TableCell>
                        </TableRow>

                        <TableRow>
                            <TableCell />
                            <TableCell>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Filtrar referencia"
                                    value={filters.ref}
                                    onChange={(e) => setFilters((s) => ({ ...s, ref: e.target.value }))}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Filtrar descripción"
                                    value={filters.descripcion}
                                    onChange={(e) => setFilters((s) => ({ ...s, descripcion: e.target.value }))}
                                />
                            </TableCell>
                            <TableCell>
                                <Select
                                    fullWidth
                                    size="small"
                                    displayEmpty
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
                                    fullWidth
                                    size="small"
                                    placeholder="Filtrar comentario"
                                    value={filters.comentario}
                                    onChange={(e) => setFilters((s) => ({ ...s, comentario: e.target.value }))}
                                />
                            </TableCell>
                            <TableCell>
                                <Select
                                    fullWidth
                                    size="small"
                                    displayEmpty
                                    value={filters.estadoSuperior}
                                    onChange={(e) => setFilters((s) => ({ ...s, estadoSuperior: e.target.value }))}
                                >
                                    <MenuItem value=""><em>Todos</em></MenuItem>
                                    <MenuItem value={0}>Pendiente revisión</MenuItem>
                                    <MenuItem value={1}>Aprobado</MenuItem>
                                    <MenuItem value={2}>Rechazado</MenuItem>
                                </Select>
                            </TableCell>
                            <TableCell>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Filtrar comentario superior"
                                    value={filters.comentarioSuperior}
                                    onChange={(e) => setFilters((s) => ({ ...s, comentarioSuperior: e.target.value }))}
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
                                        "&:nth-of-type(odd)": {
                                            bgcolor: r.ELIMINADO ? "error.lighter" : "action.hover"
                                        }
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
                                        <Chip
                                            size="small"
                                            color={
                                                r.ESTADO === 1 ? "success" :
                                                    r.ESTADO === 0 ? "info" :
                                                        "error"
                                            }
                                            label={
                                                r.ESTADO === 0 ? "Pendiente revisión" :
                                                    r.ESTADO === 1 ? "Aprobado" :
                                                        "Rechazado"
                                            }
                                        />
                                    </TableCell>

                                    <TableCell>{r.COMENTARIO_SUPERVISOR}</TableCell>

                                    <TableCell>
                                        <Chip
                                            size="small"
                                            color={
                                                r.ESTADO_SUPERIOR === 1 ? "success" :
                                                    r.ESTADO_SUPERIOR === 0 ? "info" :
                                                        "error"
                                            }
                                            label={
                                                r.ESTADO_SUPERIOR === 0 ? "Pendiente revisión" :
                                                    r.ESTADO_SUPERIOR === 1 ? "Aprobado" :
                                                        "Rechazado"
                                            }
                                        />
                                    </TableCell>

                                    <TableCell>{r.COMENTARIO_SUPERIOR}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
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