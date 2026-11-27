/**
 * @fileoverview
 * Acceso a datos con SQL parametrizado a través de Prisma (adaptador MariaDB).
 *
 * El código anterior usaba `mysql2`. Para que las respuestas de la API no cambien, este módulo
 * reproduce las convenciones de `mysql2`:
 * - Las fechas de la base (`DATE`, `DATETIME`) se interpretan como **hora local del servidor**.
 *   El adaptador de Prisma las interpreta como UTC; sin este ajuste, el frontend las vería
 *   desplazadas (en Guatemala, 6 horas, y las fechas sin hora caerían en el día anterior).
 * - Los parámetros `Date` se envían como hora local (`YYYY-MM-DD HH:MM:SS.mmm`).
 * - `COUNT(*)` y los `BIGINT` llegan como `Number`, no como `BigInt`.
 * - Un parámetro `undefined` es un error, como en `pool.execute` de `mysql2`.
 *
 * Los parámetros se envían siempre aparte del SQL (`?`); nunca se concatenan valores del request.
 *
 * @module bd/consultas
 */

const prisma = require('../prisma/client');

/** Tiempo máximo de una transacción interactiva. Algunas copias entre periodos son largas. */
const OPCIONES_TRANSACCION = { maxWait: 10000, timeout: 60000 };

const dos = (n, z = 2) => String(n).padStart(z, '0');

/**
 * Formatea una fecha como hora local, igual que `mysql2` al enviar un parámetro `Date`.
 * @param {Date} fecha
 * @returns {string}
 */
function fechaParametro(fecha) {
    return `${dos(fecha.getFullYear(), 4)}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())} ` +
        `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}.${dos(fecha.getMilliseconds(), 3)}`;
}

/**
 * Prepara los parámetros para el adaptador.
 * @param {Array} params
 * @param {string} sql Solo se usa en el mensaje de error.
 * @returns {Array}
 */
function prepararParametros(params, sql) {
    if (!Array.isArray(params)) throw new TypeError('Los parámetros de la consulta deben ser un arreglo.');
    return params.map(valor => {
        if (valor === undefined) {
            throw new TypeError('Bind parameters must not contain undefined. To pass SQL NULL specify JS null');
        }
        if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : fechaParametro(valor);
        // mysql2 rechazaba objetos y arreglos como valor de un marcador; Prisma los serializaría como JSON.
        if (valor !== null && typeof valor === 'object' && !Buffer.isBuffer(valor) && !(valor instanceof Uint8Array)) {
            throw Object.assign(new Error('Incorrect arguments to mysqld_stmt_execute'),
                { code: 'ER_WRONG_ARGUMENTS', errno: 1210, sql: sql.trim().slice(0, 200) });
        }
        return valor;
    });
}

/**
 * Convierte un valor leído por Prisma a la forma que entregaba `mysql2`.
 * @param {*} valor
 * @returns {*}
 */
function valorResultado(valor) {
    if (valor instanceof Date) {
        // Prisma leyó la hora de la base como UTC; se reinterpreta como hora local.
        return new Date(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate(),
            valor.getUTCHours(), valor.getUTCMinutes(), valor.getUTCSeconds(), valor.getUTCMilliseconds());
    }
    if (typeof valor === 'bigint') {
        return valor <= BigInt(Number.MAX_SAFE_INTEGER) && valor >= BigInt(Number.MIN_SAFE_INTEGER)
            ? Number(valor) : valor.toString();
    }
    if (valor instanceof Uint8Array && !Buffer.isBuffer(valor)) return Buffer.from(valor);
    return valor;
}

/**
 * Normaliza las filas de un `SELECT`.
 * @param {object[]} filas
 * @returns {object[]}
 */
function filasResultado(filas) {
    for (const fila of filas) {
        for (const clave of Object.keys(fila)) fila[clave] = valorResultado(fila[clave]);
    }
    return filas;
}

/** Nombres de los errores de MariaDB que el código revisa o registra (los mismos que usa `mysql2`). */
const NOMBRES_ERROR = {
    1048: 'ER_BAD_NULL_ERROR', 1062: 'ER_DUP_ENTRY', 1205: 'ER_LOCK_WAIT_TIMEOUT', 1213: 'ER_LOCK_DEADLOCK',
    1292: 'ER_TRUNCATED_WRONG_VALUE', 1364: 'ER_NO_DEFAULT_FOR_FIELD', 1366: 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
    1406: 'ER_DATA_TOO_LONG', 1451: 'ER_ROW_IS_REFERENCED_2', 1452: 'ER_NO_REFERENCED_ROW_2', 4025: 'ER_CONSTRAINT_FAILED'
};

/**
 * Agrega al error de Prisma los campos de `mysql2` (`code`, `errno`, `sqlMessage`), para que las
 * validaciones existentes (por ejemplo, `err.code === 'ER_DUP_ENTRY'`) sigan funcionando.
 * El código original de Prisma queda en `prismaCode`.
 * @param {Error} error
 * @returns {Error}
 */
