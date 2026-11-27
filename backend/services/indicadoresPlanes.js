const prisma = require('../prisma/client');
const { camposActividadCorte, cumplimientoAsignacion, diaGuatemala } = require('./planesSeguimiento');

const llave = row => `${row.codigoEntidad}:${row.codigoPeriodo}:${row.codigoRiesgo}`;
const riesgoActivo = { OR: [{ eliminado: 0 }, { eliminado: null }] };

/** Devuelve las direcciones distintas vinculadas a cada riesgo del periodo. */
async function direccionesVinculadas(codigoCia, codigoPeriodo) {
    const rows = await prisma.riesgosRiesgoVinculo.findMany({ where: { codigoCia, codigoPeriodo, activo: 1 },
        select: { codigoEntidad: true, codigoPeriodo: true, codigoRiesgo: true, codigoEntidadVinculada: true } });
    const mapa = new Map();
    for (const row of rows) {
        const key = llave(row);
        if (!mapa.has(key)) mapa.set(key, new Set());
        mapa.get(key).add(row.codigoEntidadVinculada);
    }
    return mapa;
}

/** Agrega planes, eventos y cortes, contando cada riesgo una sola vez en los totales. */
async function indicadoresPlanes(codigoCia, codigoPeriodo, filtroDirecciones, riesgos) {
    const seleccion = new Set(filtroDirecciones);
    const hoy = diaGuatemala();
    const filtroRiesgo = { ...riesgoActivo, ...(seleccion.size && { AND: [{ OR: [
        { codigoEntidad: { in: filtroDirecciones } },
        { vinculos: { some: { activo: 1, codigoEntidadVinculada: { in: filtroDirecciones } } } }
    ] }] }) };
    const [direcciones, planes, eventos] = await Promise.all([
        prisma.seguridadEntidad.findMany({ where: { codigoCia, ...(seleccion.size && { codigoEntidad: { in: filtroDirecciones } }) },
            select: { codigoEntidad: true, nombre: true }, orderBy: { nombre: 'asc' } }),
        prisma.riesgosPlanAccion.findMany({ where: { codigoCia, codigoPeriodo, activo: 1, riesgo: filtroRiesgo },
            select: { codigoEntidad: true, codigoPeriodo: true, codigoRiesgo: true, responsables: { where: { activo: 1 },
                select: { fechaInicio: true, fechaFin: true, frecuencia: { select: { cortesAnio: true } },
                    actividades: { where: { activo: 1 }, select: camposActividadCorte } } } } }),
        prisma.riesgosRiesgoEvento.groupBy({ by: ['codigoEntidad', 'codigoPeriodo', 'codigoRiesgo'],
            where: { codigoCia, codigoPeriodo, activo: 1, riesgo: filtroRiesgo }, _count: { _all: true } })
    ]);
    const agregados = new Map(direcciones.map(row => [row.codigoEntidad, { ...row, riesgos: 0, vinculados: 0,
        cumplidos: 0, pendientes: 0, vencidos: 0 }]));
    const direccionRiesgos = new Map();
    const eventosActivos = new Map(eventos.map(row => [llave(row), row._count._all]));
    let totalEventos = 0;
    for (const riesgo of riesgos) {
        const { codigo_entidad: codigoEntidad, codigo_periodo: periodo, codigo_riesgo: codigoRiesgo } = riesgo;
        if (codigoPeriodo != null && periodo !== codigoPeriodo) continue;
        const ids = [codigoEntidad, ...riesgo.direccionesVinculadas].filter(id => agregados.has(id));
        if (!ids.length) continue;
        const key = llave({ codigoEntidad, codigoPeriodo: periodo, codigoRiesgo });
        direccionRiesgos.set(key, ids);
        totalEventos += Math.max(eventosActivos.get(key) || 0, riesgo.tiene_evento ? 1 : 0);
        if (Number(riesgo.es_nuevo) === 1) continue;
        for (const id of ids) {
            const indicador = agregados.get(id);
            indicador.riesgos++;
            indicador.vinculados += Number(id !== codigoEntidad);
        }
    }
    for (const plan of planes) {
        const direccionesPlan = direccionRiesgos.get(llave(plan)) || [];
        for (const responsable of plan.responsables) {
            const { resumen } = cumplimientoAsignacion(responsable, hoy);
            for (const id of direccionesPlan) {
                const fila = agregados.get(id);
                fila.cumplidos += resumen.cumplido;
                fila.pendientes += resumen.pendiente + resumen.por_verificar;
                fila.vencidos += resumen.vencido;
            }
        }
    }
    const filas = [...agregados.values()];
    const topDirecciones = filas.filter(item => item.riesgos > 0)
        .sort((a, b) => b.riesgos - a.riesgos || a.nombre.localeCompare(b.nombre, 'es-GT')).slice(0, 10);
    return { totalPlanes: planes.length, totalEventos, riesgosUnicos: direccionRiesgos.size,
        topDirecciones, cumplimiento: filas.filter(row => row.cumplidos || row.pendientes || row.vencidos) };
}

module.exports = { direccionesVinculadas, indicadoresPlanes };
