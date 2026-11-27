const prisma = require('../../prisma/client');
const { cargoVigente } = require('../../services/cargos');
const { accesoAdministracion, fechaCivil } = require('../../services/administracionRiesgos');
const { camposPersona, codigo, errorRiesgo, nombrePersona, responder } = require('../../services/detalleRiesgos');

function datosCargo(body = {}) {
    const nombreCargo = typeof body.nombreCargo === 'string' ? body.nombreCargo.trim() : '';
    const inicio = fechaCivil(body.fechaPosesion);
    const fin = fechaCivil(body.fechaEntrega);
    if (!nombreCargo || nombreCargo.length > 150 || !inicio || (fin && fin < inicio)) {
        throw errorRiesgo(400, 'Indique el nombre del cargo, la dirección y un rango de fechas válido.');
    }
    return { nombreCargo, codigoEntidad: codigo(body.codigoEntidad),
        fechaPosesion: new Date(inicio + 'T00:00:00Z'), fechaEntrega: fin ? new Date(fin + 'T00:00:00Z') : null };
}

async function validarPersona(req, client, ambito, bloquear) {
    const codigoCia = req.codigo_cia;
    const codigoColaborador = codigo(req.params.persona);
    if (bloquear) await client.$queryRaw`SELECT CODIGO_COLABORADOR FROM seguridad_persona
        WHERE CODIGO_CIA = ${codigoCia} AND CODIGO_COLABORADOR = ${codigoColaborador} FOR UPDATE`;
    const persona = await client.seguridadPersona.findFirst({ where: { codigoCia, codigoColaborador },
        select: { codigoEntidad: true } });
    if (!persona) throw errorRiesgo(404, 'No se encontró a la persona.');
    if (ambito.direccion != null && persona.codigoEntidad !== ambito.direccion) {
        throw errorRiesgo(403, 'La persona queda fuera de su dirección.');
    }
    return { codigoCia, codigoColaborador };
}

async function validarDireccion(tx, codigoCia, codigoEntidad) {
    if (!await tx.seguridadEntidad.count({ where: { codigoCia, codigoEntidad } })) {
        throw errorRiesgo(400, 'Seleccione una dirección de su institución.');
    }
}

/** Busca supervisores activos y ofrece sus datos para la firma. */
exports.buscarSuperiores = responder(async (req, res) => {
    await accesoAdministracion(req);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 3 || q.length > 120) throw errorRiesgo(400, 'Escriba entre 3 y 120 caracteres.');
    const result = await prisma.seguridadPersona.findMany({ where: { codigoCia: req.codigo_cia, activo: '1',
        AND: q.split(/\s+/).map(term => ({ OR: Object.keys(camposPersona).filter(campo => campo !== 'codigoColaborador')
            .map(campo => ({ [campo]: { contains: term } })) })) },
        select: { ...camposPersona, cargos: cargoVigente() }, orderBy: [{ primerApellido: 'asc' }, { primerNombre: 'asc' }], take: 20 });
    return res.json({ result: result.map(persona => ({ codigoColaborador: persona.codigoColaborador,
        nombre: nombrePersona(persona), cargo: persona.cargos[0]?.nombreCargo ?? '' })) });
});

/** Lista el historial de cargos de una persona dentro del ámbito administrativo. */
exports.listar = responder(async (req, res) => {
    const key = await validarPersona(req, prisma, await accesoAdministracion(req), false);
    const result = await prisma.riesgosColaboradorCargo.findMany({ where: key,
        include: { direccion: { select: { nombre: true } } }, orderBy: [{ fechaPosesion: 'desc' }, { codigoCargo: 'desc' }] });
    return res.json({ result });
});

/** Registra el nuevo cargo y fija el día anterior como fin del cargo previo. */
exports.registrar = responder(async (req, res) => {
    const ambito = await accesoAdministracion(req);
    const { codigoEntidad, nombreCargo, fechaPosesion } = datosCargo(req.body);
    const result = await prisma.$transaction(async tx => {
        const key = await validarPersona(req, tx, ambito, true);
        await validarDireccion(tx, key.codigoCia, codigoEntidad);
        const ultimo = await tx.riesgosColaboradorCargo.findFirst({ where: key,
            orderBy: { fechaPosesion: 'desc' }, select: { codigoCargo: true, fechaPosesion: true, fechaEntrega: true } });
        if (ultimo && (fechaPosesion <= ultimo.fechaPosesion || (ultimo.fechaEntrega && fechaPosesion <= ultimo.fechaEntrega))) {
            throw errorRiesgo(409, 'La nueva posesión debe ser posterior al último cargo registrado.');
        }
        if (ultimo && !ultimo.fechaEntrega) {
            const fechaEntrega = new Date(fechaPosesion.getTime() - 86_400_000);
            await tx.riesgosColaboradorCargo.update({
                where: { codigoCia_codigoCargo: { codigoCia: key.codigoCia, codigoCargo: ultimo.codigoCargo } },
                data: { fechaEntrega, fechaModificacion: new Date(), usuarioModificacion: req.userId }
            });
        }
        return tx.riesgosColaboradorCargo.create({ data: { ...key, codigoEntidad, nombreCargo, fechaPosesion,
            usuarioCreacion: req.userId } });
    });
    return res.status(201).json({ result });
});

/** Corrige un cargo y protege la validez de la cronología registrada. */
exports.corregir = responder(async (req, res) => {
    const ambito = await accesoAdministracion(req);
    const codigoCargo = codigo(req.params.cargo);
    const datos = datosCargo(req.body);
    const result = await prisma.$transaction(async tx => {
        const key = await validarPersona(req, tx, ambito, true);
        await validarDireccion(tx, key.codigoCia, datos.codigoEntidad);
        if (!await tx.riesgosColaboradorCargo.count({ where: { ...key, codigoCargo } })) {
            throw errorRiesgo(404, 'No se encontró el cargo.');
        }
        const solapado = await tx.riesgosColaboradorCargo.count({ where: { ...key, codigoCargo: { not: codigoCargo },
            ...(datos.fechaEntrega && { fechaPosesion: { lte: datos.fechaEntrega } }),
            OR: [{ fechaEntrega: null }, { fechaEntrega: { gte: datos.fechaPosesion } }] } });
        if (solapado) throw errorRiesgo(409, 'Las fechas se cruzan con otro cargo registrado.');
        return tx.riesgosColaboradorCargo.update({
            where: { codigoCia_codigoCargo: { codigoCia: key.codigoCia, codigoCargo } },
            data: { ...datos, usuarioModificacion: req.userId, fechaModificacion: new Date() }
        });
    });
    return res.json({ result });
});
