const express = require('express');
const router = express.Router();

const controller = require('../../Controller/general/administracion');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

router.get('/general', controller.obtenerGeneral);
router.put('/general', controller.actualizarGeneral);

// Logs
router.get('/obtener-logs', controller.obtenerLogsPorTabla)

// Metricas
router.get('/obtener-metricas', controller.obtenerMetricas)

module.exports = router;
