/**
 * @fileoverview 
 * Administración de asignación de roles a colaboradores por Dirección
 * dentro del sistema de Gestión de Riesgos.
 *
 * Esta vista permite a los administradores de la dirección:
 * - Consultar un resumen de colaboradores y los roles que tiene asignados cada uno.
 * - Registrar nuevas asignaciones de roles a colaboradores de la dirección.
 * - Editar las combinaciones de roles de un colaborador existente.
 * 
 * @module Riesgos/Admin F/Direccion/RolesUsuarios.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useState } from "react";
import {
    Button, Typography, Box, Paper, Table, TableHead,
    TableRow, TableCell, TableBody
} from "@mui/material";
import axios from "axios";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import AlertaMensaje from "./../../Alerta F/AlertaMensaje";
import FormRolUsuario from "./FormRolUsuario";

/**
 * Vista de administración de asignación de roles a usuarios.
 *
 * - Muestra un resumen de colaboradores y sus roles asociados.
 * - Permite registrar nuevas asignaciones y editar las existentes.
 * - Administra catálogos de roles y colaboradores disponibles.
 *
 * @component
 */
function RolesUsuarios() {

    const [alerta, setAlerta] = useState({ open: false, tipo: 'success', mensaje: '' });
    const [showModal, setShowModal] = useState(false);
    const [id, setId] = useState(null);
    const [data, setData] = useState([]);
    const [nombre, setNombre] = useState('')
    const [roles, setRoles] = useState([])
    const [personas, setPersonas] = useState([])

    /**
     * Obtiene el listado de colaboradores (personas) disponibles para
     * asignar roles dentro de la dirección actual.
     *
     * @async
     * @returns {Promise<void>} No retorna valor; actualiza el estado `personas`.
     */
    const obtenerPersonas = async () => {
        try {
            const result = await axios.get("/api/responsables-actualizados/administracion-direccion", {
                headers: { "x-access-token": localStorage.getItem("token") }
            });
            setPersonas(result.data.data);
        } catch (err) {
            console.error(err);
            mostrarAlerta('error', 'Error al cargar datos');
        }
    };

    /**
     * Obtiene el catálogo de roles disponibles para la dirección.
     *
     * @async
     * @returns {Promise<void>} No retorna valor; actualiza el estado `roles`.
     */
    const obtenerRoles = async () => {
        try {
            const result = await axios.get("/api/roles-actualizados/informacion-roles-direccion", {
                headers: { "x-access-token": localStorage.getItem("token") }
            });
            setRoles(result.data.roles);
        } catch (err) {
            console.error(err);
            mostrarAlerta('error', 'Error al cargar datos');
        }
    };

    /**
     * Obtiene la lista de personas con sus roles asociados y agrupa la
     * información por colaborador para facilitar su visualización.
     *
     * @async
     * @returns {Promise<void>} No retorna valor; actualiza el estado `data`.
     */
    const obtenerLista = async () => {
        try {
            const result = await axios.get("/api/roles-actualizados/obtener-personas-con-roles-direccion", {
                headers: { "x-access-token": localStorage.getItem("token") }
            });
            const agrupado = agruparRolesPorPersona(result.data.data);
            setData(agrupado);
        } catch (err) {
            console.error(err);
            mostrarAlerta('error', 'Error al cargar datos');
        }
    };

    /**
     * Agrupa el listado recibido desde el backend por persona, consolidando
     * los roles asignados a cada colaborador en una sola estructura.
     *
     * @param {Array} lista - Listado plano de personas con sus roles.
     * @returns {Array} Arreglo de objetos con la estructura `{ persona, roles[] }`.
     */
    const agruparRolesPorPersona = (lista) => {
        const mapa = new Map();

        for (const item of lista) {
            const { persona, roles } = item;
            const key = persona.codigo_colaborador;

            if (!mapa.has(key)) {
                mapa.set(key, {
                    persona,
                    roles: []
                });
            }

            mapa.get(key).roles.push(...roles);
        }

        return Array.from(mapa.values());
    };

    useEffect(() => {
        obtenerLista();
        obtenerRoles();
        obtenerPersonas();
    }, []);

    /**
     * Cierra el formulario de asignación de roles y limpia el colaborador seleccionado.
     *
     * @returns {void}
     */
    const handleClose = () => {
        setShowModal(false);
        setId(null);
    };

    /**
     * Maneja el flujo posterior a una operación exitosa, recargando la
     * información y mostrando un mensaje positivo.
     *
     * @returns {void}
     */
    const handleSuccess = () => {
        handleClose();
        obtenerLista();
        mostrarAlerta('success', 'Guardado exitosamente');
    };

    /**
     * Configura el mensaje de alerta a mostrar en pantalla.
     *
     * @param {"success"|"error"|"warning"|"info"} tipo - Tipo de alerta.
     * @param {string} mensaje - Mensaje a mostrar.
     * @returns {void}
     */
    const mostrarAlerta = (tipo, mensaje) => setAlerta({ open: true, tipo, mensaje });

    /**
     * Calcula el listado de colaboradores que aún no tienen roles asignados,
     * para que puedan ser priorizados al crear nuevos registros.
     */
    const colaboradoresSinRoles = personas.filter(
        (persona) => !data.some(d => d.persona.codigo_colaborador === persona.codigo_colaborador)
    );

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom>Asignación de roles a usuarios</Typography>
            <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setShowModal(true)}
                sx={{ mb: 2 }}
            >
                Nuevo Registro
            </Button>
            <Paper elevation={3}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Acciones</TableCell>
                            <TableCell>Colaborador</TableCell>
                            <TableCell>Roles</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((row) => (
                            <TableRow key={row.persona.codigo_colaborador}>
                                <TableCell>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<EditIcon />}
                                        onClick={() => {
                                            setId(row.persona.codigo_colaborador);
                                            setNombre(row.persona.nombre)
                                            setShowModal(true);
                                        }}
                                    >
                                        Editar
                                    </Button>
                                </TableCell>
                                <TableCell>{row.persona.nombre}</TableCell>
                                <TableCell>
                                    {row.roles.map(r => r.nombre).join(", ")}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <FormRolUsuario
                showModal={showModal}
                id={id}
                onClose={handleClose}
                onSuccess={handleSuccess}
                onError={(mensaje) => mostrarAlerta('error', mensaje)}
                nombre={nombre}
                roles={roles}
                personas={id ? personas : colaboradoresSinRoles}
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

export default RolesUsuarios;
