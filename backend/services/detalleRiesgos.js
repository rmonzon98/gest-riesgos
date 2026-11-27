const prisma = require('../prisma/client');
const { permisoEliminacionDirecta, permisosUsuario } = require('./permisosRiesgos');

const secciones = {
    ME: { url: '/evaluacion-gestion-riesgos', superior: 'estadoMeSuperior', propiedades: 'propiedadesMe' },
    MC: { url: '/mapa-riesgos', superior: 'estadoMcSuperior', propiedades: 'propiedadesMc' },
    MCE: { url: '/continuidad-monitoreo', superior: 'estadoMceSuperior', propiedades: 'propiedadesMce' }
};
const perfilInstitucional = '/riesgos-institucional';
const reasignar = '/reasignar';
const camposPersona = { codigoColaborador: true, primerNombre: true, segundoNombre: true,
    tercerNombre: true, primerApellido: true, segundoApellido: true, tercerApellido: true };

/** Crea un error de dominio que conserva el código HTTP. */
function errorRiesgo(status, message) {
    return Object.assign(new Error(message), { status });
}

/** Convierte un identificador recibido por HTTP. */
function codigo(valor) {
    if (!/^\d+$/.test(String(valor)) || Number(valor) <= 0 || Number(valor) > 2147483647) {
        throw errorRiesgo(400, 'Identificador inválido.');
    }
    return Number(valor);
}

/** Obtiene la lista y sus campos de estado a partir de un código conocido. */
function seccionRiesgo(tipo = 'ME') {
    if (!Object.hasOwn(secciones, tipo)) throw errorRiesgo(400, 'Tipo de evaluación inválido.');
    return secciones[tipo];
}

/** Aplica los permisos de la lista y de la vista institucional al detalle. */
async function accesoRiesgo(req, entidad, tipo = 'ME', key) {
    const { url } = seccionRiesgo(tipo);
    const permisos = await permisosUsuario(req, [url, perfilInstitucional, reasignar, permisoEliminacionDirecta], { vigentes: true });
    const propia = Number(req.codigo_entidad) === entidad;
    const edicion = propia && permisos.has(url);
    const vinculado = !propia && Number(req.codigo_entidad) > 0 && key && permisos.has(url) &&
        Boolean(await prisma.riesgosRiesgoVinculo.findFirst({ where: {
            codigoCia: req.codigo_cia, codigoEntidad: entidad, codigoPeriodo: key.codigoPeriodo, codigoRiesgo: key.codigoRiesgo,
            codigoEntidadVinculada: Number(req.codigo_entidad), activo: 1
        }, select: { codigoVinculo: true } }));
    if (!edicion && !vinculado && !permisos.has(perfilInstitucional)) {
        throw errorRiesgo(403, 'No tiene acceso al riesgo de esta dirección.');
    }
    return { edicion, vinculado: Boolean(vinculado), reasignar: edicion && permisos.has(reasignar),
        eliminarDirecto: edicion && permisos.has(permisoEliminacionDirecta) };
}

/** Lee la identidad del riesgo de la ruta y de la institución autenticada. */
function llaveRiesgo(req) {
    return { codigoCia: req.codigo_cia, codigoEntidad: codigo(req.params.entidad),
        codigoPeriodo: codigo(req.params.periodo), codigoRiesgo: codigo(req.params.codigo) };
}

/** Construye el filtro de la llave compuesta de un riesgo. */
function riesgoUnico(key) {
    return { codigoCia_codigoEntidad_codigoPeriodo_codigoRiesgo: key };
}

