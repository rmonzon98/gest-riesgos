/**
 * @fileoverview
 * Controlador de variables de riesgo para la aplicación de Gestión de Riesgos.
 *
 * @module controller/riesgos/riesgosVariables
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');
const { param } = require('../../Routes/riesgos/riesgosVariables');

// INFORMACIÓN GENERAL
async function obtenerPeriodosEs(codigo_cia) {
    const conn = await pool.getConnection();
    try {
        await conn.query("SET SESSION lc_time_names = 'es_ES'");
        const [rows] = await conn.execute(
            `SELECT
         CODIGO_PERIODO,
         DATE_FORMAT(PERIODO_INICIAL, '%d-%M') AS FECINI,
         DATE_FORMAT(PERIODO_FINAL,   '%d-%M') AS FECFIN
       FROM gestion_riesgos.riesgos_periodo
       WHERE CODIGO_CIA = ?
       ORDER BY CODIGO_PERIODO ASC`,
            [codigo_cia]
        );
        return rows;
    } finally {
        conn.release();
    }
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
            pool.execute(
                `
                SELECT CODIGO_AREA AS ID, DESCRIPCION AS NOMBRE
                FROM gestion_riesgos.riesgos_area WHERE ESTADO = 1 AND CODIGO_CIA = ? ORDER BY DESCRIPCION
                `, [codigo_cia]
            ).then(([rows]) => rows),

            obtenerPeriodosEs(codigo_cia),

            // Mitigación (criterio de eficiencia de control)
            pool.execute(`SELECT CODIGO_MITIGACION AS CODIGO, DESCRIPCION FROM gestion_riesgos.riesgos_mitigacion`).then(([rows]) => rows),

            // Capacidad de mitigación del riesgo (usa NOMBRE_EXTRA como descripción)
            pool.execute(
                `SELECT CODIGO_MITIGACION AS CODIGO, NOMBRE_EXTRA AS DESCRIPCION FROM gestion_riesgos.riesgos_mitigacion `
            ).then(([rows]) => rows),

            // Tolerancia
            pool.execute(`SELECT CODIGO_TOLERANCIA AS CODIGO, DESCRIPCION FROM gestion_riesgos.riesgos_tolerancia`).then(([rows]) => rows),

            // Probabilidad
            pool.execute(`SELECT CODIGO_PROBABILIDAD AS CODIGO, DESCRIPCION FROM  gestion_riesgos.riesgos_probabilidad`).then(([rows]) => rows),

            // Severidad
            pool.execute(`SELECT CODIGO_SEVERIDAD AS CODIGO, DESCRIPCION FROM gestion_riesgos.riesgos_severidad`).then(([rows]) => rows),

            // Info del usuario: nombre de entidad, siglas y código_entidad
            pool.execute(
                ` 
                SELECT re.NOMBRE, re.SIGLAS, rp.CODIGO_ENTIDAD
                FROM seguridad.seguridad_persona rp
                LEFT JOIN  seguridad.seguridad_entidad re 
                ON  re.CODIGO_CIA = rp.CODIGO_CIA AND re.CODIGO_ENTIDAD = rp.CODIGO_ENTIDAD
                WHERE rp.CODIGO_CIA = ? AND rp.CODIGO_COLABORADOR = ?
                `, [codigo_cia, userId]
            ).then(([rows]) => rows),

            // Tipo de objetivos
            pool.execute(
                `
                SELECT CODIGO_TIPO_OBJETIVO, DESCRIPCION
                FROM gestion_riesgos.riesgos_tipo_objetivo
                WHERE CODIGO_CIA = ? AND ESTADO = 1
                `, [codigo_cia]
            ).then(([rows]) => rows),

            // Frecuencias
            pool.execute(
                `
                SELECT CODIGO_FRECUENCIA, DESCRIPCION
                FROM gestion_riesgos.riesgos_frecuencia
                WHERE CODIGO_CIA = ?  AND ESTADO = 1
                `, [codigo_cia]
            ).then(([rows]) => rows),

            // Organos
            pool.execute(
                `
                SELECT CODIGO_ORGANO, NOMBRE
                FROM gestion_riesgos.riesgos_organos
                WHERE CODIGO_CIA = ?
                `, [codigo_cia]
            ).then(([rows]) => rows),

            // Viceministerios
            pool.execute(
                `
                SELECT CODIGO_VICEMINISTERIO, NOMBRE
                FROM gestion_riesgos.riesgos_viceministerio
                WHERE CODIGO_CIA = ?
                `, [codigo_cia]
            ).then(([rows]) => rows),
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
        const [rows] = await pool.execute(sql);
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
    const map = { 1: 'PROPIEDADES_ME', 2: 'PROPIEDADES_MC', 3: 'PROPIEDADES_MCE' };
    const col = map[Number(tipo)];

    if (!col) return res.status(400).json({ ok: false, error: 'Tipo inválido (1, 2 o 3)' });

    try {
        const sql = `
      SELECT ${col} AS PROPIEDADES
      FROM gestion_riesgos.riesgos_reportes_propiedades
      WHERE codigo_cia = ? AND defecto = 'S' AND codigo_periodo = ?
    `;
        const [rows] = await pool.execute(sql, [req.codigo_cia, periodo]);

        const result = rows.flatMap(r => {
            try {
                const arr = typeof r.PROPIEDADES === 'string'
                    ? JSON.parse(r.PROPIEDADES)
                    : r.PROPIEDADES;
                return Array.isArray(arr) ? arr : [];
            } catch {
                return [];
            }
        });

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
        const [rows] = await pool.execute(sql, params);

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
        const [rows] = await pool.execute(sql, [req.codigo_cia, periodo]);
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
        const [rows] = await pool.execute(sql, [req.codigo_cia, periodo, codigo_version]);
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

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [[nxtR]] = await conn.execute(
            `
            SELECT COALESCE(MAX(CODIGO_VERSION), 0) + 1 AS NEXT_VAL
            FROM gestion_riesgos.riesgos_riesgo_propiedades_versiones
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
            FOR UPDATE
            `,
            [codigo_cia, periodo]
        );
        const codigo_version = Number(nxtR?.NEXT_VAL || 1);

        await conn.execute(
            `
            INSERT INTO gestion_riesgos.riesgos_riesgo_propiedades_versiones
                (CODIGO_CIA, CODIGO_PERIODO, CODIGO_VERSION, USUARIO_CREACION, FECHA_CREACION)
            VALUES (?, ?, ?, ?, NOW())
            `,
            [codigo_cia, periodo, codigo_version, usuario_creacion]
        );

        const placeholders = propiedades.map(() => "(?, ?, ?, ?, ?)").join(", ");
        const values = propiedades.flatMap((p, i) => [
            codigo_cia,
            periodo,
            i + 1,
            codigo_version,
            p
        ]);

        await conn.execute(
            `
            INSERT INTO gestion_riesgos.riesgos_riesgo_propiedades
                (CODIGO_CIA, CODIGO_PERIODO, CODIGO_PROPIEDAD, CODIGO_VERSION, PROPIEDAD)
            VALUES ${placeholders}
            `,
            values
        );

        await conn.execute(
            `
            UPDATE gestion_riesgos.riesgos_riesgo_propiedades_versiones
            SET ESTADO = 'N'
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION != ?
            `,
            [codigo_cia, periodo, codigo_version]
        );

        await conn.commit();

        return res.status(201).json({
            message: "Versión y propiedades creadas con éxito.",
            codigo_version,
            periodo,
            total_propiedades: propiedades.length,
        });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error("Crear propiedades riesgo:", err);
        return res.status(500).json({ error: "Error al crear propiedades riesgo" });
    } finally {
        conn?.release();
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
    let conn;

    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [[defPrev]] = await conn.execute(
            `
            SELECT CODIGO_VERSION
            FROM gestion_riesgos.riesgos_riesgo_propiedades_versiones
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND ESTADO = 'S'
            ORDER BY CODIGO_VERSION DESC
            LIMIT 1
            FOR UPDATE
            `,
            [codigo_cia, periodoAnterior]
        );

        if (!defPrev?.CODIGO_VERSION) {
            await conn.rollback();
            return res.status(404).json({
                error: "No existe versión por defecto en el período anterior.",
                periodo_anterior: periodoAnterior,
            });
        }

        const codigo_version_prev = Number(defPrev.CODIGO_VERSION);

        const [propsPrev] = await conn.execute(
            `
            SELECT CODIGO_PROPIEDAD, PROPIEDAD
            FROM gestion_riesgos.riesgos_riesgo_propiedades
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION = ?
            ORDER BY CODIGO_PROPIEDAD ASC
            `,
            [codigo_cia, periodoAnterior, codigo_version_prev]
        );

        const [[nxt]] = await conn.execute(
            `
            SELECT COALESCE(MAX(CODIGO_VERSION), 0) + 1 AS NEXT_VAL
            FROM gestion_riesgos.riesgos_riesgo_propiedades_versiones
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
            FOR UPDATE
            `,
            [codigo_cia, periodo]
        );
        const codigo_version_nuevo = Number(nxt?.NEXT_VAL || 1);

        await conn.execute(
            `
            INSERT INTO gestion_riesgos.riesgos_riesgo_propiedades_versiones
                (CODIGO_CIA, CODIGO_PERIODO, CODIGO_VERSION, USUARIO_CREACION, FECHA_CREACION)
            VALUES (?, ?, ?, ?, NOW())
            `,
            [codigo_cia, periodo, codigo_version_nuevo, usuario_creacion]
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

            await conn.execute(
                `
                INSERT INTO gestion_riesgos.riesgos_riesgo_propiedades
                (CODIGO_CIA, CODIGO_PERIODO, CODIGO_PROPIEDAD, CODIGO_VERSION, PROPIEDAD)
                VALUES ${placeholders}
                `,
                values
            );
        }

        await conn.execute(
            `
            UPDATE gestion_riesgos.riesgos_riesgo_propiedades_versiones
            SET ESTADO = 'N'
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION != ?`,
            [codigo_cia, periodo, codigo_version_nuevo]
        );

        await conn.commit();

        return res.status(201).json({
            message: "Versión por defecto del año pasado copiada con éxito.",
            periodo_origen: periodoAnterior,
            codigo_version_origen: codigo_version_prev,
            periodo_destino: periodo,
            codigo_version_nuevo,
            total_propiedades_copiadas: propsPrev?.length || 0,
        });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error("Copiar defecto año pasado (riesgos):", err);
        return res.status(500).json({ error: "Error al copiar la versión por defecto del año pasado." });
    } finally {
        conn?.release();
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

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        await conn.execute(
            `
            UPDATE gestion_riesgos.riesgos_riesgo_propiedades_versiones
            SET ESTADO = 'N'
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION != ?`,
            [codigo_cia, periodo, codigo_version]
        );

        await conn.execute(
            `
            UPDATE gestion_riesgos.riesgos_riesgo_propiedades_versiones
            SET ESTADO = 'S'
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION = ?`,
            [codigo_cia, periodo, codigo_version]
        );

        await conn.commit();

        return res.status(201).json({ message: 'Propiedades actualizadas con exito', });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error('Crear propiedades riesgo:', err);
        return res.status(500).json({ error: 'Error al actualizar propiedades riesgo' });
    } finally {
        conn?.release();
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
        const [rows] = await pool.execute(sql, [req.codigo_cia, periodo]);
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
        const [rows] = await pool.execute(sql, [req.codigo_cia, periodo]);
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

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [[nxt]] = await conn.execute(
            `
            SELECT COALESCE(MAX(CODIGO_VERSION), 0) + 1 AS NEXT_VAL
            FROM gestion_riesgos.riesgos_reportes_propiedades
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
            FOR UPDATE
            `, [codigo_cia, periodo]
        );
        const codigo_version = Number(nxt?.NEXT_VAL || 1);

        await conn.execute(
            `
            INSERT INTO gestion_riesgos.riesgos_reportes_propiedades
            (CODIGO_CIA, CODIGO_PERIODO, CODIGO_VERSION,
            PROPIEDADES_ME, PROPIEDADES_MC, PROPIEDADES_MCE, USUARIO_CREACION, FECHA_CREACION)
            VALUES (?, ?, ?, ?, ?, ?,  ?, NOW())
            `, [codigo_cia, periodo, codigo_version, jsonME, jsonMC, jsonMCE, usuario_creacion]
        );

        await conn.execute(
            `
            UPDATE gestion_riesgos.riesgos_reportes_propiedades
            SET DEFECTO = 'N'
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION != ?
            `, [codigo_cia, periodo, codigo_version]
        );

        await conn.commit();

        return res.status(201).json({
            message: "Versión de reportes creada con éxito.",
            periodo,
            codigo_version,
            counts: {
                matriz_evaluacion_riesgos: me.length,
                mapa_calor_riesgo_residual: mc.length,
                matriz_continuidad_evaluacion: mce.length,
            },
        });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error("crearVersionPropiedadesReportes:", err);
        return res.status(500).json({ error: "Error al crear la versión de reportes." });
    } finally {
        conn?.release();
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

    let conn;
    try {
        conn = await pool.getConnection();

        const [srcRows] = await conn.execute(
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

        await conn.beginTransaction();

        const [[nxtR]] = await conn.execute(
            `
            SELECT COALESCE(MAX(CODIGO_VERSION), 0) + 1 AS NEXT_VAL
            FROM gestion_riesgos.riesgos_reportes_propiedades
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
            FOR UPDATE
            `,
            [codigo_cia, perNum]
        );
        const codigo_version = Number(nxtR?.NEXT_VAL || 1);

        await conn.execute(
            `
            INSERT INTO gestion_riesgos.riesgos_reportes_propiedades
                (CODIGO_CIA, CODIGO_PERIODO, CODIGO_VERSION,
                PROPIEDADES_ME, PROPIEDADES_MC, PROPIEDADES_MCE,
                DEFECTO, USUARIO_CREACION, FECHA_CREACION)
            VALUES (?, ?, ?, ?, ?, ?, 'S', ?, NOW())
            `,
            [codigo_cia, perNum, codigo_version, String(jsonME), String(jsonMC), String(jsonMCE), usuario_creacion]
        );

        await conn.execute(
            `
            UPDATE gestion_riesgos.riesgos_reportes_propiedades
            SET DEFECTO = 'N'
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION <> ?
            `,
            [codigo_cia, perNum, codigo_version]
        );

        await conn.commit();

        return res.status(201).json({
            message: "Versión copiada y establecida como defecto.",
            periodo: perNum,
            codigo_version,
            fuente_periodo: periodoAnterior,
            fuente_codigo_version: src.CODIGO_VERSION,
        });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error("Copiar defecto del año pasado (reportes):", err);
        return res.status(500).json({ error: "Error al copiar la versión por defecto del año pasado." });
    } finally {
        conn?.release();
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

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        await conn.execute(
            `
            UPDATE gestion_riesgos.riesgos_reportes_propiedades
            SET DEFECTO = 'N'
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION != ?`,
            [codigo_cia, periodo, codigo_version]
        );

        await conn.execute(
            `
            UPDATE gestion_riesgos.riesgos_reportes_propiedades
            SET DEFECTO = 'S'
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO_VERSION = ?`,
            [codigo_cia, periodo, codigo_version]
        );

        await conn.commit();

        return res.status(201).json({ message: 'Propiedades actualizadas con exito', });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error('Crear propiedades riesgo:', err);
        return res.status(500).json({ error: 'Error al actualizar propiedades riesgo' });
    } finally {
        conn?.release();
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
    const tipo = req.query?.tipo;

    if (!codigo_cia || !codigo_entidad || !periodo) {
        return res
            .status(400)
            .json({ error: "Faltan parámetros: codigo_cia, codigo_entidad y periodo son requeridos." });
    }

    try {
        const sqlRiesgos = `
        SELECT
            rr.CODIGO_RIESGO,
            rr.DESCRIPCION,
            rr.REF,
            rr.COMENTARIO_SUPERVISOR_${tipo} AS COMENTARIO_SUPERVISOR,
            rr.ESTADO_${tipo} AS ESTADO,
            rr.ESTADO_${tipo}_SUPERIOR AS ESTADO_SUPERIOR,
            rr.COMENTARIO_SUPERIOR_${tipo} AS COMENTARIO_SUPERIOR,
            ELIMINADO
        FROM 
            gestion_riesgos.riesgos_riesgo_extendido rr
        WHERE 
            rr.CODIGO_CIA = ?
            AND rr.CODIGO_ENTIDAD = ?
            AND rr.CODIGO_PERIODO = ?
        ORDER BY rr.eliminado ASC, rr.ESTADO_${tipo} DESC, rr.REF ASC
        `;
        const [riesgosRows] = await pool.execute(sqlRiesgos, [
            codigo_cia,
            Number(codigo_entidad),
            periodo,
        ]);

        return res.json({
            riesgos: riesgosRows,
        });
    } catch (err) {
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
        viceministerioCodigo
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

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [[nxt]] = await conn.execute(
            `
            SELECT COALESCE(MAX(CODIGO_RIESGO), 0) + 1 AS NEXT_VAL
            FROM gestion_riesgos.riesgos_riesgo_extendido
            WHERE 
                CODIGO_CIA = ?
                AND CODIGO_ENTIDAD = ?
                AND CODIGO_PERIODO = ?
            FOR UPDATE
      `,
            [codigo_cia, Number(codigo_entidad), pPeriodo]
        );
        const codigo_riesgo = Number(nxt?.NEXT_VAL || 1);
        const sql = `
            INSERT INTO gestion_riesgos.riesgos_riesgo_extendido (
                CODIGO_CIA, CODIGO_PERIODO, CODIGO_RIESGO, CODIGO_ENTIDAD,
                CODIGO_TIPO_OBJETIVO, CODIGO_OBJETIVO, CODIGO_AREA, DESCRIPCION, 
                CODIGO_PROBABILIDAD, CODIGO_SEVERIDAD, CODIGO_TOLERANCIA, CODIGO_MITIGACION, 
                OBSERVACIONES, VARIABLE_MITIGACION, REF, USUARIO_CREACION, 
                FECHA_CREACION, SEVERIDAD_NARRACION, PROBABILIDAD_AJUSTADA, SEVERIDAD_AJUSTADA,
                RIESGO_RESIDUAL, RIESGO_INHERENTE, EVENTO, CONTROL, 
                MONITOREO, CODIGO_FRECUENCIA, RESPONSABLE, EXTRAS_ME,
                ORGANO, VICEMINISTERIO
            ) VALUES (
                ?, ?, ?, ?,
                ?, ?, ?, ?, 
                ?, ?, ?, ?, 
                ?, ?, ?, ?, 
                CURRENT_TIMESTAMP, ?, ?, ?,
                ?, ?, ?, ?, 
                ?, ?, ?, ?,
                ?, ?
            )
            `;
        await conn.execute(sql, [
            codigo_cia, pPeriodo, codigo_riesgo, Number(codigo_entidad),
            pTipoObj || null, pObj || null, pArea || null, descripcion || null,
            pProb || null, pSev || null, pTol || null, pMit || null,
            observaciones || null, varMit || null, ref || null, usuario_creacion,
            severidadNarracion || null, Number(probabilidadAjustada) || null, Number(severidadAjustada) || null,
            Number(riesgoResidual) || null, Number(riesgoInherente) || null, evento || null, control || null,
            monitoreo || null, pFreq || null, responsable || null, extras || null,
            organoCodigo || null, viceministerioCodigo || null
        ]);

        await conn.commit();

        return res.status(201).json({
            message: "✅ Riesgo creado exitosamente (extendido)",
            data: {
                codigo_cia,
                codigo_entidad: Number(codigo_entidad),
                codigoPeriodo: pPeriodo,
                codigoArea: pArea,
                codigoRiesgo: codigo_riesgo
            }
        });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error("❌ crearRiesgo (extendido):", err);
        return res.status(500).json({ error: "Error al crear el riesgo extendido." });
    } finally {
        conn?.release?.();
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
            PERIODO_ANTERIOR
        FROM gestion_riesgos.riesgos_riesgo_extendido
        WHERE CODIGO_CIA = ?
            AND CODIGO_ENTIDAD = ?
            AND CODIGO_PERIODO = ?
            AND CODIGO_RIESGO = ?
        LIMIT 1
    `;
        const params = [codigoCia, Number(codigoEntidad), pPeriodo, pRiesgo];
        const [rows] = await pool.execute(sql, params);

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
        LEFT JOIN seguridad.seguridad_entidad sent
            ON sent.CODIGO_CIA = rrx.CODIGO_CIA
        AND sent.CODIGO_ENTIDAD = rrx.CODIGO_ENTIDAD

        WHERE 
            rrx.CODIGO_CIA = ?
            AND rrx.CODIGO_PERIODO = ?
            AND rrx.CODIGO_ENTIDAD = ?
            AND rrx.CODIGO_RIESGO = ?
    `;
        const params = [codigoCia, periodo, codigoEntidad, Number(codigo_riesgo)];
        const [rows] = await pool.execute(sql, params);

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

        tipo,
        organoCodigo,
        viceministerioCodigo
    } = req.body || {};

    const pPeriodo = Number(codigoPeriodo);
    const pRiesgo = Number(codigoRiesgo);
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

    let conn;
    try {
        conn = await pool.getConnection();

        const sql = `
      UPDATE gestion_riesgos.riesgos_riesgo_extendido
      SET
        CODIGO_TIPO_OBJETIVO = ?, CODIGO_OBJETIVO      = ?, CODIGO_AREA          = ?, DESCRIPCION          = ?,
        CODIGO_PROBABILIDAD  = ?, CODIGO_SEVERIDAD     = ?, CODIGO_TOLERANCIA    = ?, CODIGO_MITIGACION    = ?,
        OBSERVACIONES        = ?, VARIABLE_MITIGACION  = ?, REF                  = ?, PROBABILIDAD_AJUSTADA= ?,
        SEVERIDAD_AJUSTADA   = ?, RIESGO_INHERENTE     = ?, RIESGO_RESIDUAL      = ?, EVENTO               = ?,
        CONTROL              = ?, MONITOREO            = ?, CODIGO_FRECUENCIA    = ?, RESPONSABLE          = ?,
        SEVERIDAD_NARRACION  = ?, EXTRAS_${tipo}               = ?, USUARIO_MODIFICACION = ?, FECHA_MODIFICACION   = CURRENT_TIMESTAMP,
        ESTADO_${tipo} = 0,       VICEMINISTERIO       = ?,         ORGANO = ?, ESTADO_${tipo}_SUPERIOR = 0
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

            codigo_cia, Number(codigo_entidad), pPeriodo, pRiesgo
        ];

        const [result] = await conn.execute(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Riesgo no encontrado con los identificadores proporcionados.' });
        }

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
        console.error('actualizarRiesgo:', err);
        return res.status(500).json({ error: 'Error al actualizar el riesgo' });
    } finally {
        try { conn?.release(); } catch { }
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

    const { periodo, codigo_riesgo } = req.body || {};

    let conn;
    try {
        conn = await pool.getConnection();

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

        const [result] = await conn.execute(sql, params);

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
    } finally {
        try { conn?.release(); } catch { }
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

    let conn;
    try {
        conn = await pool.getConnection();

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

        const [result] = await conn.execute(sql, params);

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
    } finally {
        try { conn?.release(); } catch { }
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
        const [propRows] = await pool.execute(sqlPropiedades, [req.codigo_cia, periodoNum]);
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
            rrx.ESTADO_${tipo} AS ESTADO
        FROM gestion_riesgos.riesgos_riesgo_extendido rrx
        -- Área del riesgo
        LEFT JOIN gestion_riesgos.riesgos_area ra
            ON ra.CODIGO_CIA = rrx.CODIGO_CIA AND ra.CODIGO_AREA = rrx.CODIGO_AREA
        -- Dirección del riesgo
        LEFT JOIN seguridad.seguridad_entidad se
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
        const [rows] = await pool.execute(sql, params);

        return res.status(200).json({ riesgos: rows, propiedades });
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
        const [propRows] = await pool.execute(sqlPropiedades, [req.codigo_cia, periodoNum]);
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
            rrx.ESTADO_${tipo}_SUPERIOR AS ESTADO
        FROM gestion_riesgos.riesgos_riesgo_extendido rrx
        -- Área del riesgo
        LEFT JOIN gestion_riesgos.riesgos_area ra
            ON ra.CODIGO_CIA = rrx.CODIGO_CIA AND ra.CODIGO_AREA = rrx.CODIGO_AREA
        -- Dirección del riesgo
        LEFT JOIN seguridad.seguridad_entidad se
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
        const [rows] = await pool.execute(sql, params);

        return res.status(200).json({ riesgos: rows, propiedades });
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

        const [r] = await pool.execute(sql, [comentarioClean ? comentarioClean : null, supervisor, estado, cia, codigo_entidad, periodo, codigo_riesgo]);

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

        const [r] = await pool.execute(sql, [comentarioClean ? comentarioClean : null, supervisor, estado, cia, codigo_entidad, periodo, codigo_riesgo]);

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
    LEFT JOIN seguridad.seguridad_entidad se
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
    LEFT JOIN seguridad.seguridad_entidad sent
        ON rrx.codigo_entidad = sent.codigo_entidad AND rrx.codigo_cia = sent.codigo_cia
    WHERE rrx.CODIGO_CIA = ?
        AND rrx.CODIGO_PERIODO = ?
        AND rrx.codigo_entidad = ?
        AND eliminado != 1
    ORDER BY rrx.REF ASC`
    let parametros = [codigo_cia, Number(periodo), req.codigo_entidad]
    const conn = await pool.getConnection();
    try {
        await conn.query("SET SESSION lc_time_names = 'es_ES'");
        const [rows] = await conn.execute(sql, parametros);
        res.json({ valores: rows })
    } finally {
        conn.release();
    }
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
        LEFT JOIN seguridad.seguridad_entidad sent
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
        const [rows] = await pool.execute(sql, params);
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

        const [r] = await pool.execute(sql, [mostrar_general, usuario, cia, codigo_periodo, codigo_riesgo, codigo_entidad]);

        if (r.affectedRows === 0) {
            return res.status(404).json({ ok: false, msg: "No se encontró el riesgo a actualizar." });
        }

        return res.status(200).json({ ok: true, msg: "✅ mostrar_general actualizado correctamente." });
    } catch (err) {
        console.error("❌ actualizarMostrarGeneral:", err);
        return res.status(500).json({ ok: false, msg: "Error interno al actualizar mostrar_general.", error: err.message });
    }
};
