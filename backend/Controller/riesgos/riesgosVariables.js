/**
 * @fileoverview
 * Controlador de variables de riesgo para la aplicación de Gestión de Riesgos.
 *
 * @module controller/riesgos/riesgosVariables
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const { RespuestaHttp, conIdiomaEspanol, consultar, ejecutar, enviarRespuestaHttp, transaccion } = require('../../bd/consultas');
const { accesoRiesgo, camposMarn, propiedadesPeriodo, seccionRiesgo, validarAreaRiesgo } = require('../../services/detalleRiesgos');
const prisma = require('../../prisma/client');
const { permisoEliminacionDirecta, permisosUsuario } = require('../../services/permisosRiesgos');
const { cumplimientoRiesgos } = require('../../services/planesSeguimiento');

// Normaliza el flag ES_NUEVO recibido del front (true/'1'/1 → 1, false/'0'/0 → 0).
// Devuelve null cuando no viene, para conservar el valor actual en actualizaciones.
function normalizarEsNuevo(valor) {
    if (valor === undefined || valor === null || valor === '') return null;
    return (valor === true || valor === 'true' || Number(valor) === 1) ? 1 : 0;
}

// Año de origen de cada riesgo de una unidad/período: recorre la cadena de continuidad
// (PERIODO_ANTERIOR) hacia atrás y toma el período más antiguo. Sin relación anterior,
// el origen es el propio período. Devuelve Map<CODIGO_RIESGO, año>.
async function obtenerAniosOrigen(codigo_cia, codigo_entidad, codigo_periodo) {
    const rows = await consultar(
        `
        WITH RECURSIVE cadena AS (
            SELECT
                r.CODIGO_CIA,
                r.CODIGO_ENTIDAD,
                r.CODIGO_RIESGO AS RIESGO_SEMILLA,
                r.CODIGO_PERIODO,
                r.PERIODO_ANTERIOR
            FROM gestion_riesgos.riesgos_riesgo_extendido r
            WHERE r.CODIGO_CIA = ?
              AND r.CODIGO_ENTIDAD = ?
              AND r.CODIGO_PERIODO = ?

            UNION ALL

            SELECT
                c.CODIGO_CIA,
                c.CODIGO_ENTIDAD,
                c.RIESGO_SEMILLA,
                p.CODIGO_PERIODO,
                p.PERIODO_ANTERIOR
            FROM cadena c
            JOIN gestion_riesgos.riesgos_riesgo_extendido p
              ON p.CODIGO_CIA = c.CODIGO_CIA
             AND p.CODIGO_ENTIDAD = c.CODIGO_ENTIDAD
             AND p.CODIGO_PERIODO = c.CODIGO_PERIODO - 1
             AND p.CODIGO_RIESGO = c.PERIODO_ANTERIOR
            WHERE c.PERIODO_ANTERIOR IS NOT NULL
              AND COALESCE(p.ELIMINADO, 0) != 1
        )
        SELECT RIESGO_SEMILLA AS CODIGO_RIESGO, MIN(CODIGO_PERIODO) AS ANIO_ORIGEN
        FROM cadena
        GROUP BY RIESGO_SEMILLA
        `,
        [codigo_cia, codigo_entidad, codigo_periodo]
    );
    return new Map(rows.map(r => [Number(r.CODIGO_RIESGO), Number(r.ANIO_ORIGEN)]));
}

const agregarAnioOrigen = (riesgos, anios, periodo) =>
    riesgos.map(r => ({ ...r, ANIO_ORIGEN: anios.get(Number(r.CODIGO_RIESGO)) ?? Number(periodo) }));

// INFORMACIÓN GENERAL
async function obtenerPeriodosEs(codigo_cia) {
    return conIdiomaEspanol(tx => consultar(
            `SELECT
         CODIGO_PERIODO,
         DATE_FORMAT(PERIODO_INICIAL, '%d-%M') AS FECINI,
         DATE_FORMAT(PERIODO_FINAL,   '%d-%M') AS FECFIN
       FROM gestion_riesgos.riesgos_periodo
       WHERE CODIGO_CIA = ?
       ORDER BY CODIGO_PERIODO ASC`,
            [codigo_cia], tx
    ));
}

/**
 * obtenerInfoInicial
 *
 * Función del controlador encargada de procesar la operación obtenerInfoInicial.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /obtener-info-inicial-vista-riesgos
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerInfoInicial = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const userId = req.userId;
    const { tipo } = req.query
    if (!codigo_cia || !userId) {
        return res.status(401).json({ error: 'Sesión inválida' });
    }
    try {
        const [
            areasResult, periodosResult,
            mitigacionResult, capacidadMitigacionResult, toleranciaResult,
            probabilidadResult, severidadResult, userInfoResult,
            tipoObjetivosResult, frecuenciaResult, organosResult,
            viceministeriosResult
        ] = await Promise.all([
            // Áreas
            consultar(
                `
                SELECT CODIGO_AREA AS ID, DESCRIPCION AS NOMBRE
                FROM gestion_riesgos.riesgos_area WHERE ESTADO = 1 AND CODIGO_CIA = ?
                    AND (CODIGO_ENTIDAD IS NULL OR CODIGO_ENTIDAD = ?) ORDER BY DESCRIPCION
                `, [codigo_cia, req.codigo_entidad]
            ),

            obtenerPeriodosEs(codigo_cia),

            // Mitigación (criterio de eficiencia de control)
            consultar(`SELECT CODIGO_MITIGACION AS CODIGO, DESCRIPCION FROM gestion_riesgos.riesgos_mitigacion`),

            // Capacidad de mitigación del riesgo (usa NOMBRE_EXTRA como descripción)
            consultar(
                `SELECT CODIGO_MITIGACION AS CODIGO, NOMBRE_EXTRA AS DESCRIPCION FROM gestion_riesgos.riesgos_mitigacion `
            ),

            // Tolerancia
            consultar(`SELECT CODIGO_TOLERANCIA AS CODIGO, DESCRIPCION FROM gestion_riesgos.riesgos_tolerancia`),

            // Probabilidad
            consultar(`SELECT CODIGO_PROBABILIDAD AS CODIGO, DESCRIPCION FROM  gestion_riesgos.riesgos_probabilidad`),

            // Severidad
            consultar(`SELECT CODIGO_SEVERIDAD AS CODIGO, DESCRIPCION FROM gestion_riesgos.riesgos_severidad`),

            // Info del usuario: nombre de entidad, siglas y código_entidad
            consultar(
                ` 
                SELECT re.NOMBRE, re.SIGLAS, rp.CODIGO_ENTIDAD
                FROM gestion_riesgos.seguridad_persona rp
                LEFT JOIN  gestion_riesgos.seguridad_entidad re 
                ON  re.CODIGO_CIA = rp.CODIGO_CIA AND re.CODIGO_ENTIDAD = rp.CODIGO_ENTIDAD
                WHERE rp.CODIGO_CIA = ? AND rp.CODIGO_COLABORADOR = ?
                `, [codigo_cia, userId]
            ),

            // Tipo de objetivos
            consultar(
                `
                SELECT CODIGO_TIPO_OBJETIVO, DESCRIPCION
                FROM gestion_riesgos.riesgos_tipo_objetivo
                WHERE CODIGO_CIA = ? AND ESTADO = 1
                `, [codigo_cia]
            ),

            // Frecuencias
            consultar(
                `
                SELECT CODIGO_FRECUENCIA, DESCRIPCION
                FROM gestion_riesgos.riesgos_frecuencia
                WHERE CODIGO_CIA = ?  AND ESTADO = 1
                `, [codigo_cia]
            ),

            // Organos
            consultar(
                `
                SELECT CODIGO_ORGANO, NOMBRE
                FROM gestion_riesgos.riesgos_organos
                WHERE CODIGO_CIA = ?
                `, [codigo_cia]
            ),

            // Viceministerios
            consultar(
                `
                SELECT CODIGO_VICEMINISTERIO, NOMBRE
                FROM gestion_riesgos.riesgos_viceministerio
                WHERE CODIGO_CIA = ?
                `, [codigo_cia]
            ),
        ]);

        return res.json({
            areas: areasResult, periodos: periodosResult,
            mitigacion: mitigacionResult, capacidadMitigacion: capacidadMitigacionResult, tolerancia: toleranciaResult,
            probabilidad: probabilidadResult, severidad: severidadResult, userInfo: userInfoResult[0] || null,
            tipoObjetivos: tipoObjetivosResult, frecuencia: frecuenciaResult, organos: organosResult,
            viceminsiterios: viceministeriosResult
        });
    } catch (err) {
        console.error('obtenerInfoInicial:', err);
        return res.status(500).json({ error: 'Error interno al obtener información inicial.' });
    }
};

/**
 * obtenerCatalogoRiesgos
 *
 * Función del controlador encargada de procesar la operación obtenerCatalogoRiesgos.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /obtener-catalogo-riesgos
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerCatalogoRiesgos = async (req, res) => {
    try {
        const sql = `
        SELECT CODIGO_CATALOGO AS CODIGO, NOMBRE, NOMBRE_SIN_TILDE AS NOMBRETILDE
        FROM gestion_riesgos.riesgos_catalogo_nombre
        WHERE ACTIVO = 1
        ORDER BY NOMBRE
        `;
        const rows = await consultar(sql);
        return res.json({ data: rows });
    } catch (err) {
        console.error('obtenerCatalogoRiesgos:', err);
        return res.status(500).json({ error: 'Error al obtener catálogo de riesgos' });
    }
};

/**
 * obtenerPropiedades
 *
 * Función del controlador encargada de procesar la operación obtenerPropiedades.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /obtener-propiedades
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerPropiedades = async (req, res) => {
    const { tipo, periodo } = req.query;
    const map = { 1: 'ME', 2: 'MC', 3: 'MCE' };
    const seccion = map[Number(tipo)];

    if (!seccion || !Number.isInteger(Number(periodo))) return res.status(400).json({ ok: false, error: 'Tipo o periodo inválido.' });

    try {
        const result = await propiedadesPeriodo(prisma, req.codigo_cia, Number(periodo), seccion);
        return res.json({ ok: true, data: result });
    } catch (err) {
        console.error('obtener propiedades:', err);
        return res.status(500).json({ ok: false, error: 'Error al obtener propiedades' });
    }
};

/**
 * obtenerObjetivos
 *
 * Función del controlador encargada de procesar la operación obtenerObjetivos.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /lista-objetivos
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerObjetivos = async (req, res) => {
    const codigoCia = req.codigo_cia;

    try {
        const sql = `
        SELECT CODIGO_OBJETIVO, DESCRIPCION, CODIGO_TIPO_OBJETIVO
        FROM gestion_riesgos.riesgos_objetivo
        WHERE CODIGO_CIA = ?`;

        const params = [codigoCia];
        const rows = await consultar(sql, params);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Objetivos no encontrados' });
        }

        return res.status(200).json({ objetivos: rows });
    } catch (err) {
        console.error('obtener objetivos:', err);
        return res.status(500).json({ error: 'Error al obtener objetivos' });
    }
};

/**
 * obtenerVersionesPropiedadesRiesgos
 *
 * Función del controlador encargada de procesar la operación obtenerVersionesPropiedadesRiesgos.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /versiones-riesgos
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerVersionesPropiedadesRiesgos = async (req, res) => {
    const { periodo } = req.query
    try {
        const sql = `
        SELECT CODIGO_VERSION, ESTADO
        FROM gestion_riesgos.riesgos_riesgo_propiedades_versiones
        WHERE codigo_cia = ? and codigo_periodo = ?
        ORDER BY CODIGO_VERSION
        `;
        const rows = await consultar(sql, [req.codigo_cia, periodo]);
        return res.json({ data: rows });
    } catch (err) {
        console.error('Obtener versiones de las propiedas de riesgos por período:', err);
        return res.status(500).json({ error: 'Obtener versiones de las propiedas de riesgos por período' });
    }
};

/**
 * obtenerPropiedadesDeVersionRiesgos
 *
 * Función del controlador encargada de procesar la operación obtenerPropiedadesDeVersionRiesgos.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /propiedades-riesgos
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerPropiedadesDeVersionRiesgos = async (req, res) => {
    const { periodo, codigo_version } = req.query
    try {
        const sql = `
        SELECT PROPIEDAD, CODIGO_PROPIEDAD
        FROM gestion_riesgos.riesgos_riesgo_propiedades
        WHERE codigo_cia = ? and codigo_periodo = ? and codigo_version = ?
        ORDER BY PROPIEDAD
        `;
        const rows = await consultar(sql, [req.codigo_cia, periodo, codigo_version]);
        return res.json({ data: rows });
    } catch (err) {
        console.error('Obtener propiedades de riesgos por período:', err);
        return res.status(500).json({ error: 'Obtener propiedas de riesgos por período' });
    }
};

/**
 * crearVersionPropiedadesRiesgos
 *
 * Función del controlador encargada de procesar la operación crearVersionPropiedadesRiesgos.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route POST /propiedades-riesgos
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.crearVersionPropiedadesRiesgos = async (req, res) => {
    const { periodo, propiedades } = req.body || {};

    const codigo_cia = req.codigo_cia;
    const usuario_creacion = req.userId;

    if (!codigo_cia || !usuario_creacion) {
        return res.status(401).json({ error: "No autorizado." });
    }
    if (!periodo || !Array.isArray(propiedades)) {
        return res.status(400).json({ error: "Faltan variables." });
    }
    if (propiedades.length === 0) {
        return res.status(400).json({ error: "Debes enviar al menos una propiedad." });
    }

    try {
        const resultado = await transaccion(async tx => {
            const [nxtR] = await consultar(
                `
                SELECT COALESCE(MAX(CODIGO_VERSION), 0) + 1 AS NEXT_VAL
                FROM gestion_riesgos.riesgos_riesgo_propiedades_versiones
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
                FOR UPDATE
                `,
                [codigo_cia, periodo], tx
            );
            const codigo_version = Number(nxtR?.NEXT_VAL || 1);

            await ejecutar(
                `
                INSERT INTO gestion_riesgos.riesgos_riesgo_propiedades_versiones
                    (CODIGO_CIA, CODIGO_PERIODO, CODIGO_VERSION, USUARIO_CREACION, FECHA_CREACION)
                VALUES (?, ?, ?, ?, NOW())
                `,
                [codigo_cia, periodo, codigo_version, usuario_creacion], tx
            );

            const placeholders = propiedades.map(() => "(?, ?, ?, ?, ?)").join(", ");
            const values = propiedades.flatMap((p, i) => [
                codigo_cia,
                periodo,
                i + 1,
                codigo_version,
                p
            ]);

            await ejecutar(
                `
                INSERT INTO gestion_riesgos.riesgos_riesgo_propiedades
                    (CODIGO_CIA, CODIGO_PERIODO, CODIGO_PROPIEDAD, CODIGO_VERSION, PROPIEDAD)
                VALUES ${placeholders}
                `,
                values, tx
            );

            await ejecutar(
                `
                UPDATE gestion_riesgos.riesgos_riesgo_propiedades_versiones
                SET ESTADO = 'N'
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION != ?
                `,
                [codigo_cia, periodo, codigo_version], tx
            );
            return {
                message: "Versión y propiedades creadas con éxito.",
                codigo_version,
                periodo,
                total_propiedades: propiedades.length,
            };
        });
        return res.status(201).json(resultado);
    } catch (err) {
        console.error("Crear propiedades riesgo:", err);
        return res.status(500).json({ error: "Error al crear propiedades riesgo" });
    }
};

/**
 * copiarDefectoPasadoRiesgo
 *
 * Función del controlador encargada de procesar la operación copiarDefectoPasadoRiesgo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route POST /defecto-pasado-riesgo
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.copiarDefectoPasadoRiesgo = async (req, res) => {
    const { periodo } = req.body || {};
    const codigo_cia = req.codigo_cia;
    const usuario_creacion = req.userId;

    if (!codigo_cia || !usuario_creacion) {
        return res.status(401).json({ error: "No autorizado." });
    }
    if (!periodo || isNaN(Number(periodo))) {
        return res.status(400).json({ error: "Falta o es inválido el período actual." });
    }

    const periodoAnterior = Number(periodo) - 1;
    try {
        const resultado = await transaccion(async tx => {
            const [defPrev] = await consultar(
                `
                SELECT CODIGO_VERSION
                FROM gestion_riesgos.riesgos_riesgo_propiedades_versiones
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND ESTADO = 'S'
                ORDER BY CODIGO_VERSION DESC
                LIMIT 1
                FOR UPDATE
                `,
                [codigo_cia, periodoAnterior], tx
            );

            if (!defPrev?.CODIGO_VERSION) {
                throw new RespuestaHttp(404, {
                    error: "No existe versión por defecto en el período anterior.",
                    periodo_anterior: periodoAnterior,
                });
            }

            const codigo_version_prev = Number(defPrev.CODIGO_VERSION);

            const propsPrev = await consultar(
                `
                SELECT CODIGO_PROPIEDAD, PROPIEDAD
                FROM gestion_riesgos.riesgos_riesgo_propiedades
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION = ?
                ORDER BY CODIGO_PROPIEDAD ASC
                `,
                [codigo_cia, periodoAnterior, codigo_version_prev], tx
            );

            const [nxt] = await consultar(
                `
                SELECT COALESCE(MAX(CODIGO_VERSION), 0) + 1 AS NEXT_VAL
                FROM gestion_riesgos.riesgos_riesgo_propiedades_versiones
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
                FOR UPDATE
                `,
                [codigo_cia, periodo], tx
            );
            const codigo_version_nuevo = Number(nxt?.NEXT_VAL || 1);

            await ejecutar(
                `
                INSERT INTO gestion_riesgos.riesgos_riesgo_propiedades_versiones
                    (CODIGO_CIA, CODIGO_PERIODO, CODIGO_VERSION, USUARIO_CREACION, FECHA_CREACION)
                VALUES (?, ?, ?, ?, NOW())
                `,
                [codigo_cia, periodo, codigo_version_nuevo, usuario_creacion], tx
            );

            if (Array.isArray(propsPrev) && propsPrev.length > 0) {
                const placeholders = propsPrev.map(() => "(?, ?, ?, ?, ?)").join(", ");
                const values = propsPrev.flatMap((r) => [
                    codigo_cia,
                    periodo,
                    r.CODIGO_PROPIEDAD,
                    codigo_version_nuevo,
                    r.PROPIEDAD
                ]);

                await ejecutar(
                    `
                    INSERT INTO gestion_riesgos.riesgos_riesgo_propiedades
                    (CODIGO_CIA, CODIGO_PERIODO, CODIGO_PROPIEDAD, CODIGO_VERSION, PROPIEDAD)
                    VALUES ${placeholders}
                    `,
                    values, tx
                );
            }

            await ejecutar(
                `
                UPDATE gestion_riesgos.riesgos_riesgo_propiedades_versiones
                SET ESTADO = 'N'
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION != ?`,
                [codigo_cia, periodo, codigo_version_nuevo], tx
            );
            return {
                message: "Versión por defecto del año pasado copiada con éxito.",
                periodo_origen: periodoAnterior,
                codigo_version_origen: codigo_version_prev,
                periodo_destino: periodo,
                codigo_version_nuevo,
                total_propiedades_copiadas: propsPrev?.length || 0,
            };
        });
        return res.status(201).json(resultado);
    } catch (err) {
        if (enviarRespuestaHttp(err, res)) return;
        console.error("Copiar defecto año pasado (riesgos):", err);
        return res.status(500).json({ error: "Error al copiar la versión por defecto del año pasado." });
    }
};

/**
 * establecerDefectoRiesgos
 *
 * Función del controlador encargada de procesar la operación establecerDefectoRiesgos.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /defecto-riesgos
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.establecerDefectoRiesgos = async (req, res) => {
    const { periodo, codigo_version } = req.body || {};
    const codigo_cia = req.codigo_cia

    try {
        const resultado = await transaccion(async tx => {
            await ejecutar(
                `
                UPDATE gestion_riesgos.riesgos_riesgo_propiedades_versiones
                SET ESTADO = 'N'
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION != ?`,
                [codigo_cia, periodo, codigo_version], tx
            );

            await ejecutar(
                `
                UPDATE gestion_riesgos.riesgos_riesgo_propiedades_versiones
                SET ESTADO = 'S'
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION = ?`,
                [codigo_cia, periodo, codigo_version], tx
            );
            return { message: 'Propiedades actualizadas con exito', };
        });
        return res.status(201).json(resultado);
    } catch (err) {
        console.error('Crear propiedades riesgo:', err);
        return res.status(500).json({ error: 'Error al actualizar propiedades riesgo' });
    }
};

/**
 * obtenerPropiedadesDefectoPeriodo
 *
 * Función del controlador encargada de procesar la operación obtenerPropiedadesDefectoPeriodo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /propiedades-riesgos-defecto
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerPropiedadesDefectoPeriodo = async (req, res) => {
    const { periodo } = req.query
    try {
        const sql = `
        SELECT b.PROPIEDAD, b.CODIGO_PROPIEDAD, b.CODIGO_VERSION
        FROM gestion_riesgos.riesgos_riesgo_propiedades b
        LEFT JOIN gestion_riesgos.riesgos_riesgo_propiedades_versiones a
        ON a.codigo_cia = b.codigo_cia AND a.codigo_periodo = b.codigo_periodo 
        AND a.codigo_version = b.codigo_version
        WHERE a.estado = 'S' AND a.codigo_cia = ? AND a.codigo_periodo = ?
        ORDER BY b.PROPIEDAD
        `;
        const rows = await consultar(sql, [req.codigo_cia, periodo]);
        return res.json({ data: rows });
    } catch (err) {
        console.error('Obtener versiones de las propiedas de riesgos por período:', err);
        return res.status(500).json({ error: 'Obtener versiones de las propiedas de riesgos por período' });
    }
};

/**
 * obtenerVersionesPropiedadesReportes
 *
 * Función del controlador encargada de procesar la operación obtenerVersionesPropiedadesReportes.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /versiones-propiedades-reportes
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerVersionesPropiedadesReportes = async (req, res) => {
    const { periodo, codigo_version } = req.query
    try {
        const sql = `
        SELECT CODIGO_VERSION, PROPIEDADES_ME, PROPIEDADES_MC, PROPIEDADES_MCE, DEFECTO
        FROM gestion_riesgos.riesgos_reportes_propiedades
        WHERE codigo_cia = ? and codigo_periodo = ?
        ${codigo_version ? `AND codigo_version = ${codigo_version}` : ``}
        ORDER BY codigo_version
        `;
        const rows = await consultar(sql, [req.codigo_cia, periodo]);
        return res.json({ data: rows });
    } catch (err) {
        console.error('Obtener versiones de las propiedas de riesgos por período:', err);
        return res.status(500).json({ error: 'Obtener versiones de las propiedas de riesgos por período' });
    }
};

/**
 * crearVersionPropiedadesReportes
 *
 * Función del controlador encargada de procesar la operación crearVersionPropiedadesReportes.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route POST /versiones-propiedades-reportes
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.crearVersionPropiedadesReportes = async (req, res) => {
    const { periodo, reportes } = req.body || {};

    const codigo_cia = req.codigo_cia;
    const usuario_creacion = req.userId;

    const me = reportes?.matriz_evaluacion_riesgos ?? [];
    const mc = reportes?.mapa_calor_riesgo_residual ?? [];
    const mce = reportes?.matriz_continuidad_evaluacion ?? [];

    if (!codigo_cia || !usuario_creacion) {
        return res.status(401).json({ error: "No autorizado." });
    }
    if (!periodo) {
        return res.status(400).json({ error: "Falta 'periodo'." });
    }
    if (!reportes || !Array.isArray(me) || !Array.isArray(mc) || !Array.isArray(mce)) {
        return res.status(400).json({ error: "Formato de 'reportes' inválido." });
    }

    let jsonME, jsonMC, jsonMCE;
    try {
        jsonME = JSON.stringify(me);
        jsonMC = JSON.stringify(mc);
        jsonMCE = JSON.stringify(mce);
    } catch (e) {
        return res.status(400).json({ error: "No se pudo serializar los reportes a JSON." });
    }

    try {
        const resultado = await transaccion(async tx => {
            const [nxt] = await consultar(
                `
                SELECT COALESCE(MAX(CODIGO_VERSION), 0) + 1 AS NEXT_VAL
                FROM gestion_riesgos.riesgos_reportes_propiedades
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
                FOR UPDATE
                `, [codigo_cia, periodo], tx
            );
            const codigo_version = Number(nxt?.NEXT_VAL || 1);

            await ejecutar(
                `
                INSERT INTO gestion_riesgos.riesgos_reportes_propiedades
                (CODIGO_CIA, CODIGO_PERIODO, CODIGO_VERSION,
                PROPIEDADES_ME, PROPIEDADES_MC, PROPIEDADES_MCE, USUARIO_CREACION, FECHA_CREACION)
                VALUES (?, ?, ?, ?, ?, ?,  ?, NOW())
                `, [codigo_cia, periodo, codigo_version, jsonME, jsonMC, jsonMCE, usuario_creacion], tx
            );

            await ejecutar(
                `
                UPDATE gestion_riesgos.riesgos_reportes_propiedades
                SET DEFECTO = 'N'
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION != ?
                `, [codigo_cia, periodo, codigo_version], tx
            );
            return {
                message: "Versión de reportes creada con éxito.",
                periodo,
                codigo_version,
                counts: {
                    matriz_evaluacion_riesgos: me.length,
                    mapa_calor_riesgo_residual: mc.length,
                    matriz_continuidad_evaluacion: mce.length,
                },
            };
        });
        return res.status(201).json(resultado);
    } catch (err) {
        console.error("crearVersionPropiedadesReportes:", err);
        return res.status(500).json({ error: "Error al crear la versión de reportes." });
    }
};

/**
 * copiarDefectoPasadoReportes
 *
 * Función del controlador encargada de procesar la operación copiarDefectoPasadoReportes.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route POST /defecto-pasado-reportes
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.copiarDefectoPasadoReportes = async (req, res) => {
    const { periodo } = req.body || {};

    const codigo_cia = req.codigo_cia;
    const usuario_creacion = req.userId;

    if (!codigo_cia || !usuario_creacion) {
        return res.status(401).json({ error: "No autorizado." });
    }
    const perNum = Number(periodo);
    if (!Number.isFinite(perNum)) {
        return res.status(400).json({ error: "Período inválido." });
    }

    const periodoAnterior = perNum - 1;

    try {
        const srcRows = await consultar(
            `
            SELECT CODIGO_VERSION, PROPIEDADES_ME, PROPIEDADES_MC, PROPIEDADES_MCE
            FROM gestion_riesgos.riesgos_reportes_propiedades
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND DEFECTO = 'S'
            LIMIT 1
            `,
            [codigo_cia, periodoAnterior]
        );

        if (!srcRows || srcRows.length === 0) {
            return res.status(404).json({
                error: `No se encontró una versión por defecto en el período anterior (${periodoAnterior}).`,
            });
        }

        const src = srcRows[0];
        const jsonME = src.PROPIEDADES_ME ?? "[]";
        const jsonMC = src.PROPIEDADES_MC ?? "[]";
        const jsonMCE = src.PROPIEDADES_MCE ?? "[]";

        const codigo_version = await transaccion(async tx => {
            const [nxtR] = await consultar(
                `
                SELECT COALESCE(MAX(CODIGO_VERSION), 0) + 1 AS NEXT_VAL
                FROM gestion_riesgos.riesgos_reportes_propiedades
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
                FOR UPDATE
                `,
                [codigo_cia, perNum], tx
            );
            const codigo = Number(nxtR?.NEXT_VAL || 1);

            await ejecutar(
                `
                INSERT INTO gestion_riesgos.riesgos_reportes_propiedades
                    (CODIGO_CIA, CODIGO_PERIODO, CODIGO_VERSION,
                    PROPIEDADES_ME, PROPIEDADES_MC, PROPIEDADES_MCE,
                    DEFECTO, USUARIO_CREACION, FECHA_CREACION)
                VALUES (?, ?, ?, ?, ?, ?, 'S', ?, NOW())
                `,
                [codigo_cia, perNum, codigo, String(jsonME), String(jsonMC), String(jsonMCE), usuario_creacion], tx
            );

            await ejecutar(
                `
                UPDATE gestion_riesgos.riesgos_reportes_propiedades
                SET DEFECTO = 'N'
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION <> ?
                `,
                [codigo_cia, perNum, codigo], tx
            );
            return codigo;
        });

        return res.status(201).json({
            message: "Versión copiada y establecida como defecto.",
            periodo: perNum,
            codigo_version,
            fuente_periodo: periodoAnterior,
            fuente_codigo_version: src.CODIGO_VERSION,
        });
    } catch (err) {
        console.error("Copiar defecto del año pasado (reportes):", err);
        return res.status(500).json({ error: "Error al copiar la versión por defecto del año pasado." });
    }
};

/**
 * establecerDefectoReportes
 *
 * Función del controlador encargada de procesar la operación establecerDefectoReportes.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /versiones-establecer-defecto-reportes
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.establecerDefectoReportes = async (req, res) => {
    const { periodo, codigo_version } = req.body || {};
    const codigo_cia = req.codigo_cia

    try {
        const resultado = await transaccion(async tx => {
            await ejecutar(
                `
                UPDATE gestion_riesgos.riesgos_reportes_propiedades
                SET DEFECTO = 'N'
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION != ?`,
                [codigo_cia, periodo, codigo_version], tx
            );

            await ejecutar(
                `
                UPDATE gestion_riesgos.riesgos_reportes_propiedades
                SET DEFECTO = 'S'
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION = ?`,
                [codigo_cia, periodo, codigo_version], tx
            );
            return { message: 'Propiedades actualizadas con exito', };
        });
        return res.status(201).json(resultado);
    } catch (err) {
        console.error('Crear propiedades riesgo:', err);
        return res.status(500).json({ error: 'Error al actualizar propiedades riesgo' });
    }
};

/**
 * obtenerRiesgos
 *
 * Función del controlador encargada de procesar la operación obtenerRiesgos.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /obtener-lista
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerRiesgos = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = req.codigo_entidad;
    const periodo = Number(req.query?.periodo);
    const tipo = req.query?.tipo ?? 'ME';

    if (!codigo_cia || !codigo_entidad || !periodo) {
        return res
            .status(400)
            .json({ error: "Faltan parámetros: codigo_cia, codigo_entidad y periodo son requeridos." });
    }

    try {
        const { url } = seccionRiesgo(tipo);
        const permisos = await permisosUsuario(req, [url, permisoEliminacionDirecta], { vigentes: true });
        const incluirVinculados = tipo === 'ME' && permisos.has(url);
        const sqlRiesgos = `
        SELECT
            rr.CODIGO_RIESGO,
            rr.CODIGO_ENTIDAD,
            rr.DESCRIPCION,
            rr.REF,
            rr.CODIGO_DUENO,
            EXISTS(SELECT 1 FROM gestion_riesgos.riesgos_solicitud_eliminacion s
              WHERE s.CODIGO_CIA = rr.CODIGO_CIA AND s.CODIGO_ENTIDAD = rr.CODIGO_ENTIDAD
                AND s.CODIGO_PERIODO = rr.CODIGO_PERIODO AND s.CODIGO_RIESGO = rr.CODIGO_RIESGO
                AND s.ESTADO = 'P') AS ELIMINACION_SOLICITADA,
            direccion.NOMBRE AS DIRECCION_DUENA,
            NULLIF(CONCAT_WS(' ', dueno.PRIMER_NOMBRE, dueno.PRIMER_APELLIDO), '') AS DUENO,
            GREATEST((SELECT COUNT(*) FROM gestion_riesgos.riesgos_riesgo_evento ev
              WHERE ev.CODIGO_CIA = rr.CODIGO_CIA AND ev.CODIGO_ENTIDAD = rr.CODIGO_ENTIDAD
                AND ev.CODIGO_PERIODO = rr.CODIGO_PERIODO AND ev.CODIGO_RIESGO = rr.CODIGO_RIESGO
                AND ev.ACTIVO = 1), IF(NULLIF(TRIM(rr.EVENTO), '') IS NULL, 0, 1)) AS EVENTOS,
            (SELECT COUNT(*) FROM gestion_riesgos.riesgos_plan_accion plan
              WHERE plan.CODIGO_CIA = rr.CODIGO_CIA AND plan.CODIGO_ENTIDAD = rr.CODIGO_ENTIDAD
                AND plan.CODIGO_PERIODO = rr.CODIGO_PERIODO AND plan.CODIGO_RIESGO = rr.CODIGO_RIESGO
                AND plan.ACTIVO = 1) AS PLANES,
            rr.COMENTARIO_SUPERVISOR_${tipo} AS COMENTARIO_SUPERVISOR,
            rr.ESTADO_${tipo} AS ESTADO,
            rr.COMENTARIO_SUPERIOR_${tipo} AS COMENTARIO_SUPERIOR,
            rr.ESTADO_${tipo}_SUPERIOR AS ESTADO_SUPERIOR,
            ELIMINADO,
            rr.ES_NUEVO
        FROM
            gestion_riesgos.riesgos_riesgo_extendido rr
        LEFT JOIN gestion_riesgos.seguridad_persona dueno
            ON dueno.CODIGO_CIA = rr.CODIGO_CIA AND dueno.CODIGO_COLABORADOR = rr.CODIGO_DUENO
        JOIN gestion_riesgos.seguridad_entidad direccion
            ON direccion.CODIGO_CIA = rr.CODIGO_CIA AND direccion.CODIGO_ENTIDAD = rr.CODIGO_ENTIDAD
        WHERE 
            rr.CODIGO_CIA = ?
            AND rr.CODIGO_PERIODO = ?
            AND (rr.CODIGO_ENTIDAD = ? OR (? AND COALESCE(rr.ELIMINADO, 0) = 0 AND EXISTS (
                SELECT 1 FROM gestion_riesgos.riesgos_riesgo_vinculo vinculo
                WHERE vinculo.CODIGO_CIA = rr.CODIGO_CIA AND vinculo.CODIGO_ENTIDAD = rr.CODIGO_ENTIDAD
                  AND vinculo.CODIGO_PERIODO = rr.CODIGO_PERIODO AND vinculo.CODIGO_RIESGO = rr.CODIGO_RIESGO
                  AND vinculo.CODIGO_ENTIDAD_VINCULADA = ? AND vinculo.ACTIVO = 1
            )))
        ORDER BY rr.eliminado ASC, rr.ESTADO_${tipo} DESC, rr.REF ASC
        `;
        const riesgosRows = await consultar(sqlRiesgos, [
            codigo_cia,
            periodo,
            Number(codigo_entidad), incluirVinculados, Number(codigo_entidad)
        ]);
        const direcciones = [...new Set(riesgosRows.map(row => row.CODIGO_ENTIDAD))];
        const anios = new Map(await Promise.all(direcciones.map(async direccion => [direccion,
            await obtenerAniosOrigen(codigo_cia, direccion, periodo)])));
        const cumplimiento = tipo === 'ME' ? await cumplimientoRiesgos(codigo_cia, periodo, riesgosRows.map(row => ({
            codigoEntidad: row.CODIGO_ENTIDAD, codigoRiesgo: row.CODIGO_RIESGO }))) : new Map();

        return res.json({
            puedeEliminarDirecto: permisos.has(permisoEliminacionDirecta),
            puedeSolicitarEliminacion: tipo === 'ME' && permisos.has(url),
            riesgos: riesgosRows.map(row => ({ ...agregarAnioOrigen([row], anios.get(row.CODIGO_ENTIDAD), periodo)[0],
                CUMPLIMIENTO: cumplimiento.get(`${row.CODIGO_ENTIDAD}:${row.CODIGO_RIESGO}`)?.porcentaje ?? null,
                vinculado: row.CODIGO_ENTIDAD !== Number(codigo_entidad) })),
        });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error("obtenerRiesgos:", err);
        return res.status(500).json({ error: "Error al obtener riesgos" });
    }
};

/**
 * crearRiesgo
 *
 * Función del controlador encargada de procesar la operación crearRiesgo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route POST /
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.crearRiesgo = async (req, res) => {
    const {
        codigoPeriodo,
        tipoObjetivoCodigo,
        areaCodigo,
        toleranciaCodigo,
        frecuenciaCodigo,
        descripcion,
        ref,
        probabilidad,
        severidad,
        capacidadMitigacion,
        variableMitigacion,
        severidadNarracion,
        evento,
        control,
        monitoreo,
        observaciones,
        probabilidadAjustada,
        severidadAjustada,
        riesgoInherente,
        riesgoResidual,
        responsable,
        objetivoCodigo,
        extras,
        organoCodigo,
        viceministerioCodigo,
        esNuevo,
        tipo = 'ME'
    } = req.body || {};

    const codigo_cia = req.codigo_cia;
    const codigo_entidad = req.codigo_entidad;
    const usuario_creacion = req.userId;

    if (!codigo_cia || !codigo_entidad || !usuario_creacion) {
        return res.status(401).json({ error: "Sesión inválida." });
    }

    const pPeriodo = Number(codigoPeriodo);
    const pArea = Number(areaCodigo);
    const pTol = Number(toleranciaCodigo);
    const pFreq = Number(frecuenciaCodigo);
    const pProb = Number(probabilidad);
    const pSev = Number(severidad);
    const pMit = Number(capacidadMitigacion) + 1;
    const varMit = String(variableMitigacion || "").toUpperCase();
    const pTipoObj = String(tipoObjetivoCodigo || "");
    const pObj = Number(objetivoCodigo);

    try {
        seccionRiesgo(tipo);
        if (tipo === 'ME' && !(await accesoRiesgo(req, Number(codigo_entidad), tipo)).edicion) {
            return res.status(403).json({ error: 'No tiene permiso para crear el riesgo.' });
        }
        const marn = await camposMarn(req, pPeriodo, tipo);
        await validarAreaRiesgo(req, pArea);
        const codigo_riesgo = await transaccion(async tx => {
            const [nxt] = await consultar(
                `
                SELECT COALESCE(MAX(CODIGO_RIESGO), 0) + 1 AS NEXT_VAL
                FROM gestion_riesgos.riesgos_riesgo_extendido
                WHERE 
                    CODIGO_CIA = ?
                    AND CODIGO_ENTIDAD = ?
                    AND CODIGO_PERIODO = ?
                FOR UPDATE
          `,
                [codigo_cia, Number(codigo_entidad), pPeriodo], tx
            );
            const codigo = Number(nxt?.NEXT_VAL || 1);
            const sql = `
                INSERT INTO gestion_riesgos.riesgos_riesgo_extendido (
                    CODIGO_CIA, CODIGO_PERIODO, CODIGO_RIESGO, CODIGO_ENTIDAD,
                    CODIGO_TIPO_OBJETIVO, CODIGO_OBJETIVO, CODIGO_AREA, DESCRIPCION, 
                    CODIGO_PROBABILIDAD, CODIGO_SEVERIDAD, CODIGO_TOLERANCIA, CODIGO_MITIGACION, 
                    OBSERVACIONES, VARIABLE_MITIGACION, REF, USUARIO_CREACION, 
                    FECHA_CREACION, SEVERIDAD_NARRACION, PROBABILIDAD_AJUSTADA, SEVERIDAD_AJUSTADA,
                    RIESGO_RESIDUAL, RIESGO_INHERENTE, EVENTO, CONTROL, 
                    MONITOREO, CODIGO_FRECUENCIA, RESPONSABLE, EXTRAS_ME,
                    ORGANO, VICEMINISTERIO, ES_NUEVO, OBJETIVO_TEXTO, CODIGO_EJE, CODIGO_DUENO
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    CURRENT_TIMESTAMP, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?
                )
                `;
            await ejecutar(sql, [
                codigo_cia, pPeriodo, codigo, Number(codigo_entidad),
                pTipoObj || null, pObj || null, pArea || null, descripcion || null,
                pProb || null, pSev || null, pTol || null, pMit || null,
                observaciones || null, varMit || null, ref || null, usuario_creacion,
                severidadNarracion || null, Number(probabilidadAjustada) || null, Number(severidadAjustada) || null,
                Number(riesgoResidual) || null, Number(riesgoInherente) || null, evento || null, control || null,
                monitoreo || null, pFreq || null, responsable || null, extras ? JSON.stringify(extras) : null,
                organoCodigo || null, viceministerioCodigo || null, normalizarEsNuevo(esNuevo) ?? 0,
                marn.objetivoTexto ?? null, marn.codigoEje ?? null, marn.codigoDueno
            ], tx);
            return codigo;
        });

        return res.status(201).json({
            message: "✅ Riesgo creado exitosamente (extendido)",
            data: {
                codigo_cia,
                codigo_entidad: Number(codigo_entidad),
                codigoPeriodo: pPeriodo,
                codigoArea: pArea,
                codigoRiesgo: codigo_riesgo,
                esNuevo: normalizarEsNuevo(esNuevo) ?? 0
            }
        });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error("❌ crearRiesgo (extendido):", err);
        return res.status(500).json({ error: "Error al crear el riesgo extendido." });
    }
};

/**
 * obtenerRiesgoPorId
 *
 * Función del controlador encargada de procesar la operación obtenerRiesgoPorId.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /riesgo-por-id
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerRiesgoPorId = async (req, res) => {
    const codigoCia = req.codigo_cia;
    const codigoEntidad = req.codigo_entidad;

    const pPeriodo = Number(req.query?.periodo);
    const pRiesgo = Number(req.query?.riesgo);
    const tipo = req.query.tipo

    if (!codigoCia || !codigoEntidad) {
        return res.status(401).json({ error: 'Sesión inválida.' });
    }
    if (!Number.isFinite(pPeriodo) || !Number.isFinite(pRiesgo)) {
        return res.status(400).json({ error: 'Faltan identificadores: periodo y riesgo son obligatorios.' });
    }

    try {
        const sql = `
        SELECT
            CODIGO_CIA,
            CODIGO_PERIODO,
            CODIGO_RIESGO,
            CODIGO_ENTIDAD,

            CODIGO_TIPO_OBJETIVO,
            CODIGO_OBJETIVO,
            CODIGO_AREA,
            DESCRIPCION,

            CODIGO_PROBABILIDAD,
            CODIGO_SEVERIDAD,
            CODIGO_TOLERANCIA,
            CODIGO_MITIGACION,

            OBSERVACIONES,
            VARIABLE_MITIGACION,
            REF,

            PROBABILIDAD_AJUSTADA,
            SEVERIDAD_AJUSTADA,
            RIESGO_INHERENTE,
            RIESGO_RESIDUAL,

            EVENTO,
            CONTROL,
            MONITOREO,
            CODIGO_FRECUENCIA,
            RESPONSABLE,
            SEVERIDAD_NARRACION,

            EXTRAS_${tipo} AS EXTRAS,
            VICEMINISTERIO,
            ORGANO,
            PERIODO_ANTERIOR,
            ES_NUEVO
        FROM gestion_riesgos.riesgos_riesgo_extendido
        WHERE CODIGO_CIA = ?
            AND CODIGO_ENTIDAD = ?
            AND CODIGO_PERIODO = ?
            AND CODIGO_RIESGO = ?
        LIMIT 1
    `;
        const params = [codigoCia, Number(codigoEntidad), pPeriodo, pRiesgo];
        const rows = await consultar(sql, params);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Riesgo no encontrado' });
        }

        const r = rows[0];

        let extrasObj = {};
        if (r.EXTRAS != null) {
            if (typeof r.EXTRAS === 'string') {
                try {
                    const parsed = JSON.parse(r.EXTRAS);
                    extrasObj = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
                } catch {
                    extrasObj = {};
                }
            } else if (typeof r.EXTRAS === 'object') {
                extrasObj = Array.isArray(r.EXTRAS) ? {} : (r.EXTRAS ?? {});
            }
        }

        const riesgo = {
            CODIGO_CIA: r.CODIGO_CIA,
            CODIGO_PERIODO: r.CODIGO_PERIODO,
            CODIGO_RIESGO: r.CODIGO_RIESGO,
            CODIGO_ENTIDAD: r.CODIGO_ENTIDAD,

            CODIGO_TIPO_OBJETIVO: r.CODIGO_TIPO_OBJETIVO ?? null,
            CODIGO_OBJETIVO: r.CODIGO_OBJETIVO ?? null,
            CODIGO_AREA: r.CODIGO_AREA ?? null,

            DESCRIPCION: r.DESCRIPCION ?? '',

            CODIGO_PROBABILIDAD: r.CODIGO_PROBABILIDAD ?? null,
            CODIGO_SEVERIDAD: r.CODIGO_SEVERIDAD ?? null,
            CODIGO_TOLERANCIA: r.CODIGO_TOLERANCIA ?? null,
            CODIGO_MITIGACION: r.CODIGO_MITIGACION ?? null,

            VARIABLE_MITIGACION: r.VARIABLE_MITIGACION ?? '',
            OBSERVACIONES: r.OBSERVACIONES ?? '',
            REF: r.REF ?? '',

            PROBABILIDAD_AJUSTADA: r.PROBABILIDAD_AJUSTADA ?? null,
            SEVERIDAD_AJUSTADA: r.SEVERIDAD_AJUSTADA ?? null,
            RIESGO_INHERENTE: r.RIESGO_INHERENTE ?? null,
            RIESGO_RESIDUAL: r.RIESGO_RESIDUAL ?? null,

            EVENTO: r.EVENTO ?? '',
            CONTROL: r.CONTROL ?? '',
            MONITOREO: r.MONITOREO ?? '',
            CODIGO_FRECUENCIA: r.CODIGO_FRECUENCIA ?? null,
            RESPONSABLE: r.RESPONSABLE ?? '',
            SEVERIDAD_NARRACION: r.SEVERIDAD_NARRACION ?? '',
            VICEMINISTERIO: r.VICEMINISTERIO ?? '',
            ORGANO: r.ORGANO ?? '',
            PERIODO_ANTERIOR: r.PERIODO_ANTERIOR ?? '',
            ES_NUEVO: Number(r.ES_NUEVO) === 1 ? 1 : 0,

            EXTRAS_JSON: extrasObj,
            PROP_EXTRA_JSON: extrasObj
        };

        return res.status(200).json({ riesgo });
    } catch (err) {
        console.error('obtenerRiesgoPorIdMe:', err);
        return res.status(500).json({ error: 'Error al obtener riesgo' });
    }
};

/**
 * obtenerRiesgoPeriodoPasado
 *
 * Función del controlador encargada de procesar la operación obtenerRiesgoPeriodoPasado.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /riesgo-por-id-periodo-anterior
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerRiesgoPeriodoPasado = async (req, res) => {
    const codigoCia = req.codigo_cia;
    const codigoEntidad = req.codigo_entidad;
    const periodo = req.query.periodo;
    const codigo_riesgo = req.query.codigo_riesgo;

    try {
        const sql = `
        SELECT
            rrx.CODIGO_ENTIDAD,
            rrx.CODIGO_RIESGO, 
            -- tipo objetivos
            rto.DESCRIPCION                              AS 'Tipo de objetivo',
            -- objetivo
            ro.DESCRIPCION                               AS 'Objetivo',
            -- área
            ra.DESCRIPCION                               AS 'Área evaluada',
            -- probabilidad
            CONCAT(rprob.CODIGO_PROBABILIDAD, ' - ', rprob.DESCRIPCION) AS 'Probabilidad',
            -- severidad
            CONCAT(rsev.CODIGO_SEVERIDAD, ' - ', rsev.DESCRIPCION)      AS 'Severidad',
            -- tolerancia
            rtol.DESCRIPCION                             AS 'Tolerancia',
            -- mitigacion
            concat(rm.codigo_mitigacion - 1, ' - ', rm.DESCRIPCION)         AS 'Eficiencia del mitigador',
            -- descripción riesgo
            rrx.DESCRIPCION                              AS 'Descripción del riesgo',    
            rrx.OBSERVACIONES                            AS 'Observaciones',
            rrx.VARIABLE_MITIGACION                      AS 'A mitigar',
            rrx.REF                                      AS 'Ref.',
            rrx.SEVERIDAD_NARRACION                      AS 'Severidad (narración)',
            rrx.PROBABILIDAD_AJUSTADA                    AS 'Probabilidad ajustada',
            rrx.SEVERIDAD_AJUSTADA                       AS 'Severidad ajustada',
            rrx.RIESGO_RESIDUAL                          AS 'Riesgo residual',
            rrx.RIESGO_INHERENTE                         AS 'Riesgo Inherente',
            rrx.EVENTO                                   AS 'Evento',
            rrx.CONTROL                                  AS 'Control interno para mitigar',
            rrx.MONITOREO                                AS 'Método de monitoreo',
            rf.DESCRIPCION                               AS 'Frecuencia',
            rrx.RESPONSABLE                              AS 'Responsable',
            sent.NOMBRE                                  AS 'Dirección',
            
            CASE 
                WHEN JSON_VALID(rrx.EXTRAS_ME) THEN JSON_EXTRACT(rrx.EXTRAS_ME, '$')
                ELSE JSON_OBJECT()
            END                                           AS 'EXTRAS_ME',

            rrx.ESTADO_ME                                AS 'ESTADO_ME',

            CASE 
                WHEN JSON_VALID(rrx.EXTRAS_MC) THEN JSON_EXTRACT(rrx.EXTRAS_MC, '$')
                ELSE JSON_OBJECT()
            END                                           AS 'EXTRAS_MC',

            rrx.ESTADO_MC                                AS 'ESTADO_MC',

            CASE 
                WHEN JSON_VALID(rrx.EXTRAS_MCE) THEN JSON_EXTRACT(rrx.EXTRAS_MCE, '$')
                ELSE JSON_OBJECT()
            END                                           AS 'EXTRAS_MCE',

            rrx.ESTADO_MCE                                AS 'ESTADO_MCE',
            rrx.MOSTRAR_GENERAL

        FROM gestion_riesgos.riesgos_riesgo_extendido rrx

        -- Área del riesgo
        LEFT JOIN gestion_riesgos.riesgos_area ra
            ON ra.CODIGO_CIA = rrx.CODIGO_CIA
        AND ra.CODIGO_AREA = rrx.CODIGO_AREA

        -- Período del riesgo
        LEFT JOIN gestion_riesgos.riesgos_periodo rp
            ON rp.CODIGO_CIA = rrx.CODIGO_CIA
        AND rp.CODIGO_PERIODO = rrx.CODIGO_PERIODO

        -- Tipo de objetivo del riesgo
        LEFT JOIN gestion_riesgos.riesgos_tipo_objetivo rto
            ON rto.CODIGO_CIA = rrx.CODIGO_CIA
        AND rto.CODIGO_TIPO_OBJETIVO = rrx.CODIGO_TIPO_OBJETIVO

        -- Objetivo del riesgo
        LEFT JOIN gestion_riesgos.riesgos_objetivo ro
            ON ro.CODIGO_CIA = rrx.CODIGO_CIA
        AND ro.CODIGO_TIPO_OBJETIVO = rrx.CODIGO_TIPO_OBJETIVO
        AND ro.CODIGO_OBJETIVO      = rrx.CODIGO_OBJETIVO

        -- Probabilidad del riesgo (si aplica por CIA, agrega: AND rprob.CODIGO_CIA = rrx.CODIGO_CIA)
        LEFT JOIN gestion_riesgos.riesgos_probabilidad rprob
            ON rprob.CODIGO_PROBABILIDAD = rrx.CODIGO_PROBABILIDAD

        -- Severidad del riesgo
        LEFT JOIN gestion_riesgos.riesgos_severidad rsev
            ON rsev.CODIGO_SEVERIDAD = rrx.CODIGO_SEVERIDAD

        -- Tolerancia del riesgo
        LEFT JOIN gestion_riesgos.riesgos_tolerancia rtol
            ON rtol.CODIGO_TOLERANCIA = rrx.CODIGO_TOLERANCIA

        -- Mitigación del riesgo
        LEFT JOIN gestion_riesgos.riesgos_mitigacion rm
            ON rm.CODIGO_MITIGACION = rrx.CODIGO_MITIGACION

        -- Frecuencia del riesgo
        LEFT JOIN gestion_riesgos.riesgos_frecuencia rf
            ON rf.CODIGO_CIA = rrx.CODIGO_CIA
        AND rf.CODIGO_FRECUENCIA = rrx.CODIGO_FRECUENCIA

        -- Dirección
        LEFT JOIN gestion_riesgos.seguridad_entidad sent
            ON sent.CODIGO_CIA = rrx.CODIGO_CIA
        AND sent.CODIGO_ENTIDAD = rrx.CODIGO_ENTIDAD

        WHERE 
            rrx.CODIGO_CIA = ?
            AND rrx.CODIGO_PERIODO = ?
            AND rrx.CODIGO_ENTIDAD = ?
            AND rrx.CODIGO_RIESGO = ?
    `;
        const params = [codigoCia, periodo, codigoEntidad, Number(codigo_riesgo)];
        const rows = await consultar(sql, params);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'No tiene riesgo relacionado del período anterior.' });
        }

        const r = rows[0];

        let extrasObj = {};
        if (r.EXTRAS != null) {
            if (typeof r.EXTRAS === 'string') {
                try {
                    const parsed = JSON.parse(r.EXTRAS);
                    extrasObj = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
                } catch {
                    extrasObj = {};
                }
            } else if (typeof r.EXTRAS === 'object') {
                extrasObj = Array.isArray(r.EXTRAS) ? {} : (r.EXTRAS ?? {});
            }
        }
        r.EXTRAS_JSON = extrasObj;
        r.PROP_EXTRA_JSON = extrasObj;
        return res.status(200).json({ riesgo: r });
    } catch (err) {
        console.error('obtenerRiesgoPorIdMe:', err);
        return res.status(500).json({ error: 'Error al obtener riesgo' });
    }
};

/**
 * actualizarRiesgoMe
 *
 * Función del controlador encargada de procesar la operación actualizarRiesgoMe.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.actualizarRiesgoMe = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = req.codigo_entidad;
    const usuario_modificacion = req.userId;

    if (!codigo_cia || !codigo_entidad || !usuario_modificacion) {
        return res.status(401).json({ error: 'Sesión inválida.' });
    }

    const {
        codigoPeriodo,
        codigoRiesgo,

        tipoObjetivoCodigo,
        objetivoCodigo,
        areaCodigo,
        probabilidad,
        severidad,
        toleranciaCodigo,
        frecuenciaCodigo,
        capacidadMitigacionCodigo,
        capacidadMitigacion,

        variableMitigacion,
        ref,
        descripcion,
        observaciones,
        severidadNarracion,
        evento,
        control,
        monitoreo,
        responsable,

        probabilidadAjustada,
        severidadAjustada,
        riesgoInherente,
        riesgoResidual,

        extras,

        tipo = 'ME',
        organoCodigo,
        viceministerioCodigo,
        esNuevo
    } = req.body || {};

    const pPeriodo = Number(codigoPeriodo);
    const pRiesgo = Number(codigoRiesgo);
    const pEsNuevo = normalizarEsNuevo(esNuevo);
    const pArea = Number(areaCodigo);
    const pObj = objetivoCodigo ?? null;
    const pProb = Number(probabilidad);
    const pSev = Number(severidad);
    const pTol = Number(toleranciaCodigo);
    const pFreq = Number(frecuenciaCodigo);

    let pMitCod = null;
    if (capacidadMitigacionCodigo != null && capacidadMitigacionCodigo !== '') {
        pMitCod = Number(capacidadMitigacionCodigo);
    } else if (capacidadMitigacion != null && capacidadMitigacion !== '') {
        pMitCod = Number(capacidadMitigacion) + 1;
    }

    const varMit = String(variableMitigacion || '').trim().toUpperCase();

    if (!Number.isFinite(pPeriodo) || !Number.isFinite(pRiesgo)) {
        return res.status(400).json({ error: 'Faltan identificadores (periodo y riesgo).' });
    }

    let extrasStr = null;
    if (typeof extras === 'string') {
        extrasStr = extras;
    } else if (extras && typeof extras === 'object') {
        try { extrasStr = JSON.stringify(extras); } catch { extrasStr = null; }
    }

    try {
        seccionRiesgo(tipo);
        if (req.body?.codigoEntidad != null && Number(req.body.codigoEntidad) !== Number(codigo_entidad)) {
            return res.status(403).json({ error: 'No puede editar el riesgo de otra dirección.' });
        }
        if (tipo === 'ME' && !(await accesoRiesgo(req, Number(codigo_entidad), tipo)).edicion) {
            return res.status(403).json({ error: 'No tiene permiso para editar el riesgo.' });
        }
        await transaccion(async tx => {
            const [actual] = await consultar(
                `SELECT ES_NUEVO, PERIODO_ANTERIOR, ESTADO_ME_SUPERIOR, ELIMINADO, CODIGO_EJE, CODIGO_DUENO, CODIGO_AREA
                 FROM gestion_riesgos.riesgos_riesgo_extendido
                 WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND CODIGO_RIESGO = ? FOR UPDATE`,
                [codigo_cia, Number(codigo_entidad), pPeriodo, pRiesgo], tx
            );
            if (!actual) throw new RespuestaHttp(404, { error: 'Riesgo no encontrado con los identificadores proporcionados.' });
            if (tipo === 'ME' && (actual.ELIMINADO || Number(actual.ESTADO_ME_SUPERIOR) === 1)) {
                throw new RespuestaHttp(403, { error: 'No se puede editar un riesgo aprobado o eliminado.' });
            }
            const marn = await camposMarn(req, pPeriodo, tipo, actual);
            await validarAreaRiesgo(req, pArea, actual.CODIGO_AREA);
            const mostrar = req.body?.mostrarGeneral;
            if (mostrar !== undefined && !['S', 'N'].includes(mostrar)) {
                throw new RespuestaHttp(400, { error: 'El valor para mostrar en reportes no es válido.' });
            }

            // Si cambia ES_NUEVO, el riesgo vuelve a revisión en los tres tipos (ME, MC, MCE);
            // si no, solo se reinicia el estado del tipo que se está editando.
            let cambiaEsNuevo = false;
            if (pEsNuevo !== null) {
                // Un riesgo que continúa de un año anterior no puede marcarse como identificado en el período
                if (pEsNuevo === 1 && actual.PERIODO_ANTERIOR != null) {
                    throw new RespuestaHttp(409, {
                        error: 'Este riesgo está relacionado con un riesgo del año anterior. Quite la relación en Continuidad antes de marcarlo como identificado en el período.'
                    });
                }
                cambiaEsNuevo = Number(actual.ES_NUEVO) !== pEsNuevo;
            }
            const reinicioEstados = (cambiaEsNuevo ? ['ME', 'MC', 'MCE'] : [tipo])
                .map(t => `ESTADO_${t} = 0, ESTADO_${t}_SUPERIOR = 0`)
                .join(', ');

            const sql = `
          UPDATE gestion_riesgos.riesgos_riesgo_extendido rr
          SET
            CODIGO_TIPO_OBJETIVO = ?, CODIGO_OBJETIVO      = ?, CODIGO_AREA          = ?, DESCRIPCION          = ?,
            CODIGO_PROBABILIDAD  = ?, CODIGO_SEVERIDAD     = ?, CODIGO_TOLERANCIA    = ?, CODIGO_MITIGACION    = ?,
            OBSERVACIONES        = ?, VARIABLE_MITIGACION  = ?, REF                  = ?, PROBABILIDAD_AJUSTADA= ?,
            SEVERIDAD_AJUSTADA   = ?, RIESGO_INHERENTE     = ?, RIESGO_RESIDUAL      = ?,
            EVENTO = IF(EXISTS (SELECT 1 FROM gestion_riesgos.riesgos_riesgo_evento ev
              WHERE ev.CODIGO_CIA = rr.CODIGO_CIA AND ev.CODIGO_ENTIDAD = rr.CODIGO_ENTIDAD
                AND ev.CODIGO_PERIODO = rr.CODIGO_PERIODO AND ev.CODIGO_RIESGO = rr.CODIGO_RIESGO), rr.EVENTO, ?),
            CONTROL              = ?, MONITOREO            = ?, CODIGO_FRECUENCIA    = ?, RESPONSABLE          = ?,
            SEVERIDAD_NARRACION  = ?, EXTRAS_${tipo}               = ?, USUARIO_MODIFICACION = ?, FECHA_MODIFICACION   = CURRENT_TIMESTAMP,
            ${reinicioEstados},       VICEMINISTERIO       = ?,         ORGANO = ?,
            ES_NUEVO             = COALESCE(?, ES_NUEVO), MOSTRAR_GENERAL = COALESCE(?, MOSTRAR_GENERAL),
            OBJETIVO_TEXTO = IF(?, ?, OBJETIVO_TEXTO), CODIGO_EJE = IF(?, ?, CODIGO_EJE),
            CODIGO_DUENO = COALESCE(?, CODIGO_DUENO)
          WHERE
            CODIGO_CIA     = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND CODIGO_RIESGO  = ?
          LIMIT 1
        `;
            const params = [
                tipoObjetivoCodigo || null, pObj || null, pArea || null, descripcion || null,
                pProb || null, pSev || null, pTol || null, pMitCod || null,
                observaciones || null, varMit, ref, Number.isFinite(Number(probabilidadAjustada)) ? Number(probabilidadAjustada) : null,

                Number.isFinite(Number(severidadAjustada)) ? Number(severidadAjustada) : null,
                Number.isFinite(Number(riesgoInherente)) ? Number(riesgoInherente) : null,
                Number.isFinite(Number(riesgoResidual)) ? Number(riesgoResidual) : null,
                evento || null,

                control || null, monitoreo || null, pFreq || null, responsable || null,
                severidadNarracion || null, extrasStr || null, usuario_modificacion,
                viceministerioCodigo || null, organoCodigo || null,
                pEsNuevo, mostrar ?? null,
                marn.objetivoTexto !== undefined, marn.objetivoTexto ?? null,
                marn.codigoEje !== undefined, marn.codigoEje ?? null, marn.codigoDueno ?? null,

                codigo_cia, Number(codigo_entidad), pPeriodo, pRiesgo
            ];

            const result = await ejecutar(sql, params, tx);

            if (result.affectedRows === 0) {
                throw new RespuestaHttp(404, { error: 'Riesgo no encontrado con los identificadores proporcionados.' });
            }
        });

        return res.status(200).json({
            message: 'Riesgo actualizado correctamente',
            data: {
                codigo_cia,
                codigo_entidad: Number(codigo_entidad),
                periodo: pPeriodo,
                codigo_riesgo: pRiesgo
            }
        });
    } catch (err) {
        if (enviarRespuestaHttp(err, res)) return;
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error('actualizarRiesgo:', err);
        return res.status(500).json({ error: 'Error al actualizar el riesgo' });
    }
};

/**
 * eliminarRiesgo
 *
 * Función del controlador encargada de procesar la operación eliminarRiesgo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /eliminar
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.eliminarRiesgo = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = req.codigo_entidad;
    const usuario_modificacion = req.userId;

    if (!codigo_cia || !codigo_entidad || !usuario_modificacion) {
        return res.status(401).json({ error: 'Sesión inválida.' });
    }

    const { periodo, codigo_riesgo, codigo_entidad: entidadSolicitada } = req.body || {};

    try {
        if ((entidadSolicitada != null && Number(entidadSolicitada) !== Number(codigo_entidad)) ||
            !(await permisosUsuario(req, [permisoEliminacionDirecta], { vigentes: true })).has(permisoEliminacionDirecta)) {
            return res.status(403).json({ error: 'No tiene permiso para eliminar este riesgo directamente.' });
        }
        const sql = `
        UPDATE gestion_riesgos.riesgos_riesgo_extendido
        SET
            ELIMINADO = 1,
            USUARIO_MODIFICACION = ?,
            FECHA_MODIFICACION = CURRENT_TIMESTAMP
        WHERE
            CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND CODIGO_RIESGO = ?
        LIMIT 1
        `;
        const params = [usuario_modificacion, codigo_cia, codigo_entidad, periodo, codigo_riesgo];

        const result = await ejecutar(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Riesgo no encontrado con los identificadores proporcionados.' });
        }

        return res.status(200).json({
            ok: true,
            msg: 'Riesgo eliminado correctamente.',
        });
    } catch (err) {
        console.error('eliminarRiesgo:', err);
        return res.status(500).json({ error: 'Error al eliminar el riesgo.' });
    }
};

/**
 * restablecerRiesgo
 *
 * Función del controlador encargada de procesar la operación restablecerRiesgo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /restablecer
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.restablecerRiesgo = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = req.codigo_entidad;
    const usuario_modificacion = req.userId;

    if (!codigo_cia || !codigo_entidad || !usuario_modificacion) {
        return res.status(401).json({ error: 'Sesión inválida.' });
    }

    const { periodo, codigo_riesgo } = req.body || {};

    try {
const sql = `
        UPDATE gestion_riesgos.riesgos_riesgo_extendido
        SET
            ELIMINADO = 0,
            USUARIO_MODIFICACION = ?,
            FECHA_MODIFICACION = CURRENT_TIMESTAMP
        WHERE
            CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND CODIGO_RIESGO = ?
        LIMIT 1
        `;
        const params = [usuario_modificacion, codigo_cia, codigo_entidad, periodo, codigo_riesgo];

        const result = await ejecutar(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Riesgo no encontrado con los identificadores proporcionados.' });
        }

        return res.status(200).json({
            ok: true,
            msg: 'Riesgo eliminado correctamente.',
        });
    } catch (err) {
        console.error('eliminarRiesgo:', err);
        return res.status(500).json({ error: 'Error al eliminar el riesgo.' });
    }
};
/**
 * obtenerRiesgosUnidadPeriodo
 *
 * Función del controlador encargada de procesar la operación obtenerRiesgosUnidadPeriodo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /unidad-periodo
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerRiesgosUnidadPeriodo = async (req, res) => {
    const cia = Number(req.codigo_cia ?? req.user?.CODIGO_CIA);
    const { periodo, codigo_entidad, tipo } = req.query;

    if (!Number.isFinite(cia) || !periodo || !codigo_entidad) {
        return res.status(400).json({ ok: false, msg: 'Faltan parámetros: periodo y codigo_entidad.' });
    }

    const entidad = Number(codigo_entidad);
    const periodoNum = Number(periodo);

    try {
        const sqlPropiedades = `
        SELECT PROPIEDADES_${tipo} AS PROPIEDADES
        FROM gestion_riesgos.riesgos_reportes_propiedades
        WHERE codigo_cia = ? AND defecto = 'S' AND codigo_periodo = ?
        `;
        const propRows = await consultar(sqlPropiedades, [req.codigo_cia, periodoNum]);
        let propiedades = propRows.flatMap(r => {
            try {
                const arr = typeof r.PROPIEDADES === 'string'
                    ? JSON.parse(r.PROPIEDADES)
                    : r.PROPIEDADES;
                return Array.isArray(arr) ? arr : [];
            } catch {
                return [];
            }
        });
        propiedades = propiedades.map((prop) => { return ({ "key": prop.key, "label": prop.label, "source": prop.source }) })



        let sql = `
        SELECT
            rrx.CODIGO_ENTIDAD,
            rrx.CODIGO_RIESGO, 
            -- tipo objetivos
            rto.DESCRIPCION                              AS 'Tipo de objetivo',
            -- objetivo
            ro.DESCRIPCION                               AS 'Objetivo',
            -- área
            ra.DESCRIPCION                               AS 'Área evaluada',
            -- probabilidad
            concat(rprob.codigo_probabilidad, ' - ', rprob.DESCRIPCION) AS 'Probabilidad',
            -- severidad
            concat(rsev.codigo_severidad, ' - ', rsev.DESCRIPCION)      AS 'Severidad',
            -- tolerancia
            rtol.DESCRIPCION                             AS 'Tolerancia',
            -- mitigacion
            concat(rm.codigo_mitigacion - 1, ' - ', rm.DESCRIPCION)         AS 'Eficiencia del mitigador',
            -- descripción riesgo
            rrx.DESCRIPCION                              AS 'Descripción del riesgo',    
            rrx.OBSERVACIONES                            AS 'Observaciones',
            rrx.VARIABLE_MITIGACION                      AS 'A mitigar',
            rrx.REF                                      AS 'Ref.',
            rrx.SEVERIDAD_NARRACION                      AS 'Severidad (narración)',
            rrx.PROBABILIDAD_AJUSTADA                    AS 'Probabilidad ajustada',
            rrx.SEVERIDAD_AJUSTADA                       AS 'Severidad ajustada',
            rrx.RIESGO_RESIDUAL                          AS 'Riesgo residual',
            rrx.RIESGO_INHERENTE                         AS 'Riesgo Inherente',
            rrx.EVENTO                                   AS 'Evento',
            rrx.CONTROL                                  AS 'Control interno para mitigar',
            rrx.MONITOREO                                AS 'Método de monitoreo',
            rf.DESCRIPCION                               AS 'Frecuencia',
            rrx.RESPONSABLE                              AS 'Responsable',
            rrx.COMENTARIO_SUPERVISOR_${tipo}            AS 'Comentario supervisor',
            rrx.COMENTARIO_SUPERIOR_${tipo}              AS 'Comentario superior',
            CASE 
                WHEN JSON_VALID(rrx.EXTRAS_${tipo}) THEN JSON_EXTRACT(rrx.EXTRAS_${tipo}, '$')
                ELSE JSON_OBJECT('EXTRAS_${tipo}', JSON_ARRAY())
            END AS EXTRAS,
            rrx.ESTADO_${tipo} AS ESTADO_SUPERVISOR,
            rrx.ESTADO_${tipo}_SUPERIOR AS ESTADO_SUPERIOR,
            rrx.ES_NUEVO
        FROM gestion_riesgos.riesgos_riesgo_extendido rrx
        -- Área del riesgo
        LEFT JOIN gestion_riesgos.riesgos_area ra
            ON ra.CODIGO_CIA = rrx.CODIGO_CIA AND ra.CODIGO_AREA = rrx.CODIGO_AREA
        -- Dirección del riesgo
        LEFT JOIN gestion_riesgos.seguridad_entidad se
            ON se.CODIGO_CIA = rrx.CODIGO_CIA AND se.CODIGO_ENTIDAD = rrx.CODIGO_ENTIDAD
        -- Período del riesgo
        LEFT JOIN gestion_riesgos.riesgos_periodo rp
            ON rp.CODIGO_CIA = rrx.CODIGO_CIA AND rp.CODIGO_PERIODO = rrx.CODIGO_PERIODO
        -- Tipo de objetivo del riesgo
        LEFT JOIN gestion_riesgos.riesgos_tipo_objetivo rto
            ON rto.CODIGO_CIA = rrx.CODIGO_CIA AND rto.CODIGO_TIPO_OBJETIVO = rrx.CODIGO_TIPO_OBJETIVO
        -- Objetivo del riesgo
        LEFT JOIN gestion_riesgos.riesgos_objetivo ro
            ON ro.CODIGO_CIA = rrx.CODIGO_CIA
            AND ro.CODIGO_TIPO_OBJETIVO = rrx.CODIGO_TIPO_OBJETIVO
            AND ro.CODIGO_OBJETIVO      = rrx.CODIGO_OBJETIVO
        -- Probabilidad del riesgo
        LEFT JOIN gestion_riesgos.riesgos_probabilidad rprob
            ON rprob.CODIGO_PROBABILIDAD = rrx.CODIGO_PROBABILIDAD
        -- Severidad del riesgo
        LEFT JOIN gestion_riesgos.riesgos_severidad rsev
            ON rsev.CODIGO_SEVERIDAD = rrx.CODIGO_SEVERIDAD
        -- Tolerancia del riesgo
        LEFT JOIN gestion_riesgos.riesgos_tolerancia rtol
            ON rtol.CODIGO_TOLERANCIA = rrx.CODIGO_TOLERANCIA
        -- Mitigación del riesgo
        LEFT JOIN gestion_riesgos.riesgos_mitigacion rm
            ON rm.CODIGO_MITIGACION = rrx.CODIGO_MITIGACION
        -- Frecuencia del riesgo
        LEFT JOIN gestion_riesgos.riesgos_frecuencia rf
            ON rf.CODIGO_CIA = rrx.CODIGO_CIA AND rf.CODIGO_FRECUENCIA = rrx.CODIGO_FRECUENCIA
        WHERE rrx.CODIGO_CIA = ?
            AND rrx.CODIGO_ENTIDAD = ?
            AND rrx.CODIGO_PERIODO = ?
            AND rrx.eliminado != 1
        ORDER BY rrx.ESTADO_${tipo} ASC, rrx.REF ASC
    `;
        const params = [cia, entidad, periodoNum];
        const rows = await consultar(sql, params);
        const anios = await obtenerAniosOrigen(cia, entidad, periodoNum);

        return res.status(200).json({ riesgos: agregarAnioOrigen(rows, anios, periodoNum), propiedades });
    } catch (err) {
        console.error('❌ obtenerRiesgosUnidadPeriodo:', err);
        return res.status(500).json({ ok: false, msg: 'Error interno al obtener riesgos por unidad/período.' });
    }
};

/**
 * obtenerRiesgosUnidadPeriodoSuperior
 *
 * Función del controlador encargada de procesar la operación obtenerRiesgosUnidadPeriodo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /unidad-periodo-superior
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerRiesgosUnidadPeriodoSuperior = async (req, res) => {
    const cia = Number(req.codigo_cia ?? req.user?.CODIGO_CIA);
    const { periodo, codigo_entidad = req.codigo_entidad, tipo } = req.query;

    if (!Number.isFinite(cia) || !periodo || !codigo_entidad) {
        return res.status(400).json({ ok: false, msg: 'Faltan parámetros: periodo y codigo_entidad.' });
    }

    const entidad = Number(codigo_entidad);
    const periodoNum = Number(periodo);

    try {
        const sqlPropiedades = `
        SELECT PROPIEDADES_${tipo} AS PROPIEDADES
        FROM gestion_riesgos.riesgos_reportes_propiedades
        WHERE codigo_cia = ? AND defecto = 'S' AND codigo_periodo = ?
        `;
        const propRows = await consultar(sqlPropiedades, [req.codigo_cia, periodoNum]);
        let propiedades = propRows.flatMap(r => {
            try {
                const arr = typeof r.PROPIEDADES === 'string'
                    ? JSON.parse(r.PROPIEDADES)
                    : r.PROPIEDADES;
                return Array.isArray(arr) ? arr : [];
            } catch {
                return [];
            }
        });
        propiedades = propiedades.map((prop) => { return ({ "key": prop.key, "label": prop.label, "source": prop.source }) })



        let sql = `
        SELECT
            rrx.CODIGO_ENTIDAD,
            rrx.CODIGO_RIESGO, 
            -- tipo objetivos
            rto.DESCRIPCION                              AS 'Tipo de objetivo',
            -- objetivo
            ro.DESCRIPCION                               AS 'Objetivo',
            -- área
            ra.DESCRIPCION                               AS 'Área evaluada',
            -- probabilidad
            concat(rprob.codigo_probabilidad, ' - ', rprob.DESCRIPCION) AS 'Probabilidad',
            -- severidad
            concat(rsev.codigo_severidad, ' - ', rsev.DESCRIPCION)      AS 'Severidad',
            -- tolerancia
            rtol.DESCRIPCION                             AS 'Tolerancia',
            -- mitigacion
            concat(rm.codigo_mitigacion - 1, ' - ', rm.DESCRIPCION)         AS 'Eficiencia del mitigador',
            -- descripción riesgo
            rrx.DESCRIPCION                              AS 'Descripción del riesgo',    
            rrx.OBSERVACIONES                            AS 'Observaciones',
            rrx.VARIABLE_MITIGACION                      AS 'A mitigar',
            rrx.REF                                      AS 'Ref.',
            rrx.SEVERIDAD_NARRACION                      AS 'Severidad (narración)',
            rrx.PROBABILIDAD_AJUSTADA                    AS 'Probabilidad ajustada',
            rrx.SEVERIDAD_AJUSTADA                       AS 'Severidad ajustada',
            rrx.RIESGO_RESIDUAL                          AS 'Riesgo residual',
            rrx.RIESGO_INHERENTE                         AS 'Riesgo Inherente',
            rrx.EVENTO                                   AS 'Evento',
            rrx.CONTROL                                  AS 'Control interno para mitigar',
            rrx.MONITOREO                                AS 'Método de monitoreo',
            rf.DESCRIPCION                               AS 'Frecuencia',
            rrx.RESPONSABLE                              AS 'Responsable',
            CASE 
                WHEN JSON_VALID(rrx.EXTRAS_${tipo}) THEN JSON_EXTRACT(rrx.EXTRAS_${tipo}, '$')
                ELSE JSON_OBJECT('EXTRAS_${tipo}', JSON_ARRAY())
            END AS EXTRAS,
            rrx.ESTADO_${tipo} AS ESTADO_SUPERVISOR,
            rrx.ESTADO_${tipo}_SUPERIOR AS ESTADO_SUPERIOR,
            rrx.COMENTARIO_SUPERVISOR_${tipo}            AS 'Comentario supervisor',
            rrx.COMENTARIO_SUPERIOR_${tipo}              AS 'Comentario superior',
            rrx.ES_NUEVO
        FROM gestion_riesgos.riesgos_riesgo_extendido rrx
        -- Área del riesgo
        LEFT JOIN gestion_riesgos.riesgos_area ra
            ON ra.CODIGO_CIA = rrx.CODIGO_CIA AND ra.CODIGO_AREA = rrx.CODIGO_AREA
        -- Dirección del riesgo
        LEFT JOIN gestion_riesgos.seguridad_entidad se
            ON se.CODIGO_CIA = rrx.CODIGO_CIA AND se.CODIGO_ENTIDAD = rrx.CODIGO_ENTIDAD
        -- Período del riesgo
        LEFT JOIN gestion_riesgos.riesgos_periodo rp
            ON rp.CODIGO_CIA = rrx.CODIGO_CIA AND rp.CODIGO_PERIODO = rrx.CODIGO_PERIODO
        -- Tipo de objetivo del riesgo
        LEFT JOIN gestion_riesgos.riesgos_tipo_objetivo rto
            ON rto.CODIGO_CIA = rrx.CODIGO_CIA AND rto.CODIGO_TIPO_OBJETIVO = rrx.CODIGO_TIPO_OBJETIVO
        -- Objetivo del riesgo
        LEFT JOIN gestion_riesgos.riesgos_objetivo ro
            ON ro.CODIGO_CIA = rrx.CODIGO_CIA
            AND ro.CODIGO_TIPO_OBJETIVO = rrx.CODIGO_TIPO_OBJETIVO
            AND ro.CODIGO_OBJETIVO      = rrx.CODIGO_OBJETIVO
        -- Probabilidad del riesgo
        LEFT JOIN gestion_riesgos.riesgos_probabilidad rprob
            ON rprob.CODIGO_PROBABILIDAD = rrx.CODIGO_PROBABILIDAD
        -- Severidad del riesgo
        LEFT JOIN gestion_riesgos.riesgos_severidad rsev
            ON rsev.CODIGO_SEVERIDAD = rrx.CODIGO_SEVERIDAD
        -- Tolerancia del riesgo
        LEFT JOIN gestion_riesgos.riesgos_tolerancia rtol
            ON rtol.CODIGO_TOLERANCIA = rrx.CODIGO_TOLERANCIA
        -- Mitigación del riesgo
        LEFT JOIN gestion_riesgos.riesgos_mitigacion rm
            ON rm.CODIGO_MITIGACION = rrx.CODIGO_MITIGACION
        -- Frecuencia del riesgo
        LEFT JOIN gestion_riesgos.riesgos_frecuencia rf
            ON rf.CODIGO_CIA = rrx.CODIGO_CIA AND rf.CODIGO_FRECUENCIA = rrx.CODIGO_FRECUENCIA
        WHERE rrx.CODIGO_CIA = ?
            AND rrx.CODIGO_ENTIDAD = ?
            AND rrx.CODIGO_PERIODO = ?
            AND rrx.eliminado != 1
        ORDER BY rrx.ESTADO_${tipo}_SUPERIOR ASC, rrx.REF ASC
    `;
        const params = [cia, entidad, periodoNum];
        const rows = await consultar(sql, params);
        const anios = await obtenerAniosOrigen(cia, entidad, periodoNum);

        return res.status(200).json({ riesgos: agregarAnioOrigen(rows, anios, periodoNum), propiedades });
    } catch (err) {
        console.error('❌ obtenerRiesgosUnidadPeriodo:', err);
        return res.status(500).json({ ok: false, msg: 'Error interno al obtener riesgos por unidad/período.' });
    }
};

/**
 * comentarRiesgo
 *
 * Función del controlador encargada de procesar la operación comentarRiesgo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /revision
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.comentarRiesgo = async (req, res) => {

    const { codigo_entidad, codigo_riesgo, comentario, estado, periodo, tipo } = req.body
    const cia = req.codigo_cia;
    const supervisor = req.userId;

    if (!cia) {
        return res.status(401).json({ ok: false, msg: 'Sesión inválida.' });
    }
    if (!periodo || !codigo_riesgo || !codigo_entidad || !estado) {
        return res.status(400).json({
            ok: false,
            msg: 'Faltan datos: codigo_entidad, codigo_riesgo, estado y periodo son obligatorios.'
        });
    }

    const comentarioClean = String(comentario).trim().slice(0, 499);

    try {
        const sql = `
        UPDATE gestion_riesgos.riesgos_riesgo_extendido
        SET 
            COMENTARIO_SUPERVISOR_${tipo}   = ?,
            SUPERVISOR_MODIFICACION_${tipo} = ?,
            ESTADO_${tipo} = ?,
            FECHA_SUPERVISOR_${tipo} = CURRENT_TIMESTAMP
        WHERE 
            CODIGO_CIA = ?
            AND CODIGO_ENTIDAD = ?
            AND CODIGO_PERIODO = ?
            AND CODIGO_RIESGO  = ?
        `;

        const r = await ejecutar(sql, [comentarioClean ? comentarioClean : null, supervisor, estado, cia, codigo_entidad, periodo, codigo_riesgo]);

        if (r.affectedRows === 0) {
            return res.status(404).json({ ok: false, msg: 'No se encontró el riesgo especificado.' });
        }

        return res.status(200).json({ ok: true, msg: '✅ Comentario de supervisor actualizado.' });
    } catch (err) {
        console.error('❌ comentarRiesgo:', err);
        return res.status(500).json({ ok: false, msg: 'Error interno al registrar el comentario.' });
    }
};

/**
 * comentarRiesgoSuperior
 *
 * Función del controlador encargada de procesar la operación comentarRiesgo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /revision-superior
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.comentarRiesgoSuperior = async (req, res) => {

    const { codigo_entidad = req.codigo_entidad, codigo_riesgo, comentario, estado, periodo, tipo } = req.body
    const cia = req.codigo_cia;
    const supervisor = req.userId;

    if (!cia) {
        return res.status(401).json({ ok: false, msg: 'Sesión inválida.' });
    }
    if (!periodo || !codigo_riesgo || !codigo_entidad || !estado) {
        return res.status(400).json({
            ok: false,
            msg: 'Faltan datos: codigo_entidad, codigo_riesgo, estado y periodo son obligatorios.'
        });
    }

    const comentarioClean = String(comentario).trim().slice(0, 499);

    try {
        const sql = `
        UPDATE gestion_riesgos.riesgos_riesgo_extendido
        SET 
            COMENTARIO_SUPERIOR_${tipo}   = ?,
            SUPERIOR_MODIFICACION_${tipo} = ?,
            ESTADO_${tipo}_SUPERIOR = ?,
            FECHA_SUPERIOR_${tipo} = CURRENT_TIMESTAMP
        WHERE 
            CODIGO_CIA = ?
            AND CODIGO_ENTIDAD = ?
            AND CODIGO_PERIODO = ?
            AND CODIGO_RIESGO  = ?
        `;

        const r = await ejecutar(sql, [comentarioClean ? comentarioClean : null, supervisor, estado, cia, codigo_entidad, periodo, codigo_riesgo]);

        if (r.affectedRows === 0) {
            return res.status(404).json({ ok: false, msg: 'No se encontró el riesgo especificado.' });
        }

        return res.status(200).json({ ok: true, msg: '✅ Comentario de superior actualizado.' });
    } catch (err) {
        console.error('❌ comentarRiesgo:', err);
        return res.status(500).json({ ok: false, msg: 'Error interno al registrar el comentario.' });
    }
};

/**
 * obtenerDetalleRiesgos
 *
 * Función del controlador encargada de procesar la operación obtenerDetalleRiesgos.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /obtener-lista-riesgos-detalle
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerDetalleRiesgos = async (req, res, next) => {
    const codigo_cia = req.codigo_cia
    const { periodo } = req.query
    // Seguimiento no incluye riesgos nuevos; Continuidad/Relacionar envían incluir_nuevos=1 para poder arrastrarlos
    const incluirNuevos = normalizarEsNuevo(req.query.incluir_nuevos) === 1
    let sql = `
    SELECT
        rrx.CODIGO_ENTIDAD,
        rrx.CODIGO_RIESGO, 
        -- tipo objetivos
        rto.DESCRIPCION                              AS 'Tipo de objetivo',
        -- objetivo
        ro.DESCRIPCION                               AS 'Objetivo',
        -- área
        ra.DESCRIPCION                               AS 'Área evaluada',
        -- probabilidad
        concat(rprob.codigo_probabilidad, ' - ', rprob.DESCRIPCION) AS 'Probabilidad',
        -- severidad
        concat(rsev.codigo_severidad, ' - ', rsev.DESCRIPCION)      AS 'Severidad',
        -- riesgo inherente
        rrx.RIESGO_INHERENTE                         AS 'Riesgo Inherente',
        -- mitigacion
        concat(rm.codigo_mitigacion - 1, ' - ', rm.DESCRIPCION)         AS 'Eficiencia del mitigador',
        rrx.VARIABLE_MITIGACION                      AS 'A mitigar',
        rrx.PROBABILIDAD_AJUSTADA                    AS 'Probabilidad ajustada',
        rrx.SEVERIDAD_AJUSTADA                       AS 'Severidad ajustada',
        rrx.RIESGO_RESIDUAL                          AS 'Riesgo residual',
        rrx.OBSERVACIONES                            AS 'Observaciones',
        rrx.EVENTO                                   AS 'Evento',
        -- tolerancia
        rtol.DESCRIPCION                             AS 'Tolerancia',
        -- descripción riesgo
        rrx.DESCRIPCION                              AS 'Descripción del riesgo',    
        rrx.REF                                      AS 'Ref.',
        rrx.SEVERIDAD_NARRACION                      AS 'Severidad (narración)',
        rrx.CONTROL                                  AS 'Control interno para mitigar',
        rrx.MONITOREO                                AS 'Método de monitoreo',
        rf.DESCRIPCION                               AS 'Frecuencia',
        rrx.RESPONSABLE                              AS 'Responsable',
        rrx.codigo_periodo                           AS 'Periodo',
        PERIODO_ANTERIOR                             AS 'Riesgo año pasado',
        rrx.ES_NUEVO,
        CASE
            WHEN JSON_VALID(rrx.EXTRAS_ME) THEN JSON_EXTRACT(rrx.EXTRAS_ME, '$')
            ELSE JSON_OBJECT('EXTRAS_ME', JSON_ARRAY())
        END AS EXTRAS_ME,
        CASE 
            WHEN JSON_VALID(rrx.EXTRAS_MCE) THEN JSON_EXTRACT(rrx.EXTRAS_MCE, '$')
            ELSE JSON_OBJECT('EXTRAS_MCE', JSON_ARRAY())
        END AS EXTRAS_MCE,
        CASE 
            WHEN JSON_VALID(rrx.EXTRAS_MC) THEN JSON_EXTRACT(rrx.EXTRAS_MC, '$')
            ELSE JSON_OBJECT('EXTRAS_MC', JSON_ARRAY())
        END AS EXTRAS_MC
    FROM gestion_riesgos.riesgos_riesgo_extendido rrx
    -- Área del riesgo
    LEFT JOIN gestion_riesgos.riesgos_area ra
        ON ra.CODIGO_CIA = rrx.CODIGO_CIA AND ra.CODIGO_AREA = rrx.CODIGO_AREA
    -- Dirección del riesgo
    LEFT JOIN gestion_riesgos.seguridad_entidad se
        ON se.CODIGO_CIA = rrx.CODIGO_CIA AND se.CODIGO_ENTIDAD = rrx.CODIGO_ENTIDAD
    -- Período del riesgo
    LEFT JOIN gestion_riesgos.riesgos_periodo rp
        ON rp.CODIGO_CIA = rrx.CODIGO_CIA AND rp.CODIGO_PERIODO = rrx.CODIGO_PERIODO
    -- Tipo de objetivo del riesgo
    LEFT JOIN gestion_riesgos.riesgos_tipo_objetivo rto
        ON rto.CODIGO_CIA = rrx.CODIGO_CIA AND rto.CODIGO_TIPO_OBJETIVO = rrx.CODIGO_TIPO_OBJETIVO
    -- Objetivo del riesgo
    LEFT JOIN gestion_riesgos.riesgos_objetivo ro
        ON ro.CODIGO_CIA = rrx.CODIGO_CIA
        AND ro.CODIGO_TIPO_OBJETIVO = rrx.CODIGO_TIPO_OBJETIVO
        AND ro.CODIGO_OBJETIVO      = rrx.CODIGO_OBJETIVO
    -- Probabilidad del riesgo
    LEFT JOIN gestion_riesgos.riesgos_probabilidad rprob
        ON rprob.CODIGO_PROBABILIDAD = rrx.CODIGO_PROBABILIDAD
    -- Severidad del riesgo
    LEFT JOIN gestion_riesgos.riesgos_severidad rsev
        ON rsev.CODIGO_SEVERIDAD = rrx.CODIGO_SEVERIDAD
    -- Tolerancia del riesgo
    LEFT JOIN gestion_riesgos.riesgos_tolerancia rtol
        ON rtol.CODIGO_TOLERANCIA = rrx.CODIGO_TOLERANCIA
    -- Mitigación del riesgo
    LEFT JOIN gestion_riesgos.riesgos_mitigacion rm
        ON rm.CODIGO_MITIGACION = rrx.CODIGO_MITIGACION
    -- Frecuencia del riesgo
    LEFT JOIN gestion_riesgos.riesgos_frecuencia rf
        ON rf.CODIGO_CIA = rrx.CODIGO_CIA AND rf.CODIGO_FRECUENCIA = rrx.CODIGO_FRECUENCIA
    -- Unidad
    LEFT JOIN gestion_riesgos.seguridad_entidad sent
        ON rrx.codigo_entidad = sent.codigo_entidad AND rrx.codigo_cia = sent.codigo_cia
    WHERE rrx.CODIGO_CIA = ?
        AND rrx.CODIGO_PERIODO = ?
        AND rrx.codigo_entidad = ?
        AND eliminado != 1
        ${incluirNuevos ? '' : 'AND COALESCE(rrx.ES_NUEVO, 0) = 0'}
    ORDER BY rrx.REF ASC`
    let parametros = [codigo_cia, Number(periodo), req.codigo_entidad]
    const rows = await conIdiomaEspanol(tx => consultar(sql, parametros, tx));
    const anios = await obtenerAniosOrigen(codigo_cia, req.codigo_entidad, Number(periodo));
    res.json({ valores: agregarAnioOrigen(rows, anios, periodo) })
}

/**
 * obtenerRiesgosPeriodo
 *
 * Función del controlador encargada de procesar la operación obtenerRiesgosPeriodo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /obtener-riesgos-periodo
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerRiesgosPeriodo = async (req, res) => {
    const cia = Number(req.codigo_cia);
    const { periodo } = req.query;

    try {
        let sql = `
        SELECT
            rrx.CODIGO_ENTIDAD,
            rrx.CODIGO_RIESGO, 
            -- tipo objetivos
            rto.DESCRIPCION                              AS 'Tipo de objetivo',
            -- objetivo
            ro.DESCRIPCION                               AS 'Objetivo',
            -- área
            ra.DESCRIPCION                               AS 'Área evaluada',
            -- probabilidad
            CONCAT(rprob.CODIGO_PROBABILIDAD, ' - ', rprob.DESCRIPCION) AS 'Probabilidad',
            -- severidad
            CONCAT(rsev.CODIGO_SEVERIDAD, ' - ', rsev.DESCRIPCION)      AS 'Severidad',
            -- tolerancia
            rtol.DESCRIPCION                             AS 'Tolerancia',
            -- mitigacion
            concat(rm.codigo_mitigacion - 1, ' - ', rm.DESCRIPCION)         AS 'Eficiencia del mitigador',
            -- descripción riesgo
            rrx.DESCRIPCION                              AS 'Descripción del riesgo',    
            rrx.OBSERVACIONES                            AS 'Observaciones',
            rrx.VARIABLE_MITIGACION                      AS 'A mitigar',
            rrx.REF                                      AS 'Ref.',
            rrx.SEVERIDAD_NARRACION                      AS 'Severidad (narración)',
            rrx.PROBABILIDAD_AJUSTADA                    AS 'Probabilidad ajustada',
            rrx.SEVERIDAD_AJUSTADA                       AS 'Severidad ajustada',
            rrx.RIESGO_RESIDUAL                          AS 'Riesgo residual',
            rrx.RIESGO_INHERENTE                         AS 'Riesgo Inherente',
            rrx.EVENTO                                   AS 'Evento',
            rrx.CONTROL                                  AS 'Control interno para mitigar',
            rrx.MONITOREO                                AS 'Método de monitoreo',
            rf.DESCRIPCION                               AS 'Frecuencia',
            rrx.RESPONSABLE                              AS 'Responsable',
            sent.NOMBRE                                  AS 'Dirección',
            
            CASE 
                WHEN JSON_VALID(rrx.EXTRAS_ME) THEN JSON_EXTRACT(rrx.EXTRAS_ME, '$')
                ELSE JSON_OBJECT()
            END                                           AS 'EXTRAS_ME',

            rrx.ESTADO_ME                                AS 'ESTADO_ME',

            CASE 
                WHEN JSON_VALID(rrx.EXTRAS_MC) THEN JSON_EXTRACT(rrx.EXTRAS_MC, '$')
                ELSE JSON_OBJECT()
            END                                           AS 'EXTRAS_MC',

            rrx.ESTADO_MC                                AS 'ESTADO_MC',

            CASE 
                WHEN JSON_VALID(rrx.EXTRAS_MCE) THEN JSON_EXTRACT(rrx.EXTRAS_MCE, '$')
                ELSE JSON_OBJECT()
            END                                           AS 'EXTRAS_MCE',

            rrx.ESTADO_MCE                                AS 'ESTADO_MCE',
            rrx.MOSTRAR_GENERAL,
            rrx.ES_NUEVO

        FROM gestion_riesgos.riesgos_riesgo_extendido rrx

        -- Área del riesgo
        LEFT JOIN gestion_riesgos.riesgos_area ra
            ON ra.CODIGO_CIA = rrx.CODIGO_CIA
        AND ra.CODIGO_AREA = rrx.CODIGO_AREA

        -- Período del riesgo
        LEFT JOIN gestion_riesgos.riesgos_periodo rp
            ON rp.CODIGO_CIA = rrx.CODIGO_CIA
        AND rp.CODIGO_PERIODO = rrx.CODIGO_PERIODO

        -- Tipo de objetivo del riesgo
        LEFT JOIN gestion_riesgos.riesgos_tipo_objetivo rto
            ON rto.CODIGO_CIA = rrx.CODIGO_CIA
        AND rto.CODIGO_TIPO_OBJETIVO = rrx.CODIGO_TIPO_OBJETIVO

        -- Objetivo del riesgo
        LEFT JOIN gestion_riesgos.riesgos_objetivo ro
            ON ro.CODIGO_CIA = rrx.CODIGO_CIA
        AND ro.CODIGO_TIPO_OBJETIVO = rrx.CODIGO_TIPO_OBJETIVO
        AND ro.CODIGO_OBJETIVO      = rrx.CODIGO_OBJETIVO

        -- Probabilidad del riesgo (si aplica por CIA, agrega: AND rprob.CODIGO_CIA = rrx.CODIGO_CIA)
        LEFT JOIN gestion_riesgos.riesgos_probabilidad rprob
            ON rprob.CODIGO_PROBABILIDAD = rrx.CODIGO_PROBABILIDAD

        -- Severidad del riesgo
        LEFT JOIN gestion_riesgos.riesgos_severidad rsev
            ON rsev.CODIGO_SEVERIDAD = rrx.CODIGO_SEVERIDAD

        -- Tolerancia del riesgo
        LEFT JOIN gestion_riesgos.riesgos_tolerancia rtol
            ON rtol.CODIGO_TOLERANCIA = rrx.CODIGO_TOLERANCIA

        -- Mitigación del riesgo
        LEFT JOIN gestion_riesgos.riesgos_mitigacion rm
            ON rm.CODIGO_MITIGACION = rrx.CODIGO_MITIGACION

        -- Frecuencia del riesgo
        LEFT JOIN gestion_riesgos.riesgos_frecuencia rf
            ON rf.CODIGO_CIA = rrx.CODIGO_CIA
        AND rf.CODIGO_FRECUENCIA = rrx.CODIGO_FRECUENCIA

        -- Dirección
        LEFT JOIN gestion_riesgos.seguridad_entidad sent
            ON sent.CODIGO_CIA = rrx.CODIGO_CIA
        AND sent.CODIGO_ENTIDAD = rrx.CODIGO_ENTIDAD

        WHERE 
            rrx.CODIGO_CIA = ?
            AND rrx.CODIGO_PERIODO = ?
            AND rrx.eliminado != 1
        ORDER BY
            rrx.CODIGO_ENTIDAD ASC,
            rrx.REF ASC;
            `;
        const params = [cia, periodo];
        const rows = await consultar(sql, params);
        return res.status(200).json({ rows });
    } catch (err) {
        console.error('❌ obtenerRiesgosUnidadPeriodo:', err);
        return res.status(500).json({ ok: false, msg: 'Error interno al obtener riesgos por unidad/período.' });
    }
};

/**
 * actualizarMostrarGeneral
 *
 * Función del controlador encargada de procesar la operación actualizarMostrarGeneral.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /mostrar-general
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.actualizarMostrarGeneral = async (req, res) => {
    const cia = req.codigo_cia;
    const usuario = req.userId;

    const { codigo_periodo, codigo_riesgo, codigo_entidad, mostrar_general } = req.body || {};

    if (!cia || !codigo_periodo || !codigo_riesgo || !codigo_entidad) {
        return res.status(400).json({
            ok: false,
            msg: "❌ Faltan parámetros obligatorios (cia, periodo, riesgo, entidad)."
        });
    }

    try {
        const sql = `
        UPDATE gestion_riesgos.riesgos_riesgo_extendido
        SET 
            MOSTRAR_GENERAL         = ?,
            USUARIO_MODIFICACION    = ?,
            FECHA_MODIFICACION      = CURRENT_TIMESTAMP
        WHERE 
            CODIGO_CIA              = ?
            AND CODIGO_PERIODO      = ?
            AND CODIGO_RIESGO       = ?
            AND CODIGO_ENTIDAD      = ?
        LIMIT 1
        `;

        const r = await ejecutar(sql, [mostrar_general, usuario, cia, codigo_periodo, codigo_riesgo, codigo_entidad]);

        if (r.affectedRows === 0) {
            return res.status(404).json({ ok: false, msg: "No se encontró el riesgo a actualizar." });
        }

        return res.status(200).json({ ok: true, msg: "✅ mostrar_general actualizado correctamente." });
    } catch (err) {
        console.error("❌ actualizarMostrarGeneral:", err);
        return res.status(500).json({ ok: false, msg: "Error interno al actualizar mostrar_general.", error: err.message });
    }
};
