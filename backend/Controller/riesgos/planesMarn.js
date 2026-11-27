const prisma = require('../../prisma/client');
const { accesoRiesgo, camposPersona, codigo, errorRiesgo, llaveRiesgo,
    mutarRiesgo, nombrePersona, responder, riesgoUnico } = require('../../services/detalleRiesgos');
const { permisosUsuario } = require('../../services/permisosRiesgos');
const { camposActividadCorte, cumplimientoAsignacion, diaGuatemala } = require('../../services/planesSeguimiento');
const { resumen } = require('../../services/cumplimientoPlanes');
const { cargoVigente } = require('../../services/cargos');

const camposFrecuencia = { codigoFrecuencia: true, descripcion: true, cortesAnio: true };
const datosPersona = { ...camposPersona, codigoEntidad: true, activo: true,
    cargos: { where: { fechaEntrega: null }, select: { nombreCargo: true }, take: 1 } };
const inclusionesResponsable = { colaborador: { select: datosPersona }, frecuencia: { select: camposFrecuencia },
    actividades: { where: { activo: 1 }, select: camposActividadCorte } };
const inclusionesVinculo = { direccionVinculada: { select: { nombre: true } }, areaVinculada: { select: { descripcion: true } } };

function texto(value, nombre, max) {
    const dato = typeof value === 'string' ? value.trim() : '';
    if (!dato || dato.length > max) throw errorRiesgo(400, `${nombre} es obligatorio y admite hasta ${max} caracteres.`);
    return dato;
}

function datosPlan(body = {}) {
    const porcentajeMitigacion = Number(body.porcentajeMitigacion);
    if (!Number.isInteger(porcentajeMitigacion) || porcentajeMitigacion < 1 || porcentajeMitigacion > 100) {
        throw errorRiesgo(400, 'El porcentaje de mitigación debe ser un entero entre 1 y 100.');
    }
    return { descripcion: texto(body.descripcion, 'La acción', 1000), porcentajeMitigacion };
}

function auditoria(req) {
    return { usuarioModificacion: req.userId, fechaModificacion: new Date() };
}

async function requiereConsulta(req) {
    const key = llaveRiesgo(req);
    await accesoRiesgo(req, key.codigoEntidad, 'ME', key);
    if (!(await prisma.riesgosRiesgoExtendido.findUnique({ where: riesgoUnico(key), select: { codigoRiesgo: true } }))) {
        throw errorRiesgo(404, 'Riesgo no encontrado.');
    }
    return key;
}

/** Lista los planes activos del riesgo con sus responsables y frecuencias. */
exports.listarPlanes = responder(async (req, res) => {
    const key = await requiereConsulta(req);
    const planes = await prisma.riesgosPlanAccion.findMany({ where: { ...key, activo: 1 },
        include: { responsables: { where: { activo: 1 }, orderBy: { codigoResponsablePlan: 'asc' }, include: inclusionesResponsable } },
        orderBy: [{ orden: 'asc' }, { codigoPlan: 'asc' }] });
    const ids = [...new Set(planes.flatMap(plan => plan.responsables.map(row => row.colaborador?.codigoEntidad)).filter(id => id != null))];
    const direcciones = await prisma.seguridadEntidad.findMany({ where: { codigoCia: key.codigoCia, codigoEntidad: { in: ids } },
        select: { codigoEntidad: true, nombre: true } });
    const nombres = new Map(direcciones.map(row => [row.codigoEntidad, row.nombre]));
    const hoy = diaGuatemala();
    const result = planes.map(plan => {
        const responsables = plan.responsables.map(({ colaborador, actividades, ...row }) => ({ ...row,
            ...cumplimientoAsignacion({ ...row, actividades }, hoy),
            colaborador: colaborador && { codigoColaborador: colaborador.codigoColaborador, nombre: nombrePersona(colaborador),
                direccion: nombres.get(colaborador.codigoEntidad) ?? null, cargo: colaborador.cargos[0]?.nombreCargo ?? null }
        }));
        return { ...plan, responsables, cumplimiento: resumen(responsables.flatMap(row => row.cortes)).porcentaje };
    });
    return res.json({ result });
});

