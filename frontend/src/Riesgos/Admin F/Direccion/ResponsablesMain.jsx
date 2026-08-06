/**
 * @fileoverview 
 * Gestión principal de colaboradores (responsables) asociados a una Dirección
 * 
 * Este módulo es esencial para mantener el control administrativo del personal
 * que interactúa con los flujos de trabajo de la dirección.
 * 
 *
 * @module Riesgos/Admin F/Direccion/ResponsablesMain.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useState, useMemo } from "react";
import {
    Button, Typography, Box, Table, TableHead, TableRow,
    TableCell, TableBody, Paper, Stack, TableContainer,
    Grid, Card, CardContent, TextField, useMediaQuery,
    Chip, Tooltip, Collapse, IconButton, Divider,
    FormControl, Select, MenuItem, InputLabel
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import apiClient from "api/apiClient";
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
 * Vista principal de administración de colaboradores.
 *
 * - Lista colaboradores asociados a la dirección del usuario.
 * - Permite filtrar por nombre, correo, vigente y estado (activo/eliminado).
 * - Habilita acciones de edición, activación/desactivación y control de acceso al sistema.
 * - Ofrece restablecimiento de contraseña con retroalimentación visual.
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
        vigente: "",   // '' | '1' | '0'
        activo: ""     // '' | '1' | '0'
    });
    const [openCollapse, setOpenCollapse] = useState(null);

    /**
     * Muestra un mensaje temporal (por ejemplo una contraseña generada)
     * y lo limpia automáticamente después de un tiempo definido.
     *
     * @param {string} nuevoValor - Texto a mostrar temporalmente.
     * @returns {void}
     */
    const mostrarTemporalmente = (nuevoValor) => {
        setMensaje(nuevoValor);
        setTimeout(() => setMensaje(""), 20000);
    };

    /**
     * Obtiene el listado de colaboradores desde el backend y lo almacena
     * en el estado local de la vista.
     *
     * @async
     * @returns {Promise<void>} No retorna valor; actualiza el estado `data`.
     */
    const obtenerColaboradores = async () => {
        try {
            const res = await apiClient.get("/api/responsables-actualizados/administracion-direccion");
            setData(res.data.data || []);
        } catch (err) {
            console.error(err);
            mostrarAlerta("error", "Error al cargar los colaboradores");
        }
    };

    /**
     * Obtiene el catálogo de entidades que pueden asociarse a los colaboradores.
     *
     * @async
     * @returns {Promise<void>} No retorna valor; actualiza el estado `entidades`.
     */
    const fetchEntidades = async () => {
        try {
            const resEntidades = await apiClient.get("/api/direcciones-actualizados");
            setEntidades(resEntidades.data.result || []);
        } catch (err) {
            onError("Error al cargar responsable");
        }
    };

    /**
     * Actualiza una propiedad de estado de un colaborador (activo, vigente, etc.),
     * enviando la solicitud correspondiente al backend.
     *
     * @async
     * @param {string} propiedad - Nombre de la propiedad a actualizar (por ejemplo, "activo" o "vigente").
     * @param {number} valor - Nuevo valor que se desea establecer.
     * @param {string|number} colaborador - Identificador del colaborador a modificar.
     * @returns {Promise<void>} No retorna valor; refresca el listado al finalizar.
     */
    const actualizarEstado = async (propiedad, valor, colaborador) => {
        try {
            const payload = { valor, codigo_colaborador: colaborador };
            await apiClient.put(`/api/responsables-actualizados/cambiar-${propiedad}`, payload);
            obtenerColaboradores();
        } catch (err) {
            onError("Error al actualizar estado");
        }
    };

    useEffect(() => {
        obtenerColaboradores();
        fetchEntidades();
    }, []);

    /**
     * Cierra el formulario de edición/creación de colaboradores y
     * limpia el colaborador seleccionado.
     *
     * @returns {void}
     */
    const handleClose = () => {
        setShowModal(false);
        setColaborador(null);
    };

    /**
     * Maneja el flujo posterior a una operación exitosa en el formulario:
     * cierra el modal, recarga el listado y muestra un mensaje de éxito.
     *
     * @returns {void}
     */
    const handleSuccess = () => {
        handleClose();
        obtenerColaboradores();
        mostrarAlerta("success", "Guardado exitosamente");
    };

    /**
     * Muestra un mensaje de error estándar en el componente de alerta.
     *
     * @param {string} [mensaje="Error al realizar la acción"] - Mensaje a mostrar.
     * @returns {void}
     */
    const onError = (mensaje = "Error al realizar la acción") => {
        setAlerta({ open: true, tipo: "error", mensaje });
    };

    /**
     * Configura la alerta global del módulo, permitiendo mostrar mensajes
     * de éxito o error en la interfaz.
     *
     * @param {"success"|"error"|"warning"|"info"} tipo - Tipo de alerta.
     * @param {string} mensaje - Mensaje a mostrar al usuario.
     * @returns {void}
     */
    const mostrarAlerta = (tipo, mensaje) => {
        setAlerta({ open: true, tipo, mensaje });
    };

    /**
     * Solicita al backend el restablecimiento de la contraseña de un usuario,
     * mostrando un spinner mientras se procesa la petición y un mensaje con el resultado.
     *
     * @async
     * @param {string} correo - Correo electrónico del colaborador.
     * @returns {Promise<void>} No retorna valor; muestra mensajes según resultado.
     */
    const actualizarContrasena = async (correo) => {
        try {
            setResetLoading(correo);
            const endpoint = "/api/responsables-actualizados/actualizar-contrasena-admin";
            const result = await apiClient.put(endpoint, { correo });
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
     * Normaliza un texto para comparación, removiendo acentos y
     * convirtiendo todo a minúsculas.
     *
     * @param {string} [v=""] - Texto a normalizar.
     * @returns {string} Texto normalizado.
     */
    const normalize = (v = "") =>
        v.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    /**
     * Datos filtrados según los criterios de nombre, correo, vigente y activo.
     */
    const filteredData = useMemo(() => {
        const fNombre = normalize(filters.nombre);
        const fCorreo = normalize(filters.correo);
        const fVigente = filters.vigente; // '' | '1' | '0'
        const fActivo = filters.activo;   // '' | '1' | '0'

        return data.filter((r) => {
            const nombre = normalize(r.nombre_completo);
            const correo = normalize(r.correo);

            if (fNombre && !nombre.includes(fNombre)) return false;
            if (fCorreo && !correo.includes(fCorreo)) return false;

            if (fVigente !== "" && String(r.vigente) !== fVigente) return false;
            if (fActivo !== "" && String(r.activo) !== fActivo) return false;

            return true;
        });
    }, [data, filters]);

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>Listado de colaboradores</Typography>

            {/* Filtros */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                mb={2}
                flexWrap="wrap"
                alignItems="flex-start"
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

                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="filtro-vigente-label">Vigente</InputLabel>
                    <Select
                        labelId="filtro-vigente-label"
                        label="Vigente"
                        value={filters.vigente}
                        onChange={(e) => setFilters((f) => ({ ...f, vigente: e.target.value }))}
                    >
                        <MenuItem value="">Todos</MenuItem>
                        <MenuItem value="1">Vigente</MenuItem>
                        <MenuItem value="0">No vigente</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="filtro-estado-label">Estado registro</InputLabel>
                    <Select
                        labelId="filtro-estado-label"
                        label="Estado registro"
                        value={filters.activo}
                        onChange={(e) => setFilters((f) => ({ ...f, activo: e.target.value }))}
                    >
                        <MenuItem value="">Todos</MenuItem>
                        <MenuItem value="1">Activo</MenuItem>
                        <MenuItem value="0">Eliminado</MenuItem>
                    </Select>
                </FormControl>
            </Stack>

            {mensaje && (
                <Typography sx={{ mb: 1 }} color="error">
                    La nueva contraseña para el usuario creado es: {mensaje}
                </Typography>
            )}

            {/* Vista de escritorio */}
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
                                                {openCollapse === row.codigo_colaborador
                                                    ? <ExpandLessIcon />
                                                    : <SettingsIcon />}
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
                                                        startIcon={row.activo === 1 ? <DeleteIcon /> : <RestartAltIcon />}
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
                                                        startIcon={row.vigente === 1 ? <LockRoundedIcon /> : <LockOpenRoundedIcon />}
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
                                                            resetLoading === row.correo
                                                                ? (
                                                                    <AutorenewIcon
                                                                        sx={{
                                                                            fontSize: 18,
                                                                            animation: "spin 1s linear infinite"
                                                                        }}
                                                                    />
                                                                )
                                                                : <LockResetIcon />
                                                        }
                                                        size="small"
                                                        disabled={resetLoading === row.correo}
                                                        onClick={() => actualizarContrasena(row.correo)}
                                                    >
                                                        {resetLoading === row.correo ? "Enviando..." : "Restablecer"}
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
                                                    label={row.vigente === 1 ? "Vigente" : "No vigente"}
                                                    color={row.vigente === 1 ? "success" : "default"}
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
                                                    label={row.activo === 1 ? "Activo" : "Eliminado"}
                                                    color={row.activo === 1 ? "success" : "error"}
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
                // Vista móvil (cards)
                <Grid container spacing={2}>
                    {filteredData.map((row) => (
                        <Grid item xs={12} key={row.codigo_colaborador}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Stack spacing={1}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle1" fontWeight={600}>
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
                                                {openCollapse === row.codigo_colaborador
                                                    ? <ExpandLessIcon />
                                                    : <ExpandMoreIcon />}
                                            </IconButton>
                                        </Stack>
                                        <Typography variant="body2">{row.correo}</Typography>
                                        <Typography variant="body2" color="text.secondary">
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
                                                    label={row.vigente === 1 ? "Vigente" : "No vigente"}
                                                    color={row.vigente === 1 ? "success" : "default"}
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
                                                    label={row.activo === 1 ? "Activo" : "Eliminado"}
                                                    color={row.activo === 1 ? "success" : "error"}
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
                                                        setColaborador(row.codigo_colaborador);
                                                        setShowModal(true);
                                                    }}
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={row.activo === 1 ? <DeleteIcon /> : <RestartAltIcon />}
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
                                                    startIcon={row.vigente === 1 ? <LockRoundedIcon /> : <LockOpenRoundedIcon />}
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
                                                        resetLoading === row.correo
                                                            ? (
                                                                <AutorenewIcon
                                                                    sx={{
                                                                        fontSize: 18,
                                                                        animation: "spin 1s linear infinite"
                                                                    }}
                                                                />
                                                            )
                                                            : <LockResetIcon />
                                                    }
                                                    size="small"
                                                    disabled={resetLoading === row.correo}
                                                    onClick={() => actualizarContrasena(row.correo)}
                                                >
                                                    {resetLoading === row.correo ? "Enviando..." : "Restablecer"}
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
