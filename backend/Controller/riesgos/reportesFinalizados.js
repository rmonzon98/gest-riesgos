/**
 * @fileoverview
 * Controlador para generación de reportes finales, valores de matriz y datos institucionales.
 *
 * @module controller/riesgos/reportesFinalizados
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('./../../bd/mySQLConnection');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { DOCS_DIR } = require('./../../services/paths');


/**
 * obtenerSuperiorInfo
 * 
 * Obtiene los datos del superior inmediato del colaborador autenticado.
 *
 * - Toma `codigo_cia` y `userId` desde la request.
 * - Consulta la tabla `riesgos_colaborador_superior` para obtener nombre y puesto.
 * - Devuelve un objeto sencillo con el nombre y puesto del superior.
 *
 * @returns {200|500} `{nombre, puesto}` o mensaje de error.
 */
exports.obtenerSuperiorInfo = async (req, res) => {
    const codigo_cia = asNum(req.codigo_cia);
    const codigo_colaborador = asNum(req.userId);

    let conn;
    try {
        conn = await pool.getConnection();

        const [rows] = await conn.query(
            `
            SELECT  nombre_superior AS nombre, puesto_superior AS puesto
            FROM gestion_riesgos.riesgos_colaborador_superior
            WHERE codigo_cia = ? AND codigo_colaborador = ?
            `,
            [codigo_cia, codigo_colaborador]
        );

        if (!rows.length) {
            return res
                .status(404)
                .json({ msg: 'No se encontró información para el superior' });
        }
        return res.json({ nombre: rows[0].nombre, puesto: rows[0].puesto })
    } catch (err) {
        console.error('Error en obtener superior:', err);
        return res.status(500).json({ msg: 'Error al obtener superior', err: err.message });
    } finally {
        try {
            conn?.release?.();
        } catch { }
    }
}

/**
 * obtenerSuperior
 * 
 * Middleware que adjunta, si existe, la información del superior al objeto `req`.
 *
 * - Toma `codigo_cia` y `userId` desde la request.
 * - Consulta la misma tabla de configuración de superiores.
 * - Si encuentra datos, los almacena en `req.superior` y llama a `next()`.
 * - Si no hay registro, continúa sin bloquear el flujo.
 *
 * @route GET /obtener-superior
 * @returns {next|500} Continúa la ejecución o responde con error en caso de fallo.
 */
exports.obtenerSuperior = async (req, res, next) => {
    const codigo_cia = asNum(req.codigo_cia);
    const codigo_colaborador = asNum(req.userId);

    let conn;
    try {
        conn = await pool.getConnection();

        const [rows] = await conn.query(
            `
            SELECT  nombre_superior AS nombre, puesto_superior AS puesto
            FROM gestion_riesgos.riesgos_colaborador_superior
            WHERE codigo_cia = ? AND codigo_colaborador = ?
            `,
            [codigo_cia, codigo_colaborador]
        );

        if (!rows.length) {
            return res
                .status(404)
                .json({ msg: 'No se encontró información para el superior' });
        }
        req.superior = { nombre: rows[0].nombre, puesto: rows[0].puesto }
        next()
    } catch (err) {
        console.error('Error en obtener superior:', err);
        return res.status(500).json({ msg: 'Error al obtener superior', err: err.message });
    } finally {
        try {
            conn?.release?.();
        } catch { }
    }
}

const asNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

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
 * Obtiene información base para la generación de reportes finales.
 *
 * - Valida `codigo_cia`.
 * - Configura la sesión MySQL para usar nombres de fechas en español.
 * - Consulta tipos de objetivo, períodos disponibles y unidades organizacionales.
 * - Empaqueta los tres catálogos en una sola respuesta JSON.
 *
 * @route GET /informacion-select
 * @returns {200|400|500} `{tipos, periodos, unidades}` o mensaje de error.
 */
