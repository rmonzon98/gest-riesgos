// src/Administracion/Logs.jsx
import { useState, useEffect } from "react";
import apiClient from "api/apiClient";

import {
    Box,
    Typography,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TextField,
    IconButton,
    Paper,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert,
    MenuItem,
    TablePagination,
    Checkbox,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";

import { ReporteLogs } from "./../../Reportes F/Administracion/ReporteLogs";

// === Listas permitidas ===
const TABLAS_RIESGOS = [
    "riesgos_area",
    "riesgos_colaborador_superior",
    "riesgos_documentos",
    "riesgos_frecuencia",
    "riesgos_informe_anual",
    "riesgos_matriz_insti",
    "riesgos_mitigacion",
    "riesgos_objetivo",
    "riesgos_organos",
    "riesgos_periodo",
    "riesgos_primera_matriz",
    "riesgos_primera_matriz_est",
    "riesgos_primera_matriz_his",
    "riesgos_probabilidad",
    "riesgos_reportes_propiedades",
    "riesgos_riesgo_extendido",
    "riesgos_riesgo_propiedades",
    "riesgos_riesgo_propiedades_versiones",
    "riesgos_seguimiento",
    "riesgos_seguimiento_docs",
    "riesgos_seguimiento_reporte",
    "riesgos_segunda_matriz",
    "riesgos_segunda_matriz_est",
    "riesgos_segunda_matriz_his",
    "riesgos_severidad",
    "riesgos_tipo_objetivo",
    "riesgos_tolerancia",
    "riesgos_viceministerio",
];

const TABLAS_SEGURIDAD = [
    "seguridad_aplicacion",
    "seguridad_dependencia",
    "seguridad_entidad",
    "seguridad_institucion",
    "seguridad_institucion_acceso_app",
    "seguridad_menu_rol",
    "seguridad_menu_rol_url",
    "seguridad_menu_rol_usuario",
    "seguridad_menu_urls",
    "seguridad_persona",
    "seguridad_unidad_ejecutora",
    "seguridad_viceministerio",
];

// ===== Helpers para origen (gestor BD vs sistema) =====
const parseNumberSafe = (value) => {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
};

const collectNumbersFromInfo = (info, candidates) => {
    if (!info || typeof info !== "object") return;

    const keysToCheck = [
        "CODIGO_COLABORADOR",
        "codigo_colaborador",
        "CODIGO_USUARIO",
        "codigo_usuario",
        "USUARIO",
        "usuario",
    ];

    keysToCheck.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(info, k)) {
            const n = parseNumberSafe(info[k]);
            if (n !== null) candidates.push(n);
        }
    });

    if (info.registro && typeof info.registro === "object") {
        collectNumbersFromInfo(info.registro, candidates);
    }
};

const isFromDBTool = (log) => {
    const candidates = [];

    const cia = parseNumberSafe(log.codigo_cia);
    const usr = parseNumberSafe(log.usuario_creacion);

    if (cia !== null) candidates.push(cia);
    if (usr !== null) candidates.push(usr);

    try {
        const infoObj =
            typeof log.informacion === "string"
                ? JSON.parse(log.informacion)
                : log.informacion;
        collectNumbersFromInfo(infoObj, candidates);
    } catch {
        // ignorar errores de parseo
    }

    return candidates.some((n) => n === 0 || n === -1);
};

const origenTexto = (log) =>
    isFromDBTool(log)
        ? "Gestor de base de datos (fuera del sistema)"
        : "Sistema (aplicación web)";

const getAccionTexto = (accion) => {
    const n = Number(accion);
    if (n === 1) return "INSERT";
    if (n === 2) return "UPDATE";
    if (n === 3) return "DELETE";
    return String(accion ?? "");
};

const formatFecha = (fecha) => {
    if (!fecha) return "";
    try {
        return new Date(fecha).toLocaleString("es-GT");
    } catch {
        return String(fecha);
    }
};

