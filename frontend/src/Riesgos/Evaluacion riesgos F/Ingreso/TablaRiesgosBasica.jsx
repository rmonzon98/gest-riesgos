import { useMemo, useState } from "react";
import {
    Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, IconButton, Tooltip, Typography, Box, Select, MenuItem, Stack,
    Chip
} from "@mui/material";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import RestoreRounded from "@mui/icons-material/RestoreRounded";
import OrigenRiesgo, { ORIGEN, ORIGEN_LABEL, tipoOrigen } from "funciones/OrigenRiesgo";

const normalize = (str = "") =>
    str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Estado de revisi\u00f3n (0 pendiente, 1 aprobado/recibido, 2 rechazado/revisi\u00f3n) con su comentario debajo
function EstadoConComentario({ estado, labels, comentario }) {
    const color = estado === 1 ? "success" : estado === 2 ? "error" : "warning";
    const label = labels[estado === 1 || estado === 2 ? estado : 0];
    return (
        <Stack spacing={0.5} alignItems="flex-start">
            <Chip size="small" color={color} label={label} />
            {comentario && (
                <Typography variant="caption" color="text.secondary">
                    {comentario}
                </Typography>
            )}
        </Stack>
    );
}

export default function TablaRiesgosBasica({ rows = [], onEdit, onDelete, onRestore }) {
    const [filters, setFilters] = useState({
        ref: "",
        descripcion: "",
        comentario: "",
        estado: "",
        estadoSuperior: "",
        comentarioSuperior: "",
        origen: "" // "" todos | ORIGEN.SEGUIMIENTO | ORIGEN.EN_PERIODO
    });

    const filtered = useMemo(() => {
        const fRef = normalize(filters.ref);
        const fDesc = normalize(filters.descripcion);
        const fCom = normalize(filters.comentario);
        const fEstado = filters.estado;
        const fEstadoSuperior = filters.estadoSuperior;
        const fComentarioSuperior = normalize(filters.comentarioSuperior);

        // Orden: por año de origen (más antiguo primero); los eliminados siempre al final.
        // El sort es estable, así que dentro del mismo año se conserva el orden del backend.
        const anio = (r) => Number(r.ANIO_ORIGEN) || Number.MAX_SAFE_INTEGER;
        const ordenados = [...(Array.isArray(rows) ? rows : [])].sort(
            (a, b) => (Number(!!a.ELIMINADO) - Number(!!b.ELIMINADO)) || (anio(a) - anio(b))
        );

        return ordenados.filter((r) => {
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
            const okOrigen = filters.origen === "" || tipoOrigen(r) === filters.origen;

            return (
                okRef &&
                okDesc &&
                okCom &&
                okEstado &&
                okEstadoSuperior &&
                okComentarioSuperior &&
                okOrigen
            );
        });
    }, [rows, filters]);

    return (
        <Paper elevation={3} sx={{ borderRadius: 2 }}>
            <TableContainer sx={{ maxHeight: 520 }}>
                {/* Ancho fijo al 100%: las columnas se reparten el espacio y el texto hace salto de línea (sin scroll horizontal) */}
                <Table
                    stickyHeader
                    size="small"
                    sx={{
                        tableLayout: "fixed",
                        width: "100%",
                        "& td, & th": { wordBreak: "break-word", verticalAlign: "top" }
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 88 }}>Acciones</TableCell>
                            <TableCell sx={{ width: "13%" }}>Origen</TableCell>
                            <TableCell sx={{ width: "13%" }}>Referencia</TableCell>
                            <TableCell>Descripción</TableCell>
                            <TableCell sx={{ width: "20%" }}>Revisión superior</TableCell>
                            <TableCell sx={{ width: "20%" }}>Revisión consolidador</TableCell>
                        </TableRow>

                        <TableRow>
                            <TableCell />
                            <TableCell>
                                <Select
                                    fullWidth
                                    size="small"
                                    displayEmpty
                                    value={filters.origen}
                                    onChange={(e) => setFilters((s) => ({ ...s, origen: e.target.value }))}
                                >
                                    <MenuItem value=""><em>Todos</em></MenuItem>
                                    <MenuItem value={ORIGEN.SEGUIMIENTO}>{ORIGEN_LABEL[ORIGEN.SEGUIMIENTO]}</MenuItem>
                                    <MenuItem value={ORIGEN.EN_PERIODO}>{ORIGEN_LABEL[ORIGEN.EN_PERIODO]}</MenuItem>
                                </Select>
                            </TableCell>
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
                                <Stack spacing={1}>
                                    <Select
                                        fullWidth
                                        size="small"
                                        displayEmpty
                                        value={filters.estadoSuperior}
                                        onChange={(e) => setFilters((s) => ({ ...s, estadoSuperior: e.target.value }))}
                                    >
                                        <MenuItem value=""><em>Todos los estados</em></MenuItem>
                                        <MenuItem value={0}>Pendiente revisión</MenuItem>
                                        <MenuItem value={1}>Aprobado</MenuItem>
                                        <MenuItem value={2}>Rechazado</MenuItem>
                                    </Select>
                                </Stack>
                            </TableCell>
                            <TableCell>
                                <Stack spacing={1}>
                                    <Select
                                        fullWidth
                                        size="small"
                                        displayEmpty
                                        value={filters.estado}
                                        onChange={(e) => setFilters((s) => ({ ...s, estado: e.target.value }))}
                                    >
                                        <MenuItem value=""><em>Todos los estados</em></MenuItem>
                                        <MenuItem value={0}>Pendiente revisión</MenuItem>
                                        <MenuItem value={1}>Recibido</MenuItem>
                                        <MenuItem value={2}>Se necesita revisión</MenuItem>
                                    </Select>
                                </Stack>
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

                                    <TableCell>
                                        <OrigenRiesgo riesgo={r} />
                                    </TableCell>
                                    <TableCell>{r.REF}</TableCell>
                                    <TableCell>{r.DESCRIPCION}</TableCell>

                                    <TableCell>
                                        <EstadoConComentario
                                            estado={r.ESTADO_SUPERIOR}
                                            labels={["Pendiente revisión", "Aprobado", "Rechazado"]}
                                            comentario={r.COMENTARIO_SUPERIOR}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <EstadoConComentario
                                            estado={r.ESTADO}
                                            labels={["Pendiente revisión", "Recibido", "Se necesita revisión"]}
                                            comentario={r.COMENTARIO_SUPERVISOR}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
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