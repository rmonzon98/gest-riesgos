const express = require('express');
const router = express.Router();
const controller = require('../../Controller/general/unidades');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

router.get('/', controller.obtenerDirecciones)
router.get('/obtener-direccion', controller.obtenerDireccionUnica)
router.post('/', controller.crearDirecciones)
router.put('/', controller.actualizarDirecciones)

module.exports = router;