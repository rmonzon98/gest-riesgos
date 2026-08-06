/**
 * @fileoverview
 * Mantenimiento de roles específicos de la Dirección dentro del sistema de Gestión de Riesgos.
 *
 * Esta vista permite a los administradores de dirección:
 * - Consultar el listado de roles configurados para su dirección.
 * - Crear nuevos roles o editar los existentes mediante un formulario modal.
 *   (permisos de acceso dentro de la aplicación).
 *
 * @module Riesgos/Admin F/Direccion/RolesViews.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useState } from "react";
import {
    Button, Typography, Box, Table, TableHead, TableRow,
    TableCell, TableBody, Paper
} from "@mui/material";
import apiClient from "api/apiClient";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import AlertaMensaje from "../../Alerta F/AlertaMensaje";
import ChipsDeUrls from "./ChipsDeUrls";
import FormRoles from "./FormRoles";

/**
 * Vista principal de mantenimiento de roles.
 *
 * - Lista los roles definidos para la dirección.
 * - Permite crear y editar configuraciones de roles.
 * - Muestra de forma resumida las URLs asociadas a cada rol.
 *
 * @component
 */
function RolesMain() {
    const [lista, setLista] = useState([]);
    const [listaUrls, setListaUrls] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [id, setId] = useState(null); // para editar un rol existente
    const [alerta, setAlerta] = useState({
        open: false,
        tipo: 'success',
        mensaje: ''
    });

    /**
     * Obtiene la información general de roles y sus URLs asociadas desde el backend.
     *
     * @async
     * @returns {Promise<void>} No retorna valor; actualiza los estados `lista` y `listaUrls`.
     */
    const obtenerInformacion = async () => {
        try {
            const response = await apiClient.get('/api/roles-actualizados/informacion-roles-direccion');
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
     * Cierra el formulario de mantenimiento de roles y limpia el identificador seleccionado.
     *
     * @returns {void}
     */
    const handleClose = () => {
        setShowModal(false);
        setId(null);
    };

    /**
     * Maneja el flujo tras una operación exitosa: cierra el formulario,
     * recarga la información y muestra un mensaje de confirmación.
     *
     * @returns {void}
     */
    const handleSuccess = () => {
        handleClose();
        obtenerInformacion();
        mostrarAlerta('success', 'Guardado exitosamente');
    };

    /**
     * Muestra un mensaje de error estándar en el componente de alerta.
     *
     * @param {string} [mensaje='Error al realizar la acción'] - Mensaje de error a mostrar.
     * @returns {void}
     */
    const onError = (mensaje = 'Error al realizar la acción') => {
        setAlerta({ open: true, tipo: 'error', mensaje });
    };

    /**
     * Configura el mensaje de alerta general del módulo.
     *
     * @param {"success"|"error"|"warning"|"info"} tipo - Tipo de alerta.
     * @param {string} mensaje - Mensaje a mostrar al usuario.
     * @returns {void}
     */
    const mostrarAlerta = (tipo, mensaje) => {
        setAlerta({ open: true, tipo, mensaje });
    };

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>Mantenimiento de roles</Typography>
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
                                    {rol.general === 1 ? 'S' : 'N'}
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
                setOpen={() => setAlerta(prev => ({ ...prev, open: false }))}
            />
        </Box>
    );
}

export default RolesMain;
