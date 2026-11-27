/**
 * @fileoverview
 * Convención de fechas del cliente de Prisma: los timestamps (`DATETIME`) se guardan y se leen como
 * **hora local del proceso Node**, igual que el resto del sistema.
 *
 * Por qué: los datos existentes, los triggers de bitácora y los `DEFAULT CURRENT_TIMESTAMP` de MariaDB
 * guardan la hora local (Guatemala), y el código SQL (`bd/consultas.js`) la interpreta así. El adaptador
 * de Prisma, en cambio, trata los `DATETIME` como UTC, y con `@default(now())` genera el valor él mismo
 * en UTC. Sin esta extensión, lo que escribe el cliente tipado queda 6 horas adelantado respecto del
 * resto, y lo que lee se muestra 6 horas atrasado (por ejemplo, una sesión vence 6 horas antes).
 *
 * Alcance:
 * - Timestamps (`@db.DateTime`): se convierten en argumentos (`data`, `where`, relaciones anidadas),
 *   en resultados (incluidos `include`/`select` y `_min`/`_max`), y se completan los `@default(now())`
 *   al crear.
 * - Fechas de calendario (`@db.Date`): no se tocan. El código las maneja como medianoche UTC.
 * - `$queryRaw`/`$executeRaw`: no se tocan (el SQL usa `bd/consultas.js`, que aplica la misma convención).
 *
 * @module prisma/horaLocal
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Convierte un instante a la fecha que Prisma debe escribir para que la base guarde la hora local.
 * @param {Date} fecha
 * @returns {Date}
 */
function aBaseDeDatos(fecha) {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return fecha;
    return new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(),
        fecha.getHours(), fecha.getMinutes(), fecha.getSeconds(), fecha.getMilliseconds()));
}

/**
 * Convierte la fecha que Prisma leyó (hora local etiquetada como UTC) al instante real.
 * @param {Date} fecha
 * @returns {Date}
 */
function deBaseDeDatos(fecha) {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return fecha;
    return new Date(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate(),
        fecha.getUTCHours(), fecha.getUTCMinutes(), fecha.getUTCSeconds(), fecha.getUTCMilliseconds());
}

/**
 * Lee del esquema, por modelo: timestamps, campos con `@default(now())` y relaciones.
 * Se usa el texto del esquema porque el DMMF en tiempo de ejecución no incluye el tipo nativo (`@db.Date`).
 * @param {string} texto Contenido de schema.prisma.
 * @returns {Map<string, {timestamps: Set<string>, ahora: Set<string>, relaciones: Map<string, string>}>}
 */
function leerEsquema(texto) {
    const modelos = new Map();
    const nombres = new Set([...texto.matchAll(/^model\s+(\w+)\s*\{/gm)].map(m => m[1]));
    for (const bloque of texto.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
        const info = { timestamps: new Set(), ahora: new Set(), relaciones: new Map() };
        for (const linea of bloque[2].split('\n')) {
            const m = /^\s*(\w+)\s+(\w+)(\[\])?\??\s*(.*)$/.exec(linea);
            if (!m || m[1].startsWith('@@')) continue;
            const [, campo, tipo, , resto] = m;
            if (tipo === 'DateTime' && !/@db\.Date\b(?!Time)/.test(resto)) {
                info.timestamps.add(campo);
                if (/@default\(now\(\)\)/.test(resto)) info.ahora.add(campo);
            } else if (nombres.has(tipo)) {
                info.relaciones.set(campo, tipo);
            }
        }
        modelos.set(bloque[1], info);
    }
    return modelos;
}

const esquema = leerEsquema(fs.readFileSync(path.join(__dirname, 'schema.prisma'), 'utf8'));

const esObjeto = v => v !== null && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v);

/** Aplica `convertir` a una fecha o a las fechas dentro de un filtro u operación (`{ gte, lt, in, set }`). */
function convertirValor(valor, convertir) {
    if (valor instanceof Date) return convertir(valor);
    if (Array.isArray(valor)) return valor.map(v => convertirValor(v, convertir));
    if (esObjeto(valor)) return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, convertirValor(v, convertir)]));
    return valor;
}

/** Completa los `@default(now())` que faltan en los datos de una creación. */
function completarAhora(modelo, datos) {
    const info = esquema.get(modelo);
    if (!info || !esObjeto(datos) || !info.ahora.size) return datos;
    const ahora = new Date();
    const resultado = { ...datos };
    for (const campo of info.ahora) if (resultado[campo] === undefined) resultado[campo] = ahora;
    return resultado;
}

