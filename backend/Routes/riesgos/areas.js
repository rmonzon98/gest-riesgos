const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/areas');
const { verifyJWT } = require('../../services/verifyJWTUpd');
const { requiereUrl } = require('../../services/permisosRiesgos');

router.use(verifyJWT);

router.get('/', controller.obtenerAreas)
router.get('/obtener-area', controller.obtenerAreaUnica)
router.post('/', requiereUrl('/areas'), controller.crearAreas)
router.put('/', requiereUrl('/areas'), controller.actualizarAreas)

module.exports = router;
