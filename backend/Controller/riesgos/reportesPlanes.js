const prisma = require('../../prisma/client');
const { permisosUsuario } = require('../../services/permisosRiesgos');
const { camposPersona, codigo, errorRiesgo, nombrePersona, responder } = require('../../services/detalleRiesgos');
const { fechaCivil } = require('../../services/administracionRiesgos');
const { cargoVigente } = require('../../services/cargos');
const { resumen } = require('../../services/cumplimientoPlanes');
const { cumplimientoAsignacion, diaGuatemala, referentePlan, superioresPlanes } = require('../../services/planesSeguimiento');

const titulos = {
    trabajo: 'Plan de trabajo en evaluación de riesgos',
    avance: 'Avance del seguimiento de riesgos',
    consolidado: 'Avance consolidado por dirección',
    incumplimiento: 'Informe de incumplimiento de actividades',
    actividades: 'Informe de actividades',
    designacion: 'Designación del responsable',
    responsables: 'Riesgos por responsable'
};
const estados = {
    cumplido: 'Cumplido', por_verificar: 'Por verificar', observado: 'Observado',
    pendiente: 'Pendiente', vencido: 'Vencido', futuro: 'Futuro'
};
const estadosActividad = { P: 'Por verificar', V: 'Verificada', O: 'Observada' };
const direccion = { codigoEntidad: true, nombre: true };
const fechaIso = fecha => fecha?.toISOString().slice(0, 10) ?? '';
const col = (nombre, formato) => ({ nombre, ...(formato && { formato }) });
const fecha = nombre => col(nombre, 'fecha');
const porcentaje = nombre => col(nombre, 'porcentaje');
const riesgoCols = ['Dirección', 'REF', 'Riesgo', 'Plan de acción'].map(nombre => col(nombre));
const responsabilidadCols = [col('Responsable'), col('Frecuencia'), fecha('Inicio'), fecha('Fin')];
const actividadCols = [fecha('Fecha'), col('Actividad'), col('Estado'), col('Verificador'),
    col('Comentario'), col('Archivos')];

async function ambitoDireccion(req, filtro) {
    const permisos = await permisosUsuario(req, ['/reportes-riesgos', '/riesgos-institucional']);
    if (!permisos.has('/reportes-riesgos')) throw errorRiesgo(403, 'No tiene permiso para consultar reportes de planes.');
    const solicitada = filtro ? codigo(filtro) : null;
    if (permisos.has('/riesgos-institucional')) return solicitada;
    const propia = Number(req.codigo_entidad);
    if (!propia || (solicitada && solicitada !== propia)) {
        throw errorRiesgo(403, 'Los reportes de su usuario corresponden a su dirección.');
    }
    return propia;
}

function filtroRiesgo(entidad) {
    return { OR: [{ eliminado: 0 }, { eliminado: null }], ...(entidad && { AND: [{ OR: [
        { codigoEntidad: entidad }, { vinculos: { some: { activo: 1, codigoEntidadVinculada: entidad } } }
    ] }] }) };
}

/** Devuelve los filtros disponibles dentro del ámbito de reportes del usuario. */
exports.filtros = responder(async (req, res) => {
    const propia = await ambitoDireccion(req);
    const direcciones = await prisma.seguridadEntidad.findMany({ where: { codigoCia: req.codigo_cia,
        ...(propia && { codigoEntidad: propia }) }, select: direccion, orderBy: { nombre: 'asc' } });
    return res.json({ result: { propia, direcciones, reportes: Object.entries(titulos).map(([codigo, titulo]) => ({ codigo, titulo })) } });
});

/** Busca personas que figuran como responsables en los planes visibles para el usuario. */
exports.buscarResponsables = responder(async (req, res) => {
    const entidad = await ambitoDireccion(req, req.query.entidad);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 3 || q.length > 120) throw errorRiesgo(400, 'Escriba entre 3 y 120 caracteres.');
    const result = await prisma.seguridadPersona.findMany({ where: { codigoCia: req.codigo_cia,
        responsabilidadesPlan: { some: { activo: 1, plan: { activo: 1, riesgo: filtroRiesgo(entidad) } } },
        AND: q.split(/\s+/).map(term => ({ OR: Object.keys(camposPersona).filter(campo => campo !== 'codigoColaborador')
            .map(campo => ({ [campo]: { contains: term } })) })) },
        select: camposPersona, orderBy: [{ primerApellido: 'asc' }, { primerNombre: 'asc' }], take: 20 });
    return res.json({ result: result.map(row => ({ codigoColaborador: row.codigoColaborador, nombre: nombrePersona(row) })) });
});

function responsableNombre(row) {
    return row.nombreExterno ? `Externo: ${row.nombreExterno}` : nombrePersona(row.colaborador);
}

