const prisma = require('../../prisma/client');
const { codigo, errorRiesgo, nombrePersona, camposPersona, responder } = require('../../services/detalleRiesgos');
const { permisosUsuario } = require('../../services/permisosRiesgos');
const { calcularCortes } = require('../../services/cumplimientoPlanes');
const { camposActividadCorte, camposFrecuencia, cumplimientoAsignacion, diaGuatemala,
    referentePlan, superioresPlanes } = require('../../services/planesSeguimiento');
const { guardarAdjuntosPlan, descartarAdjuntosPlan } = require('../../services/archivosPlanes');
const { safeInDocs, esRutaPlan } = require('../../services/paths');

const riesgoActivo = { OR: [{ eliminado: 0 }, { eliminado: null }] };
const planActivo = { activo: 1, riesgo: riesgoActivo };
const vistaPlan = { codigoPlan: true, codigoEntidad: true, codigoPeriodo: true, codigoRiesgo: true, descripcion: true,
    riesgo: { select: { codigoDueno: true, ref: true, descripcion: true } } };
const seleccionDocumento = { codigoDoc: true, nombre: true, mime: true, tamano: true };
const incluirDocumentos = { documentos: { where: { activo: 1 }, select: seleccionDocumento, orderBy: { codigoDoc: 'asc' } } };
const auditoria = req => ({ usuarioModificacion: req.userId, fechaModificacion: new Date() });
const isoDia = date => date.toISOString().slice(0, 10);

function asignacionesPropias(codigoCia, codigoUsuario, codigoPeriodo) {
    return { codigoCia, activo: 1, plan: { ...planActivo, codigoPeriodo }, OR: [{ codigoColaborador: codigoUsuario },
        { codigoColaborador: null, plan: { riesgo: { codigoDueno: codigoUsuario } } }] };
}

/** Cuenta los cortes vencidos y por vencer en el periodo disponible para el inicio. */
exports.resumenInicio = responder(async (req, res) => {
    const codigoCia = req.codigo_cia;
    const hoy = diaGuatemala();
    const limite = new Date(hoy + 'T23:59:59Z');
    const periodo = await prisma.riesgosPeriodo.findFirst({
        where: { codigoCia, activo: 1, periodoInicial: { lte: limite } },
        orderBy: [{ periodoInicial: 'desc' }, { codigoPeriodo: 'desc' }], select: { codigoPeriodo: true }
    });
    if (!periodo) return res.json({ result: null });
    const rows = await prisma.riesgosPlanResponsable.findMany({ where: asignacionesPropias(codigoCia, req.userId, periodo.codigoPeriodo),
        select: { fechaInicio: true, fechaFin: true, frecuencia: { select: { cortesAnio: true } },
            actividades: { where: { activo: 1 }, select: camposActividadCorte } } });
    if (!rows.length) return res.json({ result: null });
    const result = { periodo: periodo.codigoPeriodo, vencidos: 0, porVencer: 0 };
    for (const row of rows) {
        const { resumen } = cumplimientoAsignacion(row, hoy);
        result.vencidos += resumen.vencido;
        result.porVencer += resumen.porVencer;
    }
    return res.json({ result });
});

