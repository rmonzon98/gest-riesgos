const prisma = require('../../prisma/client');
const { permisosUsuario } = require('../../services/permisosRiesgos');
const { historialSolicitudes } = require('./solicitudesEliminacion');
const { accesoRiesgo, camposPersona, codigo, errorRiesgo, esEditable, llaveRiesgo, mutarRiesgo,
    nombrePersona, propiedadesPeriodo, responder, riesgoUnico } = require('../../services/detalleRiesgos');
const ordenEventos = [{ orden: 'asc' }, { codigoEvento: 'asc' }];
const ejes = { codigoEje: true, nombre: true, descripcion: true, orden: true, estado: true };
const camposFisicos = row => Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase(), value]));

async function eventosRiesgo(client, key, riesgo) {
    const rows = await client.riesgosRiesgoEvento.findMany({ where: key, orderBy: ordenEventos });
    if (!rows.length && riesgo.evento?.trim()) {
        return [{ codigoEvento: 0, descripcion: riesgo.evento, orden: 1, activo: 1 }];
    }
    return rows.filter(row => row.activo === 1);
}

/** Devuelve el riesgo visible, las propiedades del periodo, eventos, conteos y bitácora. */
exports.detalle = responder(async (req, res) => {
    const key = llaveRiesgo(req);
    const permisos = await accesoRiesgo(req, key.codigoEntidad, 'ME', key);
    const row = await prisma.riesgosRiesgoExtendido.findUnique({ where: riesgoUnico(key), include: {
        dueno: { select: camposPersona },
        seguridadEntidad: { select: { nombre: true, siglas: true } },
        riesgosPeriodo: { select: { periodoInicial: true } }
    } });
    if (!row) throw errorRiesgo(404, 'Riesgo no encontrado.');
    const { dueno, seguridadEntidad: direccion, riesgosPeriodo: periodo, ...riesgo } = row;
    const [eventos, planes, vinculos, propiedades, opcionesEje, solicitudes, historia] = await Promise.all([
        eventosRiesgo(prisma, key, riesgo),
        prisma.riesgosPlanAccion.count({ where: { ...key, activo: 1 } }),
        prisma.riesgosRiesgoVinculo.count({ where: { ...key, activo: 1 } }),
        propiedadesPeriodo(prisma, key.codigoCia, key.codigoPeriodo),
        prisma.riesgosEjeEstrategico.findMany({ where: { codigoCia: key.codigoCia,
            OR: [{ estado: '1' }, ...(riesgo.codigoEje == null ? [] : [{ codigoEje: riesgo.codigoEje }])] }, select: ejes,
            orderBy: [{ orden: 'asc' }, { codigoEje: 'asc' }] }),
        historialSolicitudes(key, req.userId),
        prisma.$queryRaw`
            SELECT l.CODIGO_LOG AS codigoLog, l.NOMBRE_TABLA AS tabla, l.ACCION AS accion,
                   l.FECHA_CREACION AS fecha, l.INFORMACION AS informacion,
                   CONCAT_WS(' ', p.PRIMER_NOMBRE, p.PRIMER_APELLIDO) AS autor
            FROM riesgos_logs l
            LEFT JOIN seguridad_persona p ON p.CODIGO_CIA = l.CODIGO_CIA AND p.CODIGO_COLABORADOR = l.USUARIO_CREACION
            WHERE l.CODIGO_CIA = ${key.codigoCia}
              AND l.NOMBRE_TABLA IN ('riesgos_riesgo_extendido', 'riesgos_riesgo_evento')
              AND COALESCE(JSON_VALUE(l.INFORMACION, '$.despues.CODIGO_ENTIDAD'), JSON_VALUE(l.INFORMACION, '$.registro.CODIGO_ENTIDAD')) = ${key.codigoEntidad}
              AND COALESCE(JSON_VALUE(l.INFORMACION, '$.despues.CODIGO_PERIODO'), JSON_VALUE(l.INFORMACION, '$.registro.CODIGO_PERIODO')) = ${key.codigoPeriodo}
              AND COALESCE(JSON_VALUE(l.INFORMACION, '$.despues.CODIGO_RIESGO'), JSON_VALUE(l.INFORMACION, '$.registro.CODIGO_RIESGO')) = ${key.codigoRiesgo}
            ORDER BY l.CODIGO_LOG DESC LIMIT 100`
    ]);
    const data = camposFisicos(riesgo);
    data.EXTRAS_JSON = riesgo.extrasMe;
    return res.json({ result: { riesgo: data, eventos, conteos: { planes, vinculos }, propiedades, ejes: opcionesEje,
        historia, solicitudes, direccion, dueno: nombrePersona(dueno), vinculado: permisos.vinculado,
        anioPeriodo: periodo.periodoInicial?.getUTCFullYear() ?? key.codigoPeriodo,
        editable: permisos.edicion && esEditable(row),
        puedeSolicitarEliminacion: permisos.edicion && !permisos.eliminarDirecto && Number(row.eliminado) !== 1,
        puedeEliminarDirecto: permisos.eliminarDirecto && Number(row.eliminado) !== 1,
        puedeCambiarDueno: permisos.reasignar && esEditable(row) } });
});

