const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/entidades');

router.get('/listado-entidades-login', controller.obtenerEntidades)

module.exports = router;