function datosRiesgo(plan, entidad) {
    const { riesgo } = plan;
    const nombre = riesgo.seguridadEntidad.nombre;
    return [entidad && entidad !== plan.codigoEntidad ? `${nombre} (vinculado)` : nombre, riesgo.ref, riesgo.descripcion, plan.descripcion];
}

const datosResponsable = row => [responsableNombre(row), row.frecuencia.descripcion, fechaIso(row.fechaInicio), fechaIso(row.fechaFin)];

function datosActividad(actividad) {
    return [fechaIso(actividad.fechaActividad), actividad.descripcion, estadosActividad[actividad.estado],
        nombrePersona(actividad.verificador), actividad.comentarioVerificador, actividad._count.documentos];
}

function columnas(tipo) {
    const extra = {
        trabajo: [porcentaje('Mitigación'), ...responsabilidadCols, col('Método'), col('Recurso')],
        avance: [...responsabilidadCols, col('Cortes'), porcentaje('Cumplimiento')],
        incumplimiento: [col('Responsable'), col('Superior'), col('Corte'), fecha('Desde'), fecha('Hasta')],
        actividades: [col('Responsable'), ...actividadCols],
        designacion: [col('Responsable'), col('Cargo'), fecha('Inicio'), fecha('Fin'), col('Firma')],
        responsables: [col('Responsable'), col('Cargo'), col('Registró'), ...actividadCols]
    };
    if (tipo === 'consolidado') return [col('Dirección'), col('Cumplidos'), col('Por verificar'), col('Pendientes'),
        col('Vencidos'), col('Futuros'), col('Total de cortes'), porcentaje('Cumplimiento')];
    return [...riesgoCols, ...extra[tipo]];
}

function filasDetalle(tipo, planes, entidad, superiores, autores) {
    return planes.flatMap(plan => {
        const datos = datosRiesgo(plan, entidad);
        if (tipo === 'trabajo' && !plan.responsables.length) return [[...datos, plan.porcentajeMitigacion]];
        return plan.responsables.flatMap(row => {
            const persona = responsableNombre(row);
            const cargo = row.puestoExterno ?? row.colaborador?.cargos[0]?.nombreCargo;
            switch (tipo) {
                case 'trabajo':
                    return [[...datos, plan.porcentajeMitigacion, ...datosResponsable(row), row.metodo, row.recurso === 'I' ? 'Interno' : 'Externo']];
                case 'avance':
                    return [[...datos, ...datosResponsable(row), row.cortes.map(corte =>
                        `${corte.etiqueta} · ${estados[corte.estado]}`).join('\n'), row.resumen.porcentaje]];
                case 'incumplimiento': {
                    const superior = superiores.get(referentePlan({ ...row, plan }))?.nombre;
                    return row.cortes.filter(corte => corte.estado === 'vencido').map(corte =>
                        [...datos, persona, superior, corte.etiqueta, corte.desde, corte.hasta]);
                }
                case 'actividades':
                    return row.actividadesEnRango.map(actividad => [...datos, persona, ...datosActividad(actividad)]);
                case 'designacion':
                    return [[...datos, persona, cargo, fechaIso(row.fechaInicio), fechaIso(row.fechaFin), '________________']];
                case 'responsables':
                    return row.actividadesEnRango.length ? row.actividadesEnRango.map(actividad =>
                        [...datos, persona, cargo, autores.get(actividad.usuarioCreacion), ...datosActividad(actividad)]) :
                        [[...datos, persona, cargo]];
                default:
                    return [];
            }
        });
    });
}

function filasConsolidadas(planes, entidad, direcciones) {
    const porDireccion = new Map();
    function sumar(id, datos) {
        if (!porDireccion.has(id)) porDireccion.set(id, { cumplido: 0, por_verificar: 0,
            pendiente: 0, vencido: 0, futuro: 0, total: 0, cerrados: 0 });
        const suma = porDireccion.get(id);
        for (const campo of Object.keys(suma)) suma[campo] += datos[campo];
    }
    for (const plan of planes) {
        const entidades = new Set([plan.codigoEntidad, ...plan.riesgo.vinculos.map(row => row.codigoEntidadVinculada)]);
        for (const responsable of plan.responsables) {
            if (!entidad) sumar(null, responsable.resumen);
            for (const id of entidades) {
                if (!entidad || id === entidad) sumar(id, responsable.resumen);
            }
        }
    }
    const nombres = new Map(direcciones.map(row => [row.codigoEntidad, row.nombre]));
    return [...porDireccion].sort(([a], [b]) => a == null ? -1 : b == null ? 1 :
        nombres.get(a)?.localeCompare(nombres.get(b), 'es-GT')).map(([id, row]) => [
        id == null ? 'Total institucional' : nombres.get(id), row.cumplido, row.por_verificar, row.pendiente,
        row.vencido, row.futuro, row.total, row.cerrados ? Math.round(row.cumplido * 10000 / row.cerrados) / 100 : null
    ]);
}