/** Crea un plan al final de la lista del riesgo editable. */
exports.crearPlan = responder(async (req, res) => {
    const data = datosPlan(req.body);
    const result = await mutarRiesgo(req, async (tx, key) => {
        const { _max } = await tx.riesgosPlanAccion.aggregate({ where: key, _max: { orden: true } });
        return tx.riesgosPlanAccion.create({ data: { ...key, ...data, orden: (_max.orden ?? 0) + 1, usuarioCreacion: req.userId } });
    });
    return res.status(201).json({ result });
});

async function planActivo(tx, key, rawId) {
    const codigoPlan = codigo(rawId);
    const plan = await tx.riesgosPlanAccion.findFirst({ where: { ...key, codigoPlan, activo: 1 }, select: { codigoPlan: true } });
    if (!plan) throw errorRiesgo(404, 'Plan activo no encontrado en este riesgo.');
    return codigoPlan;
}

async function modificarPlan(req, res, data) {
    const result = await mutarRiesgo(req, async (tx, key) => {
        const codigoPlan = await planActivo(tx, key, req.params.plan);
        return tx.riesgosPlanAccion.update({ where: { codigoCia_codigoPlan: { codigoCia: key.codigoCia, codigoPlan } },
            data: { ...data, ...auditoria(req) } });
    });
    return res.json({ result });
}

/** Edita la acción y el porcentaje actual de mitigación. */
exports.editarPlan = responder((req, res) => modificarPlan(req, res, datosPlan(req.body)));

/** Desactiva el plan y conserva las filas de su historial. */
exports.desactivarPlan = responder((req, res) => modificarPlan(req, res, { activo: 0 }));

function fechaISO(value, nombre) {
    const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
    if (!date || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
        throw errorRiesgo(400, `${nombre} debe ser una fecha válida.`);
    }
    return date;
}

async function datosResponsable(tx, key, body = {}) {
    const { tipo, recurso } = body;
    if (!['usuario', 'externo'].includes(tipo)) throw errorRiesgo(400, 'Seleccione un responsable usuario o externo.');
    if (!['I', 'E'].includes(recurso)) throw errorRiesgo(400, 'Seleccione un recurso interno o externo.');
    const fechaInicio = fechaISO(body.fechaInicio, 'La fecha de inicio');
    const fechaFin = fechaISO(body.fechaFin, 'La fecha de fin');
    if (fechaInicio > fechaFin) throw errorRiesgo(400, 'La fecha de inicio debe ser anterior o igual a la fecha de fin.');
    const periodo = await tx.riesgosPeriodo.findUnique({ where: { codigoCia_codigoPeriodo: {
        codigoCia: key.codigoCia, codigoPeriodo: key.codigoPeriodo } }, select: { periodoInicial: true } });
    const anio = periodo?.periodoInicial?.getUTCFullYear() ?? key.codigoPeriodo;
    if (fechaInicio.getUTCFullYear() !== anio || fechaFin.getUTCFullYear() !== anio) {
        throw errorRiesgo(400, `Las dos fechas deben estar dentro del año ${anio} del periodo.`);
    }
    const codigoFrecuencia = codigo(body.codigoFrecuencia);
    const frecuencia = await tx.riesgosFrecuencia.findFirst({ where: { codigoCia: key.codigoCia, codigoFrecuencia, estado: '1' },
        select: { codigoFrecuencia: true } });
    if (!frecuencia) throw errorRiesgo(400, 'La frecuencia seleccionada no está activa en la institución.');
    const comunes = { codigoFrecuencia, metodo: texto(body.metodo, 'El método', 500), recurso, fechaInicio, fechaFin };
    if (tipo === 'externo') {
        if (body.codigoColaborador != null && body.codigoColaborador !== '') throw errorRiesgo(400, 'El responsable externo no puede tener un usuario asignado.');
        return { ...comunes, codigoColaborador: null, nombreExterno: texto(body.nombreExterno, 'El nombre externo', 150),
            puestoExterno: texto(body.puestoExterno, 'El puesto externo', 150) };
    }
    if (body.nombreExterno || body.puestoExterno) throw errorRiesgo(400, 'El responsable usuario no puede incluir datos de una persona externa.');
    const codigoColaborador = codigo(body.codigoColaborador);
    const persona = await tx.seguridadPersona.findFirst({ where: { codigoCia: key.codigoCia, codigoColaborador, activo: '1' },
        select: { codigoColaborador: true } });
    if (!persona) throw errorRiesgo(400, 'Seleccione una persona activa de la institución.');
    return { ...comunes, codigoColaborador, nombreExterno: null, puestoExterno: null };
}

