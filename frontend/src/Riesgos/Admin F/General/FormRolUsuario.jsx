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
    Button, Grid, Autocomplete, TextField, Chip, Stack, Typography
} from "@mui/material";
import apiClient from "api/apiClient";
import { apiErrorMessage } from "funciones/errors";
import { safefmt } from "funciones/Fechas";

/**
 * Formulario modal para administrar la relación colaborador–roles.
 *
 * Soporta tanto la creación de nuevas asignaciones como su edición.
 *
 * @component
 */
function FormRolUsuario({ showModal, id, onClose, onSuccess, onError, roles = [], personas = [], nombre }) {
    const [form, setForm] = useState({ rolesSeleccionados: [], colaborador: null });
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    /**
     * Efecto que, en modo edición, consulta los roles actuales del colaborador
     * y prellena la selección del formulario.
     */
    useEffect(() => {
        if (!showModal) return;
        if (id) {
            const controller = new AbortController();
            setCargando(true);
            apiClient.get('/api/roles-actualizados/obtener-personas-con-roles-unico', {
                params: { codigo_colaborador: id }, signal: controller.signal
            }).then(res => {
                if (controller.signal.aborted) return;
                const rolesAsignados = res.data.data?.map(r => ({
                    ...(roles.find(role => role.codigo_rol === r.CODIGO_ROL) ||
                        { codigo_rol: r.CODIGO_ROL, nombre: r.NOMBRE_ROL }),
                    fecha_inicio: r.FECHA_INICIO || '', fecha_fin: r.FECHA_FIN || ''
                })) || [];

                setForm({
                    rolesSeleccionados: rolesAsignados,
                    colaborador: {
                        codigo_colaborador: id,
                        nombre_completo: nombre
                    }
                });

            }).catch(err => {
                if (!controller.signal.aborted) onError(apiErrorMessage(err));
            }).finally(() => { if (!controller.signal.aborted) setCargando(false); });
            return () => controller.abort();
        } else {
            setCargando(false);
            setForm({ rolesSeleccionados: [], colaborador: null });
        }
    }, [id, roles, nombre, showModal]);

    const hoy = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Guatemala' }).format(new Date());
    const cambiarFecha = (codigo, campo, fecha) => setForm(prev => ({ ...prev,
        rolesSeleccionados: prev.rolesSeleccionados.map(rol => rol.codigo_rol === codigo ? { ...rol, [campo]: fecha } : rol) }));

    /**
     * Valida la selección de colaborador y roles, arma el payload y llama al backend.
     */
    const handleSubmit = async () => {
        if ((!id && !form.rolesSeleccionados.length) || !form.colaborador) {
            onError("Debe seleccionar al menos un rol y un colaborador.");
            return;
        }
        if (form.rolesSeleccionados.some(rol => rol.fecha_inicio && rol.fecha_fin && rol.fecha_inicio > rol.fecha_fin)) {
            onError('La fecha desde debe ser anterior o igual a la fecha hasta.');
            return;
        }

        const payload = {
            colaboradores: id
                ? [id]
                : [form.colaborador.codigo_colaborador],
            roles: form.rolesSeleccionados.map(r => ({ codigo_rol: r.codigo_rol,
                fecha_inicio: r.fecha_inicio || null, fecha_fin: r.fecha_fin || null }))
        };

        const endpoint = id
            ? "/api/roles-actualizados/actualizar-personas-con-roles"
            : "/api/roles-actualizados/crear-personas-con-roles";

        const method = id ? apiClient.put : apiClient.post;

        setGuardando(true);
        try {
            await method(endpoint, payload);
            onSuccess();
        } catch (err) {
            onError(err.response?.data?.msg || apiErrorMessage(err));
        } finally {
            setGuardando(false);
        }
    };

    const handleClose = () => {
        setForm({ rolesSeleccionados: [], colaborador: null });
        onClose()
    }

    return (
        <Dialog open={showModal} onClose={guardando ? undefined : handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{id ? "Editar" : "Asignar"} Roles a Usuarios</DialogTitle>
            <DialogContent>
                <Grid container spacing={2} mt={1}>
                    <Grid item xs={12}>
                        <Autocomplete
                            multiple
                            options={[...roles, ...form.rolesSeleccionados.filter(item => !roles.some(rol => rol.codigo_rol === item.codigo_rol))]}
                            getOptionLabel={(option) => option.nombre}
                            isOptionEqualToValue={(a, b) => a.codigo_rol === b.codigo_rol}
                            disabled={cargando || guardando}
                            value={form.rolesSeleccionados}
                            onChange={(e, value) => setForm(prev => ({ ...prev, rolesSeleccionados: value }))}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip label={option.fecha_fin && option.fecha_fin < hoy
                                        ? `${option.nombre} (${safefmt(option.fecha_fin)})` : option.nombre}
                                        sx={{ textDecoration: option.fecha_fin && option.fecha_fin < hoy ? 'line-through' : 'none' }}
                                        {...getTagProps({ index })} key={option.codigo_rol} />
                                ))
                            }
                            renderInput={(params) => <TextField {...params} label="Roles" />}
                        />
                    </Grid>
                    {form.rolesSeleccionados.map(rol => <Grid item xs={12} key={rol.codigo_rol}>
                        <Stack spacing={1} sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight={600}>{rol.nombre}</Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <TextField size="small" type="date" label="Desde" fullWidth disabled={guardando}
                                    InputLabelProps={{ shrink: true }} value={rol.fecha_inicio || ''}
                                    onChange={e => cambiarFecha(rol.codigo_rol, 'fecha_inicio', e.target.value)} />
                                <TextField size="small" type="date" label="Hasta" fullWidth disabled={guardando}
                                    InputLabelProps={{ shrink: true }} value={rol.fecha_fin || ''}
                                    onChange={e => cambiarFecha(rol.codigo_rol, 'fecha_fin', e.target.value)} />
                            </Stack>
                        </Stack>
                    </Grid>)}
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
                <Button onClick={handleClose} disabled={guardando}>Cancelar</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={cargando || guardando}>Guardar</Button>
            </DialogActions>
        </Dialog>
    );
}

export default FormRolUsuario;
