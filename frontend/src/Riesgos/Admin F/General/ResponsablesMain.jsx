/**
 * @fileoverview
 * Panel principal de listado y administración de colaboradores generales.
 *
 * @module Riesgos/Admin F/General/ResponsablesMain.jsx
 * @version 1.1
 * @author Equipo de Desarrollo
 */

import { useEffect, useState, useMemo } from "react";
import {
    Button, Typography, Box, Table, TableHead, TableRow,
    TableCell, TableBody, Paper, Stack, TableContainer,
    Grid, Card, CardContent, TextField, useMediaQuery,
    Chip, Tooltip, Collapse, IconButton, Divider,
    FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import axios from "axios";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import LockResetIcon from "@mui/icons-material/LockReset";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import SettingsIcon from "@mui/icons-material/Settings";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AlertaMensaje from "./../../Alerta F/AlertaMensaje";
import FormResponsable from "./FormResponsable";

/**
 * Panel principal de colaboradores generales.
 *
 * Renderiza filtros, tabla/tarjetas y acciones de mantenimiento por colaborador.
 *
 * @component
 */
function ResponablesMain() {
    const theme = useTheme();
    const mdDown = useMediaQuery(theme.breakpoints.down("md"));

    const [alerta, setAlerta] = useState({ open: false, tipo: "success", mensaje: "" });
    const [entidades, setEntidades] = useState([]);
    const [puestos, setPuestos] = useState([]);
    const [data, setData] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [colaborador, setColaborador] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [resetLoading, setResetLoading] = useState(null);
    const [filters, setFilters] = useState({
        nombre: "",
        correo: "",
        unidad: "",
        vigente: "todos",
        activo: "todos",
    });
    const [openCollapse, setOpenCollapse] = useState(null);

    const headers = { "x-access-token": localStorage.getItem("token") };

    /**
     * Muestra un mensaje temporal (por ejemplo, una contraseña generada) y lo limpia
     * después de unos segundos.
     *
     * @param {string} nuevoValor - Texto a mostrar de manera temporal.
     */
    const mostrarTemporalmente = (nuevoValor) => {
        setMensaje(nuevoValor);
        setTimeout(() => setMensaje(""), 20000);
    };

    /**
     * Consulta el listado de colaboradores generales en el backend y lo almacena en estado.
     */
    const obtenerColaboradores = async () => {
        try {
            const res = await axios.get("/api/responsables-actualizados/administracion-general", { headers });
            setData(res.data.data || []);
        } catch (err) {
            console.error(err);
            mostrarAlerta("error", "Error al cargar los colaboradores");
        }
    };

    /**
     * Obtiene el catálogo de entidades que puede asociarse a los colaboradores.
     */
    const fetchEntidades = async () => {
        try {
            const resEntidades = await axios.get("/api/direcciones-actualizados", { headers });
            setEntidades(resEntidades.data.result || []);
        } catch (err) {
            onError("Error al cargar responsable");
        }
    };

    /**
     * Actualiza una propiedad de estado de un colaborador (activo, vigente, etc.).
     *
     * @param {string} propiedad - Nombre de la propiedad a modificar.
     * @param {number} valor - Valor que se asignará a la propiedad.
     * @param {string|number} colaborador - Identificador del colaborador.
     */
    const actualizarEstado = async (propiedad, valor, colaborador) => {
        try {
            const payload = { valor, codigo_colaborador: colaborador };
            await axios.put(`/api/responsables-actualizados/cambiar-${propiedad}`, payload, { headers });
            obtenerColaboradores();
        } catch (err) {
            onError("Error al actualizar estado");
        }
    };

    useEffect(() => {
        obtenerColaboradores();
        fetchEntidades();
    }, []);

    const handleClose = () => {
        setShowModal(false);
        setColaborador(null);
    };

    const handleSuccess = () => {
        handleClose();
        obtenerColaboradores();
        mostrarAlerta("success", "Guardado exitosamente");
    };

    const onError = (mensaje = "Error al realizar la acción") => {
        setAlerta({ open: true, tipo: "error", mensaje });
    };

    const mostrarAlerta = (tipo, mensaje) => {
        setAlerta({ open: true, tipo, mensaje });
    };

    /**
     * Solicita el restablecimiento de la contraseña de un colaborador.
     *
     * @param {string} correo - Correo electrónico del colaborador.
     */
    const actualizarContrasena = async (correo) => {
        try {
            setResetLoading(correo);
            const endpoint = "/api/responsables-actualizados/actualizar-contrasena-admin";
            const result = await axios.put(endpoint, { correo }, { headers });
            const ok = result?.data?.ok !== false;
            const msg = result?.data?.msg || (ok
                ? `Se restableció la contraseña y se envió un correo a ${correo}.`
                : `No fue posible restablecer la contraseña para ${correo}.`);
            mostrarAlerta(ok ? "success" : "error", msg);
        } catch (err) {
            console.error(err);
            mostrarAlerta("error", "Error al restablecer la contraseña.");
        } finally {
            setResetLoading(null);
        }
    };

    /**
     * Normaliza un texto para comparación (minúsculas y sin acentos).
     *
     * @param {string} [v] - Texto a normalizar.
     * @returns {string} Texto listo para comparar.
     */
    const normalize = (v = "") =>
        v.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const filteredData = useMemo(() => {
        const fNombre = normalize(filters.nombre);
        const fCorreo = normalize(filters.correo);
        const fUnidad = normalize(filters.unidad);
        const fVigente = filters.vigente;
        const fActivo = filters.activo;

        return data.filter((r) => {
            const nombre = normalize(r.nombre_completo);
            const correo = normalize(r.correo);
            const unidad = normalize(r.unidad);

            const matchNombre = !fNombre || nombre.includes(fNombre);
            const matchCorreo = !fCorreo || correo.includes(fCorreo);
            const matchUnidad = !fUnidad || unidad.includes(fUnidad);

            const matchVigente =
                fVigente === "todos" ||
                (fVigente === "vigente" && r.vigente === 1) ||
                (fVigente === "no_vigente" && r.vigente !== 1);

            const matchActivo =
                fActivo === "todos" ||
                (fActivo === "activo" && r.activo === 1) ||
                (fActivo === "eliminado" && r.activo !== 1);

            return matchNombre && matchCorreo && matchUnidad && matchVigente && matchActivo;
        });
    }, [data, filters]);

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>Listado de colaboradores</Typography>

            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                mb={2}
                flexWrap="wrap"
                alignItems="center"
            >
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => setShowModal(true)}
                >
                    Nuevo Colaborador
                </Button>

                <TextField
                    label="Filtrar por nombre"
                    size="small"
                    value={filters.nombre}
                    onChange={(e) => setFilters((f) => ({ ...f, nombre: e.target.value }))}
                />

                <TextField
                    label="Filtrar por correo"
                    size="small"
                    value={filters.correo}
                    onChange={(e) => setFilters((f) => ({ ...f, correo: e.target.value }))}
                />

                <TextField
                    label="Filtrar por unidad"
                    size="small"
                    value={filters.unidad}
                    onChange={(e) => setFilters((f) => ({ ...f, unidad: e.target.value }))}
                />

                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Vigencia</InputLabel>
                    <Select
                        label="Vigencia"
                        value={filters.vigente}
                        onChange={(e) =>
                            setFilters((f) => ({ ...f, vigente: e.target.value }))
                        }
                    >
                        <MenuItem value="todos">Todos</MenuItem>
                        <MenuItem value="vigente">Vigente</MenuItem>
                        <MenuItem value="no_vigente">No vigente</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 170 }}>
                    <InputLabel>Estado registro</InputLabel>
                    <Select
                        label="Estado registro"
                        value={filters.activo}
                        onChange={(e) =>
                            setFilters((f) => ({ ...f, activo: e.target.value }))
                        }
                    >
                        <MenuItem value="todos">Todos</MenuItem>
                        <MenuItem value="activo">Activo</MenuItem>
                        <MenuItem value="eliminado">Eliminado</MenuItem>
                    </Select>
                </FormControl>
            </Stack>

            {mensaje && (
                <Typography sx={{ mb: 1 }} color="error">
                    La nueva contraseña para el usuario creado es: {mensaje}
                </Typography>
            )}

            {!mdDown ? (
                <Paper elevation={3}>
                    <TableContainer sx={{ maxHeight: 560, overflowX: "auto" }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell width={70} align="center">Opciones</TableCell>
                                    <TableCell>Nombre completo</TableCell>
                                    <TableCell>Correo electrónico</TableCell>
                                    <TableCell>Unidad</TableCell>
                                    <TableCell>Vigente</TableCell>
                                    <TableCell>Eliminado</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredData.map((row) => (
                                    <TableRow key={row.codigo_colaborador} hover>
                                        <TableCell align="center">
                                            <IconButton
                                                onClick={() =>
                                                    setOpenCollapse(
                                                        openCollapse === row.codigo_colaborador
                                                            ? null
                                                            : row.codigo_colaborador
                                                    )
                                                }
                                            >
                                                {openCollapse === row.codigo_colaborador ? (
                                                    <ExpandLessIcon />
                                                ) : (
                                                    <SettingsIcon />
                                                )}
                                            </IconButton>
                                            <Collapse
                                                in={openCollapse === row.codigo_colaborador}
                                                timeout="auto"
                                                unmountOnExit
                                            >
                                                <Divider sx={{ my: 1 }} />
                                                <Stack direction="column" spacing={1}>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<EditIcon />}
                                                        size="small"
                                                        onClick={() => {
                                                            setColaborador(row.codigo_colaborador);
                                                            setShowModal(true);
                                                        }}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={
                                                            row.activo === 1 ? (
                                                                <DeleteIcon />
                                                            ) : (
                                                                <RestartAltIcon />
                                                            )
                                                        }
                                                        size="small"
                                                        onClick={() => {
                                                            actualizarEstado(
                                                                "activo",
                                                                row.activo === 1 ? 0 : 1,
                                                                row.codigo_colaborador
                                                            );
                                                        }}
                                                    >
                                                        {row.activo === 1 ? "Eliminar" : "Restaurar"}
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={
                                                            row.vigente === 1 ? (
                                                                <LockRoundedIcon />
                                                            ) : (
                                                                <LockOpenRoundedIcon />
                                                            )
                                                        }
                                                        size="small"
                                                        onClick={() => {
                                                            actualizarEstado(
                                                                "vigente",
                                                                row.vigente === 1 ? 0 : 1,
                                                                row.codigo_colaborador
                                                            );
                                                        }}
                                                    >
                                                        {row.vigente === 1
                                                            ? "Quitar acceso al sistema"
                                                            : "Dar acceso al sistema"}
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={
                                                            resetLoading === row.correo ? (
                                                                <AutorenewIcon
                                                                    sx={{
                                                                        fontSize: 18,
                                                                        animation:
                                                                            "spin 1s linear infinite",
                                                                    }}
                                                                />
                                                            ) : (
                                                                <LockResetIcon />
                                                            )
                                                        }
                                                        size="small"
                                                        disabled={resetLoading === row.correo}
                                                        onClick={() =>
                                                            actualizarContrasena(row.correo)
                                                        }
                                                    >
                                                        {resetLoading === row.correo
                                                            ? "Enviando..."
                                                            : "Restablecer"}
                                                    </Button>
                                                </Stack>
                                            </Collapse>
                                        </TableCell>
                                        <TableCell>{row.nombre_completo}</TableCell>
                                        <TableCell>{row.correo}</TableCell>
                                        <TableCell>{row.unidad}</TableCell>
                                        <TableCell>
                                            <Tooltip
                                                title={
                                                    row.vigente === 1
                                                        ? "El usuario tiene acceso al sistema con su contraseña."
                                                        : "El usuario no tiene acceso actualmente al sistema."
                                                }
                                            >
                                                <Chip
                                                    label={
                                                        row.vigente === 1
                                                            ? "Vigente"
                                                            : "No vigente"
                                                    }
                                                    color={
                                                        row.vigente === 1
                                                            ? "success"
                                                            : "default"
                                                    }
                                                    size="small"
                                                />
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip
                                                title={
                                                    row.activo === 1
                                                        ? "El usuario está activo y puede aparecer en la lista de colaboradores activos del sistema."
                                                        : "El usuario está eliminado, no tendrá acceso a la información ni aparecerá en la lista de colaboradores activos dentro del sistema."
                                                }
                                            >
                                                <Chip
                                                    label={
                                                        row.activo === 1
                                                            ? "Activo"
                                                            : "Eliminado"
                                                    }
                                                    color={
                                                        row.activo === 1
                                                            ? "success"
                                                            : "error"
                                                    }
                                                    size="small"
                                                />
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            ) : (
                <Grid container spacing={2}>
                    {filteredData.map((row) => (
                        <Grid item xs={12} key={row.codigo_colaborador}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Stack spacing={1}>
                                        <Stack
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={600}
                                            >
                                                {row.nombre_completo}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    setOpenCollapse(
                                                        openCollapse === row.codigo_colaborador
                                                            ? null
                                                            : row.codigo_colaborador
                                                    )
                                                }
                                            >
                                                {openCollapse === row.codigo_colaborador ? (
                                                    <ExpandLessIcon />
                                                ) : (
                                                    <ExpandMoreIcon />
                                                )}
                                            </IconButton>
                                        </Stack>
                                        <Typography variant="body2">
                                            {row.correo}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            {row.unidad}
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Tooltip
                                                title={
                                                    row.vigente === 1
                                                        ? "El usuario tiene acceso al sistema con su contraseña."
                                                        : "El usuario no tiene acceso actualmente al sistema."
                                                }
                                            >
                                                <Chip
                                                    label={
                                                        row.vigente === 1
                                                            ? "Vigente"
                                                            : "No vigente"
                                                    }
                                                    color={
                                                        row.vigente === 1
                                                            ? "success"
                                                            : "default"
                                                    }
                                                    size="small"
                                                />
                                            </Tooltip>
                                            <Tooltip
                                                title={
                                                    row.activo === 1
                                                        ? "El usuario está activo y puede aparecer en la lista del sistema."
                                                        : "El usuario está eliminado, no tendrá acceso a la información ni aparecerá en la lista de usuarios dentro del sistema."
                                                }
                                            >
                                                <Chip
                                                    label={
                                                        row.activo === 1
                                                            ? "Activo"
                                                            : "Eliminado"
                                                    }
                                                    color={
                                                        row.activo === 1
                                                            ? "success"
                                                            : "error"
                                                    }
                                                    size="small"
                                                />
                                            </Tooltip>
                                        </Stack>

                                        <Collapse
                                            in={openCollapse === row.codigo_colaborador}
                                            timeout="auto"
                                            unmountOnExit
                                        >
                                            <Divider sx={{ my: 1 }} />
                                            <Stack direction="column" spacing={1}>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<EditIcon />}
                                                    size="small"
                                                    onClick={() => {
                                                        setColaborador(
                                                            row.codigo_colaborador
                                                        );
                                                        setShowModal(true);
                                                    }}
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={
                                                        row.activo === 1 ? (
                                                            <DeleteIcon />
                                                        ) : (
                                                            <RestartAltIcon />
                                                        )
                                                    }
                                                    size="small"
                                                    onClick={() => {
                                                        actualizarEstado(
                                                            "activo",
                                                            row.activo === 1 ? 0 : 1,
                                                            row.codigo_colaborador
                                                        );
                                                    }}
                                                >
                                                    {row.activo === 1
                                                        ? "Eliminar"
                                                        : "Restaurar"}
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={
                                                        row.vigente === 1 ? (
                                                            <LockRoundedIcon />
                                                        ) : (
                                                            <LockOpenRoundedIcon />
                                                        )
                                                    }
                                                    size="small"
                                                    onClick={() => {
                                                        actualizarEstado(
                                                            "vigente",
                                                            row.vigente === 1 ? 0 : 1,
                                                            row.codigo_colaborador
                                                        );
                                                    }}
                                                >
                                                    {row.vigente === 1
                                                        ? "Quitar acceso al sistema"
                                                        : "Dar acceso al sistema"}
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={
                                                        resetLoading === row.correo ? (
                                                            <AutorenewIcon
                                                                sx={{
                                                                    fontSize: 18,
                                                                    animation:
                                                                        "spin 1s linear infinite",
                                                                }}
                                                            />
                                                        ) : (
                                                            <LockResetIcon />
                                                        )
                                                    }
                                                    size="small"
                                                    disabled={resetLoading === row.correo}
                                                    onClick={() =>
                                                        actualizarContrasena(row.correo)
                                                    }
                                                >
                                                    {resetLoading === row.correo
                                                        ? "Enviando..."
                                                        : "Restablecer"}
                                                </Button>
                                            </Stack>
                                        </Collapse>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <FormResponsable
                showModal={showModal}
                colaborador={colaborador}
                onClose={handleClose}
                onSuccess={handleSuccess}
                onError={onError}
                entidades={entidades}
                puestos={puestos}
                mostrarTemporalmente={mostrarTemporalmente}
            />

            <AlertaMensaje
                open={alerta.open}
                tipo={alerta.tipo}
                mensaje={alerta.mensaje}
                setOpen={() => setAlerta((prev) => ({ ...prev, open: false }))}
            />
        </Box>
    );
}

export default ResponablesMain;