/** Agrega al plan un usuario de la institución o un responsable externo. */
exports.crearResponsable = responder(async (req, res) => {
    const result = await mutarRiesgo(req, async (tx, key) => {
        const codigoPlan = await planActivo(tx, key, req.params.plan);
        const data = await datosResponsable(tx, key, req.body);
        return tx.riesgosPlanResponsable.create({ data: { ...data, codigoCia: key.codigoCia, codigoPlan, usuarioCreacion: req.userId } });
    });
    return res.status(201).json({ result });
});

async function modificarResponsable(req, res, actualizar) {
    const result = await mutarRiesgo(req, async (tx, key) => {
        const codigoPlan = await planActivo(tx, key, req.params.plan);
        const codigoResponsablePlan = codigo(req.params.responsable);
        const existe = await tx.riesgosPlanResponsable.findFirst({ where: { codigoCia: key.codigoCia, codigoPlan, codigoResponsablePlan, activo: 1 },
            select: { codigoResponsablePlan: true } });
        if (!existe) throw errorRiesgo(404, 'Responsable activo no encontrado en este plan.');
        const data = await actualizar(tx, key, codigoResponsablePlan);
        return tx.riesgosPlanResponsable.update({ where: { codigoCia_codigoResponsablePlan: { codigoCia: key.codigoCia, codigoResponsablePlan } },
            data: { ...data, ...auditoria(req) } });
    });
    return res.json({ result });
}

/** Edita el tipo y los datos de un responsable activo. */
exports.editarResponsable = responder((req, res) => modificarResponsable(req, res, (tx, key) => datosResponsable(tx, key, req.body)));

/** Desactiva el responsable cuando todavía carece de actividades verificadas. */
exports.desactivarResponsable = responder((req, res) => modificarResponsable(req, res, async (tx, key, codigoResponsablePlan) => {
    const verificada = await tx.riesgosPlanActividad.findFirst({ where: { codigoCia: key.codigoCia, codigoResponsablePlan, estado: 'V' },
        select: { codigoActividad: true } });
    if (verificada) throw errorRiesgo(409, 'No puede desactivar un responsable con actividades verificadas.');
    return { activo: 0 };
}));

