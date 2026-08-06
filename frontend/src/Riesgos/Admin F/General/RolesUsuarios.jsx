/**
 * @fileoverview
 * Vista de resumen de colaboradores generales y los roles que tienen asignados.
 *
 * @module Riesgos/Admin F/General/RolesUsuarios.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useState } from "react";
import {
    Button, Typography, Box, Paper, Table, TableHead,
    TableRow, TableCell, TableBody
} from "@mui/material";
import apiClient from "api/apiClient";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import AlertaMensaje from "./../../Alerta F/AlertaMensaje";
import FormRolUsuario from "./FormRolUsuario";

/**
 * Vista resumen de roles asignados a colaboradores generales.
 *
 * Renderiza la tabla de personas con sus roles y expone acciones de edición.
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
     * Obtiene el catálogo de colaboradores disponibles para asignación de roles.
     */
    const obtenerPersonas = async () => {
        try {
            const result = await apiClient.get("/api/responsables-actualizados");
            setPersonas(result.data.data);
        } catch (err) {
            console.error(err);
            mostrarAlerta('error', 'Error al cargar datos');
        }
    };

    /**
     * Carga desde el backend el catálogo de roles generales disponibles.
     */
    const obtenerRoles = async () => {
        try {
            const result = await apiClient.get("/api/roles-actualizados/informacion-roles");
            setRoles(result.data.roles);
        } catch (err) {
            console.error(err);
            mostrarAlerta('error', 'Error al cargar datos');
        }
    };

    /**
     * Recupera la lista de personas con roles y la agrupa por colaborador.
     */
    const obtenerLista = async () => {
        try {
            const result = await apiClient.get("/api/roles-actualizados/obtener-personas-con-roles");
            const agrupado = agruparRolesPorPersona(result.data.data);
            setData(agrupado);
        } catch (err) {
            console.error(err);
            mostrarAlerta('error', 'Error al cargar datos');
        }
    };

    /**
     * Agrupa los registros persona–rol en una estructura por colaborador.
     *
     * @param {Array} lista - Listado plano devuelto por el backend.
     * @returns {Array} Listado agrupado por persona.
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
     * Cierra el formulario de asignación de roles y limpia el identificador activo.
     */
    const handleClose = () => {
        setShowModal(false);
        setId(null);
    };

    const handleSuccess = () => {
        handleClose();
        obtenerLista();
        mostrarAlerta('success', 'Guardado exitosamente');
    };

    const mostrarAlerta = (tipo, mensaje) => setAlerta({ open: true, tipo, mensaje });

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
