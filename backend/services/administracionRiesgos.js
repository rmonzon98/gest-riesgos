const { permisosUsuario } = require('./permisosRiesgos');
const { consultar, prisma } = require('../bd/consultas');

const urlGeneral = '/administracion';
const urlDireccion = '/administracion-direccion';
const mensajeLimite = 'La institución alcanzó el límite de usuarios de la aplicación.';
const asignacionVigente = "(asignacion.FECHA_INICIO IS NULL OR asignacion.FECHA_INICIO <= CURDATE())" +
    " AND (asignacion.FECHA_FIN IS NULL OR asignacion.FECHA_FIN >= CURDATE())";

/**
 * Condición SQL de licencia vigente para una fila de `seguridad_institucion_acceso_app`.
 * La usan el login, el menú y el aviso de Administración, para que apliquen la misma regla.
 *
 * @param {string} alias Alias de la tabla en la consulta (valor fijo del código, nunca del request).
 * @returns {string} Expresión SQL booleana.
 */
function licenciaVigente(alias) {
    return `(${alias}.VIGENTE = '1'` +
        ` AND (${alias}.FECHA_VIGENCIA IS NULL OR ${alias}.FECHA_VIGENCIA > NOW())` +
        ` AND (${alias}.FECHA_INICIO_VIGENCIA IS NULL OR ${alias}.FECHA_INICIO_VIGENCIA <= CURDATE()))`;
}

/** Construye errores de validación para las operaciones de administración. */
function errorAdministracion(status, message) {
    return Object.assign(new Error(message), { status });
}

/** Determina el ámbito de una operación institucional o por dirección. */
async function accesoAdministracion(req, soloGeneral = false) {
    const urls = await permisosUsuario(req, [urlGeneral, urlDireccion], { vigentes: true });
    if (urls.has(urlGeneral)) return { general: true, direccion: null };
    if (!soloGeneral && urls.has(urlDireccion) && req.codigo_entidad != null) {
        return { general: false, direccion: Number(req.codigo_entidad) };
    }
    throw errorAdministracion(403, 'No tiene permiso para administrar estos datos.');
}

/**
 * Serializa las escrituras que modifican licencias o vínculos entre personas.
 * @param {object} tx Cliente de la transacción de Prisma en curso.
 * @param {number} cia
 */
async function bloquearInstitucion(tx, cia) {
    await consultar('SELECT CODIGO_CIA FROM gestion_riesgos.seguridad_institucion WHERE CODIGO_CIA = ? FOR UPDATE', [cia], tx);
}

/**
 * Obtiene el uso y las fechas de la licencia de aplicación 1.
 * @param {object} cliente `prisma` o el cliente de una transacción.
 * @param {number} cia
 */
async function obtenerLicencia(cliente, cia) {
    // Secuencial: dentro de una transacción ambas consultas usan la misma conexión.
    const [licencia] = await consultar(`SELECT LIMITE_USUARIO AS limite, DATE_FORMAT(FECHA_INICIO_VIGENCIA, '%Y-%m-%d') AS desde,
            DATE_FORMAT(FECHA_VIGENCIA, '%Y-%m-%d') AS hasta,
            NOT COALESCE(${licenciaVigente('licencia')}, 0) AS fueraDeVigencia
            FROM gestion_riesgos.seguridad_institucion_acceso_app licencia
            WHERE licencia.CODIGO_CIA = ? AND licencia.CODIGO_APLICACION = 1`, [cia], cliente);
    const [uso] = await consultar(`SELECT COUNT(*) AS usados, DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hoy
            FROM gestion_riesgos.seguridad_persona persona
            WHERE persona.CODIGO_CIA = ? AND persona.ACTIVO = '1' AND EXISTS (
                SELECT 1 FROM gestion_riesgos.seguridad_menu_rol_usuario asignacion
                WHERE asignacion.CODIGO_CIA = persona.CODIGO_CIA AND asignacion.CODIGO_APLICACION = 1
                    AND asignacion.CODIGO_COLABORADOR = persona.CODIGO_COLABORADOR AND ${asignacionVigente})`, [cia], cliente);
    const limite = licencia?.limite ?? null;
    const usados = Number(uso.usados);
    return { limite, usados, hoy: uso.hoy, lleno: limite != null && usados >= limite,
        desde: licencia?.desde ?? null, hasta: licencia?.hasta ?? null,
        fueraDeVigencia: Boolean(licencia?.fueraDeVigencia) };
}

/** Aplica el límite a las altas y reactivaciones solicitadas. */
function comprobarLicencia(licencia) {
    if (licencia.lleno) throw errorAdministracion(409, mensajeLimite);
}

/** Valida la fecha civil y la conserva como texto ISO para MariaDB. */
function fechaCivil(value) {
    if (value === '' || value == null) return null;
    const date = new Date(value);
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value) throw errorAdministracion(400, 'Indique una fecha válida.');
    return value;
}

module.exports = { accesoAdministracion, asignacionVigente, bloquearInstitucion, comprobarLicencia,
    errorAdministracion, fechaCivil, licenciaVigente, mensajeLimite, obtenerLicencia };
