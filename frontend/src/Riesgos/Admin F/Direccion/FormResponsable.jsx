/**
 * @fileoverview 
 * Formulario modal para la creación y edición de colaboradores (responsables)
 * de una Dirección dentro del sistema de Gestión de Riesgos.
 * 
 * Uso principal:
 * - Crear responsable de dirección: captura datos personales básicos y de
 *   su superior inmediato, generando el registro asociado a la dirección del
 *   usuario autenticado.
 * - Editar responsable existente: cuando se recibe `colaborador`, el
 *   formulario precarga la información desde el backend y permite actualizarla.
 *
 * @module Riesgos/Admin F/Direccion/FormResponsable.jsx
 * @version 1.0
 * @author Equipo de Desarrollo
 */

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, Divider, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import apiClient from "api/apiClient";
import { apiErrorMessage } from "funciones/errors";

/**
 * Formulario modal para creación y edición de colaboradores (responsables).
 *
 * - Carga los datos de un colaborador cuando se recibe un identificador.
 * - Permite registrar/actualizar nombres, apellidos, correo y datos del superior.
 * - Valida campos obligatorios antes de enviar la información al backend.
 *
 * @component
 * @param {Object} props - Propiedades del componente.
 * @param {boolean} props.showModal - Controla la visibilidad del diálogo.
 * @param {Function} props.onClose - Callback al cerrar el modal.
 * @param {Function} props.onSuccess - Callback al completar correctamente la operación.
 * @param {Function} props.onError - Callback para notificar errores.
 * @param {string|number} [props.colaborador] - Código del colaborador a editar (modo edición).
 * @param {Array} [props.entidades] - Listado de entidades disponible (no utilizado actualmente en el formulario).
 * @param {Function} props.mostrarTemporalmente - Función para mostrar información sensible (como contraseñas) de forma temporal.
 */
function FormResponsable({ showModal, onClose, onSuccess, onError, colaborador, entidades, mostrarTemporalmente }) {
    const [formData, setFormData] = useState({
        primer_nombre: "",
        segundo_nombre: "",
        tercer_nombre: "",
        primer_apellido: "",
        segundo_apellido: "",
        tercer_apellido: "",
        correo: "",
        nombre_superior: "",
        puesto_superior: ""
    });

    /**
     * Obtiene la información del colaborador desde el backend cuando se está
     * en modo edición y carga los datos en el formulario.
     *
     * @async
     * @returns {Promise<void>} No retorna valor; actualiza el estado `formData`.
     */
    const fetchResponsable = async () => {
        try {
            const res = await apiClient.get("/api/responsables-actualizados/obtener-responsable", {
                params: { codigo: colaborador }
            });

            const responsable = res.data.data;

            if (responsable) {
                setFormData({
                    primer_nombre: responsable.PRIMER_NOMBRE || "",
                    segundo_nombre: responsable.SEGUNDO_NOMBRE || "",
                    tercer_nombre: responsable.TERCER_NOMBRE || "",
                    primer_apellido: responsable.PRIMER_APELLIDO || "",
                    segundo_apellido: responsable.SEGUNDO_APELLIDO || "",
                    tercer_apellido: responsable.TERCER_APELLIDO || "",
                    correo: responsable.CORREO_ELECTRONICO || "",
                    codigo_colaborador: colaborador || '',
                    puesto_supervisor: "",
                    nombre_supervisor: "",
                    puesto_superior: responsable.PUESTO_SUPERIOR || "",
                    nombre_superior: responsable.NOMBRE_SUPERIOR || "",
                });
            }
        } catch (error) {
            onError("Error al cargar el responsable");
        }
    };

    useEffect(() => {
        if (showModal && colaborador) {
            fetchResponsable();
        }
    }, [showModal]);

    /**
     * Maneja el cambio de cualquier campo del formulario,
     * actualizando el estado `formData` de forma controlada.
     *
     * @param {React.ChangeEvent<HTMLInputElement>} e - Evento de cambio del campo.
     */
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    /**
     * Limpia el formulario y ejecuta el callback de cierre del modal.
     *
     * @returns {void}
     */
    const clear = () => {
        setFormData({
            primer_nombre: "",
            segundo_nombre: "",
            tercer_nombre: "",
            primer_apellido: "",
            segundo_apellido: "",
            tercer_apellido: "",
            correo: "",
            puesto_supervisor: "",
            nombre_supervisor: ""
        })
        onClose()
    }

    /**
     * Valida los campos obligatorios y envía la información al backend.
     *
     * - Verifica que los campos requeridos tengan valor.
     * - Determina si la operación es creación (POST) o actualización (PUT).
     * - Muestra temporalmente la contraseña generada, en caso de que el backend la retorne.
     *
     * @async
     * @returns {Promise<void>} No retorna valor; ejecuta callbacks `onSuccess` u `onError` según corresponda.
     */
    const handleSubmit = async () => {
        const camposObligatorios = [
            { nombre: "primer_nombre", etiqueta: "Primer nombre" },
            { nombre: "primer_apellido", etiqueta: "Primer apellido" },
            { nombre: "correo", etiqueta: "Correo electrónico" },
        ];
        for (let campo of camposObligatorios) {
            if (!formData[campo.nombre] || formData[campo.nombre].toString().trim() === "") {
                onError(`El campo '${campo.etiqueta}' es obligatorio`);
                return;
            }
        }
        try {
            const endpoint = "/api/responsables-actualizados/direccion";
            const method = colaborador ? "put" : "post";
            const result = await apiClient[method](endpoint, formData);
            if (result.data.contra) {
                mostrarTemporalmente(result.data.contra)
            }
            onSuccess();
            clear();
        } catch (err) {
            console.error(err);
            onError?.(apiErrorMessage(err));
        }
    };

    return (
        <Dialog open={showModal} onClose={clear} maxWidth="md" fullWidth>
            <DialogTitle>{colaborador ? "Editar colaborador" : "Nuevo colaborador"}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    {/* Nombres */}
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Primer nombre" name="primer_nombre" value={formData.primer_nombre} onChange={handleChange} inputProps={{ maxLength: 50 }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Segundo nombre" name="segundo_nombre" value={formData.segundo_nombre} onChange={handleChange} inputProps={{ maxLength: 50 }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Tercer nombre" name="tercer_nombre" value={formData.tercer_nombre} onChange={handleChange} inputProps={{ maxLength: 50 }} />
                    </Grid>

                    {/* Apellidos */}
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Primer apellido" name="primer_apellido" value={formData.primer_apellido} onChange={handleChange} inputProps={{ maxLength: 50 }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Segundo apellido" name="segundo_apellido" value={formData.segundo_apellido} onChange={handleChange} inputProps={{ maxLength: 50 }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Tercer apellido" name="tercer_apellido" value={formData.tercer_apellido} onChange={handleChange} inputProps={{ maxLength: 50 }} />
                    </Grid>

                    {/* Correo */}
                    <Grid item xs={12}>
                        <TextField disabled={colaborador} fullWidth label="Correo electrónico" name="correo" type="email" value={formData.correo} onChange={handleChange} />
                    </Grid>

                    <Grid item xs={12}>
                        <Divider />
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="subtitle" sx={{ mt: 2 }}>
                            Superior
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Nombre de superior" name="nombre_superior" value={formData.nombre_superior} onChange={handleChange} inputProps={{ maxLength: 100 }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Puesto de superior" name="puesto_superior" value={formData.puesto_superior} onChange={handleChange} inputProps={{ maxLength: 100 }} />
                    </Grid>

                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={clear}>Cancelar</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">
                    {colaborador ? "Guardar cambios" : "Crear"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default FormResponsable;