/** Busca objetivos específicos de la institución para autocompletar. */
exports.objetivosHistoricos = responder(async (req, res) => {
    await accesoRiesgo(req, req.codigo_entidad);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 3) throw errorRiesgo(400, 'Escriba al menos tres caracteres.');
    const result = await prisma.riesgosRiesgoExtendido.groupBy({ by: ['objetivoTexto'],
        where: { codigoCia: req.codigo_cia, objetivoTexto: { contains: q }, OR: [{ eliminado: 0 }, { eliminado: null }] },
        orderBy: { objetivoTexto: 'asc' }, take: 20 });
    return res.json({ result: result.map(row => row.objetivoTexto) });
});

/** Busca posibles dueños entre las personas activas de la institución. */
exports.buscarDuenos = responder(async (req, res) => {
    if (!(await permisosUsuario(req, ['/reasignar'], { vigentes: true })).has('/reasignar')) {
        throw errorRiesgo(403, 'No tiene permiso para reasignar.');
    }
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 3) throw errorRiesgo(400, 'Escriba al menos tres caracteres.');
    const rows = await prisma.seguridadPersona.findMany({ where: { codigoCia: req.codigo_cia, activo: '1',
        AND: q.split(/\s+/).map(term => ({ OR: ['primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido']
            .map(field => ({ [field]: { contains: term } })) })) },
        select: camposPersona, orderBy: [{ primerApellido: 'asc' }, { primerNombre: 'asc' }], take: 20 });
    return res.json({ result: rows.map(row => ({ codigoColaborador: row.codigoColaborador, nombre: nombrePersona(row) })) });
});

/** Lista los ejes estratégicos del catálogo autorizado. */
exports.listarEjes = responder(async (req, res) => {
    const result = await prisma.riesgosEjeEstrategico.findMany({ where: { codigoCia: req.codigo_cia },
        select: ejes, orderBy: [{ orden: 'asc' }, { codigoEje: 'asc' }] });
    return res.json({ result });
});

function camposEje(body = {}) {
    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
    const orden = Number(body.orden);
    if (!nombre || nombre.length > 50 || !descripcion || descripcion.length > 500 || !Number.isInteger(orden) ||
        orden < 0 || orden > 2147483647 || body.orden === '' || body.orden === null) {
        throw errorRiesgo(400, 'Indique un nombre, una descripción y un orden válido.');
    }
    return { nombre, descripcion, orden };
}

/** Crea un eje estratégico de la institución. */
exports.crearEje = responder(async (req, res) => {
    const result = await prisma.riesgosEjeEstrategico.create({ data: { ...camposEje(req.body), codigoCia: req.codigo_cia,
        usuarioCreacion: req.userId }, select: ejes });
    return res.status(201).json({ result });
});

async function editarEje(req, res, data) {
    const result = await prisma.riesgosEjeEstrategico.updateMany({ where: { codigoCia: req.codigo_cia, codigoEje: codigo(req.params.eje) },
        data: { ...data, usuarioModificacion: req.userId, fechaModificacion: new Date() } });
    if (!result.count) throw errorRiesgo(404, 'Eje estratégico no encontrado.');
    return res.json({ result: true });
}

/** Edita los datos del eje estratégico. */
exports.editarEje = responder((req, res) => editarEje(req, res, camposEje(req.body)));

/** Activa o desactiva un eje sin afectar sus referencias históricas. */
exports.cambiarEstadoEje = responder((req, res) => {
    if (typeof req.body?.activo !== 'boolean') throw errorRiesgo(400, 'Indique si el eje estará activo.');
    return editarEje(req, res, { estado: req.body.activo ? '1' : '0' });
});

