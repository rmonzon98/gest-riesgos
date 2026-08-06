/**
 * @fileoverview
 * Mantenimiento de roles generales y de las URLs (permisos) asociadas.
 *
 * @module Riesgos/Admin F/General/RolesViews.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useState } from "react";
import {
    Button, Typography, Box, Table, TableHead, TableRow,
    TableCell, TableBody, Paper, Switch, Tooltip
} from "@mui/material";
import apiClient from "api/apiClient";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import AlertaMensaje from "../../Alerta F/AlertaMensaje";
import ChipsDeUrls from "./ChipsDeUrls";
import FormRoles from "./FormRoles";

/**
 * Vista de mantenimiento de roles generales.
 *
 * Muestra la tabla de roles, sus URLs y abre el formulario de edición/alta.
 *
 * @component
 */
function RolesMain() {
    const [lista, setLista] = useState([]);
    const [listaUrls, setListaUrls] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [id, setId] = useState(null);
    const [alerta, setAlerta] = useState({
        open: false,
        tipo: "success",
        mensaje: "",
    });

    /**
     * Carga desde el backend la lista de roles generales y el catálogo de URLs.
     */
    const obtenerInformacion = async () => {
        try {
            const response = await apiClient.get("/api/roles-actualizados/informacion-roles");
            setLista(response.data.roles);
            setListaUrls(response.data.urls);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        obtenerInformacion();
    }, []);

    /**
     * Cierra el formulario de roles y limpia el identificador activo.
     */
    const handleClose = () => {
        setShowModal(false);
        setId(null);
    };

    /**
     * Maneja el flujo posterior a un guardado exitoso.
     *
     * Refresca la información y muestra una alerta de éxito.
     */
    const handleSuccess = () => {
        handleClose();
        obtenerInformacion();
        mostrarAlerta("success", "Guardado exitosamente");
    };

    /**
     * Muestra una alerta de error con el mensaje indicado.
     *
     * @param {string} [mensaje] - Mensaje a mostrar.
     */
    const onError = (mensaje = "Error al realizar la acción") => {
        setAlerta({ open: true, tipo: "error", mensaje });
    };

    /**
     * Configura el estado de alerta global con tipo y mensaje.
     *
     * @param {"success"|"error"|"warning"|"info"} tipo - Tipo de alerta.
     * @param {string} mensaje - Mensaje a mostrar.
     */
    const mostrarAlerta = (tipo, mensaje) => {
        setAlerta({ open: true, tipo, mensaje });
    };

    /**
     * Alterna la marca de un rol como general / no general en el backend.
     *
     * @param {Object} rol - Rol a actualizar.
     */
    const cambiarGeneral = async (rol) => {
        try {
            const nuevoValor = rol.general === 1 ? 0 : 1;
            await apiClient.put(
                `/api/roles-actualizados/cambiar-general/${rol.codigo_rol}`,
                { general: nuevoValor }
            );
            mostrarAlerta("success", `Rol actualizado correctamente (${nuevoValor ? "General" : "No general"})`);
            obtenerInformacion();
        } catch (err) {
            console.error(err);
            onError("Error al actualizar el estado general del rol.");
        }
    };

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>
                Mantenimiento de roles
            </Typography>

            <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setShowModal(true)}
                sx={{ mb: 2 }}
            >
                Nuevo Rol
            </Button>

            <Paper elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Acciones</TableCell>
                            <TableCell>Nombre del Rol</TableCell>
                            <TableCell>General</TableCell>
                            <TableCell>URLs Asignadas</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {lista.map((rol) => (
                            <TableRow key={rol.codigo_rol}>
                                <TableCell>
                                    <Button
                                        variant="outlined"
                                        startIcon={<EditIcon />}
                                        size="small"
                                        onClick={() => {
                                            setId(rol.codigo_rol);
                                            setShowModal(true);
                                        }}
                                    >
                                        Editar
                                    </Button>
                                </TableCell>

                                <TableCell>{rol.nombre}</TableCell>

                                <TableCell>
                                    <Tooltip
                                        title="Si este rol es general, la vista de administración de dirección también tendrá acceso."
                                        arrow
                                    >
                                        <Switch
                                            checked={rol.general === 1}
                                            color="primary"
                                            onChange={() => cambiarGeneral(rol)}
                                        />
                                    </Tooltip>
                                </TableCell>

                                <TableCell>
                                    <ChipsDeUrls lista={rol.urls} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <FormRoles
                showModal={showModal}
                id={id}
                onClose={handleClose}
                onSuccess={handleSuccess}
                onError={onError}
                listaUrls={listaUrls}
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

export default RolesMain;
