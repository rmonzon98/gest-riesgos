const express = require('express');
const router = express.Router();

//ARCHIVOS
const multer = require('multer');

// Configurar multer para recibir archivos
const storage = multer.memoryStorage(); // Usamos memoria para procesarlo antes

//RUTAS
const controller = require('../../Controller/riesgos/archivos')
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

//LOGO REPORTES
const upload = multer({ storage });
router.get('/obtener-logo', controller.obtenerLogo)
router.put('/update-image-logo', upload.single('logo'), controller.actualizarLogo);

//LOGO BARRA
router.get('/obtener-logo-barra', controller.obtenerLogoBarra)
router.put('/update-image-logo-barra', upload.single('logo'), controller.actualizarLogoBarra);

//FOTO DE PERFIL
router.get('/obtener-foto-perfil', controller.obtenerFotoPerfil)
router.put('/update-foto-perfil', upload.single('foto-perfil'), controller.actualizarFotoPerfil);

//Archivos generales
router.get('/', controller.obtenerArchivo);

module.exports = router;