function errorMariaDb(error) {
    const causa = error?.meta?.driverAdapterError?.cause;
    const errno = Number(causa?.originalCode);
    if (Number.isInteger(errno) && errno > 0) {
        error.prismaCode = error.code;
        error.prismaMessage = error.message;
        error.errno = errno;
        error.code = NOMBRES_ERROR[errno] || `ER_${errno}`;
        error.sqlMessage = causa.originalMessage;
        // Igual que mysql2: el mensaje es el del servidor (algunos endpoints lo devuelven en `detail`).
        error.message = causa.originalMessage;
    }
    return error;
}

/**
 * Ejecuta un `SELECT` (o cualquier sentencia que devuelva filas).
 *
 * @param {string} sql SQL con marcadores `?`.
 * @param {Array} [params] Valores de los marcadores.
 * @param {object} [cliente] `prisma` o el cliente de una transacción.
 * @returns {Promise<object[]>} Filas con las convenciones de `mysql2`.
 */
async function consultar(sql, params = [], cliente = prisma) {
    const valores = prepararParametros(params, sql);
    try {
        return filasResultado(await cliente.$queryRawUnsafe(sql, ...valores));
    } catch (error) {
        throw errorMariaDb(error);
    }
}

/**
 * Ejecuta un `INSERT`, `UPDATE`, `DELETE` o `SET`.
 *
 * @param {string} sql SQL con marcadores `?`.
 * @param {Array} [params] Valores de los marcadores.
 * @param {object} [cliente] `prisma` o el cliente de una transacción.
 * @returns {Promise<{affectedRows: number}>} Filas encontradas, igual que `affectedRows` en `mysql2`.
 */
async function ejecutar(sql, params = [], cliente = prisma) {
    const valores = prepararParametros(params, sql);
    try {
        return { affectedRows: await cliente.$executeRawUnsafe(sql, ...valores) };
    } catch (error) {
        throw errorMariaDb(error);
    }
}

/**
 * Ejecuta un `INSERT` y devuelve el `AUTO_INCREMENT` generado.
 * `LAST_INSERT_ID()` es por conexión, así que fuera de una transacción abre una para fijarla.
 *
 * @param {string} sql
 * @param {Array} [params]
 * @param {object} [cliente] `prisma` o el cliente de una transacción.
 * @returns {Promise<{affectedRows: number, insertId: number}>}
 */
async function insertar(sql, params = [], cliente = prisma) {
    const operar = async tx => {
        const { affectedRows } = await ejecutar(sql, params, tx);
        const [{ id }] = await consultar('SELECT LAST_INSERT_ID() AS id', [], tx);
        return { affectedRows, insertId: Number(id) };
    };
    return cliente === prisma ? prisma.$transaction(operar, OPCIONES_TRANSACCION) : operar(cliente);
}

/**
 * Ejecuta una función dentro de una transacción. Si la función lanza un error, se revierte.
 *
 * @template T
 * @param {(tx: object) => Promise<T>} operacion
 * @returns {Promise<T>}
 */
function transaccion(operacion) {
    return prisma.$transaction(operacion, OPCIONES_TRANSACCION);
}

/**
 * Ejecuta consultas con los nombres de meses y días en español (`DATE_FORMAT` con `%M`, `%W`),
 * sobre una misma conexión.
 *
 * @template T
 * @param {(tx: object) => Promise<T>} operacion
 * @returns {Promise<T>}
 */
function conIdiomaEspanol(operacion) {
    return transaccion(async tx => {
        await ejecutar("SET SESSION lc_time_names = 'es_ES'", [], tx);
        return operacion(tx);
    });
}

/**
 * Respuesta HTTP que interrumpe una transacción: la revierte y el controlador la devuelve tal cual.
 * Reemplaza el patrón `await conn.rollback(); return res.status(...).json(...)`.
 */
class RespuestaHttp extends Error {
    /**
     * @param {number} status
     * @param {object} cuerpo
     */
    constructor(status, cuerpo) {
        super(cuerpo?.error || cuerpo?.message || `HTTP ${status}`);
        this.status = status;
        this.cuerpo = cuerpo;
    }
}

/**
 * Si el error es una {@link RespuestaHttp}, la envía y devuelve `true`.
 * @param {Error} error
 * @param {object} res
 * @returns {boolean}
 */
function enviarRespuestaHttp(error, res) {
    if (!(error instanceof RespuestaHttp)) return false;
    res.status(error.status).json(error.cuerpo);
    return true;
}

/**
 * Genera `?, ?, ?` para una lista (lo que `mysql2` hacía con `IN (?)` y un arreglo).
 * @param {Array} valores
 * @returns {string}
 */
function marcadores(valores) {
    return valores.map(() => '?').join(', ');
}

module.exports = {
    consultar, ejecutar, insertar, transaccion, conIdiomaEspanol,
    RespuestaHttp, enviarRespuestaHttp, marcadores, prisma
};
