const prisma = require('../../prisma/client');
const { Prisma } = require('../../generated/prisma/client');
const { codigo, errorRiesgo, camposPersona, nombrePersona, responder } = require('../../services/detalleRiesgos');
const { permisosUsuario } = require('../../services/permisosRiesgos');
const { calcularCortes } = require('../../services/cumplimientoPlanes');
const { camposActividadCorte, camposFrecuencia, cumplimientoAsignacion, diaGuatemala,
    referentePlan, superioresPlanes } = require('../../services/planesSeguimiento');

const URL_VERIFICACION = '/verificacion-actividades';
const URL_ADMIN = '/administracion';
const URL_DIRECCION = '/administracion-direccion';
const riesgoActivo = { OR: [{ eliminado: 0 }, { eliminado: null }] };
const planActivo = { activo: 1, riesgo: riesgoActivo };
const datosRiesgo = { codigoDueno: true, ref: true, descripcion: true, seguridadEntidad: { select: { nombre: true } } };
const datosPlan = { codigoPlan: true, codigoEntidad: true, codigoPeriodo: true, codigoRiesgo: true, descripcion: true,
    riesgo: { select: datosRiesgo } };
const datosAsignacion = { plan: { select: datosPlan }, colaborador: { select: camposPersona }, frecuencia: { select: camposFrecuencia } };
const formatoActividad = { codigoActividad: true, codigoResponsablePlan: true, fechaActividad: true, descripcion: true,
    documentoGenerado: true, usuarioCreacion: true, documentos: { where: { activo: 1 }, orderBy: { codigoDoc: 'asc' },
        select: { codigoDoc: true, nombre: true, mime: true } } };
const tieneSuperior = codigoSuperior => ({ riesgosColaboradorSuperior: { is: { codigoSuperior } } });

function asignacionDe(codigoSuperior) {
    const persona = tieneSuperior(codigoSuperior);
    return { OR: [{ colaborador: persona }, { codigoColaborador: null, plan: { riesgo: { dueno: persona } } }] };
}

function datosResponsable(row) {
    return row.codigoColaborador == null ? `Externo: ${row.nombreExterno}` : nombrePersona(row.colaborador);
}

function representarAsignacion(row, hoy, superior) {
    const { actividades, colaborador, ...asignacion } = row;
    return { ...asignacion, nombreResponsable: datosResponsable(row), superior,
        totalActividades: actividades.length, ...cumplimientoAsignacion(row, hoy) };
}

/** Devuelve las actividades pendientes del superior y la sección de asignaciones sin superior cuando procede. */
exports.pendientes = responder(async (req, res) => {
    const codigoCia = req.codigo_cia;
    const codigoPeriodo = codigo(req.query.periodo);
    const permisos = await permisosUsuario(req, [URL_VERIFICACION, URL_ADMIN, URL_DIRECCION]);
    if (!permisos.size) throw errorRiesgo(403, 'No tiene acceso a la bandeja de verificación.');
    const condiciones = [];
    if (permisos.has(URL_VERIFICACION)) condiciones.push(asignacionDe(req.userId));
    if (permisos.has(URL_DIRECCION)) condiciones.push({ plan: { codigoEntidad: req.codigo_entidad ?? 0 } });
    const rows = await prisma.riesgosPlanResponsable.findMany({ where: { codigoCia, activo: 1, plan: { ...planActivo, codigoPeriodo },
        ...(!permisos.has(URL_ADMIN) && { OR: condiciones }), actividades: { some: { estado: 'P', activo: 1 } } },
        include: { ...datosAsignacion,
            actividades: { where: { estado: 'P', activo: 1 }, select: formatoActividad } } });
    const superiores = await superioresPlanes(prisma, codigoCia, rows.map(referentePlan));
    const autorIds = [...new Set(rows.flatMap(row => row.actividades.map(a => a.usuarioCreacion)).filter(id => id != null))];
    const autores = autorIds.length ? await prisma.seguridadPersona.findMany({ where: { codigoCia, codigoColaborador: { in: autorIds } }, select: camposPersona }) : [];
    const nombres = new Map(autores.map(row => [row.codigoColaborador, nombrePersona(row)]));
    const result = [];
    const sinSuperior = [];
    for (const row of rows) {
        const superior = superiores.get(referentePlan(row));
        const permiteVerificar = permisos.has(URL_VERIFICACION) && superior?.codigoColaborador === req.userId;
        const permiteCorregir = !superior && (permisos.has(URL_ADMIN) ||
            (permisos.has(URL_DIRECCION) && row.plan.codigoEntidad === req.codigo_entidad));
        if (!permiteVerificar && !permiteCorregir) continue;
        const lista = permiteVerificar ? result : sinSuperior;
        const cortes = calcularCortes({ fechaInicio: row.fechaInicio, fechaFin: row.fechaFin, cortesAnio: row.frecuencia.cortesAnio });
        for (const actividad of row.actividades) {
            const fecha = actividad.fechaActividad.toISOString().slice(0, 10);
            const corte = cortes.find(item => fecha >= item.desde && fecha <= item.hasta)?.etiqueta ?? null;
            const nombre = datosResponsable(row);
            const autor = nombres.get(actividad.usuarioCreacion);
            lista.push({ ...actividad, plan: row.plan, responsable: row.codigoColaborador == null && autor ? `${nombre} (registró: ${autor})` : nombre,
                corte, permiteVerificar });
        }
    }
    const comparar = (a, b) => a.fechaActividad - b.fechaActividad || a.codigoActividad - b.codigoActividad;
    return res.json({ result: result.sort(comparar), sinSuperior: sinSuperior.sort(comparar),
        puedeConsultarSinSuperior: permisos.has(URL_ADMIN) || permisos.has(URL_DIRECCION),
        puedeVerificar: permisos.has(URL_VERIFICACION), codigoUsuario: req.userId });
});

