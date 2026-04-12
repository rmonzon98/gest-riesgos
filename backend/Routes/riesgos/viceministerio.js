const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/viceministerio');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

router.get('/', controller.obtenerViceministerios);
router.get('/obtener-viceministerio', controller.obtenerViceministerio);
router.post('/', controller.crearViceministerio);
router.put('/', controller.actualizarViceministerio);

module.exports = router;