function Logs() {
    // === Snackbar ===
    const [snackbar, setSnackbar] = useState({
        open: false,
        severity: "info",
        message: "",
    });

    const mostrarSnackbar = (severity, message) => {
        setSnackbar({ open: true, severity, message });
    };

    const handleCloseSnackbar = (_, reason) => {
        if (reason === "clickaway") return;
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const [nombreTabla, setNombreTabla] = useState("");
    const [listaLogs, setListaLogs] = useState([]);
    const [listaFiltrada, setListaFiltrada] = useState([]);

    // filtros
    const [filtroAccion, setFiltroAccion] = useState("");
    const [filtroTabla, setFiltroTabla] = useState("");

    // paginación
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // selección
    const [selectedIds, setSelectedIds] = useState({});

    // modal detalle
    const [showDetalle, setShowDetalle] = useState(false);
    const [logSeleccionado, setLogSeleccionado] = useState(null);

    const obtenerLogs = async () => {
        if (!nombreTabla) {
            mostrarSnackbar("error", "Debes seleccionar una tabla.");
            setListaLogs([]);
            return;
        }

        try {
            const response = await apiClient.get(
                "/api/administracion-actualizados/obtener-logs",
                {
                    params: { tabla: nombreTabla },
                }
            );

            if (!response.data.ok) {
                throw new Error(response.data.msg || "Error al obtener logs");
            }

            const data = Array.isArray(response.data.data)
                ? response.data.data
                : [];

            // Añadimos un id interno estable por fila
            const dataWithIds = data.map((log, idx) => ({
                ...log,
                _id: `${log.codigo_cia ?? "x"}-${log.codigo_log ?? "x"
                    }-${log.nombre_tabla ?? "x"}-${idx}`,
            }));

            setListaLogs(dataWithIds);
            setSelectedIds({});
            setPage(0); // reset página al recargar

            if (dataWithIds.length === 0) {
                mostrarSnackbar(
                    "info",
                    "No se encontraron logs para la tabla seleccionada."
                );
            } else {
                mostrarSnackbar("success", "Logs cargados correctamente.");
            }
        } catch (error) {
            console.error("Error al obtener logs:", error);
            const msg =
                error.response?.data?.msg ||
                error.message ||
                "Error inesperado al obtener logs.";
            mostrarSnackbar("error", msg);
            setListaLogs([]);
            setSelectedIds({});
        }
    };

    // Filtrado local (acción + nombre tabla)
    useEffect(() => {
        const filtrado = listaLogs.filter((log) => {
            const accion = getAccionTexto(log.accion)
                .toLowerCase()
                .includes(filtroAccion.toLowerCase());

            const tabla = String(log.nombre_tabla || "")
                .toLowerCase()
                .includes(filtroTabla.toLowerCase());

            return accion && tabla;
        });

        setListaFiltrada(filtrado);
        setPage(0); // cada vez que cambia filtro, regresar a primera página
    }, [listaLogs, filtroAccion, filtroTabla]);

    const abrirDetalle = (log) => {
        setLogSeleccionado(log);
        setShowDetalle(true);
    };

    const cerrarDetalle = () => {
        setShowDetalle(false);
        setLogSeleccionado(null);
    };

    const informacionPretty = (() => {
        if (!logSeleccionado || logSeleccionado.informacion == null) return "";
        const raw = logSeleccionado.informacion;

        if (typeof raw === "object") {
            try {
                return JSON.stringify(raw, null, 2);
            } catch {
                return String(raw);
            }
        }

        try {
            const parsed = JSON.parse(raw);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return String(raw);
        }
    })();

    const handleChangePage = (_, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // filas a mostrar según paginación
    const rowsToShow = listaFiltrada.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const toggleSelect = (log) => {
        if (!log?._id) return;
        setSelectedIds((prev) => ({
            ...prev,
            [log._id]: !prev[log._id],
        }));
    };

    const logsSeleccionados = listaLogs.filter((log) => selectedIds[log._id]);

    const handleImprimirSeleccionados = () => {
        if (logsSeleccionados.length === 0) {
            mostrarSnackbar(
                "info",
                "Debes seleccionar al menos un log para imprimir."
            );
            return;
        }

        ReporteLogs(logsSeleccionados, {
            subtitulo: `Tabla: ${nombreTabla}`,
        });
    };

    const handleImprimirDetalle = () => {
        if (!logSeleccionado) return;
        ReporteLogs([logSeleccionado], {
            subtitulo: `Tabla: ${logSeleccionado.nombre_tabla}`,
        });
    };

    return (
        <Box p={3}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                Bitácora de logs
            </Typography>

            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
                <TextField
                    select
                    label="Tabla"
                    variant="outlined"
                    size="small"
                    value={nombreTabla}
                    onChange={(e) => setNombreTabla(e.target.value)}
                    sx={{ minWidth: 320 }}
                >
                    <MenuItem value="" disabled>
                        Seleccionar tabla...
                    </MenuItem>

                    <MenuItem disabled sx={{ fontWeight: 700 }}>
                        --- Riesgos ---
                    </MenuItem>
                    {TABLAS_RIESGOS.map((tabla) => (
                        <MenuItem key={tabla} value={tabla}>
                            {tabla}
                        </MenuItem>
                    ))}

                    <MenuItem disabled sx={{ fontWeight: 700 }}>
                        --- Seguridad ---
                    </MenuItem>
                    {TABLAS_SEGURIDAD.map((tabla) => (
                        <MenuItem key={tabla} value={tabla}>
                            {tabla}
                        </MenuItem>
                    ))}
                </TextField>

                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SearchIcon />}
                    onClick={obtenerLogs}
                >
                    Buscar logs
                </Button>

                <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<PrintIcon />}
                    onClick={handleImprimirSeleccionados}
                >
                    Imprimir seleccionados
                </Button>
            </Box>

            <Paper elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <strong>Sel.</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Opción</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Fecha</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Acción</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Tabla</strong>
                            </TableCell>
                            <TableCell>
                                <strong>Origen</strong>
                            </TableCell>
                        </TableRow>

                        {/* Fila de filtros */}
                        <TableRow>
                            <TableCell>Buscar</TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    placeholder="Filtrar por acción (INSERT, UPDATE, DELETE)"
                                    value={filtroAccion}
                                    onChange={(e) =>
                                        setFiltroAccion(e.target.value)
                                    }
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton size="small">
                                                    <SearchIcon fontSize="small" />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    placeholder="Filtrar por nombre de tabla"
                                    value={filtroTabla}
                                    onChange={(e) =>
                                        setFiltroTabla(e.target.value)
                                    }
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton size="small">
                                                    <SearchIcon fontSize="small" />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rowsToShow.map((log, idx) => (
                            <TableRow
                                key={log._id || `${log.nombre_tabla}-${idx}`}
                            >
                                <TableCell>
                                    <Checkbox
                                        size="small"
                                        checked={!!selectedIds[log._id]}
                                        onChange={() => toggleSelect(log)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<VisibilityIcon />}
                                        onClick={() => abrirDetalle(log)}
                                    >
                                        Ver
                                    </Button>
                                </TableCell>
                                <TableCell>
                                    {formatFecha(log.fecha_creacion)}
                                </TableCell>
                                <TableCell>{getAccionTexto(log.accion)}</TableCell>
                                <TableCell>{log.nombre_tabla}</TableCell>
                                <TableCell>{origenTexto(log)}</TableCell>
                            </TableRow>
                        ))}

                        {listaFiltrada.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6}>
                                    <Typography
                                        variant="body2"
                                        align="center"
                                        sx={{ py: 2 }}
                                    >
                                        Sin registros para mostrar.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <TablePagination
                    component="div"
                    count={listaFiltrada.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Filas por página"
                />
            </Paper>

            {/* Modal de detalle del log (JSON) */}
            <Dialog open={showDetalle} onClose={cerrarDetalle} fullWidth maxWidth="md">
                <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    Detalle del log
                    <IconButton
                        onClick={cerrarDetalle}
                        sx={{ marginLeft: "auto" }}
                        size="small"
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {logSeleccionado && (
                        <>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Fecha:</strong>{" "}
                                {formatFecha(logSeleccionado.fecha_creacion)}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Acción:</strong>{" "}
                                {getAccionTexto(logSeleccionado.accion)}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Tabla:</strong>{" "}
                                {logSeleccionado.nombre_tabla}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Origen del cambio:</strong>{" "}
                                {origenTexto(logSeleccionado)}
                            </Typography>
                        </>
                    )}

                    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                        Información (JSON)
                    </Typography>
                    <Box
                        component="pre"
                        sx={{
                            bgcolor: "#111",
                            color: "#eee",
                            p: 2,
                            borderRadius: 1,
                            maxHeight: 400,
                            overflow: "auto",
                            fontSize: 13,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                        }}
                    >
                        {informacionPretty || "// Sin contenido"}
                    </Box>
                </DialogContent>
                <DialogActions>
                    {logSeleccionado && (
                        <Button
                            startIcon={<PrintIcon />}
                            variant="contained"
                            color="primary"
                            onClick={handleImprimirDetalle}
                        >
                            Imprimir
                        </Button>
                    )}
                    <Button onClick={cerrarDetalle}>Cerrar</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar global */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default Logs;
