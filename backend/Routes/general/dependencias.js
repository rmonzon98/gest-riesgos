// routes/general/Dependencias.js
const express = require('express');
const router = express.Router();
const controller = require('../../Controller/general/dependencias');

const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

// 1) Listar por entidad
router.get('/', controller.obtenerDependencias);

// 2) Crear
router.post('/', controller.crearDependencia);

// 3) Actualizar
router.put('/', controller.actualizarDependencia);

// 4) Cambiar estado (toggle)
router.patch('/estado', controller.cambiarEstadoDependencia);

module.exports = router;