exports.obtenerInfoInicial = async (req, res) => {
    const codigo_cia = asNum(req.codigo_cia);
    if (!codigo_cia) {
        return res.status(400).json({ error: 'Falta codigo_cia' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        await conn.query(`SET lc_time_names = 'es_ES'`);

        const tiposQ = conn
            .query(
                `
            SELECT  CODIGO_TIPO_OBJETIVO AS ID,  DESCRIPCION AS NOMBRE
            FROM gestion_riesgos.riesgos_tipo_objetivo
            WHERE ESTADO = '1' AND CODIGO_CIA = ?
            ORDER BY DESCRIPCION
        `,
                [codigo_cia]
            )
            .then(([rows]) => rows);

        const periodosQ = obtenerPeriodosEs(codigo_cia);
        const unidadesQ = conn
            .query(
                `
                SELECT 
                    CODIGO_ENTIDAD AS CODIGO_ENTIDAD,
                    NOMBRE
                FROM gestion_riesgos.seguridad_entidad
                WHERE CODIGO_CIA = ?
                ORDER BY NOMBRE ASC
            `,
                [codigo_cia]
            )
            .then(([rows]) => rows);

        const [tiposResult, periodosResult, unidadResult] = await Promise.all([
            tiposQ,
            periodosQ,
            unidadesQ,
        ]);

        return res.json({
            tipos: tiposResult,
            periodos: periodosResult,
            unidades: unidadResult,
        });
    } catch (err) {
        console.error('❌ Error al obtener info inicial:', err);
        return res
            .status(500)
            .send({ error: 'Error interno al obtener información inicial.' });
    } finally {
        try {
            conn?.release?.();
        } catch { }
    }
};

/**
 * obtenerLogo
 * 
 * Obtiene el logo institucional configurado para la compañía en formato base64.
 *
 * - Valida `codigo_cia`.
 * - Consulta ruta y nombre del archivo desde `seguridad_institucion`.
 * - Reconstruye la ruta real dentro de `DOCS_DIR` asegurando un acceso seguro.
 * - Lee el archivo desde disco y lo convierte a base64 para enviarlo al frontend.
 *
 * @route GET /obtener-logo
 * @returns {200|400|404|500} `{logo, nombre}` o mensaje de error.
 */
exports.obtenerLogo = async (req, res) => {
    const codigo_cia = asNum(req.codigo_cia);
    if (!codigo_cia) {
        return res.status(400).json({ msg: 'Falta codigo_cia' });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        const [rows] = await conn.query(
            `
            SELECT 
                path  AS path,
                nombre AS nombre
            FROM gestion_riesgos.seguridad_institucion
            WHERE CODIGO_CIA = ?
            LIMIT 1
            `,
            [codigo_cia]
        );

        if (!rows.length) {
            return res
                .status(404)
                .json({ msg: 'No se encontró el logo para la entidad' });
        }

        const { path: relPath, nombre } = rows[0];

        const safeRel = String(relPath || '').replace(/^(\.\.[/\\])+/, '');
        const relFromDocs = safeRel.slice(5);
        const filePath = path.join(DOCS_DIR, relFromDocs);

        try {
            const data = await fsp.readFile(filePath);
            const base64Image = data.toString('base64');
            return res.json({ logo: base64Image, nombre });
        } catch (e) {
            console.error('Error al leer imagen:', e);
            return res.status(500).json({ msg: 'Error al leer la imagen' });
        }
    } catch (err) {
        console.error('Error en obtenerLogo:', err);
        return res.status(500).json({ msg: 'Error al obtener el logo', err: err.message });
    } finally {
        try {
            conn?.release?.();
        } catch { }
    }
};

/**
 * obtenerValores
 * 
 * Obtiene los registros de riesgos evaluados para construir reportes (matriz de evaluación,
 * mapa de calor, continuidad y monitoreo) a nivel de unidad/entidad.
 *
 * - Valida `codigo_cia` y lee filtros (`periodo`, `tipo`, `unidad`, `categoria`) desde query.
 * - Ejecuta un SELECT sobre las tablas de riesgos y catálogos para armar columnas de reporte.
 * - Aplica filtros dinámicos según la categoría del reporte y parámetros recibidos.
 * - Devuelve un arreglo de filas ya etiquetadas para mostrarse o exportarse.
 *
 * @returns {200|500} `{valores:[...]}` o mensaje de error.
 */
exports.obtenerValores = async (req, res, next) => {
    const codigo_cia = req.codigo_cia
    const { periodo, tipo, unidad, categoria } = req.query
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
        sent.nombre                                  AS 'Nombre unidad',
        rrx.codigo_periodo                           AS 'Periodo',
        CASE 
            WHEN JSON_VALID(rrx.EXTRAS_${categoria}) THEN JSON_EXTRACT(rrx.EXTRAS_${categoria}, '$')
            ELSE JSON_OBJECT('EXTRAS_${categoria}', JSON_ARRAY())
        END AS EXTRAS
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
        AND eliminado != 1`
    const orden = `
        ORDER BY rrx.REF ASC`
    let filtros = ``
    let parametros = [codigo_cia, Number(periodo)]
    if (unidad) {
        if (unidad === 'propia') {
            filtros += `
        AND rrx.codigo_entidad = ${req.codigo_entidad}`
        } else {
            filtros += `
        AND rrx.codigo_entidad = ${unidad}`
        }
    }
    if (tipo) {
        filtros += `
        AND rrx.codigo_tipo_objetivo = '${tipo}'`
    }
    sql = sql + filtros + orden
    const conn = await pool.getConnection();
    try {
        await conn.query("SET SESSION lc_time_names = 'es_ES'");
        const [rows] = await conn.execute(sql, parametros);
        req.valores = rows;
        next()
    } finally {
        conn.release();
    }
}

/**
 * obtenerPropiedades
 * 
 * Obtiene la definición de columnas (propiedades) configuradas para un tipo de reporte.
 *
 * - Lee `periodo` y `categoria` desde query.
 * - Consulta `riesgos_reportes_propiedades` para la compañía y período, usando el campo dinámico PROPIEDADES_{categoria}.
 * - Parsea el JSON almacenado y normaliza el arreglo de propiedades.
 * - Devuelve el arreglo listo para combinarlo con los valores de riesgos.
 *
 * @route GET /obtener-propiedades
 * @returns {200|500} `{propiedades:[...]}` o arreglo vacío si no hay configuración.
 */
exports.obtenerPropiedades = async (req, res) => {
    const { periodo, categoria } = req.query
    const sqlPropiedades = `
        SELECT PROPIEDADES_${categoria} AS PROPIEDADES
        FROM gestion_riesgos.riesgos_reportes_propiedades
        WHERE codigo_cia = ? AND defecto = 'S' AND codigo_periodo = ?
        `;
    const [propRows] = await pool.execute(sqlPropiedades, [req.codigo_cia, periodo]);
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
    const resp = { propiedades, valores: req.valores }
    if (req.institucion) {
        resp.institucion = req.institucion
    }
    if (req.superior) {
        resp.superior = req.superior
    }
    res.json(resp)
}

/**
 * institucion
 * 
 * Middleware que obtiene información básica de la institución.
 *
 * - Consulta nombre y tipo de la institución en `seguridad_institucion` según `codigo_cia`.
 * - Adjunta el resultado a `req.institucion` para ser usado en posteriores controladores.
 *
 * @returns {next|500} Continúa la ejecución o responde con error en caso de fallo.
 */
exports.institucion = async (req, res, next) => {
    const sqlPropiedades = `
        SELECT NOMBRE, TIPO
        FROM gestion_riesgos.seguridad_institucion
        WHERE codigo_cia = ?
        `;
    const [propRows] = await pool.execute(sqlPropiedades, [req.codigo_cia]);
    req.institucion = propRows
    next()
}

/**
 * obtenerValoresInst
 * 
 * Obtiene los registros de riesgos evaluados para reportes institucionales
 * (usualmente agregados generales de la institución).
 *
 * - Usa la misma estructura de consulta que `obtenerValores`, pero filtrando configuración institucional.
 * - Aplica filtros por `periodo`, `tipo`, `unidad` y `categoria` desde query params.
 * - Devuelve los datos listos para construir reportes globales.
 *
 * @returns {200|500} `{valores:[...]}` o mensaje de error.
 */
exports.obtenerValoresInst = async (req, res, next) => {
    const codigo_cia = req.codigo_cia
    const { periodo, tipo, unidad, categoria } = req.query
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
        sent.nombre                                  AS 'Nombre unidad',
        rrx.codigo_periodo                           AS 'Periodo',
        CASE 
            WHEN JSON_VALID(rrx.EXTRAS_${categoria}) THEN JSON_EXTRACT(rrx.EXTRAS_${categoria}, '$')
            ELSE JSON_OBJECT('EXTRAS_${categoria}', JSON_ARRAY())
        END AS EXTRAS
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
        AND eliminado != 1
        AND MOSTRAR_GENERAL = 'S'`
    const orden = `
        ORDER BY rrx.REF ASC`
    let filtros = ``
    let parametros = [codigo_cia, Number(periodo)]
    if (unidad) {
        if (unidad === 'propia') {
            filtros += `
        AND rrx.codigo_entidad = ${req.codigo_entidad}`
        } else {
            filtros += `
        AND rrx.codigo_entidad = ${unidad}`
        }
    }
    if (tipo) {
        filtros += `
        AND rrx.codigo_tipo_objetivo = '${tipo}'`
    }
    sql = sql + filtros + orden
    const conn = await pool.getConnection();
    try {
        await conn.query("SET SESSION lc_time_names = 'es_ES'");
        const [rows] = await conn.execute(sql, parametros);
        req.valores = rows;
        next()
    } finally {
        conn.release();
    }
}
