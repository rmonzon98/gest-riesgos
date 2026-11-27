const prisma = require('../../prisma/client');
const { codigo, errorRiesgo, responder } = require('../../services/detalleRiesgos');
const { diaGuatemala } = require('../../services/planesSeguimiento');

const seleccion = { codigoTermino: true, titulo: true, descripcion: true, destacar: true, estado: true };

function datos(body = {}) {
    body ??= {};
    const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
    const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
    const estado = body.estado ?? '1';
    const destacar = body.destacar ?? true;
    if (!titulo || titulo.length > 150 || !descripcion || descripcion.length > 2000 ||
        !['1', '0'].includes(estado) || typeof destacar !== 'boolean') {
        throw errorRiesgo(400, 'Indique un título, una descripción y valores válidos para el estado y el destacado.');
    }
    return { titulo, descripcion, estado, destacar: Number(destacar) };
}

async function editarTermino(req, res, cambios) {
    const { count } = await prisma.riesgosGlosario.updateMany({
        where: { codigoCia: req.codigo_cia, codigoTermino: codigo(req.params.termino) },
        data: { ...cambios, usuarioModificacion: req.userId, fechaModificacion: new Date() }
    });
    if (!count) throw errorRiesgo(404, 'No se encontró el término.');
    return res.json({ result: true });
}

/** Lista los términos activos e inactivos para el catálogo de la institución. */
exports.listar = responder(async (req, res) => {
    const result = await prisma.riesgosGlosario.findMany({ where: { codigoCia: req.codigo_cia },
        select: seleccion, orderBy: [{ titulo: 'asc' }, { codigoTermino: 'asc' }] });
    return res.json({ result });
});

/** Registra un término en el glosario de la institución. */
exports.crear = responder(async (req, res) => {
    const result = await prisma.riesgosGlosario.create({ data: { ...datos(req.body), codigoCia: req.codigo_cia,
        usuarioCreacion: req.userId }, select: seleccion });
    return res.status(201).json({ result });
});

/** Actualiza el contenido, el destacado y el estado de un término. */
exports.editar = responder((req, res) => editarTermino(req, res, datos(req.body)));

/** Da de baja un término del catálogo conservando su contenido y bitácora. */
exports.desactivar = responder((req, res) => editarTermino(req, res, { estado: '0' }));

/** Aplica el índice diario a un catálogo ordenado por código. */
function elegirConcepto(terminos, hoy) {
    if (!terminos.length) return null;
    const anio = hoy.slice(0, 4);
    const indice = (Date.parse(hoy) - Date.parse(anio + '-01-01')) / 86_400_000 + 1;
    return terminos[indice % terminos.length];
}

exports.elegirConcepto = elegirConcepto;

/** Obtiene un concepto destacado para la fecha civil actual de Guatemala. */
exports.destacado = responder(async (req, res) => {
    const terminos = await prisma.riesgosGlosario.findMany({ where: { codigoCia: req.codigo_cia, destacar: 1, estado: '1' },
        select: { codigoTermino: true, titulo: true, descripcion: true }, orderBy: { codigoTermino: 'asc' } });
    return res.json({ result: elegirConcepto(terminos, diaGuatemala()) });
});
