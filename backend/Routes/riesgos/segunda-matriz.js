const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/segundaMatriz');
const { verifyJWT } = require('../../services/verifyJWTUpd');


router.use(verifyJWT);

// MATENIMIENTO
router.get('/', controller.obtenerVersionesPeriodo);
router.get('/obtener-unico', controller.obtenerUnico);
router.post('/', controller.crearSegundaMatriz);
router.post('/copiar-defecto-anio-pasado', controller.copiarDefectoAnioPasado);
router.put('/establecer-defecto', controller.establecerDefecto);

// GUARDAR RESPUESTAS Y SUPERVISIÓN
router.get('/estado-historial', controller.obtenerEstadoEHistorial);

// GUARDAR RESPUESTAS
router.get('/matriz-defecto', controller.obtenerMatrizDefecto);
router.post('/guardar-respuesta', controller.guardarRespuesta);

// Supervision
router.put('/estado-actualizar', controller.estadoActualizar);

// Supervision
router.put('/estado-actualizar-superior', controller.estadoActualizar);

// REPORTES
router.get('/ultima-version', controller.obtenerUltimaVersion);

module.exports = router;