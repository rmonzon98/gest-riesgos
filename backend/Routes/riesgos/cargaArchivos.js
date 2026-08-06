// routes/riesgos/carga-archivos.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

// === Tipos permitidos ===
const ALLOWED_MIME = new Set([
    'application/pdf', // .pdf
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel',                                          // .xls
    'application/msword',                                                // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);
const ALLOWED_EXT = new Set([
    '.pdf', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.doc', '.docx'
]);

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const mt = (file.mimetype || '').toLowerCase();
        const ext = path.extname(file.originalname || '').toLowerCase();

        const isImage = mt.startsWith('image/');
        const ok =
            isImage ||
            ALLOWED_MIME.has(mt) ||
            ALLOWED_EXT.has(ext);

        if (ok) return cb(null, true);
        return cb(new Error('FILE_TYPE_NOT_ALLOWED'));
    },
    limits: { fileSize: 50 * 1024 * 1024 }, // Opcional: 50MB
});

const { verifyJWT } = require('../../services/verifyJWTUpd');
const controller = require('../../Controller/riesgos/cargaArchivos');

// 1) Autenticación para todas las rutas
router.use(verifyJWT);

router.get('/listar-archivos-direccion-periodo', controller.listarArchivosDireccionPeriodo);

router.get('/listar-archivos-insti-periodo', controller.listarArchivosInstiPeriodo);

router.get('/consolidados', controller.obtenerFinales);

router.post('/descargar-lote', controller.descargarLoteConsolidados);

router.put('/:flag/:id', controller.eliminarDocumento)

// 2) Subir
router.post('/', upload.single('file'), controller.subirDocumento);

// 3) Listar
router.get('/:flag', controller.listarPorFlagPeriodo);

// 4) Descargar
router.get('/:flag/:id/download', controller.descargar);

// 5) Manejo de errores de tipo de archivo no permitido
router.use((err, req, res, next) => {
    if (err && err.message === 'FILE_TYPE_NOT_ALLOWED') {
        return res.status(400).json({
            ok: false,
            error: 'FILE_TYPE_NOT_ALLOWED',
            msg: 'Tipo de archivo no permitido. Solo PDF, Excel, Word e imágenes.'
        });
    }
    next(err);
});

router.post('/:flag/final', controller.actualizarFinalDocumento);

module.exports = router;
