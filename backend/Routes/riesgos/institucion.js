// Routes/User/Actualizado-Institucion.js
const express = require('express');
const router = express.Router();
const controller = require('../../Controller/riesgos/institucion');
const { verifyJWT } = require('../../services/verifyJWTUpd');

router.use(verifyJWT);

// Primera matriz
// Última versión de la primera matriz para la institución
router.get('/obtener-primer-matriz-direcciones', controller.obtenerPrimeraMatrizDirecciones)
router.get('/primera-matriz', controller.attachInstitucion, controller.getPrimeraMatriz);
// Guardar nueva versión de la primera matriz
router.post('/primera-matriz', controller.savePrimeraMatriz);

// Segunda matriz
// Última versión de la segunda matriz para la institución
router.get('/obtener-segunda-matriz-direcciones', controller.obtenerSegundaMatrizDirecciones)
router.get('/segunda-matriz', controller.attachInstitucion, controller.getSegundaMatriz);
// Guardar nueva versión de la segunda matriz
router.post('/segunda-matriz', controller.saveSegundaMatriz);

// Informe anual
router.get('/informe-anual', controller.cargarInformeAnual)
router.post('/informe-anual', controller.crearInformeAnual);

module.exports = router;
