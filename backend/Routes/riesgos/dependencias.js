const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/dependencias');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

//router.get('/', verifyJWT, controller.obtenerAreas)
//router.get('/obtener-area', verifyJWT, controller.obtenerAreaUnica)
//router.post('/', verifyJWT, controller.crearAreas)
//router.put('/', verifyJWT, controller.actualizarAreas)

module.exports = router;