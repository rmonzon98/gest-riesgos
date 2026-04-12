const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/riesgosVariables');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);



// INFORMACIÓN GENERAL
router.get('/obtener-info-inicial-vista-riesgos', controller.obtenerInfoInicial);
router.get('/obtener-catalogo-riesgos', controller.obtenerCatalogoRiesgos)
router.get('/obtener-propiedades', controller.obtenerPropiedades)
router.get('/lista-objetivos', controller.obtenerObjetivos)



// MANTENIMIENTO

// Propiedades de riesgos
router.get('/versiones-riesgos', controller.obtenerVersionesPropiedadesRiesgos)
router.get('/propiedades-riesgos', controller.obtenerPropiedadesDeVersionRiesgos)
router.post('/propiedades-riesgos', controller.crearVersionPropiedadesRiesgos)
router.post('/defecto-pasado-riesgo', controller.copiarDefectoPasadoRiesgo)
router.put('/defecto-riesgos', controller.establecerDefectoRiesgos)

// Propiedades de reportes
router.get('/propiedades-riesgos-defecto', controller.obtenerPropiedadesDefectoPeriodo)
router.get('/versiones-propiedades-reportes', controller.obtenerVersionesPropiedadesReportes)
router.post('/versiones-propiedades-reportes', controller.crearVersionPropiedadesReportes)
router.post('/defecto-pasado-reportes', controller.copiarDefectoPasadoReportes)
router.put('/versiones-establecer-defecto-reportes', controller.establecerDefectoReportes)



// RIESGOS
// INGRESO DE INFORMACIÓN
router.get('/obtener-lista', controller.obtenerRiesgos)
router.get('/riesgo-por-id', controller.obtenerRiesgoPorId)
router.get('/riesgo-por-id-periodo-anterior', controller.obtenerRiesgoPeriodoPasado)
router.post('/', controller.crearRiesgo)
router.put('/', controller.actualizarRiesgoMe)
router.put("/eliminar", controller.eliminarRiesgo);
router.put("/restablecer", controller.restablecerRiesgo);

//SUPERVISION
router.get('/unidad-periodo', controller.obtenerRiesgosUnidadPeriodo)
router.put('/revision', controller.comentarRiesgo)



// Monitoreo del comportamiento
router.get('/obtener-lista-riesgos-detalle', controller.obtenerDetalleRiesgos)



//RIESGOS PARA INSTITUCIÓN
router.get('/obtener-riesgos-periodo', controller.obtenerRiesgosPeriodo)
router.put('/mostrar-general', controller.actualizarMostrarGeneral)

module.exports = router;
