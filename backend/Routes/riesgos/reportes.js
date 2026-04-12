const express = require('express');
const router = express.Router();
const controller = require('./../../Controller/riesgos/reportesFinalizados');
const { verifyJWT } = require('./../../services/verifyJWTUpd');

router.use(verifyJWT);


// Obtener Superior
router.get('/obtener-superior', controller.obtenerSuperiorInfo);



// Información General
router.get('/informacion-select', controller.obtenerInfoInicial);
router.get('/obtener-logo', controller.obtenerLogo);



// Reportes matriz de evaluación, mapa de calor y continuidad y monitoreo
router.get('/informacion-riesgos', controller.obtenerSuperior, controller.obtenerValores, controller.obtenerPropiedades);



// Reportes matriz de evaluación, mapa de calor y continuidad y monitoreo institucionales
router.get('/matriz-evaluacion-riesgos-inst', controller.obtenerSuperior, controller.institucion, controller.obtenerValoresInst, controller.obtenerPropiedades);

module.exports = router;