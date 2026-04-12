const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/roles');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

// Obtener roles para navbar
router.get('/', controller.obtenerRoles)


// Sección de roles en administración
router.get('/informacion-roles', controller.obtenerUrls, controller.obtenerRolesInfo)
router.get('/informacion-roles-direccion', controller.obtenerUrls, controller.obtenerRolesInfoDireccion)
router.get('/obtener-rol', controller.obtenerRolPorId)
router.put('/', controller.actualizarRolConUrls)
router.put('/cambiar-general/:id', controller.cambiarGeneral)
router.post('/', controller.crearRolConUrls)

//personas
router.get('/obtener-personas-con-roles', controller.obtenerPersonasRoles)
router.get('/obtener-personas-con-roles-direccion', controller.obtenerPersonasRolesDireccion)
router.get('/obtener-personas-con-roles-unico', controller.obtenerPersonasRolesUnico)
router.post('/crear-personas-con-roles', controller.crearPersonasRoles)
router.put('/actualizar-personas-con-roles', controller.actualizarPersonasRoles)

module.exports = router;