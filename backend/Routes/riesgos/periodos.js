const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/periodos');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

router.get('/', controller.obtenerPeriodos);
router.get('/obtener-periodo', controller.obtenerPeriodoUnico);
router.post('/', controller.crearPeriodo);
router.put('/', controller.actualizarPeriodo);

module.exports = router;
