const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/objetivos');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

router.get('/', controller.obtenerObjetivos);
router.get('/obtener-objetivo', controller.obtenerObjetivoUnico);
router.post('/', controller.crearObjetivo);
router.put('/', controller.actualizarObjetivo);

module.exports = router;
