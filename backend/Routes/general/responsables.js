const express = require('express');
const router = express.Router();
const controller = require('../../Controller/general/responsables');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.put('/actualizar-contrasena', controller.actualizarContrasena);

router.use(verifyJWT);

router.get('/obtener-superior', controller.obtenerSuperior)
router.get('/obtener-mi-unidad', controller.miUnidad);
router.get('/', controller.obtenerPersonasPorEmpresa);
router.get('/obtener-responsable', controller.obtenerResponsableUnico);
router.put('/cambiar-vigente', controller.cambiarVigente)
router.put('/cambiar-activo', controller.cambiarActivo)

// Administración
router.put('/actualizar-contrasena-admin', controller.actualizarContrasenaAdmin);

// Dirección
router.get('/administracion-direccion', controller.obtenerPersonasPorEmpresaDireccion);
router.post('/direccion', controller.crearResponsableDireccion);
router.put('/direccion', controller.actualizarResponsableDireccion);

// General
router.get('/administracion-general', controller.obtenerPersonasPorEmpresaAdministracion);
router.post('/', controller.crearResponsable);
router.put('/', controller.actualizarResponsable);

// Perfil
router.get('/obtener-superior-perfil', controller.obtenerSuperiorPerfil);
router.put('/actualizar-contrasena-perfil', controller.actualizarContrasenaPerfil);
router.put('/actualizar-superior', controller.actualizarSuperior);

module.exports = router;
