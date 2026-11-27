const express = require('express');
const multer = require('multer');
const { verifyJWT } = require('../../services/verifyJWTUpd');
const { requiereUrl } = require('../../services/permisosRiesgos');
const controller = require('../../Controller/riesgos/detalleMarn');
const planes = require('../../Controller/riesgos/planesMarn');
const actividades = require('../../Controller/riesgos/actividadesMarn');
const verificacion = require('../../Controller/riesgos/verificacionMarn');
const reasignacion = require('../../Controller/riesgos/reasignacionMarn');
const solicitudes = require('../../Controller/riesgos/solicitudesEliminacion');
const reportesPlanes = require('../../Controller/riesgos/reportesPlanes');
const glosario = require('../../Controller/riesgos/glosarioMarn');
const recorridos = require('../../Controller/riesgos/recorridosMarn');

const router = express.Router();
router.use(verifyJWT);

router.get('/objetivos-historicos', controller.objetivosHistoricos);
router.get('/duenos', controller.buscarDuenos);
router.get('/usuarios', planes.buscarUsuarios);
router.get('/mis-planes', requiereUrl('/mis-planes'), actividades.misPlanes);
router.get('/mis-planes/resumen-inicio', requiereUrl('/mis-planes'), actividades.resumenInicio);
router.get('/reportes-planes/filtros', reportesPlanes.filtros);
router.get('/reportes-planes/busqueda-responsables', reportesPlanes.buscarResponsables);
router.get('/reportes-planes/:tipo', reportesPlanes.obtener);
router.get('/glosario/destacado', glosario.destacado);
router.use('/glosario', requiereUrl('/glosario'));
router.get('/glosario', glosario.listar);
router.post('/glosario', glosario.crear);
router.put('/glosario/:termino', glosario.editar);
router.delete('/glosario/:termino', glosario.desactivar);
router.get('/tour/vistos', recorridos.vistos);
router.post('/tour/visto', recorridos.marcarVisto);
router.get('/verificacion/pendientes', verificacion.pendientes);
router.post('/verificacion/verificar', requiereUrl('/verificacion-actividades'), verificacion.verificar);
router.post('/verificacion/observar', requiereUrl('/verificacion-actividades'), verificacion.observar);
router.get('/verificacion/colaboradores', requiereUrl('/verificacion-actividades'), verificacion.colaboradores);
router.get('/planes-viceministerio', requiereUrl('/planes-viceministerio'), verificacion.planesViceministerio);
router.use('/reasignar', requiereUrl('/reasignar', { vigentes: true }));
router.get('/reasignar/catalogos', reasignacion.catalogos);
router.get('/reasignar/riesgos', reasignacion.riesgos);
router.patch('/reasignar/riesgos', reasignacion.reasignarRiesgos);
router.get('/reasignar/responsabilidades', reasignacion.responsabilidades);
router.patch('/reasignar/responsabilidades', reasignacion.reasignarResponsabilidades);
router.use('/autorizaciones-eliminacion', requiereUrl('/autorizaciones-eliminacion', { vigentes: true }));
router.get('/autorizaciones-eliminacion', solicitudes.bandeja);
router.patch('/autorizaciones-eliminacion/:solicitud', solicitudes.resolver);
router.patch('/solicitudes-eliminacion/:solicitud/cancelar', solicitudes.cancelar);

const adjuntos = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 10, fields: 3 } })
    .array('files[]', 10);
function cargarAdjuntos(req, res, next) {
    adjuntos(req, res, error => {
        if (!error) return next();
        return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE'
            ? 'Cada archivo puede pesar hasta 50 MB.' : 'Revise los campos y adjunte un máximo de 10 archivos.' });
    });
}
const asignacion = '/asignaciones/:asignacion';
router.get(`${asignacion}/actividades`, actividades.listarActividades);
router.post(`${asignacion}/actividades`, actividades.autorizarRegistro, cargarAdjuntos, actividades.crearActividad);
router.put(`${asignacion}/actividades/:actividad`, actividades.editarActividad);
router.delete(`${asignacion}/actividades/:actividad`, actividades.desactivarActividad);
router.get(`${asignacion}/actividades/:actividad/documentos/:documento`, actividades.descargarAdjunto);
router.get(`${asignacion}/chat`, actividades.listarChat);
router.post(`${asignacion}/chat`, actividades.enviarMensaje);
router.patch(`${asignacion}/chat/leidos`, actividades.marcarLeidos);

router.use('/ejes-estrategicos', requiereUrl('/ejes-estrategicos'));
router.get('/ejes-estrategicos', controller.listarEjes);
router.post('/ejes-estrategicos', controller.crearEje);
router.put('/ejes-estrategicos/:eje', controller.editarEje);
router.patch('/ejes-estrategicos/:eje/estado', controller.cambiarEstadoEje);

const rutaRiesgo = '/riesgo/:entidad/:periodo/:codigo';
router.get(rutaRiesgo, controller.detalle);
router.post(`${rutaRiesgo}/solicitudes-eliminacion`, solicitudes.solicitar);
router.get(`${rutaRiesgo}/eventos`, controller.listarEventos);
router.post(`${rutaRiesgo}/eventos`, controller.agregarEvento);
router.put(`${rutaRiesgo}/eventos/orden`, controller.reordenarEventos);
router.put(`${rutaRiesgo}/eventos/:evento`, controller.editarEvento);
router.delete(`${rutaRiesgo}/eventos/:evento`, controller.desactivarEvento);
router.get(`${rutaRiesgo}/planes`, planes.listarPlanes);
router.post(`${rutaRiesgo}/planes`, planes.crearPlan);
router.put(`${rutaRiesgo}/planes/:plan`, planes.editarPlan);
router.delete(`${rutaRiesgo}/planes/:plan`, planes.desactivarPlan);
router.post(`${rutaRiesgo}/planes/:plan/responsables`, planes.crearResponsable);
router.put(`${rutaRiesgo}/planes/:plan/responsables/:responsable`, planes.editarResponsable);
router.delete(`${rutaRiesgo}/planes/:plan/responsables/:responsable`, planes.desactivarResponsable);
router.get(`${rutaRiesgo}/vinculos`, planes.listarVinculos);
router.post(`${rutaRiesgo}/vinculos`, planes.crearVinculo);
router.delete(`${rutaRiesgo}/vinculos/:vinculo`, planes.desactivarVinculo);

module.exports = router;