/** Busca por nombre personas activas en todas las direcciones de la institución. */
exports.buscarUsuarios = responder(async (req, res) => {
    const permisos = await permisosUsuario(req, ['/evaluacion-gestion-riesgos', '/reasignar'], { vigentes: true });
    if (!permisos.size) throw errorRiesgo(403, 'No tiene permiso para buscar responsables.');
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 3 || q.length > 120) throw errorRiesgo(400, 'La búsqueda debe tener entre 3 y 120 caracteres.');
    const rows = await prisma.seguridadPersona.findMany({ where: { codigoCia: req.codigo_cia, activo: '1',
        AND: q.split(/\s+/).map(term => ({ OR: ['primerNombre', 'segundoNombre', 'tercerNombre', 'primerApellido', 'segundoApellido', 'tercerApellido']
            .map(field => ({ [field]: { contains: term } })) })) },
        select: { ...datosPersona, cargos: cargoVigente() },
        orderBy: [{ primerApellido: 'asc' }, { primerNombre: 'asc' }], take: 20 });
    const codigos = [...new Set(rows.map(row => row.codigoEntidad).filter(id => id != null))];
    const direcciones = await prisma.seguridadEntidad.findMany({ where: { codigoCia: req.codigo_cia, codigoEntidad: { in: codigos } },
        select: { codigoEntidad: true, nombre: true } });
    const nombres = new Map(direcciones.map(row => [row.codigoEntidad, row.nombre]));
    return res.json({ result: rows.map(row => ({ codigoColaborador: row.codigoColaborador, nombre: nombrePersona(row),
        codigoEntidad: row.codigoEntidad, direccion: nombres.get(row.codigoEntidad) ?? null, cargo: row.cargos[0]?.nombreCargo ?? null })) });
});

/** Lista las direcciones y áreas vinculadas activas del riesgo. */
exports.listarVinculos = responder(async (req, res) => {
    const key = await requiereConsulta(req);
    const result = await prisma.riesgosRiesgoVinculo.findMany({ where: { ...key, activo: 1 }, include: inclusionesVinculo,
        orderBy: { codigoVinculo: 'asc' } });
    return res.json({ result });
});

/** Vincula una dirección distinta de la dueña con un área propia o general. */
exports.crearVinculo = responder(async (req, res) => {
    const codigoEntidadVinculada = codigo(req.body?.codigoEntidadVinculada);
    const rawArea = req.body?.codigoAreaVinculada;
    const codigoAreaVinculada = rawArea == null || rawArea === '' ? null : codigo(rawArea);
    try {
        const result = await mutarRiesgo(req, async (tx, key) => {
            if (codigoEntidadVinculada === key.codigoEntidad) throw errorRiesgo(400, 'Vincule una dirección distinta de la dueña del riesgo.');
            const direccion = await tx.seguridadEntidad.findFirst({ where: { codigoCia: key.codigoCia,
                codigoEntidad: codigoEntidadVinculada, estado: '1' }, select: { codigoEntidad: true } });
            if (!direccion) throw errorRiesgo(400, 'Seleccione una dirección activa de la institución.');
            if (codigoAreaVinculada !== null && !(await tx.riesgosArea.findFirst({ where: { codigoCia: key.codigoCia,
                codigoArea: codigoAreaVinculada, estado: '1', OR: [{ codigoEntidad: codigoEntidadVinculada }, { codigoEntidad: null }] },
                select: { codigoArea: true } }))) throw errorRiesgo(400, 'El área debe ser general o pertenecer a la dirección vinculada.');
            const destino = { codigoEntidadVinculada, codigoAreaVinculada };
            if (await tx.riesgosRiesgoVinculo.findFirst({ where: { ...key, ...destino, activo: 1 }, select: { codigoVinculo: true } })) {
                throw errorRiesgo(409, 'Ya existe un vínculo activo con esa dirección y área.');
            }
            return tx.riesgosRiesgoVinculo.create({ data: { ...key, ...destino, usuarioCreacion: req.userId }, include: inclusionesVinculo });
        });
        return res.status(201).json({ result });
    } catch (error) {
        if (error.code === 'P2002') throw errorRiesgo(409, 'Ya existe un vínculo activo con esa dirección y área.');
        throw error;
    }
});

/** Retira un vínculo sin borrar su historial. */
exports.desactivarVinculo = responder(async (req, res) => {
    const codigoVinculo = codigo(req.params.vinculo);
    await mutarRiesgo(req, async (tx, key) => {
        const result = await tx.riesgosRiesgoVinculo.updateMany({ where: { ...key, codigoVinculo, activo: 1 },
            data: { activo: 0, ...auditoria(req) } });
        if (!result.count) throw errorRiesgo(404, 'Vínculo activo no encontrado en este riesgo.');
    });
    return res.json({ result: true });
});