/** Lista los planes propios del usuario y las asignaciones externas que representa como dueño. */
exports.misPlanes = responder(async (req, res) => {
    const codigoPeriodo = codigo(req.query.periodo);
    const codigoCia = req.codigo_cia;
    const codigoUsuario = req.userId;
    const asignaciones = await prisma.riesgosPlanResponsable.findMany({ where: asignacionesPropias(codigoCia, codigoUsuario, codigoPeriodo),
        include: { plan: { select: vistaPlan }, frecuencia: { select: camposFrecuencia },
            actividades: { where: { activo: 1 }, select: camposActividadCorte } },
        orderBy: { codigoResponsablePlan: 'asc' } });
    const hoy = diaGuatemala();
    const superiores = await superioresPlanes(prisma, codigoCia, [codigoUsuario]);
    const superior = superiores.get(codigoUsuario) ?? null;
    const mensajes = superior && asignaciones.length ? await prisma.riesgosPlanMensaje.groupBy({ by: ['codigoResponsablePlan'],
        where: { codigoCia, codigoAutor: superior.codigoColaborador, leido: 0,
            codigoResponsablePlan: { in: asignaciones.map(row => row.codigoResponsablePlan) } }, _count: { _all: true } }) : [];
    const porLeer = new Map(mensajes.map(row => [row.codigoResponsablePlan, row._count._all]));
    const result = asignaciones.map(({ actividades, ...row }) => ({ ...row, superior, ...cumplimientoAsignacion({ ...row, actividades }, hoy),
        noLeidos: porLeer.get(row.codigoResponsablePlan) ?? 0 }));
    result.sort((a, b) => b.resumen.vencido - a.resumen.vencido || a.codigoResponsablePlan - b.codigoResponsablePlan);
    return res.json({ result, hoy, codigoUsuario });
});

async function contexto(client, req) {
    const codigoCia = req.codigo_cia;
    const codigoResponsablePlan = codigo(req.params.asignacion);
    const asignacion = await client.riesgosPlanResponsable.findFirst({ where: { codigoCia, codigoResponsablePlan, activo: 1, plan: planActivo },
        include: { plan: { select: vistaPlan }, frecuencia: { select: camposFrecuencia } } });
    if (!asignacion) throw errorRiesgo(404, 'Asignación de plan no encontrada.');
    const referente = referentePlan(asignacion);
    const superior = (await superioresPlanes(client, codigoCia, [referente])).get(referente);
    const esReferente = referente === req.userId;
    const esSuperior = superior?.codigoColaborador === req.userId;
    return { asignacion, referente, superior, esReferente, esSuperior };
}

async function validarActividad(req, acceso, escribir) {
    if (acceso.esReferente || (!escribir && acceso.esSuperior)) return;
    const { asignacion } = acceso;
    if (asignacion.codigoColaborador === null && asignacion.plan.codigoEntidad === req.codigo_entidad &&
        (await permisosUsuario(req, ['/evaluacion-gestion-riesgos'])).has('/evaluacion-gestion-riesgos')) return;
    throw errorRiesgo(403, 'No tiene permiso para esta actividad.');
}

function datosActividad(body, asignacion) {
    const fecha = body?.fechaActividad;
    const fechaActividad = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(`${fecha}T00:00:00Z`) : null;
    if (!fechaActividad || Number.isNaN(fechaActividad.valueOf()) || isoDia(fechaActividad) !== fecha ||
        fechaActividad < asignacion.fechaInicio || fechaActividad > asignacion.fechaFin) {
        throw errorRiesgo(400, 'La fecha de actividad debe estar dentro de las fechas de la asignación.');
    }
    const descripcion = typeof body?.descripcion === 'string' ? body.descripcion.trim() : '';
    const documento = body?.documentoGenerado;
    if (!descripcion || descripcion.length > 2000 || (documento != null && (typeof documento !== 'string' || documento.length > 500))) {
        throw errorRiesgo(400, 'Indique una descripción de hasta 2000 caracteres y un documento de hasta 500.');
    }
    return { fechaActividad, descripcion, documentoGenerado: documento?.trim() || null };
}

function cortesDe(asignacion) {
    return calcularCortes({ fechaInicio: asignacion.fechaInicio, fechaFin: asignacion.fechaFin, cortesAnio: asignacion.frecuencia.cortesAnio });
}

function presentarActividad(row, cortes) {
    const fecha = isoDia(row.fechaActividad);
    const corte = cortes.find(item => fecha >= item.desde && fecha <= item.hasta);
    return { ...row, fueraDePlazo: Boolean(corte && diaGuatemala(row.fechaCreacion) > corte.hasta),
        documentos: row.documentos.map(doc => ({ ...doc, tamano: doc.tamano == null ? null : Number(doc.tamano) })) };
}

function llaveActividad(req, asignacion) {
    return { codigoCia: asignacion.codigoCia, codigoResponsablePlan: asignacion.codigoResponsablePlan,
        codigoActividad: codigo(req.params.actividad), activo: 1 };
}

