/**
 * @fileoverview 
 * Formulario modal para asignar y editar roles de colaboradores de una Dirección.
 * 
 * Este componente se utiliza tanto para:
 * - Crear nuevas asignaciones: seleccionar un colaborador y uno o varios roles
 *   disponibles para la dirección.
 * - Editar asignaciones existentes: cargar automáticamente los roles ya
 *   asociados a un colaborador y permitir su actualización.
 *
 * @module Riesgos/Admin F/Direccion/FormRolUsuario.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Grid, Autocomplete, TextField, Chip
} from "@mui/material";
import axios from "axios";

/**
 * Formulario modal para asignar o editar roles de un colaborador.
 *
 * - Permite seleccionar múltiples roles a aplicar.
 * - En modo creación, permite seleccionar el colaborador a quien se asignarán los roles.
 * - En modo edición, carga los roles actuales del colaborador seleccionado.
 *
 * @component
 * @param {Object} props - Propiedades del componente.
 * @param {boolean} props.showModal - Indica si el diálogo está visible.
 * @param {string|number|null} props.id - Código del colaborador en modo edición.
 * @param {Function} props.onClose - Callback al cerrar el diálogo.
 * @param {Function} props.onSuccess - Callback al guardar exitosamente.
 * @param {Function} props.onError - Callback para mostrar errores.
 * @param {Array} [props.roles=[]] - Listado de roles disponibles.
 * @param {Array} [props.personas=[]] - Listado de colaboradores elegibles.
 * @param {string} [props.nombre] - Nombre del colaborador en modo edición.
 */
function FormRolUsuario({ showModal, id, onClose, onSuccess, onError, roles = [], personas = [], nombre }) {
    const [form, setForm] = useState({ rolesSeleccionados: [], colaborador: null });

    useEffect(() => {
        if (id) {
            axios.get('/api/roles-actualizados/obtener-personas-con-roles-unico', {
                params: { codigo_colaborador: id },
                headers: { "x-access-token": localStorage.getItem("token") }
            }).then(res => {
                const rolesAsignados = res.data.data?.map(r =>
                    roles.find(role => role.codigo_rol === r.CODIGO_ROL)
                ).filter(Boolean) || [];

                setForm({
                    rolesSeleccionados: rolesAsignados,
                    colaborador: {
                        codigo_colaborador: id,
                        nombre_completo: nombre
                    }
                });

            }).catch(err => {
                console.error(err);
                onError("Error al obtener datos");
            });
        } else {
            setForm({ rolesSeleccionados: [], colaboradores: [] });
        }
    }, [id, roles, nombre]);

    /**
     * Valida la selección de roles y colaborador, construye el payload y
     * envía la información al backend para crear o actualizar la asignación.
     *
     * @async
     * @returns {Promise<void>} No retorna valor; ejecuta callbacks según resultado.
     */
    const handleSubmit = async () => {
        if (form.rolesSeleccionados.length === 0 || (!id && !form.colaborador) || (id && form.colaborador === null)) {
            onError("Debe seleccionar al menos un rol y un colaborador.");
            return;
        }

        const payload = {
            colaboradores: id
                ? [id]
                : [form.colaborador.codigo_colaborador],
            roles: form.rolesSeleccionados.map(r => r.codigo_rol)
        };

        const endpoint = id
            ? "/api/roles-actualizados/actualizar-personas-con-roles"
            : "/api/roles-actualizados/crear-personas-con-roles";

        const method = id ? axios.put : axios.post;

        try {
            await method(endpoint, payload, {
                headers: { "x-access-token": localStorage.getItem("token") }
            });
            onSuccess();
        } catch (err) {
            console.error(err);
            onError("Error al guardar la información.");
        }
    };

    /**
     * Restablece el formulario a su estado inicial y cierra el diálogo.
     *
     * @returns {void}
     */
    const handleClose = () => {
        setForm({ rolesSeleccionados: [], colaborador: null });
        onClose()
    }

    return (
        <Dialog open={showModal} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{id ? "Editar" : "Asignar"} Roles a Usuarios</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} mt={1}>
                    <Grid item xs={12}>
                        <Autocomplete
                            multiple
                            options={roles}
                            getOptionLabel={(option) => option.nombre}
                            value={form.rolesSeleccionados}
                            onChange={(e, value) => setForm(prev => ({ ...prev, rolesSeleccionados: value }))}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip label={option.nombre} {...getTagProps({ index })} key={option.codigo_rol} />
                                ))
                            }
                            renderInput={(params) => <TextField {...params} label="Roles" />}
                        />
                    </Grid>
                    {!id ? (
                        <Grid item xs={12}>
                            <Autocomplete
                                options={personas}
                                getOptionLabel={(option) => option.nombre_completo}
                                value={form.colaborador}
                                onChange={(e, value) => setForm(prev => ({ ...prev, colaborador: value }))}
                                renderInput={(params) => (
                                    <TextField {...params} label="Colaborador" placeholder="Selecciona un colaborador" />
                                )}
                            />
                        </Grid>
                    ) : (
                        <Grid item xs={12}>
                            <TextField
                                label="Colaborador"
                                value={nombre}
                                fullWidth
                                disabled
                            />
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancelar</Button>
                <Button variant="contained" onClick={handleSubmit}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
}

export default FormRolUsuario;
