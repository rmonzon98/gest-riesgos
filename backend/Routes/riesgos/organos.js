const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/organos');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

router.get('/', controller.obtenerOrganos);
router.get('/obtener-organo', controller.obtenerOrgano);
router.post('/', controller.crearOrgano);
router.put('/', controller.actualizarOrgano);

module.exports = router;