async function transaccionActividad(req, operacion) {
    const codigoCia = req.codigo_cia;
    const codigoResponsablePlan = codigo(req.params.asignacion);
    return prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT CODIGO_RESPONSABLE_PLAN FROM riesgos_plan_responsable
            WHERE CODIGO_CIA = ${codigoCia} AND CODIGO_RESPONSABLE_PLAN = ${codigoResponsablePlan} FOR UPDATE`;
        const acceso = await contexto(tx, req);
        await validarActividad(req, acceso, true);
        return operacion(tx, acceso.asignacion);
    });
}

/** Autoriza antes de procesar una carga multipart. */
exports.autorizarRegistro = responder(async (req, _res, next) => {
    await validarActividad(req, await contexto(prisma, req), true);
    next();
});

/** Lista actividades activas de la asignación, con un corte opcional. */
exports.listarActividades = responder(async (req, res) => {
    const acceso = await contexto(prisma, req);
    await validarActividad(req, acceso, false);
    const asignacion = acceso.asignacion;
    const cortes = cortesDe(asignacion);
    const indice = req.query.corte == null ? null : codigo(req.query.corte);
    const corte = indice == null ? null : cortes.find(item => item.indice === indice);
    if (indice && !corte) throw errorRiesgo(404, 'Corte no encontrado.');
    const rows = await prisma.riesgosPlanActividad.findMany({ where: { codigoCia: asignacion.codigoCia,
        codigoResponsablePlan: asignacion.codigoResponsablePlan, activo: 1,
        ...(corte && { fechaActividad: { gte: new Date(`${corte.desde}T00:00:00Z`), lte: new Date(`${corte.hasta}T00:00:00Z`) } }) },
        include: incluirDocumentos, orderBy: [{ fechaActividad: 'asc' }, { codigoActividad: 'asc' }] });
    return res.json({ result: rows.map(row => presentarActividad(row, cortes)), puedeEditar: !acceso.esSuperior || acceso.esReferente });
});

/** Registra una actividad pendiente y guarda sus archivos bajo la ruta del plan. */
exports.crearActividad = responder(async (req, res) => {
    const acceso = await contexto(prisma, req);
    await validarActividad(req, acceso, true);
    datosActividad(req.body, acceso.asignacion);
    const archivos = await guardarAdjuntosPlan(acceso.asignacion, req.files ?? []);
    let result;
    try {
        result = await transaccionActividad(req, async (tx, asignacion) => {
            const { codigoCia, codigoResponsablePlan } = asignacion;
            const row = await tx.riesgosPlanActividad.create({ data: { ...datosActividad(req.body, asignacion),
                codigoCia, codigoResponsablePlan, usuarioCreacion: req.userId, fechaCreacion: new Date() } });
            if (archivos.length) {
                await tx.riesgosPlanActividadDoc.createMany({ data: archivos.map(doc => ({ ...doc, codigoCia,
                    codigoActividad: row.codigoActividad, usuarioCreacion: req.userId })) });
            }
            const completa = await tx.riesgosPlanActividad.findFirstOrThrow({ where: { codigoCia, codigoActividad: row.codigoActividad }, include: incluirDocumentos });
            return presentarActividad(completa, cortesDe(asignacion));
        });
    } catch (error) {
        await descartarAdjuntosPlan(archivos);
        throw error;
    }
    return res.status(201).json({ result });
});

async function modificarActividad(req, desactivar) {
    return transaccionActividad(req, async (tx, asignacion) => {
        const where = llaveActividad(req, asignacion);
        const data = desactivar ? { activo: 0 } : { ...datosActividad(req.body, asignacion), estado: 'P' };
        const { count } = await tx.riesgosPlanActividad.updateMany({ where: { ...where, estado: { in: ['P', 'O'] } },
            data: { ...data, ...auditoria(req) } });
        if (!count) {
            const actual = await tx.riesgosPlanActividad.findFirst({ where, select: { codigoActividad: true } });
            if (!actual) throw errorRiesgo(404, 'Actividad no encontrada.');
            throw errorRiesgo(409, 'Una actividad verificada no se puede editar ni desactivar.');
        }
        if (desactivar) return true;
        const row = await tx.riesgosPlanActividad.findFirstOrThrow({ where, include: incluirDocumentos });
        return presentarActividad(row, cortesDe(asignacion));
    });
}

/** Edita una actividad pendiente u observada y la deja pendiente de verificación. */
exports.editarActividad = responder(async (req, res) => res.json({ result: await modificarActividad(req, false) }));

/** Desactiva una actividad pendiente u observada. */
exports.desactivarActividad = responder(async (req, res) => res.json({ result: await modificarActividad(req, true) }));

/** Descarga un archivo a través de su actividad y del permiso de la asignación. */
exports.descargarAdjunto = responder(async (req, res) => {
    const acceso = await contexto(prisma, req);
    await validarActividad(req, acceso, false);
    const { codigoCia, codigoActividad, codigoResponsablePlan } = llaveActividad(req, acceso.asignacion);
    const documento = await prisma.riesgosPlanActividadDoc.findFirst({ where: { codigoCia, codigoActividad, activo: 1,
        codigoDoc: codigo(req.params.documento), actividad: { activo: 1, codigoResponsablePlan } }, select: { ruta: true, nombre: true } });
    if (!documento || !esRutaPlan(documento.ruta)) throw errorRiesgo(404, 'Documento no encontrado.');
    const archivo = safeInDocs(documento.ruta);
    res.set('X-Content-Type-Options', 'nosniff');
    return res.download(archivo, documento.nombre, { headers: { 'Content-Type': 'application/octet-stream' } }, error => {
        if (error && !res.headersSent) res.status(error.statusCode === 404 ? 404 : 500).json({ error: 'No se pudo descargar el documento.' });
    });
});

async function contextoChat(req) {
    const acceso = await contexto(prisma, req);
    if ((!acceso.esReferente && !acceso.esSuperior) || !acceso.superior || acceso.referente == null) {
        throw errorRiesgo(403, 'El chat es para el responsable y su superior asignado.');
    }
    const { codigoCia, codigoResponsablePlan } = acceso.asignacion;
    return { donde: { codigoCia, codigoResponsablePlan }, otro: acceso.esReferente ? acceso.superior.codigoColaborador : acceso.referente };
}

/** Devuelve el hilo al responsable o a su superior. */
exports.listarChat = responder(async (req, res) => {
    const { donde } = await contextoChat(req);
    const rows = await prisma.riesgosPlanMensaje.findMany({ where: donde, include: { autor: { select: camposPersona } },
        orderBy: [{ fecha: 'asc' }, { codigoMensaje: 'asc' }] });
    return res.json({ result: rows.map(({ autor, ...row }) => ({ ...row, autor: nombrePersona(autor) })) });
});

/** Envía un mensaje en el hilo de la asignación. */
exports.enviarMensaje = responder(async (req, res) => {
    const { donde } = await contextoChat(req);
    const mensaje = typeof req.body?.mensaje === 'string' ? req.body.mensaje.trim() : '';
    if (!mensaje || mensaje.length > 2000) throw errorRiesgo(400, 'El mensaje debe tener entre 1 y 2000 caracteres.');
    const result = await prisma.riesgosPlanMensaje.create({ data: { ...donde, mensaje, codigoAutor: req.userId,
        fecha: new Date(), usuarioCreacion: req.userId } });
    return res.status(201).json({ result });
});

/** Marca como leídos los mensajes recibidos del otro participante. */
exports.marcarLeidos = responder(async (req, res) => {
    const { donde, otro } = await contextoChat(req);
    const hasta = req.body?.hasta == null ? null : codigo(req.body.hasta);
    const result = await prisma.riesgosPlanMensaje.updateMany({ where: { ...donde, codigoAutor: otro, leido: 0,
        ...(hasta !== null && { codigoMensaje: { lte: hasta } }) }, data: { leido: 1, ...auditoria(req) } });
    return res.json({ result: result.count });
});
