const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/primeraMatriz');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

// MATENIMIENTO
router.get('/', controller.obtenerVersiones);
router.get('/obtener-unico', controller.obtenerVersionUnica);
router.post('/', controller.crearVersion);
router.post('/copiar-defecto-anio-pasado', controller.copiarDefecto);
router.put('/establecer-defecto', controller.establecerDefecto);

// GUARDAR RESPUESTAS Y SUPERVISIÓN
router.get('/estado-historial', controller.obtenerEstadoEHistorial);


// GUARDAR RESPUESTAS
router.get('/matriz-defecto', controller.obtenerMatrizDefecto)
router.post('/guardar-respuesta', controller.guardarRespuesta);

// Supervision
router.put('/estado-actualizar', controller.estadoActualizar);

// SUPERIOR
router.put('/estado-actualizar-superior', controller.estadoActualizar);

// REPORTES
router.get('/ultima-version', controller.obtenerUltimaVersion);

module.exports = router;