/**
 * Recorre argumentos (o resultados) de un modelo y convierte los timestamps.
 * @param {string} modelo
 * @param {*} valor
 * @param {(d: Date) => Date} convertir
 * @param {boolean} creando Si `valor` son datos de una creación (para completar `@default(now())`).
 */
function recorrer(modelo, valor, convertir, creando = false) {
    if (Array.isArray(valor)) return valor.map(v => recorrer(modelo, v, convertir, creando));
    if (!esObjeto(valor)) return valor;
    const info = esquema.get(modelo);
    if (!info) return valor;
    const origen = creando ? completarAhora(modelo, valor) : valor;
    const salida = {};
    for (const [clave, v] of Object.entries(origen)) {
        if (info.timestamps.has(clave)) salida[clave] = convertirValor(v, convertir);
        else if (info.relaciones.has(clave)) salida[clave] = recorrerRelacion(info.relaciones.get(clave), v, convertir);
        else if (clave === 'create' || clave === 'createMany') salida[clave] = clave === 'createMany'
            ? { ...v, data: recorrer(modelo, v?.data, convertir, true) } : recorrer(modelo, v, convertir, true);
        else if (esObjeto(v) || Array.isArray(v)) salida[clave] = recorrer(modelo, v, convertir, false);
        else salida[clave] = v;
    }
    return salida;
}

/** Dentro de una relación, `create`/`createMany`/`upsert.create` son creaciones del modelo relacionado. */
function recorrerRelacion(modelo, valor, convertir) {
    if (Array.isArray(valor)) return valor.map(v => recorrerRelacion(modelo, v, convertir));
    if (!esObjeto(valor)) return recorrer(modelo, valor, convertir);
    // El resto (filtros directos, some/every/none/is, update, where, data…) se recorre como el modelo relacionado.
    const { create, createMany, connectOrCreate, upsert, ...resto } = valor;
    const salida = recorrer(modelo, resto, convertir);
    if (create !== undefined) salida.create = recorrer(modelo, create, convertir, true);
    if (createMany !== undefined) salida.createMany = { ...createMany, data: recorrer(modelo, createMany?.data, convertir, true) };
    if (connectOrCreate !== undefined) salida.connectOrCreate = recorrerConnectOrCreate(modelo, connectOrCreate, convertir);
    if (upsert !== undefined) salida.upsert = recorrerUpsert(modelo, upsert, convertir);
    return salida;
}

function recorrerConnectOrCreate(modelo, valor, convertir) {
    const uno = v => ({ ...v, where: recorrer(modelo, v?.where, convertir), create: recorrer(modelo, v?.create, convertir, true) });
    return Array.isArray(valor) ? valor.map(uno) : uno(valor);
}

function recorrerUpsert(modelo, valor, convertir) {
    const uno = v => ({ ...v, where: recorrer(modelo, v?.where, convertir),
        create: recorrer(modelo, v?.create, convertir, true), update: recorrer(modelo, v?.update, convertir) });
    return Array.isArray(valor) ? valor.map(uno) : uno(valor);
}

/** Convierte los argumentos de una operación de modelo antes de enviarla. */
function convertirArgumentos(modelo, operacion, args) {
    if (!args) return args;
    const salida = recorrer(modelo, { ...args, data: undefined, create: undefined, update: undefined }, aBaseDeDatos);
    for (const clave of ['data', 'create', 'update']) {
        if (args[clave] === undefined) { delete salida[clave]; continue; }
        const creando = clave === 'create' || (clave === 'data' && /^create/.test(operacion));
        salida[clave] = recorrer(modelo, args[clave], aBaseDeDatos, creando);
    }
    return salida;
}

/**
 * Extensión de Prisma que aplica la convención de hora local a todas las operaciones de modelo.
 * @param {import('../generated/prisma/client').Prisma} Prisma
 */
function extensionHoraLocal(Prisma) {
    return Prisma.defineExtension({
        name: 'hora-local',
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const resultado = await query(convertirArgumentos(model, operation, args));
                    return recorrerResultado(model, resultado);
                }
            }
        }
    });
}

/** Convierte un resultado de un modelo (instantes reales). */
const recorrerResultado = (modelo, resultado) => recorrer(modelo, resultado, deBaseDeDatos);

module.exports = { extensionHoraLocal, aBaseDeDatos, deBaseDeDatos, leerEsquema, convertirArgumentos, recorrerResultado };
