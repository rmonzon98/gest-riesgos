const prisma = require('../../prisma/client');
const { camposPersona, codigo, errorRiesgo, nombrePersona, responder } = require('../../services/detalleRiesgos');

const vigentes = { OR: [{ eliminado: 0 }, { eliminado: null }] };
const descripcionRiesgo = { codigoRiesgo: true, codigoPeriodo: true, codigoEntidad: true, ref: true,
    descripcion: true, seguridadEntidad: { select: { nombre: true } } };

function filtrosRiesgos(codigoCia, origen) {
    return { codigoCia, codigoEntidad: codigo(origen.entidad), codigoPeriodo: codigo(origen.periodo), ...vigentes,
        ...(origen.area != null && origen.area !== '' ? { codigoArea: codigo(origen.area) } : {}) };
}

function seleccion(ids) {
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 500) {
        throw errorRiesgo(400, 'Seleccione entre 1 y 500 registros.');
    }
    return [...new Set(ids.map(codigo))];
}

async function validarDestino(tx, codigoCia, codigoColaborador) {
    const filas = await tx.$queryRaw`SELECT CODIGO_COLABORADOR FROM seguridad_persona
        WHERE CODIGO_CIA = ${codigoCia} AND CODIGO_COLABORADOR = ${codigoColaborador} AND ACTIVO = '1' FOR UPDATE`;
    if (!filas.length) throw errorRiesgo(400, 'Elija un usuario activo de la institución.');
}

/** Devuelve las direcciones y áreas de la institución para filtrar riesgos. */
exports.catalogos = responder(async (req, res) => {
    const [direcciones, areas] = await Promise.all([
        prisma.seguridadEntidad.findMany({ where: { codigoCia: req.codigo_cia, estado: '1' },
            select: { codigoEntidad: true, nombre: true }, orderBy: { nombre: 'asc' } }),
        prisma.riesgosArea.findMany({ where: { codigoCia: req.codigo_cia },
            select: { codigoArea: true, codigoEntidad: true, descripcion: true }, orderBy: { descripcion: 'asc' } })
    ]);
    return res.json({ result: { direcciones, areas } });
});

/** Lista los riesgos no eliminados y sus dueños actuales. */
exports.riesgos = responder(async (req, res) => {
    const rows = await prisma.riesgosRiesgoExtendido.findMany({ where: filtrosRiesgos(req.codigo_cia, req.query),
        select: { ...descripcionRiesgo, dueno: { select: camposPersona } }, orderBy: [{ ref: 'asc' }, { codigoRiesgo: 'asc' }] });
    return res.json({ result: rows.map(row => ({ ...row, dueno: nombrePersona(row.dueno) })) });
});

/** Cambia el dueño de todos los riesgos seleccionados en una transacción. */
exports.reasignarRiesgos = responder(async (req, res) => {
    const where = { ...filtrosRiesgos(req.codigo_cia, req.body || {}), codigoRiesgo: { in: seleccion(req.body?.ids) } };
    const codigoDueno = codigo(req.body?.destino);
    const result = await prisma.$transaction(async tx => {
        await validarDestino(tx, req.codigo_cia, codigoDueno);
        const { count } = await tx.riesgosRiesgoExtendido.updateMany({ where, data: { codigoDueno,
            usuarioModificacion: req.userId, fechaModificacion: new Date() } });
        if (count !== where.codigoRiesgo.in.length) throw errorRiesgo(409, 'La selección cambió. Actualice y vuelva a intentarlo.');
        return count;
    });
    return res.json({ result });
});

function filtrosResponsabilidades(codigoCia, origen) {
    return { codigoCia, codigoColaborador: codigo(origen), activo: 1, plan: { activo: 1, riesgo: vigentes } };
}

/** Lista las responsabilidades activas de la persona de origen. */
exports.responsabilidades = responder(async (req, res) => {
    const result = await prisma.riesgosPlanResponsable.findMany({ where: filtrosResponsabilidades(req.codigo_cia, req.query.origen),
        select: { codigoResponsablePlan: true, fechaInicio: true, fechaFin: true, plan: {
            select: { descripcion: true, riesgo: { select: descripcionRiesgo } } }
        }, orderBy: { codigoResponsablePlan: 'asc' } });
    return res.json({ result });
});

/** Cambia la persona responsable y conserva los datos históricos de las actividades. */
exports.reasignarResponsabilidades = responder(async (req, res) => {
    const where = { ...filtrosResponsabilidades(req.codigo_cia, req.body?.origen),
        codigoResponsablePlan: { in: seleccion(req.body?.ids) } };
    const codigoColaborador = codigo(req.body?.destino);
    if (codigoColaborador === where.codigoColaborador) throw errorRiesgo(400, 'Elija una persona distinta de la de origen.');
    const result = await prisma.$transaction(async tx => {
        await validarDestino(tx, req.codigo_cia, codigoColaborador);
        const { count } = await tx.riesgosPlanResponsable.updateMany({ where, data: { codigoColaborador,
            usuarioModificacion: req.userId, fechaModificacion: new Date() } });
        if (count !== where.codigoResponsablePlan.in.length) throw errorRiesgo(409, 'La selección cambió. Actualice y vuelva a intentarlo.');
        return count;
    });
    return res.json({ result });
});
