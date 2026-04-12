const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/areas');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

router.get('/', controller.obtenerAreas)
router.get('/obtener-area', controller.obtenerAreaUnica)
router.post('/', controller.crearAreas)
router.put('/', controller.actualizarAreas)

module.exports = router;