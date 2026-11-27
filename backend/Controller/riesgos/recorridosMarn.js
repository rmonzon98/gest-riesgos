const prisma = require('../../prisma/client');
const { errorRiesgo, responder } = require('../../services/detalleRiesgos');

const pantallas = new Set(['riesgos-ingreso', 'riesgo-detalle', 'mis-planes', 'verificacion-actividades', 'reasignar']);

/** Lista los recorridos que ya se mostraron a la persona de la sesión. */
exports.vistos = responder(async (req, res) => {
    const rows = await prisma.seguridadPersonaTour.findMany({ where: { codigoCia: req.codigo_cia, codigoColaborador: req.userId },
        select: { pantalla: true }, orderBy: { pantalla: 'asc' } });
    return res.json({ result: rows.map(row => row.pantalla) });
});

/** Conserva la primera fecha en la que se mostró el recorrido de la persona. */
exports.marcarVisto = responder(async (req, res) => {
    const pantalla = req.body?.pantalla;
    if (!pantallas.has(pantalla)) throw errorRiesgo(400, 'El recorrido seleccionado no existe.');
    const { count } = await prisma.seguridadPersonaTour.createMany({
        data: [{ codigoCia: req.codigo_cia, codigoColaborador: req.userId, pantalla,
            fechaVisto: new Date(), usuarioCreacion: req.userId }], skipDuplicates: true
    });
    return res.status(count ? 201 : 200).json({ result: true });
});
