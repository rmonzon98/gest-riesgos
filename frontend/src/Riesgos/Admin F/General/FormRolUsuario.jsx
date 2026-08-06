/**
 * @fileoverview
 * Formulario modal para asignar y editar roles de colaboradores generales.
 *
 * @module Riesgos/Admin F/General/FormRolUsuario.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { useEffect, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Grid, Autocomplete, TextField, Chip
} from "@mui/material";
import apiClient from "api/apiClient";

/**
 * Formulario modal para administrar la relación colaborador–roles.
 *
 * Soporta tanto la creación de nuevas asignaciones como su edición.
 *
 * @component
 */
function FormRolUsuario({ showModal, id, onClose, onSuccess, onError, roles = [], personas = [], nombre }) {
    const [form, setForm] = useState({ rolesSeleccionados: [], colaborador: null });

    /**
     * Efecto que, en modo edición, consulta los roles actuales del colaborador
     * y prellena la selección del formulario.
     */
    useEffect(() => {
        if (id) {
            apiClient.get('/api/roles-actualizados/obtener-personas-con-roles-unico', {
                params: { codigo_colaborador: id }
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
     * Valida la selección de colaborador y roles, arma el payload y llama al backend.
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

        const method = id ? apiClient.put : apiClient.post;

        try {
            await method(endpoint, payload);
            onSuccess();
        } catch (err) {
            console.error(err);
            onError("Error al guardar la información.");
        }
    };

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
