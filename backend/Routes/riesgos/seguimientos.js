// routes/seguimientos.js
const express = require('express');
const router = express.Router();
const controller = require('./../../Controller/riesgos/seguimientos');
const { verifyJWT } = require('./../../services/verifyJWTUpd');

router.use(verifyJWT);

const multer = require('multer');

// Usamos memoria para decidir la ruta final en el controlador
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
});

// Seguimientos
router.get('/', controller.listar);
router.get('/periodo-mes', controller.obtenerPorPeriodoMes);
router.post('/', controller.registrar);
router.put('/', controller.actualizarMesPeriodo);
router.get('/obtener-relaciones-general', controller.obtenerRelacionesPreviasGeneral);

// Documentos de seguimiento
router.get('/documentos', controller.docsListar);
router.post('/documentos', upload.array('files[]', 10), controller.docsSubir);
router.get('/documentos/:codigo_doc/descargar', controller.docsDescargar);
router.put('/documentos/:codigo_doc', controller.eliminarDocumento);

// Continuidad de riesgos
router.post('/copiar-riesgo-proximo-periodo', controller.copiarSiguientePeriodo);
router.put('/relacionar-riesgo-anterior-periodo', controller.relacionarRiesgoAnteriorPeriodo);
router.get('/relaciones-continuidad', controller.obtenerRelacionesContinuidad);
router.put('/quitar-relacion-anterior-periodo', controller.quitarRelacionAnteriorPeriodo);
router.put('/quitar-relacion-siguiente-periodo', controller.quitarRelacionSiguientePeriodo);

// Visualización de seguimientos
router.get('/listar-direcciones', controller.obtenerSeguimientosPorCia);
router.get('/informacion-general-riesgos', controller.obtenerInformacionGeneralRiesgos || ((_req, res) => {
    res.status(501).json({ ok: false, message: 'Endpoint no implementado.' });
}));

// Reporte consolidados
router.get('/lista-periodo', controller.listaPeriodo);
router.get('/obtener-informacion', controller.obtenerInformacion);
router.post('/crear-reporte', controller.crearReporte);
router.put('/actualizar-reporte', controller.actualizarReporte);

module.exports = router;