function codigosActividad(body) {
    const raw = body?.codigoActividad ?? body?.codigosActividad;
    const ids = [...new Set((Array.isArray(raw) ? raw : [raw]).map(codigo))];
    if (!ids.length) throw errorRiesgo(400, 'Seleccione al menos una actividad.');
    return ids;
}

function comentarioValido(value, requerido) {
    const comentario = typeof value === 'string' ? value.trim() : '';
    if ((requerido && !comentario) || comentario.length > 1000 || (value != null && typeof value !== 'string')) {
        throw errorRiesgo(400, requerido ? 'Ingrese un comentario de hasta 1000 caracteres.' : 'El comentario admite hasta 1000 caracteres.');
    }
    return comentario || null;
}

async function resolver(req, ids, estado, comentario) {
    const codigoCia = req.codigo_cia;
    return prisma.$transaction(async tx => {
        const buscar = () => tx.riesgosPlanActividad.findMany({ where: { codigoCia, activo: 1, codigoActividad: { in: ids },
            responsable: { activo: 1, plan: planActivo } },
            select: { codigoActividad: true, codigoResponsablePlan: true, estado: true,
                responsable: { select: { codigoColaborador: true, plan: { select: { riesgo: { select: { codigoDueno: true } } } } } } } });
        const candidatas = await buscar();
        const supervisoresIniciales = await superioresPlanes(tx, codigoCia, candidatas.map(row => referentePlan(row.responsable)));
        revisar(candidatas, supervisoresIniciales);
        const asignaciones = [...new Set(candidatas.map(row => row.codigoResponsablePlan))].sort((a, b) => a - b);
        await tx.$queryRaw`SELECT CODIGO_RESPONSABLE_PLAN FROM riesgos_plan_responsable
            WHERE CODIGO_CIA = ${codigoCia} AND CODIGO_RESPONSABLE_PLAN IN (${Prisma.join(asignaciones)})
            ORDER BY CODIGO_RESPONSABLE_PLAN FOR UPDATE`;
        const actuales = await buscar();
        const superiores = await superioresPlanes(tx, codigoCia, actuales.map(row => referentePlan(row.responsable)));
        revisar(actuales, superiores);
        const ahora = new Date();
        for (const codigoActividad of ids) {
            const { count } = await tx.riesgosPlanActividad.updateMany({ where: { codigoCia, codigoActividad, activo: 1, estado: 'P' },
                data: { estado, codigoVerificador: req.userId, fechaVerificacion: ahora, comentarioVerificador: comentario,
                    usuarioModificacion: req.userId, fechaModificacion: ahora } });
            if (!count) throw errorRiesgo(409, `La actividad ${codigoActividad} cambió durante la operación.`);
        }
        return ids;

        function revisar(rows, supervisores) {
            const porId = new Map(rows.map(row => [row.codigoActividad, row]));
            for (const id of ids) {
                const row = porId.get(id);
                if (!row || supervisores.get(referentePlan(row.responsable))?.codigoColaborador !== req.userId) {
                    throw errorRiesgo(403, `La actividad ${id} no le corresponde.`);
                }
                if (row.estado !== 'P') throw errorRiesgo(409, `La actividad ${id} ya no está pendiente de verificación.`);
            }
        }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

/** Verifica todas las actividades seleccionadas en una única transacción. */
exports.verificar = responder(async (req, res) => {
    const ids = codigosActividad(req.body);
    const result = await resolver(req, ids, 'V', comentarioValido(req.body?.comentario, false));
    return res.json({ result });
});

/** Observa una actividad pendiente y guarda el comentario obligatorio. */
exports.observar = responder(async (req, res) => {
    const id = codigo(req.body?.codigoActividad);
    const result = await resolver(req, [id], 'O', comentarioValido(req.body?.comentario, true));
    return res.json({ result });
});

async function asignaciones(codigoCia, codigoPeriodo, condiciones, extraPlan = {}) {
    return prisma.riesgosPlanResponsable.findMany({ where: { codigoCia, activo: 1,
        plan: { ...planActivo, codigoPeriodo, ...extraPlan }, ...condiciones },
        include: { ...datosAsignacion, actividades: { where: { activo: 1 }, select: camposActividadCorte } },
        orderBy: { codigoResponsablePlan: 'asc' } });
}

/** Lista las asignaciones de los colaboradores que supervisa el usuario. */
exports.colaboradores = responder(async (req, res) => {
    const codigoPeriodo = codigo(req.query.periodo);
    const filtro = req.query.filtro ?? 'todos';
    if (!['todos', 'con', 'sin'].includes(filtro)) throw errorRiesgo(400, 'Filtro de actividades inválido.');
    const estadoActividad = filtro === 'todos' ? {} : { actividades: { [filtro === 'con' ? 'some' : 'none']: { activo: 1 } } };
    const rows = await asignaciones(req.codigo_cia, codigoPeriodo, { ...asignacionDe(req.userId), ...estadoActividad });
    const hoy = diaGuatemala();
    return res.json({ result: rows.map(row => representarAsignacion(row, hoy, { codigoColaborador: req.userId })), codigoUsuario: req.userId });
});

/** Consulta direcciones del mismo viceministerio del asesor y filtra sus asignaciones por estado de corte. */
exports.planesViceministerio = responder(async (req, res) => {
    const codigoCia = req.codigo_cia;
    const codigoPeriodo = codigo(req.query.periodo);
    const estado = req.query.estado ?? '';
    if (!['', 'cumplido', 'pendiente', 'por_verificar', 'vencido', 'futuro', 'observada'].includes(estado)) {
        throw errorRiesgo(400, 'Estado de corte inválido.');
    }
    const propia = await prisma.seguridadEntidad.findFirst({ where: { codigoCia, codigoEntidad: req.codigo_entidad ?? 0 },
        select: { codigoViceministerio: true, riesgosViceministerio: { select: { nombre: true } } } });
    if (propia?.codigoViceministerio == null) throw errorRiesgo(400, 'Su dirección no tiene un viceministerio asignado.');
    const direcciones = await prisma.seguridadEntidad.findMany({ where: { codigoCia, codigoViceministerio: propia.codigoViceministerio },
        select: { codigoEntidad: true, nombre: true }, orderBy: { nombre: 'asc' } });
    const entidad = req.query.entidad == null || req.query.entidad === '' ? null : codigo(req.query.entidad);
    const ids = direcciones.map(row => row.codigoEntidad);
    if (entidad !== null && !ids.includes(entidad)) throw errorRiesgo(403, 'La dirección no pertenece a su viceministerio.');
    const rows = await asignaciones(codigoCia, codigoPeriodo, {}, { codigoEntidad: entidad ?? { in: ids } });
    const superiores = await superioresPlanes(prisma, codigoCia, rows.map(referentePlan));
    const hoy = diaGuatemala();
    const result = rows.map(row => representarAsignacion(row, hoy, superiores.get(referentePlan(row)) ?? null))
        .filter(row => !estado || row.cortes.some(corte => estado === 'observada' ? corte.observada : corte.estado === estado));
    return res.json({ result, direcciones, viceministerio: propia.riesgosViceministerio?.nombre ?? null });
});