/** Prepara la tabla que se exporta a PDF o Excel para uno de los siete informes de planes. */
exports.obtener = responder(async (req, res) => {
    const { tipo } = req.params;
    if (!Object.hasOwn(titulos, tipo)) throw errorRiesgo(404, 'Reporte de planes no encontrado.');
    const codigoCia = req.codigo_cia;
    const entidad = await ambitoDireccion(req, req.query.entidad);
    const codigoPeriodo = codigo(req.query.periodo);
    const responsable = req.query.responsable ? codigo(req.query.responsable) : null;
    const desde = fechaCivil(req.query.desde);
    const hasta = fechaCivil(req.query.hasta);
    if (desde && hasta && desde > hasta) throw errorRiesgo(400, 'El rango de fechas está invertido.');
    const dia = value => new Date(value + 'T00:00:00Z');
    const asignacion = { activo: 1, ...(responsable && { codigoColaborador: responsable }),
        ...(desde && { fechaFin: { gte: dia(desde) } }), ...(hasta && { fechaInicio: { lte: dia(hasta) } }) };
    const [registro, direcciones, planes] = await Promise.all([
        prisma.seguridadInstitucion.findUnique({ where: { codigoCia }, select: { nombre: true } }),
        prisma.seguridadEntidad.findMany({ where: { codigoCia }, select: direccion }),
        prisma.riesgosPlanAccion.findMany({ where: { codigoCia, codigoPeriodo, activo: 1, riesgo: filtroRiesgo(entidad),
            ...((responsable || desde || hasta) && { responsables: { some: asignacion } }) },
            include: { riesgo: { select: { codigoDueno: true, ref: true, descripcion: true,
                seguridadEntidad: { select: direccion }, vinculos: { where: { activo: 1 }, select: { codigoEntidadVinculada: true } } } },
                responsables: { where: asignacion, orderBy: { codigoResponsablePlan: 'asc' }, include: {
                    colaborador: { select: { ...camposPersona, cargos: cargoVigente() } },
                    frecuencia: { select: { descripcion: true, cortesAnio: true } },
                    actividades: { where: { activo: 1 }, orderBy: [{ fechaActividad: 'asc' }, { codigoActividad: 'asc' }],
                        select: { fechaActividad: true, descripcion: true, estado: true, comentarioVerificador: true, usuarioCreacion: true,
                            verificador: { select: camposPersona }, _count: { select: { documentos: { where: { activo: 1 } } } } } }
                } } }, orderBy: [{ codigoEntidad: 'asc' }, { codigoRiesgo: 'asc' }, { orden: 'asc' }] })
    ]);
    const hoy = diaGuatemala();
    const dentro = value => (!desde || value >= desde) && (!hasta || value <= hasta);
    const codigosAutores = new Set();
    const referentes = new Set();
    for (const plan of planes) {
        for (const row of plan.responsables) {
            const { cortes } = cumplimientoAsignacion(row, hoy);
            row.cortes = cortes.filter(corte => (!desde || corte.hasta >= desde) && (!hasta || corte.desde <= hasta));
            row.resumen = resumen(row.cortes);
            row.actividadesEnRango = row.actividades.filter(actividad => dentro(fechaIso(actividad.fechaActividad)));
            referentes.add(referentePlan({ ...row, plan }));
            if (tipo === 'responsables') row.actividadesEnRango.forEach(actividad => {
                if (actividad.usuarioCreacion != null) codigosAutores.add(actividad.usuarioCreacion);
            });
        }
    }
    const superiores = tipo === 'incumplimiento' ? await superioresPlanes(prisma, codigoCia, [...referentes]) : new Map();
    const autores = codigosAutores.size ? await prisma.seguridadPersona.findMany({
        where: { codigoCia, codigoColaborador: { in: [...codigosAutores] } }, select: camposPersona
    }) : [];
    const filas = tipo === 'consolidado' ? filasConsolidadas(planes, entidad, direcciones) :
        filasDetalle(tipo, planes, entidad, superiores, new Map(autores.map(row => [row.codigoColaborador, nombrePersona(row)])));
    return res.json({ result: { titulo: titulos[tipo], institucion: registro?.nombre, periodo: codigoPeriodo,
        direccion: direcciones.find(row => row.codigoEntidad === entidad)?.nombre, desde, hasta, columnas: columnas(tipo), filas } });
});