/** Lista los eventos activos del riesgo autorizado. */
exports.listarEventos = responder(async (req, res) => {
    const key = llaveRiesgo(req);
    await accesoRiesgo(req, key.codigoEntidad, 'ME', key);
    const riesgo = await prisma.riesgosRiesgoExtendido.findUnique({ where: riesgoUnico(key), select: { evento: true } });
    if (!riesgo) throw errorRiesgo(404, 'Riesgo no encontrado.');
    return res.json({ result: await eventosRiesgo(prisma, key, riesgo) });
});

function descripcionEvento(value) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || [...text].length > 1000 || /[\r\n]/.test(text)) {
        throw errorRiesgo(400, 'El evento debe ser una descripción de una línea de hasta 1000 caracteres.');
    }
    return text;
}

function codigoEvento(value) {
    return String(value) === '0' ? 0 : codigo(value);
}

async function mutarEventos(req, res, mutation, status = 200) {
    const result = await mutarRiesgo(req, async (tx, key, riesgo) => {
        const { codigoCia } = key;
        const historial = await tx.riesgosRiesgoEvento.findMany({ where: key, orderBy: ordenEventos });
        let activos = historial.filter(row => row.activo === 1);
        let legado;
        if (!historial.length && riesgo.evento?.trim()) {
            legado = await tx.riesgosRiesgoEvento.create({ data: { ...key, descripcion: riesgo.evento, orden: 1, usuarioCreacion: req.userId } });
            activos = [legado];
        }
        const persistir = (id, data) => tx.riesgosRiesgoEvento.update({ where: { codigoCia_codigoEvento: { codigoCia, codigoEvento: id } },
            data: { ...data, usuarioModificacion: req.userId, fechaModificacion: new Date() } });
        await mutation({ activos, crear: data => tx.riesgosRiesgoEvento.create({ data: { ...key, ...data, usuarioCreacion: req.userId } }),
            persistir, resolver: id => id === 0 ? legado?.codigoEvento : id });
        const rows = await tx.riesgosRiesgoEvento.findMany({ where: { ...key, activo: 1 }, orderBy: ordenEventos });
        const evento = rows.map(row => row.descripcion).join('\n');
        await tx.riesgosRiesgoExtendido.update({ where: riesgoUnico(key), data: { evento: evento || null,
            usuarioModificacion: req.userId, fechaModificacion: new Date() } });
        return rows;
    });
    return res.status(status).json({ result });
}

/** Agrega al final de la lista y sincroniza el texto legado del riesgo. */
exports.agregarEvento = responder((req, res) => {
    const descripcion = descripcionEvento(req.body?.descripcion);
    return mutarEventos(req, res, ({ activos, crear }) => crear({ descripcion, orden: (activos.at(-1)?.orden ?? 0) + 1 }), 201);
});

function modificarEvento(req, res, data) {
    const requested = codigoEvento(req.params.evento);
    return mutarEventos(req, res, ({ activos, persistir, resolver }) => {
        const id = resolver(requested);
        if (!activos.some(row => row.codigoEvento === id)) throw errorRiesgo(404, 'Evento no encontrado.');
        return persistir(id, data);
    });
}

/** Edita la descripción de un evento activo del riesgo. */
exports.editarEvento = responder((req, res) => modificarEvento(req, res, { descripcion: descripcionEvento(req.body?.descripcion) }));

/** Desactiva un evento del riesgo con borrado lógico. */
exports.desactivarEvento = responder((req, res) => modificarEvento(req, res, { activo: 0 }));

/** Reordena la lista completa de eventos activos en la misma transacción. */
exports.reordenarEventos = responder((req, res) => {
    if (!Array.isArray(req.body?.eventos)) throw errorRiesgo(400, 'Se requiere el orden completo de los eventos.');
    const ids = req.body.eventos.map(codigoEvento);
    return mutarEventos(req, res, async ({ activos, persistir, resolver }) => {
        const ordered = ids.map(resolver);
        const current = new Map(activos.map(row => [row.codigoEvento, row.orden]));
        if (new Set(ordered).size !== current.size || ordered.length !== current.size || ordered.some(id => !current.has(id))) {
            throw errorRiesgo(409, 'La lista de eventos cambió. Recargue antes de reordenarla.');
        }
        for (const [index, id] of ordered.entries()) {
            if (current.get(id) !== index + 1) await persistir(id, { orden: index + 1 });
        }
    });
});
