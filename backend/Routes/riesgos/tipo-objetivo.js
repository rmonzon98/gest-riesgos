const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/tipoObjetivo');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

router.get('/', controller.obtenerTiposObjetivo)
router.get('/obtener-tipo', controller.obtenerTipoObjetivoUnico)
router.post('/', controller.crearTipoObjetivo)
router.put('/', controller.actualizarTipoObjetivo)

module.exports = router;
