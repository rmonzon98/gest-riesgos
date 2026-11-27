const prisma = require('../../prisma/client');
const { camposPersona, codigo, errorRiesgo, mutarRiesgo, nombrePersona, responder, riesgoUnico } =
    require('../../services/detalleRiesgos');

const estados = new Set(['P', 'A', 'D', 'C']);
const personas = { solicitante: { select: camposPersona }, resolutor: { select: camposPersona } };

function presentar(row, usuario) {
    const { solicitante, resolutor, ...solicitud } = row;
    return { ...solicitud, solicitante: nombrePersona(solicitante), resolutor: nombrePersona(resolutor),
        puedeCancelar: row.estado === 'P' && row.codigoSolicitante === usuario };
}

function texto(value, obligatorio) {
    const limpio = typeof value === 'string' ? value.trim() : '';
    if ((obligatorio && !limpio) || limpio.length > 1000) {
        throw errorRiesgo(400, 'Escriba el motivo o comentario requerido con un máximo de 1000 caracteres.');
    }
    return limpio || null;
}

/** Devuelve el historial de solicitudes de un riesgo previamente autorizado. */
async function historialSolicitudes(key, usuario) {
    const rows = await prisma.riesgosSolicitudEliminacion.findMany({
        where: key, include: personas, orderBy: [{ fechaSolicitud: 'desc' }, { codigoSolicitud: 'desc' }]
    });
    return rows.map(row => presentar(row, usuario));
}

/** Crea una solicitud cuando el riesgo de la dirección sigue activo. */
const solicitar = responder(async (req, res) => {
    const motivo = texto(req.body?.motivo, true);
    const result = await mutarRiesgo(req, async (tx, key) => {
        if (await tx.riesgosSolicitudEliminacion.count({ where: { ...key, estado: 'P' } })) {
            throw errorRiesgo(409, 'Ya hay una solicitud de eliminación pendiente para este riesgo.');
        }
        return tx.riesgosSolicitudEliminacion.create({ data: { ...key, motivo, codigoSolicitante: req.userId,
            fechaSolicitud: new Date(), usuarioCreacion: req.userId } });
    }, { permitirAprobado: true });
    return res.status(201).json({ result });
});

/** Lista las solicitudes institucionales, con filtro de estado. */
const bandeja = responder(async (req, res) => {
    const estado = req.query.estado ?? 'P';
    if (estado !== '' && !estados.has(estado)) throw errorRiesgo(400, 'Estado de solicitud inválido.');
    const rows = await prisma.riesgosSolicitudEliminacion.findMany({
        where: { codigoCia: req.codigo_cia, ...(estado && { estado }) },
        include: { ...personas, riesgo: { select: { ref: true, descripcion: true,
            seguridadEntidad: { select: { nombre: true } } } } },
        orderBy: [{ fechaSolicitud: 'desc' }, { codigoSolicitud: 'desc' }]
    });
    return res.json({ result: rows.map(row => presentar(row, req.userId)) });
});

/** Espera el bloqueo del riesgo antes de cambiar una solicitud pendiente. */
async function cambiarSolicitud(req, estado, comentarioResolucion = null) {
    const codigoCia = req.codigo_cia;
    const codigoSolicitud = codigo(req.params.solicitud);
    return prisma.$transaction(async tx => {
        const where = { codigoCia, codigoSolicitud };
        const solicitud = await tx.riesgosSolicitudEliminacion.findFirst({ where, select: {
            codigoEntidad: true, codigoPeriodo: true, codigoRiesgo: true, codigoSolicitante: true
        } });
        if (!solicitud) throw errorRiesgo(404, 'Solicitud de eliminación no encontrada.');
        const { codigoEntidad, codigoPeriodo, codigoRiesgo, codigoSolicitante } = solicitud;
        if (estado === 'C' && codigoSolicitante !== req.userId) {
            throw errorRiesgo(403, 'Solo la persona solicitante puede cancelar la solicitud.');
        }
        await tx.$queryRaw`SELECT CODIGO_RIESGO FROM riesgos_riesgo_extendido WHERE CODIGO_CIA = ${codigoCia}
            AND CODIGO_ENTIDAD = ${codigoEntidad} AND CODIGO_PERIODO = ${codigoPeriodo}
            AND CODIGO_RIESGO = ${codigoRiesgo} FOR UPDATE`;
        const ahora = new Date();
        const auditoria = { usuarioModificacion: req.userId, fechaModificacion: ahora };
        const { count } = await tx.riesgosSolicitudEliminacion.updateMany({
            where: { ...where, estado: 'P' }, data: { estado, codigoResolutor: req.userId,
                fechaResolucion: ahora, comentarioResolucion, ...auditoria }
        });
        if (!count) throw errorRiesgo(409, 'La solicitud ya fue resuelta o cancelada.');
        if (estado === 'A') await tx.riesgosRiesgoExtendido.update({
            where: riesgoUnico({ codigoCia, codigoEntidad, codigoPeriodo, codigoRiesgo }),
            data: { eliminado: 1, ...auditoria }
        });
    }, { isolationLevel: 'ReadCommitted' });
}

/** Autoriza o deniega una solicitud de eliminación pendiente. */
const resolver = responder(async (req, res) => {
    const estado = req.body?.estado;
    if (estado !== 'A' && estado !== 'D') throw errorRiesgo(400, 'Indique si autoriza o deniega la solicitud.');
    await cambiarSolicitud(req, estado, texto(req.body?.comentario, estado === 'D'));
    return res.json({ result: true });
});

/** Permite a la persona solicitante cerrar su solicitud pendiente. */
const cancelar = responder(async (req, res) => {
    await cambiarSolicitud(req, 'C');
    return res.json({ result: true });
});

module.exports = { bandeja, cancelar, historialSolicitudes, resolver, solicitar };
