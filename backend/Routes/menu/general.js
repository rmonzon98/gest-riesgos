const express = require('express');
const router = express.Router();

const controller = require('../../Controller/menu/General');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

router.get('/', controller.obtenerAplicaciones);
router.get('/auth/puede-acceder', controller.checkApp);

module.exports = router;
