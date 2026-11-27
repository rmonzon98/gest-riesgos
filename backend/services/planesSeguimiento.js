const prisma = require('../prisma/client');
const { calcularCortes, estadoCortes, resumen } = require('./cumplimientoPlanes');
const { camposPersona, nombrePersona } = require('./detalleRiesgos');

const camposActividadCorte = { fechaActividad: true, estado: true };
const camposFrecuencia = { codigoFrecuencia: true, descripcion: true, cortesAnio: true };
const fechaGuatemala = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Convierte una fecha de registro a la fecha civil de Guatemala. */
function diaGuatemala(fecha = new Date()) {
    const { year, month, day } = Object.fromEntries(fechaGuatemala.formatToParts(fecha).map(({ type, value }) => [type, value]));
    return `${year}-${month}-${day}`;
}

/** Devuelve el responsable interno o el dueño que representa al responsable externo. */
function referentePlan(asignacion) {
    return asignacion.codigoColaborador ?? asignacion.plan.riesgo.codigoDueno;
}

/** Carga en una consulta los superiores asignados a las personas indicadas. */
async function superioresPlanes(client, codigoCia, codigos) {
    const ids = [...new Set(codigos.filter(id => id != null))];
    if (!ids.length) return new Map();
    const rows = await client.riesgosColaboradorSuperior.findMany({ where: { codigoCia, codigoColaborador: { in: ids } },
        select: { codigoColaborador: true, codigoSuperior: true, superior: { select: camposPersona } } });
    return new Map(rows.filter(row => row.codigoSuperior != null).map(row => [row.codigoColaborador,
        { codigoColaborador: row.codigoSuperior, nombre: nombrePersona(row.superior) }]));
}

/** Calcula los cortes y el resumen de una asignación usando sus actividades activas. */
function cumplimientoAsignacion(asignacion, hoy) {
    const cortes = estadoCortes(calcularCortes({ fechaInicio: asignacion.fechaInicio, fechaFin: asignacion.fechaFin,
        cortesAnio: asignacion.frecuencia.cortesAnio }), asignacion.actividades || [], hoy);
    return { cortes, resumen: resumen(cortes) };
}

/** Agrega el cumplimiento de asignaciones activas por llave de dirección y riesgo. */
async function cumplimientoRiesgos(codigoCia, codigoPeriodo, claves, hoy = diaGuatemala()) {
    if (!claves.length) return new Map();
    const direcciones = new Map();
    for (const key of claves) {
        if (!direcciones.has(key.codigoEntidad)) direcciones.set(key.codigoEntidad, []);
        direcciones.get(key.codigoEntidad).push(key.codigoRiesgo);
    }
    const rows = await prisma.riesgosPlanResponsable.findMany({ where: { codigoCia, activo: 1,
        plan: { activo: 1, codigoPeriodo, OR: [...direcciones].map(([codigoEntidad, ids]) => ({ codigoEntidad, codigoRiesgo: { in: ids } })) } },
        select: { fechaInicio: true, fechaFin: true, frecuencia: { select: camposFrecuencia },
            actividades: { where: { activo: 1 }, select: camposActividadCorte },
            plan: { select: { codigoEntidad: true, codigoRiesgo: true } } } });
    const cortesPorRiesgo = new Map();
    for (const row of rows) {
        const key = `${row.plan.codigoEntidad}:${row.plan.codigoRiesgo}`;
        const existentes = cortesPorRiesgo.get(key) || [];
        existentes.push(...cumplimientoAsignacion(row, hoy).cortes);
        cortesPorRiesgo.set(key, existentes);
    }
    return new Map([...cortesPorRiesgo].map(([key, cortes]) => [key, resumen(cortes)]));
}

module.exports = { camposActividadCorte, camposFrecuencia, cumplimientoAsignacion, cumplimientoRiesgos,
    diaGuatemala, referentePlan, superioresPlanes };