/** Serializa una mutación con las demás ediciones del riesgo y verifica su estado. */
async function mutarRiesgo(req, operacion, { permitirAprobado = false } = {}) {
    const key = llaveRiesgo(req);
    const { edicion } = await accesoRiesgo(req, key.codigoEntidad, 'ME', key);
    if (!edicion) throw errorRiesgo(403, 'No puede editar el riesgo de esta dirección.');
    const { codigoCia, codigoEntidad, codigoPeriodo, codigoRiesgo } = key;
    return prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT CODIGO_RIESGO FROM riesgos_riesgo_extendido WHERE CODIGO_CIA = ${codigoCia}
            AND CODIGO_ENTIDAD = ${codigoEntidad} AND CODIGO_PERIODO = ${codigoPeriodo} AND CODIGO_RIESGO = ${codigoRiesgo} FOR UPDATE`;
        const riesgo = await tx.riesgosRiesgoExtendido.findUnique({ where: riesgoUnico(key),
            select: { evento: true, eliminado: true, estadoMeSuperior: true } });
        if (!riesgo) throw errorRiesgo(404, 'Riesgo no encontrado.');
        if (Number(riesgo.eliminado) === 1 || (!permitirAprobado && !esEditable(riesgo))) {
            throw errorRiesgo(403, 'El riesgo está en modo de lectura.');
        }
        return operacion(tx, key, riesgo);
    });
}

/** Devuelve los errores de dominio en el formato de la API. */
function responder(operation) {
    return async (req, res, next) => {
        try {
            return await operation(req, res, next);
        } catch (error) {
            if (error.status) return res.status(error.status).json({ error: error.message });
            console.error('Riesgos MARN:', error);
            return res.status(500).json({ error: 'No se pudo completar la operación.' });
        }
    };
}

/** Los riesgos eliminados o aprobados quedan en lectura para su evaluación. */
function esEditable(riesgo, tipo = 'ME') {
    return Number(riesgo.eliminado) !== 1 && Number(riesgo[seccionRiesgo(tipo).superior]) !== 1;
}

/** Lee las propiedades de la versión por defecto del mismo origen que usa el ingreso. */
async function propiedadesPeriodo(client, codigoCia, codigoPeriodo, tipo = 'ME') {
    const field = seccionRiesgo(tipo).propiedades;
    const rows = await client.riesgosReportesPropiedades.findMany({
        where: { codigoCia, codigoPeriodo, defecto: 'S' },
        select: { [field]: true },
        orderBy: { codigoVersion: 'asc' }
    });
    return rows.flatMap(row => {
        try {
            const values = JSON.parse(row[field]);
            return Array.isArray(values) ? values : [];
        } catch { return []; }
    });
}

/** Valida los campos de MARN incluidos en la versión. Los omitidos se conservan. */
async function camposMarn(req, codigoPeriodo, tipo, actual) {
    const { objetivoTexto, codigoEje, codigoDueno } = req.body || {};
    const cia = req.codigo_cia;
    const data = {};
    if (objetivoTexto !== undefined || codigoEje !== undefined) {
        const keys = new Set((await propiedadesPeriodo(prisma, cia, codigoPeriodo, tipo)).map(propiedad => propiedad?.key));
        if (objetivoTexto !== undefined && keys.has('OBJETIVO_TEXTO')) {
            if (objetivoTexto !== null && (typeof objetivoTexto !== 'string' || objetivoTexto.trim().length > 800)) {
                throw errorRiesgo(400, 'El objetivo específico debe tener hasta 800 caracteres.');
            }
            data.objetivoTexto = objetivoTexto?.trim() || null;
        }
        if (codigoEje !== undefined && keys.has('CODIGO_EJE')) {
            data.codigoEje = codigoEje === null || codigoEje === '' ? null : codigo(codigoEje);
            if (data.codigoEje !== null && data.codigoEje !== actual?.CODIGO_EJE) {
                const eje = await prisma.riesgosEjeEstrategico.findFirst({
                    where: { codigoCia: cia, codigoEje: data.codigoEje, estado: '1' }, select: { codigoEje: true }
                });
                if (!eje) throw errorRiesgo(400, 'El eje estratégico no está activo en esta institución.');
            }
        }
    }
    const actualDueno = actual ? actual.CODIGO_DUENO : req.userId;
    if (!actual) data.codigoDueno = req.userId;
    if (codigoDueno !== undefined) {
        const destino = codigoDueno === null || codigoDueno === '' ? actualDueno : codigo(codigoDueno);
        if (destino !== actualDueno) {
            if (!(await permisosUsuario(req, [reasignar])).has(reasignar)) {
                throw errorRiesgo(403, 'No tiene permiso para cambiar el dueño del riesgo.');
            }
            const persona = await prisma.seguridadPersona.findFirst({
                where: { codigoCia: cia, codigoColaborador: destino, activo: '1' }, select: { codigoColaborador: true }
            });
            if (!persona) throw errorRiesgo(400, 'El dueño debe ser una persona activa de la institución.');
            data.codigoDueno = destino;
        }
    }
    return data;
}

/** Limita una nueva selección de área a la dirección del riesgo o a un área general. */
async function validarAreaRiesgo(req, area, previa) {
    if (!area || area === previa) return;
    const fila = await prisma.riesgosArea.findFirst({
        where: { codigoCia: req.codigo_cia, codigoArea: codigo(area), estado: '1',
            OR: [{ codigoEntidad: req.codigo_entidad }, { codigoEntidad: null }] },
        select: { codigoArea: true }
    });
    if (!fila) throw errorRiesgo(400, 'El área no está disponible para esta dirección.');
}

/** Formatea un nombre sin exponer otros datos de la persona. */
function nombrePersona(persona) {
    return persona ? [persona.primerNombre, persona.segundoNombre, persona.tercerNombre,
        persona.primerApellido, persona.segundoApellido, persona.tercerApellido].filter(Boolean).join(' ') : null;
}

module.exports = { accesoRiesgo, camposMarn, camposPersona, codigo, errorRiesgo, esEditable, llaveRiesgo,
    mutarRiesgo, nombrePersona, propiedadesPeriodo, responder, riesgoUnico, seccionRiesgo, validarAreaRiesgo };
