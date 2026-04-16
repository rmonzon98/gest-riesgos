/** 
 * @fileoverview
 * Controlador de seguimientos de riesgos.
 *
 * @module controller/riesgos/seguimientos
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');
const path = require('path');
const fs = require('fs').promises;

const DOCS_ROOT = process.env.DOCS_DIR
    ? path.resolve(process.env.DOCS_DIR)
    : path.join(process.cwd(), 'docs');

function safeName(name = '') {
    return String(name).replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim();
}
async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}

const ALLOWED_MIMES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
]);
const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.xlsm']);
function isAllowedFile(file) {
    const mime = (file?.mimetype || '').toLowerCase();
    const ext = path.extname(file?.originalname || '').toLowerCase();

    if (mime.startsWith('image/')) return true;

    if (ALLOWED_MIMES.has(mime)) return true;
    if (ALLOWED_EXT.has(ext)) return true;

    return false;
}

/**
 * listar
 *
 * Función del controlador encargada de procesar la operación listar.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.listar = async (req, res) => {
    try {
        const codigo_cia = Number(req.codigo_cia);
        const codigo_entidad = Number(req.codigo_entidad);
        const codigo_periodo = Number(req.query.codigo_periodo);

        if (!codigo_cia || !codigo_entidad) {
            return res.status(400).json({ error: 'Faltan codigo_cia o codigo_entidad.' });
        }
        if (!Number.isInteger(codigo_periodo)) {
            return res.status(400).json({ error: 'codigo_periodo debe ser un número (por ej. 2025).' });
        }

        const sql = `
      SELECT DISTINCT MES AS mes
      FROM gestion_riesgos.riesgos_seguimiento
      WHERE CODIGO_CIA = ?
        AND CODIGO_ENTIDAD = ?
        AND CODIGO_PERIODO = ?
      ORDER BY mes
    `;
        const params = [codigo_cia, codigo_entidad, codigo_periodo];
        const [rows] = await pool.execute(sql, params);

        const meses = rows.map(r => Number(r.mes)).filter(n => Number.isInteger(n));
        return res.json({ meses });
    } catch (err) {
        console.error('listar meses seguimiento error:', err);
        return res.status(500).json({ error: 'Error al listar meses.', detail: err.message });
    }
};

/**
 * obtenerPorPeriodoMes
 *
 * Función del controlador encargada de procesar la operación obtenerPorPeriodoMes.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /periodo-mes
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerPorPeriodoMes = async (req, res) => {
    try {
        const codigo_cia = Number(req.codigo_cia);
        const codigo_entidad = Number(req.codigo_entidad);
        const periodo = Number(req.query.codigo_periodo);
        const mes = Number(req.query.mes);

        if (!codigo_cia || !codigo_entidad) {
            return res.status(400).json({ error: 'Faltan codigo_cia o codigo_entidad.' });
        }
        if (!Number.isInteger(periodo)) {
            return res.status(400).json({ error: 'El parámetro "periodo" es obligatorio y debe ser numérico.' });
        }
        if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
            return res.status(400).json({ error: 'El parámetro "mes" debe estar entre 1 y 12.' });
        }

        const sql = `
      SELECT SECCION1, SECCION2, SECCION3, SECCION4, VICEMINISTERIO, ORGANO, SUBTITULO
      FROM gestion_riesgos.riesgos_seguimiento
      WHERE CODIGO_CIA = ?
        AND CODIGO_ENTIDAD = ?
        AND MES = ?
        AND (
          CAST(JSON_UNQUOTE(JSON_EXTRACT(SECCION4, '$.periodo_trabajo')) AS UNSIGNED) = ?
          OR CAST(JSON_UNQUOTE(JSON_EXTRACT(SECCION1, '$[0].periodo')) AS UNSIGNED) = ?
        )
      LIMIT 1
    `;
        const params = [codigo_cia, codigo_entidad, mes, periodo, periodo];
        const [rows] = await pool.execute(sql, params);

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                ok: false,
                message: 'No hay información de seguimiento para los criterios especificados.',
                criteria: { codigo_cia, codigo_entidad, periodo, mes }
            });
        }

        const safeParse = (str, fb) => { try { return str == null ? fb : JSON.parse(str); } catch { return fb; } };

        const r = rows[0];
        const seccion1 = safeParse(r.SECCION1, []);
        const seccion2 = safeParse(r.SECCION2, []);
        const seccion3 = safeParse(r.SECCION3, []);
        const seccion4 = safeParse(r.SECCION4, {});

        return res.json({
            ok: true,
            key: { codigo_cia, codigo_entidad, periodo, mes },
            seccion1, seccion2, seccion3, seccion4, organo: r.ORGANO, viceministerio: r.VICEMINISTERIO, subtitulo: r.SUBTITULO
        });
    } catch (err) {
        console.error('obtenerPorPeriodoMes error:', err);
        return res.status(500).json({ error: 'Error al obtener el seguimiento.', detail: err.message });
    }
};

/**
 * registrar
 *
 * Función del controlador encargada de procesar la operación registrar.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route POST /
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.registrar = async (req, res) => {
    try {
        const codigo_cia = Number(req.codigo_cia);
        const codigo_entidad = Number(req.codigo_entidad);

        if (!codigo_cia || !codigo_entidad) {
            return res.status(400).json({ error: 'Faltan codigo_cia o codigo_entidad en la request.' });
        }

        const {
            mes, seccion1 = [], seccion2 = [], seccion3 = [], seccion4 = {},
            entidad = null, periodo_trabajo = null, organo_encabezado, titulo_informe,
            viceministerio_encabezado
        } = req.body || {};

        const mesNum = Number(mes);
        if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
            return res.status(400).json({ error: 'El campo "mes" debe ser un número entre 1 y 12.' });
        }
        const periodoNum = Number(periodo_trabajo);
        if (!Number.isInteger(periodoNum)) {
            return res.status(400).json({ error: 'El campo "periodo_trabajo" es requerido y debe ser entero.' });
        }

        const S1 = JSON.stringify(seccion1 ?? []);
        const S2 = JSON.stringify(seccion2 ?? []);
        const S3 = JSON.stringify(seccion3 ?? []);
        const S4 = JSON.stringify({ ...(seccion4 ?? {}), entidad, periodo_trabajo: periodoNum });

        const insertSql = `
      INSERT INTO gestion_riesgos.riesgos_seguimiento
        (CODIGO_CIA, CODIGO_ENTIDAD, MES, CODIGO_PERIODO, SECCION1, SECCION2, SECCION3, SECCION4, VICEMINISTERIO, ORGANO, SUBTITULO, USUARIO_CREACION, FECHA_CREACION)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
        const params = [codigo_cia, codigo_entidad, mesNum, periodoNum, S1, S2, S3, S4, organo_encabezado, titulo_informe, viceministerio_encabezado, req.userId];

        const [result] = await pool.execute(insertSql, params);

        return res.json({
            ok: true,
            message: 'Seguimiento registrado correctamente.',
            key: { codigo_cia, codigo_entidad, mes: mesNum, periodo: periodoNum },
            dbResult: { affectedRows: result.affectedRows, insertId: result.insertId || null }
        });
    } catch (err) {
        if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
            try {
                const selectSql = `
          SELECT CODIGO_CIA, CODIGO_ENTIDAD, MES, CODIGO_PERIODO, SECCION1, SECCION2, SECCION3, SECCION4,
                 FECHA_CREACION, FECHA_MODIFICACION, USUARIO_CREACION, USUARIO_MODIFICACION
          FROM gestion_riesgos.riesgos_seguimiento
          WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND MES = ?
          LIMIT 1
        `;
                const [rows] = await pool.execute(selectSql, [
                    Number(req.codigo_cia),
                    Number(req.codigo_entidad),
                    Number(req.body?.periodo_trabajo),
                    Number(req.body?.mes)
                ]);

                return res.status(409).json({
                    ok: false,
                    code: 'DUPLICATE',
                    message: 'Ya existe un seguimiento para esa clave (cia, entidad, periodo, mes). No se sobreescribe.',
                    existing: rows?.[0] ?? null
                });
            } catch {
                return res.status(409).json({
                    ok: false,
                    code: 'DUPLICATE',
                    message: 'Ya existe un seguimiento para este período y mes.'
                });
            }
        }
        console.error('registrar seguimiento error:', err);
        return res.status(500).json({ error: 'Error al registrar el seguimiento.', detail: err.message });
    }
};

/**
 * actualizarMesPeriodo
 *
 * Función del controlador encargada de procesar la operación actualizarMesPeriodo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.actualizarMesPeriodo = async (req, res) => {
    try {
        const codigo_cia = Number(req.codigo_cia);
        const codigo_entidad = Number(req.codigo_entidad);

        if (!codigo_cia || !codigo_entidad) {
            return res.status(400).json({ error: "Faltan codigo_cia o codigo_entidad en la request." });
        }

        const {
            mes,
            seccion1 = [],
            seccion2 = [],
            seccion3 = [],
            seccion4 = {},
            entidad = null,
            periodo_trabajo = null,
            titulo_informe,
            organo_encabezado,
            viceministerio_encabezado
        } = req.body || {};

        const mesNum = Number(mes);
        if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
            return res.status(400).json({ error: 'El campo "mes" debe ser un número entre 1 y 12.' });
        }

        const codigo_periodo = Number(periodo_trabajo);
        if (!Number.isInteger(codigo_periodo)) {
            return res.status(400).json({ error: 'El campo "periodo_trabajo" debe ser un número válido.' });
        }

        const S1 = JSON.stringify(seccion1 ?? []);
        const S2 = JSON.stringify(seccion2 ?? []);
        const S3 = JSON.stringify(seccion3 ?? []);
        const S4 = JSON.stringify({ ...(seccion4 ?? {}), entidad, periodo_trabajo: codigo_periodo });

        const sqlUpdate = `
      UPDATE gestion_riesgos.riesgos_seguimiento
      SET SECCION1 = ?, SECCION2 = ?, SECCION3 = ?, SECCION4 = ?, VICEMINISTERIO = ?, ORGANO = ?, SUBTITULO = ?,
      USUARIO_MODIFICACION = ?, FECHA_MODIFICACION = NOW()
      WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND MES = ?
    `;
        const paramsUpdate = [S1, S2, S3, S4, viceministerio_encabezado, organo_encabezado, titulo_informe,
            req.userId, codigo_cia, codigo_entidad, codigo_periodo, mesNum];

        await pool.execute(sqlUpdate, paramsUpdate);

        return res.json({ ok: true, message: "Seguimiento actualizado correctamente." });
    } catch (err) {
        console.error("actualizarMesPeriodo error:", err);
        return res.status(500).json({ error: "Error al actualizar el seguimiento.", detail: err.message });
    }
};

/**
 * obtenerRelacionesPreviasGeneral
 *
 * Función del controlador encargada de procesar la operación obtenerRelacionesPreviasGeneral.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /obtener-relaciones-general
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerRelacionesPreviasGeneral = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = Number(req.query.codigo_entidad);
    const codigo_periodo = Number(req.query.codigo_periodo);

    if (!codigo_cia || !codigo_entidad || !codigo_periodo) {
        return res.status(400).json({
            ok: false,
            msg: "Faltan parámetros: codigo_entidad y codigo_periodo son requeridos."
        });
    }

    try {
        const sql = `
    WITH RECURSIVE cadena AS (
    -- Semilla: riesgos del período actual
    SELECT
        r.CODIGO_CIA,
        r.CODIGO_ENTIDAD,
        r.CODIGO_PERIODO,
        r.CODIGO_RIESGO,
        r.PERIODO_ANTERIOR,
        r.CODIGO_PERIODO AS PERIODO_SEMILLA,
        r.CODIGO_RIESGO  AS RIESGO_SEMILLA,
        0 AS NIVEL
    FROM gestion_riesgos.riesgos_riesgo_extendido r
    WHERE r.CODIGO_CIA = ?
      AND r.CODIGO_ENTIDAD = ?
      AND r.CODIGO_PERIODO = ?
      AND COALESCE(r.ELIMINADO, 0) != 1

    UNION ALL

    -- Vamos buscando el padre en el período anterior
    SELECT
        p.CODIGO_CIA,
        p.CODIGO_ENTIDAD,
        p.CODIGO_PERIODO,
        p.CODIGO_RIESGO,
        p.PERIODO_ANTERIOR,
        c.PERIODO_SEMILLA,
        c.RIESGO_SEMILLA,
        c.NIVEL + 1
    FROM cadena c
    JOIN gestion_riesgos.riesgos_riesgo_extendido p
      ON p.CODIGO_CIA = c.CODIGO_CIA
     AND p.CODIGO_ENTIDAD = c.CODIGO_ENTIDAD
     AND p.CODIGO_PERIODO = c.CODIGO_PERIODO - 1
     AND p.CODIGO_RIESGO = c.PERIODO_ANTERIOR
    WHERE c.PERIODO_ANTERIOR IS NOT NULL
      AND COALESCE(p.ELIMINADO, 0) != 1
),

raiz_por_semilla AS (
    SELECT *
    FROM (
        SELECT
            c.*,
            ROW_NUMBER() OVER (
                PARTITION BY c.CODIGO_CIA, c.CODIGO_ENTIDAD, c.PERIODO_SEMILLA, c.RIESGO_SEMILLA
                ORDER BY c.CODIGO_PERIODO ASC
            ) AS RN
        FROM cadena c
    ) x
    WHERE x.RN = 1
),

raices_unicas AS (
    SELECT DISTINCT
        CODIGO_CIA,
        CODIGO_ENTIDAD,
        CODIGO_PERIODO,
        CODIGO_RIESGO
    FROM raiz_por_semilla
)

SELECT
    rrx.CODIGO_ENTIDAD,
    rrx.CODIGO_RIESGO,
    rto.DESCRIPCION AS 'Tipo de objetivo',
    ro.DESCRIPCION  AS 'Objetivo',
    ra.DESCRIPCION  AS 'Área evaluada',
    CONCAT(rprob.CODIGO_PROBABILIDAD, ' - ', rprob.DESCRIPCION) AS 'Probabilidad',
    CONCAT(rsev.CODIGO_SEVERIDAD, ' - ', rsev.DESCRIPCION)      AS 'Severidad',
    rrx.RIESGO_INHERENTE                                         AS 'Riesgo Inherente',
    CONCAT(COALESCE(rm.CODIGO_MITIGACION,0) - 1, ' - ', COALESCE(rm.DESCRIPCION,'')) AS 'Eficiencia del mitigador',
    rrx.VARIABLE_MITIGACION                                      AS 'A mitigar',
    rrx.PROBABILIDAD_AJUSTADA                                    AS 'Probabilidad ajustada',
    rrx.SEVERIDAD_AJUSTADA                                       AS 'Severidad ajustada',
    rrx.RIESGO_RESIDUAL                                          AS 'Riesgo residual',
    rrx.OBSERVACIONES                                            AS 'Observaciones',
    rrx.EVENTO                                                   AS 'Evento',
    rtol.DESCRIPCION                                             AS 'Tolerancia',
    rrx.DESCRIPCION                                              AS 'Descripción del riesgo',
    rrx.REF                                                      AS 'Ref.',
    rrx.SEVERIDAD_NARRACION                                      AS 'Severidad(narración)',
    rrx.CONTROL                                                  AS 'Control interno para mitigar',
    rrx.MONITOREO                                                AS 'Método de monitoreo',
    rf.DESCRIPCION                                               AS 'Frecuencia',
    rrx.RESPONSABLE                                              AS 'Responsable',
    rrx.CODIGO_PERIODO                                           AS 'Periodo',
    rrx.PERIODO_ANTERIOR                                         AS 'Riesgo año pasado',
    org.NOMBRE                                                   AS 'Organo',
    vi.NOMBRE                                                    AS 'Viceministerio',
    CASE
        WHEN JSON_VALID(rrx.EXTRAS_ME)
            THEN JSON_EXTRACT(rrx.EXTRAS_ME, '$')
        ELSE JSON_OBJECT('EXTRAS_ME', JSON_ARRAY())
    END AS EXTRAS_ME,
    CASE
        WHEN JSON_VALID(rrx.EXTRAS_MCE)
            THEN JSON_EXTRACT(rrx.EXTRAS_MCE, '$')
        ELSE JSON_OBJECT('EXTRAS_MCE', JSON_ARRAY())
    END AS EXTRAS_MCE,
    CASE
        WHEN JSON_VALID(rrx.EXTRAS_MC)
            THEN JSON_EXTRACT(rrx.EXTRAS_MC, '$')
        ELSE JSON_OBJECT('EXTRAS_MC', JSON_ARRAY())
    END AS EXTRAS_MC
FROM raices_unicas ru
JOIN gestion_riesgos.riesgos_riesgo_extendido rrx
  ON rrx.CODIGO_CIA = ru.CODIGO_CIA
 AND rrx.CODIGO_ENTIDAD = ru.CODIGO_ENTIDAD
 AND rrx.CODIGO_PERIODO = ru.CODIGO_PERIODO
 AND rrx.CODIGO_RIESGO = ru.CODIGO_RIESGO
LEFT JOIN gestion_riesgos.riesgos_tipo_objetivo rto
  ON rto.CODIGO_TIPO_OBJETIVO = rrx.CODIGO_TIPO_OBJETIVO
 AND rto.CODIGO_CIA = rrx.CODIGO_CIA
LEFT JOIN gestion_riesgos.riesgos_objetivo ro
  ON ro.CODIGO_OBJETIVO = rrx.CODIGO_OBJETIVO
 AND ro.CODIGO_CIA = rrx.CODIGO_CIA
 AND ro.CODIGO_TIPO_OBJETIVO = rrx.CODIGO_TIPO_OBJETIVO
LEFT JOIN gestion_riesgos.riesgos_area ra
  ON ra.CODIGO_AREA = rrx.CODIGO_AREA
 AND ra.CODIGO_CIA = rrx.CODIGO_CIA
LEFT JOIN gestion_riesgos.riesgos_probabilidad rprob
  ON rprob.CODIGO_PROBABILIDAD = rrx.CODIGO_PROBABILIDAD
LEFT JOIN gestion_riesgos.riesgos_severidad rsev
  ON rsev.CODIGO_SEVERIDAD = rrx.CODIGO_SEVERIDAD
LEFT JOIN gestion_riesgos.riesgos_mitigacion rm
  ON rm.CODIGO_MITIGACION = rrx.CODIGO_MITIGACION
LEFT JOIN gestion_riesgos.riesgos_tolerancia rtol
  ON rtol.CODIGO_TOLERANCIA = rrx.CODIGO_TOLERANCIA
LEFT JOIN gestion_riesgos.riesgos_frecuencia rf
  ON rf.CODIGO_FRECUENCIA = rrx.CODIGO_FRECUENCIA
 AND rf.CODIGO_CIA = rrx.CODIGO_CIA
LEFT JOIN gestion_riesgos.riesgos_viceministerio vi
  ON vi.CODIGO_CIA = rrx.CODIGO_CIA
 AND vi.CODIGO_VICEMINISTERIO = rrx.VICEMINISTERIO
LEFT JOIN gestion_riesgos.riesgos_organos org
  ON org.CODIGO_CIA = rrx.CODIGO_CIA
 AND org.CODIGO_ORGANO = rrx.ORGANO
WHERE COALESCE(rrx.ELIMINADO, 0) != 1
ORDER BY rrx.CODIGO_PERIODO ASC, rrx.CODIGO_RIESGO;
    `;

        const params = [
            codigo_cia, codigo_entidad, codigo_periodo
        ];
        const [rows] = await pool.execute(sql, params);
        return res.json({ ok: true, total: rows.length, datos: rows });
    } catch (err) {
        console.error("obtenerRiesgosRaizHaciaAtras error:", err);
        return res.status(500).json({ ok: false, msg: "Error al obtener los riesgos raíz por períodos." });
    }
};

/**
 * docsListar
 *
 * Función del controlador encargada de procesar la operación docsListar.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /documentos
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.docsListar = async (req, res) => {
    try {
        const codigo_cia = Number(req.codigo_cia);
        const codigo_entidad = Number(req.query?.codigo_entidad || req.codigo_entidad);
        const codigo_periodo = Number(req.query.codigo_periodo);
        const mes = Number(req.query.mes);

        if (!codigo_cia || !codigo_entidad) return res.status(400).json({ error: 'Faltan codigo_cia o codigo_entidad.' });
        if (!Number.isInteger(codigo_periodo)) return res.status(400).json({ error: 'codigo_periodo debe ser entero.' });
        if (!Number.isInteger(mes) || mes < 1 || mes > 12) return res.status(400).json({ error: 'mes debe estar entre 1 y 12.' });

        const sql = `
      SELECT
        CODIGO_DOC      AS codigo_doc,
        NOMBRE          AS nombre,
        MIME            AS mime,
        TAMANO          AS tamano,
        RUTA            AS ruta,
        FECHA_CREACION  AS fecha
      FROM gestion_riesgos.riesgos_seguimiento_docs
      WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND MES = ?
      ORDER BY FECHA_CREACION DESC, CODIGO_DOC DESC
    `;
        const [rows] = await pool.execute(sql, [codigo_cia, codigo_entidad, codigo_periodo, mes]);
        return res.json({ documentos: rows });
    } catch (err) {
        console.error('docsListar error:', err);
        return res.status(500).json({ error: 'Error al listar documentos.', detail: err.message });
    }
};

/**
 * docsSubir
 *
 * Función del controlador encargada de procesar la operación docsSubir.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route POST /documentos
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.docsSubir = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const codigo_cia = Number(req.codigo_cia);
        const codigo_entidad = Number(req.codigo_entidad);
        const codigo_periodo = Number(req.body.codigo_periodo);
        const mes = Number(req.body.mes);
        const files = req.files || [];

        if (!codigo_cia || !codigo_entidad) return res.status(400).json({ error: 'Faltan codigo_cia o codigo_entidad.' });
        if (!Number.isInteger(codigo_periodo)) return res.status(400).json({ error: 'codigo_periodo debe ser entero.' });
        if (!Number.isInteger(mes) || mes < 1 || mes > 12) return res.status(400).json({ error: 'mes debe estar entre 1 y 12.' });
        if (!Array.isArray(files) || files.length === 0) return res.status(400).json({ error: 'No se recibieron archivos.' });

        const invalids = [];
        for (const f of files) {
            if (!isAllowedFile(f)) invalids.push(f.originalname || '(archivo sin nombre)');
        }
        if (invalids.length > 0) {
            return res.status(400).json({
                ok: false,
                error: 'TIPO_NO_PERMITIDO',
                message: 'Solo se permiten PDF, Word, Excel y archivos de imagen.',
                invalid: invalids
            });
        }

        const relDir = path.join(`entidad${codigo_cia}`, 'seguimientos', `direccion${codigo_entidad}`, String(codigo_periodo), String(mes));
        const destDir = path.join(DOCS_ROOT, relDir);
        await ensureDir(destDir);

        await conn.beginTransaction();

        const inserted = [];
        for (const f of files) {
            const [[rowNext]] = await conn.execute(
                `
          SELECT COALESCE(MAX(CODIGO_DOC), 0) + 1 AS NEXT_DOC
          FROM gestion_riesgos.riesgos_seguimiento_docs
          WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND MES = ?
          FOR UPDATE
        `,
                [codigo_cia, codigo_entidad, codigo_periodo, mes]
            );
            const codigo_doc = Number(rowNext?.NEXT_DOC || 1);

            const original = safeName(f.originalname || 'archivo');
            const filename = `${Date.now()}__${original}`;
            const absPath = path.join(destDir, filename);
            await fs.writeFile(absPath, f.buffer);

            const sqlIns = `
        INSERT INTO gestion_riesgos.riesgos_seguimiento_docs
          (CODIGO_CIA, CODIGO_ENTIDAD, CODIGO_PERIODO, MES, CODIGO_DOC,
           NOMBRE, MIME, TAMANO, RUTA,
           USUARIO_CREACION, FECHA_CREACION)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
            const paramsIns = [
                codigo_cia, codigo_entidad, codigo_periodo, mes, codigo_doc,
                original, f.mimetype || null, f.size || null, absPath,
                req.userId || null
            ];
            await conn.execute(sqlIns, paramsIns);

            inserted.push({ codigo_doc, nombre: original });
        }

        await conn.commit();
        return res.status(201).json({ ok: true, message: 'Archivo(s) subido(s) correctamente.', inserted });
    } catch (err) {
        try { await conn.rollback(); } catch { }
        console.error('docsSubir error:', err);
        return res.status(500).json({ error: 'Error al subir documentos.', detail: err.message });
    } finally {
        try { conn.release(); } catch { }
    }
};

/**
 * docsDescargar
 *
 * Función del controlador encargada de procesar la operación docsDescargar.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /documentos/:codigo_doc/descargar
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.docsDescargar = async (req, res) => {
    try {
        const codigo_cia = Number(req.codigo_cia);
        const codigo_entidad = Number(req.query?.codigo_entidad || req.codigo_entidad);
        const codigo_doc = Number(req.params.codigo_doc);
        const codigo_periodo = Number(req.query.codigo_periodo);
        const mes = Number(req.query.mes);

        if (!codigo_cia || !codigo_entidad) return res.status(400).json({ error: 'Faltan codigo_cia o codigo_entidad.' });
        if (!Number.isInteger(codigo_doc)) return res.status(400).json({ error: 'codigo_doc inválido.' });
        if (!Number.isInteger(codigo_periodo)) return res.status(400).json({ error: 'codigo_periodo debe ser entero.' });
        if (!Number.isInteger(mes) || mes < 1 || mes > 12) return res.status(400).json({ error: 'mes debe estar entre 1 y 12.' });

        const sql = `
      SELECT NOMBRE AS nombre, MIME AS mime, RUTA AS ruta
      FROM gestion_riesgos.riesgos_seguimiento_docs
      WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND MES = ? AND CODIGO_DOC = ?
      LIMIT 1
    `;
        const [rows] = await pool.execute(sql, [codigo_cia, codigo_entidad, codigo_periodo, mes, codigo_doc]);
        if (!rows || rows.length === 0) return res.status(404).json({ error: 'Documento no encontrado.' });

        const doc = rows[0];
        return res.download(doc.ruta, doc.nombre);
    } catch (err) {
        console.error('docsDescargar error:', err);
        return res.status(500).json({ error: 'Error al descargar documento.', detail: err.message });
    }
};

exports.eliminarDocumento = async (req, res) => {
    const { codigo_doc } = req.params;
    const { periodo, mes } = req.body;
    const codigo_cia = req.codigo_cia;
    try {
        const sql = `
        UPDATE gestion_riesgos.riesgos_seguimiento_docs
        SET ACTIVO                  = '0',
            USUARIO_MODIFICACION    = ?,
            FECHA_MODIFICACION      = NOW()
       WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND MES = ? AND CODIGO_DOC = ?
    `;
        const params = [req.userId, codigo_cia, req.codigo_entidad, periodo, mes, codigo_doc,];

        const [result] = await pool.execute(sql, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Error al eliminar documento' });
        }

        return res.json({ mensaje: 'Error al eliminar documento' });
    } catch (err) {
        console.error('actualizar documento:', err);
        return res.status(500).json({ error: 'Error al eliminar documento' });
    }

}

/**
 * copiarSiguientePeriodo
 *
 * Función del controlador encargada de procesar la operación copiarSiguientePeriodo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route POST /copiar-riesgo-proximo-periodo
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.copiarSiguientePeriodo = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = Number(req.body.codigo_entidad);
    const codigo_riesgo = Number(req.body.codigo_riesgo);
    const pPeriodo = Number(req.body.codigo_periodo) + 1;
    let conn;

    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [[nxt]] = await conn.execute(
            `
        SELECT COALESCE(MAX(CODIGO_RIESGO), 0) + 1 AS NEXT_VAL
        FROM gestion_riesgos.riesgos_riesgo_extendido
        WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ?
        FOR UPDATE
      `,
            [codigo_cia, codigo_entidad, pPeriodo]
        );
        const codigo_riesgoN = Number(nxt?.NEXT_VAL || 1);

        const sql = `
      INSERT INTO gestion_riesgos.riesgos_riesgo_extendido (
        codigo_cia, codigo_entidad, descripcion, codigo_area, 
        codigo_objetivo, codigo_tipo_objetivo, ref, organo, viceministerio,
        codigo_riesgo, periodo_anterior, codigo_periodo,
        usuario_creacion, fecha_creacion
      )
      SELECT 
        s.codigo_cia, s.codigo_entidad, s.descripcion, s.codigo_area, 
        s.codigo_objetivo, s.codigo_tipo_objetivo, s.ref, s.organo, s.viceministerio,
        ? AS codigo_riesgo, ? AS periodo_anterior, ? AS codigo_periodo,
        ? AS usuario_creacion, now() as fecha_creacion
      FROM   gestion_riesgos.riesgos_riesgo_extendido AS s
      WHERE  s.codigo_cia = ? 
         AND s.codigo_entidad = ? 
         AND s.codigo_periodo = ?         -- periodo origen (pPeriodo - 1)
         AND s.codigo_riesgo = ?
         AND NOT EXISTS (
              SELECT 1
              FROM gestion_riesgos.riesgos_riesgo_extendido t
              WHERE t.codigo_cia = s.codigo_cia
                AND t.codigo_entidad = s.codigo_entidad
                AND t.codigo_periodo = ?   -- destino
                AND t.ref = s.ref
         )
    `;
        const [result] = await conn.execute(sql, [
            codigo_riesgoN,
            codigo_riesgo,
            pPeriodo,
            req.userId,
            codigo_cia,
            codigo_entidad,
            pPeriodo - 1,
            codigo_riesgo,
            pPeriodo
        ]);

        if ((result?.affectedRows ?? 0) === 0) {
            await conn.rollback();
            return res.status(409).json({ message: "Ya existe un riesgo con la misma referencia en el periodo destino." });
        }

        await conn.commit();
        return res.status(201).json({ message: "Riesgo creado exitosamente." });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error("❌ copiarSiguientePeriodo:", err);
        return res.status(500).json({ error: "Error al crear el riesgo extendido." });
    } finally {
        try { conn?.release?.(); } catch { }
    }
};

/**
 * relacionarRiesgoAnteriorPeriodo
 *
 * Función del controlador encargada de procesar la operación relacionarRiesgoAnteriorPeriodo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /relacionar-riesgo-anterior-periodo
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.relacionarRiesgoAnteriorPeriodo = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = Number(req.body.codigo_entidad);
    const codigo_periodo = Number(req.body.codigo_periodo_actual);
    const riesgo_actual = req.body.riesgo_actual;
    const riesgo_anterior = req.body.riesgo_anterior;
    try {
        const sql = `
      UPDATE gestion_riesgos.riesgos_riesgo_extendido
      SET periodo_anterior = ?,
          usuario_modificacion = ?,
          fecha_modificacion = NOW()
      WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND CODIGO_RIESGO = ?
    `;
        const params = [
            riesgo_anterior.codigo_riesgo, req.userId, codigo_cia, codigo_entidad, codigo_periodo, riesgo_actual.codigo_riesgo
        ];

        const [result] = await pool.execute(sql, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Riesgo no encontrado' });
        }

        return res.json({ mensaje: 'Riesgo actualizado correctamente' });
    } catch (err) {
        console.error('actualizarRiesgo:', err);
        return res.status(500).json({ error: 'Error al actualizar riesgo' });
    }
};

/**
 * obtenerSeguimientosPorCia
 *
 * Función del controlador encargada de procesar la operación obtenerSeguimientosPorCia.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /listar-direcciones
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerSeguimientosPorCia = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_periodo = req.query.codigo_periodo;
    if (!codigo_cia) {
        return res.status(400).json({ ok: false, msg: 'Falta codigo_cia en el request.' });
    }

    const q = req.query || {};

    let codigo_entidad;
    if (q.codigo_entidad !== undefined && q.codigo_entidad !== null && q.codigo_entidad !== '') {
        const n = Number(q.codigo_entidad);
        if (!Number.isNaN(n)) codigo_entidad = n;
    }

    let mes;
    if (q.mes !== undefined && q.mes !== null && q.mes !== '') {
        const n = Number(q.mes);
        if (!Number.isNaN(n) && n >= 1 && n <= 12) mes = n;
    }

    let mes_inicio;
    if (q.mes_inicio !== undefined && q.mes_inicio !== null && q.mes_inicio !== '') {
        const n = Number(q.mes_inicio);
        if (!Number.isNaN(n) && n >= 1 && n <= 12) mes_inicio = n;
    }

    let mes_fin;
    if (q.mes_fin !== undefined && q.mes_fin !== null && q.mes_fin !== '') {
        const n = Number(q.mes_fin);
        if (!Number.isNaN(n) && n >= 1 && n <= 12) mes_fin = n;
    }

    let where = ' WHERE CODIGO_CIA = ? ';
    const params = [codigo_cia];

    if (codigo_entidad !== undefined) {
        where += ' AND CODIGO_ENTIDAD = ? ';
        params.push(codigo_entidad);
    }

    if (mes !== undefined) {
        where += ' AND MES = ? ';
        params.push(mes);
    } else {
        if (mes_inicio !== undefined && mes_fin === undefined) {
            where += ' AND MES BETWEEN ? AND 12 ';
            params.push(mes_inicio);
        } else if (mes_inicio === undefined && mes_fin !== undefined) {
            where += ' AND MES BETWEEN 1 AND ? ';
            params.push(mes_fin);
        } else if (mes_inicio !== undefined && mes_fin !== undefined) {
            const mi = Math.min(mes_inicio, mes_fin);
            const mf = Math.max(mes_inicio, mes_fin);
            where += ' AND MES BETWEEN ? AND ? ';
            params.push(mi, mf);
        }
    }

    where += ' AND codigo_periodo = ?'
    params.push(codigo_periodo)

    const sql = `
    SELECT
      CODIGO_CIA,
      CODIGO_ENTIDAD,
      CODIGO_PERIODO,
      MES,
      SECCION1,
      SECCION2,
      SECCION3,
      SECCION4
    FROM gestion_riesgos.riesgos_seguimiento
    ${where}
    ORDER BY CODIGO_ENTIDAD ASC, MES ASC, CODIGO_PERIODO ASC
  `;

    try {
        const [rows] = await pool.execute(sql, params);

        const data = rows.map(r => {
            let s1 = [];
            try { if (r.SECCION1 !== null && r.SECCION1 !== undefined && r.SECCION1 !== '') s1 = JSON.parse(r.SECCION1); } catch { }
            let s2 = [];
            try { if (r.SECCION2 !== null && r.SECCION2 !== undefined && r.SECCION2 !== '') s2 = JSON.parse(r.SECCION2); } catch { }
            let s3 = [];
            try { if (r.SECCION3 !== null && r.SECCION3 !== undefined && r.SECCION3 !== '') s3 = JSON.parse(r.SECCION3); } catch { }
            let s4 = {};
            try { if (r.SECCION4 !== null && r.SECCION4 !== undefined && r.SECCION4 !== '') s4 = JSON.parse(r.SECCION4); } catch { }

            return {
                codigo_cia: r.CODIGO_CIA,
                codigo_entidad: r.CODIGO_ENTIDAD,
                codigo_periodo: r.CODIGO_PERIODO,
                mes: r.MES,
                seccion1: Array.isArray(s1) ? s1 : [],
                seccion2: Array.isArray(s2) ? s2 : [],
                seccion3: Array.isArray(s3) ? s3 : [],
                seccion4: (s4 && typeof s4 === 'object' && !Array.isArray(s4)) ? s4 : {}
            };
        });

        return res.json({
            ok: true,
            found: data.length > 0,
            codigo_cia,
            filtros: {
                codigo_entidad: codigo_entidad ?? null,
                mes: mes ?? null,
                mes_inicio: mes_inicio ?? null,
                mes_fin: mes_fin ?? null
            },
            total: data.length,
            data
        });
    } catch (err) {
        console.error('obtenerSeguimientosPorCia error:', err);
        return res.status(500).json({ ok: false, msg: 'Error obteniendo seguimientos.', error: String(err?.message || err) });
    }
};

/**
 * listaPeriodo
 *
 * Función del controlador encargada de procesar la operación listaPeriodo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /lista-periodo
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.listaPeriodo = async (req, res) => {
    try {
        const codigo_cia = Number(req.codigo_cia);
        const codigo_periodo = Number(req.query.periodo);

        if (!codigo_cia || !codigo_periodo) {
            return res.status(400).json({ ok: false, error: "Faltan parámetros (periodo) o contexto (codigo_cia)." });
        }

        const sql = `
      SELECT
        CODIGO        AS codigo,
        TITULO        AS titulo,
        FECHA_CREACION AS fecha_creacion,
        FECHA_MODIFICACION AS fecha_modificacion
      FROM gestion_riesgos.riesgos_seguimiento_reporte
      WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
      ORDER BY IFNULL(FECHA_MODIFICACION, FECHA_CREACION) DESC, CODIGO DESC
    `;
        const [rows] = await pool.execute(sql, [codigo_cia, codigo_periodo]);

        return res.json({ ok: true, data: rows || [] });
    } catch (err) {
        console.error("listaPeriodo error:", err);
        return res.status(500).json({ ok: false, error: "Error interno al listar reportes." });
    }
};

/**
 * obtenerInformacion
 *
 * Función del controlador encargada de procesar la operación obtenerInformacion.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /obtener-informacion
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerInformacion = async (req, res) => {
    try {
        const codigo_cia = Number(req.codigo_cia);
        const codigo_periodo = Number(req.query.periodo);
        const codigo = Number(req.query.codigo);

        if (!codigo_cia || !codigo_periodo || !codigo) {
            return res.status(400).json({ ok: false, error: "Faltan parámetros requeridos." });
        }

        const sql = `
      SELECT
        CODIGO_CIA, CODIGO_PERIODO, CODIGO,
        TITULO,
        INFORMACION,
        USUARIO_CREACION, FECHA_CREACION,
        USUARIO_MODIFICACION, FECHA_MODIFICACION
      FROM gestion_riesgos.riesgos_seguimiento_reporte
      WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO = ?
      LIMIT 1
    `;
        const [rows] = await pool.execute(sql, [codigo_cia, codigo_periodo, codigo]);

        if (!rows || rows.length === 0) {
            return res.json({ ok: true, found: false, data: null });
        }

        const r = rows[0];
        let informacion = [];
        try {
            informacion = Array.isArray(r.INFORMACION) ? r.INFORMACION : JSON.parse(r.INFORMACION || "[]");
        } catch (_) {
            informacion = [];
        }

        return res.json({
            ok: true,
            found: true,
            data: {
                codigo_cia: r.CODIGO_CIA,
                codigo_periodo: r.CODIGO_PERIODO,
                codigo: r.CODIGO,
                titulo: r.TITULO,
                informacion,
                usuario_creacion: r.USUARIO_CREACION,
                fecha_creacion: r.FECHA_CREACION,
                usuario_modificacion: r.USUARIO_MODIFICACION,
                fecha_modificacion: r.FECHA_MODIFICACION,
            },
        });
    } catch (err) {
        console.error("obtenerInformacion error:", err);
        return res.status(500).json({ ok: false, error: "Error interno al obtener el reporte." });
    }
};

/**
 * crearReporte
 *
 * Función del controlador encargada de procesar la operación crearReporte.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route POST /crear-reporte
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.crearReporte = async (req, res) => {
    try {
        const codigo_cia = Number(req.codigo_cia);
        const usuario = req.userId;
        const codigo_periodo = Number(req.body.periodo);
        const titulo = (req.body.titulo || "Reporte").toString().slice(0, 255);
        const infoArr = Array.isArray(req.body.informacion) ? req.body.informacion : [];

        if (!codigo_cia || !usuario || !codigo_periodo) {
            return res.status(400).json({ ok: false, error: "Faltan parámetros o contexto (periodo, usuario, cia)." });
        }

        const [maxRows] = await pool.execute(
            "SELECT COALESCE(MAX(CODIGO), 0) + 1 AS nextCodigo FROM gestion_riesgos.riesgos_seguimiento_reporte WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?",
            [codigo_cia, codigo_periodo]
        );
        const codigo = Number(maxRows?.[0]?.nextCodigo || 1);

        const sql = `
      INSERT INTO gestion_riesgos.riesgos_seguimiento_reporte
      (CODIGO_CIA, CODIGO_PERIODO, CODIGO, TITULO, INFORMACION,
       USUARIO_CREACION, FECHA_CREACION, USUARIO_MODIFICACION, FECHA_MODIFICACION)
      VALUES (?,?,?,?,?, ?, NOW(), ?, NOW())
    `;
        const params = [
            codigo_cia,
            codigo_periodo,
            codigo,
            titulo,
            JSON.stringify(infoArr),
            usuario,
            usuario,
        ];

        await pool.execute(sql, params);

        return res.json({ ok: true, codigo });
    } catch (err) {
        console.error("crearReporte error:", err);
        return res.status(500).json({ ok: false, error: "Error interno al crear el reporte." });
    }
};

/**
 * actualizarReporte
 *
 * Función del controlador encargada de procesar la operación actualizarReporte.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /actualizar-reporte
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.actualizarReporte = async (req, res) => {
    try {
        const codigo_cia = Number(req.codigo_cia);
        const usuario = req.userId;
        const codigo_periodo = Number(req.body.periodo);
        const codigo = Number(req.body.codigo);
        const titulo = (req.body.titulo || "Reporte").toString().slice(0, 255);
        const infoArr = Array.isArray(req.body.informacion) ? req.body.informacion : [];

        if (!codigo_cia || !usuario || !codigo_periodo || !codigo) {
            return res.status(400).json({ ok: false, error: "Faltan parámetros requeridos." });
        }

        const sql = `
      UPDATE gestion_riesgos.riesgos_seguimiento_reporte
      SET TITULO = ?,
          INFORMACION = ?,
          USUARIO_MODIFICACION = ?,
          FECHA_MODIFICACION = NOW()
      WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND CODIGO = ?
    `;
        const params = [
            titulo,
            JSON.stringify(infoArr),
            usuario,
            codigo_cia, codigo_periodo, codigo
        ];

        const [result] = await pool.execute(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ ok: false, error: "Reporte no encontrado." });
        }

        return res.json({ ok: true, updated: true });
    } catch (err) {
        console.error("actualizarReporte error:", err);
        return res.status(500).json({ ok: false, error: "Error interno al actualizar el reporte." });
    }
};