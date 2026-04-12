/**
 * @fileoverview
 * Controlador institucional del módulo de Gestión de Riesgos.
 * Expone servicios para obtener y guardar matrices institucionales (primera y segunda matriz)
 * y para registrar el informe anual institucional por período.
 *
 * @module controller/riesgos/institucion
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

/**
 * obtenerPrimeraMatrizDirecciones
 *
 * Devuelve el estado de la primera matriz por dirección (entidad) para un período.
 *
 * - Usa el código de institución (`req.codigo_cia`) y el período solicitado.
 * - Consulta el historial de la primera matriz a nivel de entidad y consolida el último estado
 *   (aprobación, rechazo, usuario, fechas y comentarios) por dirección.
 *
 * @route GET /obtener-primer-matriz-direcciones
 * @returns {200|400|500} JSON con `ok`, `found` y el arreglo de direcciones con su estado de matriz.
 */
exports.obtenerPrimeraMatrizDirecciones = async (req, res) => {
    const cia = Number(req.codigo_cia);
    const periodo = Number(req.query?.periodo);

    if (!cia || !periodo) {
        return res.status(400).json({ ok: false, message: 'Faltan cia/periodo.' });
    }

    let cn;
    try {
        cn = await pool.getConnection();

        const [rows] = await cn.query(
            `
            SELECT 
                h.CODIGO_HISTORIAL,
                h.CODIGO_CIA,
                h.CODIGO_ENTIDAD,
                h.CODIGO_PERIODO,
                h.ESTADO,
                h.RESPUESTA,
                h.COMENTARIO_SUPERVISOR,
                h.USUARIO_CREACION,
                CONCAT_WS(' ',
                    p1.PRIMER_NOMBRE, p1.SEGUNDO_NOMBRE, p1.TERCER_NOMBRE,
                    p1.PRIMER_APELLIDO, p1.SEGUNDO_APELLIDO, p1.TERCER_APELLIDO
                ) AS NOMBRE_USUARIO_CREACION,
                h.FECHA_CREACION,
                h.USUARIO_MODIFICACION,
                CONCAT_WS(' ',
                    p2.PRIMER_NOMBRE, p2.SEGUNDO_NOMBRE, p2.TERCER_NOMBRE,
                    p2.PRIMER_APELLIDO, p2.SEGUNDO_APELLIDO, p2.TERCER_APELLIDO
                ) AS NOMBRE_USUARIO_MODIFICACION,
                h.FECHA_MODIFICACION,
                h.ESTADO_SUPERIOR,
                h.COMENTARIO_SUPERVISOR,
                h.FECHA_SUPERIOR,
                h.USUARIO_SUPERIOR,
                CONCAT_WS(' ',
                    p3.PRIMER_NOMBRE, p3.SEGUNDO_NOMBRE, p3.TERCER_NOMBRE,
                    p3.PRIMER_APELLIDO, p3.SEGUNDO_APELLIDO, p3.TERCER_APELLIDO
                ) AS NOMBRE_USUARIO_SUPERIOR,
                ent.NOMBRE AS NOMBRE_ENTIDAD,
                ent.SIGLAS AS SIGLAS_ENTIDAD
            FROM gestion_riesgos.riesgos_primera_matriz_his h
            JOIN (
                SELECT 
                    CODIGO_CIA,
                    CODIGO_PERIODO,
                    CODIGO_ENTIDAD,
                    MAX(CODIGO_HISTORIAL) AS MAX_HIS
                FROM gestion_riesgos.riesgos_primera_matriz_his
                WHERE CODIGO_CIA = ? 
                  AND CODIGO_PERIODO = ?
                GROUP BY CODIGO_CIA, CODIGO_PERIODO, CODIGO_ENTIDAD
            ) z  ON z.CODIGO_CIA = h.CODIGO_CIA
                AND z.CODIGO_PERIODO = h.CODIGO_PERIODO
                AND z.CODIGO_ENTIDAD = h.CODIGO_ENTIDAD
                AND z.MAX_HIS = h.CODIGO_HISTORIAL
            LEFT JOIN seguridad.seguridad_persona p1
                ON p1.CODIGO_CIA = h.CODIGO_CIA
               AND p1.CODIGO_COLABORADOR = h.USUARIO_CREACION
            LEFT JOIN seguridad.seguridad_persona p2
                ON p2.CODIGO_CIA = h.CODIGO_CIA
               AND p2.CODIGO_COLABORADOR = h.USUARIO_MODIFICACION
            LEFT JOIN seguridad.seguridad_persona p3
                ON p3.CODIGO_CIA = h.CODIGO_CIA
               AND p3.CODIGO_COLABORADOR = h.USUARIO_SUPERIOR
            LEFT JOIN seguridad.seguridad_entidad ent
                ON ent.CODIGO_CIA = h.CODIGO_CIA
               AND ent.CODIGO_ENTIDAD = h.CODIGO_ENTIDAD
            WHERE h.CODIGO_CIA = ?
              AND h.CODIGO_PERIODO = ?
            ORDER BY h.CODIGO_ENTIDAD
            `,
            [cia, periodo, cia, periodo]
        );

        const historial = rows.map((r) => {
            let parsed = null;

            if (r.RESPUESTA) {
                try {
                    let temp = r.RESPUESTA.trim();

                    while (typeof temp === "string") {
                        try {
                            temp = JSON.parse(temp);
                        } catch {
                            break;
                        }
                    }

                    if (Array.isArray(temp) && temp.length === 1 && typeof temp[0] === "object") {
                        parsed = temp[0];
                    } else if (typeof temp === "object" && temp !== null) {
                        parsed = temp;
                    }
                } catch {
                    console.warn("RESPUESTA malformada:", r.CODIGO_HISTORIAL);
                }
            }

            return {
                ...r,
                RESPUESTA: parsed,
            };
        });

        return res.json({ ok: true, historial });
    } catch (err) {
        console.error('getPrimeraMatriz direcciones error', err);
        return res.status(500).json({ ok: false, message: 'Error interno al obtener matrices.' });
    } finally {
        try { cn?.release?.(); } catch { }
    }
};

const asNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

/**
 * attachInstitucion
 *
 * Adjunta al `request` la información básica de la institución (nombre, siglas, tipo).
 *
 * - Utiliza `req.codigo_cia` para leer la institución en `seguridad_institucion`.
 * - Si existe, agrega `req.institucion = { tipo, nombre }` para ser utilizado por otros handlers
 *   (por ejemplo al responder la matriz institucional).
 *
 * @param {Object} req Objeto de solicitud Express (se espera `req.codigo_cia`).
 * @param {Object} [cn] Conexión opcional de MySQL ya abierta; si no se provee se obtiene del pool.
 * @returns {Promise<void>} Lanza error en caso de fallo de base de datos.
 */
exports.attachInstitucion = async (req, res, next) => {
    const codigo_cia = req.codigo_cia;
    if (!codigo_cia) {
        return res.status(400).json({ msg: 'Falta codigo_cia' });
    }

    try {
        const sql = `
      SELECT TIPO, NOMBRE
      FROM \`seguridad\`.\`seguridad_institucion\`
      WHERE CODIGO_CIA = ?
      LIMIT 1
    `;
        const [rows] = await pool.execute({
            sql,
            values: [codigo_cia],
            timeout: 12000,
        });

        if (!rows.length) {
            return res.status(404).json({ msg: 'Institución no encontrada' });
        }

        req.institucion = rows[0];
        return next();
    } catch (err) {
        console.error('attachInstitucion error:', err);
        return res.status(500).json({ msg: 'Error interno al obtener institución' });
    }
};

/**
 * getPrimeraMatriz
 *
 * Obtiene la última versión de la primera matriz institucional para un período.
 *
 * - Lee la versión más reciente en `riesgos_primera_matriz` por compañía y período.
 * - Devuelve la versión, el payload de matrices (parseado desde JSON) y la información de institución
 *   adjuntada previamente en `req.institucion`.
 *
 * @route GET /primera-matriz
 * @returns {200|400|404|500} JSON con `ok`, `found`, `version`, `matrices` e `institucion`.
 */
exports.getPrimeraMatriz = async (req, res) => {
    const cia = asNum(req.codigo_cia);
    const periodo = asNum(req.query?.periodo);
    const tipo = asNum(req.query?.tipo ?? 1);

    if (!cia || !periodo) {
        return res.status(400).json({ ok: false, message: 'Faltan cia/periodo.' });
    }

    let cn;
    try {
        cn = await pool.getConnection();

        const [rows] = await cn.query(
            `
        SELECT VERSION, RESPUESTA
        FROM gestion_riesgos.riesgos_matriz_insti
        WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND TIPO = ?
        ORDER BY VERSION DESC
        LIMIT 1
      `,
            [cia, periodo, tipo]
        );

        if (!rows.length) {
            return res.json({ ok: true, matrices: [], found: false, version: null });
        }

        const row = rows[0];
        let payload = {};
        try {
            const raw = row.RESPUESTA ?? '{}';
            payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
            payload = {};
        }

        const matrices = Array.isArray(payload?.matrices)
            ? payload.matrices
            : Array.isArray(payload?.MATRICES)
                ? payload.MATRICES
                : [];

        return res.json({
            ok: true,
            found: true,
            version: row.VERSION,
            matrices,
            institucion: req.institucion,
        });
    } catch (err) {
        console.error('getPrimeraMatriz error', err);
        return res
            .status(500)
            .json({ ok: false, message: 'Error interno al obtener matriz.' });
    } finally {
        try {
            cn?.release?.();
        } catch { }
    }
};

/**
 * savePrimeraMatriz
 *
 * Guarda una nueva versión de la primera matriz institucional para un período.
 *
 * - Recibe `periodo`, `tipo` (por defecto 1) y el arreglo de `matrices` en el cuerpo.
 * - Calcula `VERSION = MAX(VERSION) + 1` para la partición (cia, periodo, tipo) usando
 *   transacción y `FOR UPDATE` para garantizar consistencia.
 * - Inserta la nueva versión en `riesgos_primera_matriz` registrando usuario y fecha.
 *
 * @route POST /primera-matriz
 * @returns {200|400|500} JSON con `ok`, `version` guardada y totales de filas afectadas.
 */
exports.savePrimeraMatriz = async (req, res) => {
    const cia = asNum(req.codigo_cia);
    const usuario = (req.userId ?? 'SYSTEM').toString().slice(0, 50) || 'SYSTEM';
    const periodo = asNum(req.body?.periodo);
    const tipo = asNum(req.body?.tipo ?? 1);
    const matrices = Array.isArray(req.body?.matrices) ? req.body.matrices : [];

    if (!cia || !periodo) {
        return res.status(400).json({ ok: false, message: 'Faltan cia/periodo.' });
    }

    let cn;
    try {
        cn = await pool.getConnection();
        await cn.beginTransaction();

        const [lockRows] = await cn.query(
            `
        SELECT IFNULL(MAX(VERSION), 0) + 1 AS NEXT_VER
        FROM gestion_riesgos.riesgos_matriz_insti
        WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND TIPO = ?
        FOR UPDATE
      `,
            [cia, periodo, tipo]
        );
        const nextVersion = asNum(lockRows?.[0]?.NEXT_VER || 1);

        const jsonStr = JSON.stringify({ matrices });

        await cn.query(
            `
        INSERT INTO gestion_riesgos.riesgos_matriz_insti
          (CODIGO_CIA, CODIGO_PERIODO, TIPO, VERSION, RESPUESTA, USUARIO_CREACION, FECHA_CREACION)
        VALUES
          (?,           ?,             ?,    ?,       ?,         ?,                 NOW())
      `,
            [cia, periodo, tipo, nextVersion, jsonStr, usuario]
        );

        await cn.commit();
        return res.json({ ok: true, version: nextVersion });
    } catch (err) {
        console.error('savePrimeraMatriz error', err);
        try { await cn?.rollback(); } catch { }
        return res.status(500).json({ ok: false, message: 'Error interno al guardar.' });
    } finally {
        try { cn?.release?.(); } catch { }
    }
};

/**
 * obtenerSegundaMatrizDirecciones
 *
 * Devuelve el estado de la segunda matriz por dirección (entidad) para un período.
 *
 * - Similar a `obtenerPrimeraMatrizDirecciones`, pero consultando el historial
 *   de la segunda matriz institucional.
 * - Consolida, por dirección, el último registro de historial (estado, usuario, fechas, comentarios).
 *
 * @route GET /obtener-segunda-matriz-direcciones
 * @returns {200|400|500} JSON con `ok`, `found` y arreglo de direcciones con su estado de segunda matriz.
 */
exports.obtenerSegundaMatrizDirecciones = async (req, res) => {
    const cia = Number(req.codigo_cia);
    const periodo = Number(req.query?.periodo);

    if (!cia || !periodo) {
        return res.status(400).json({ ok: false, message: 'Faltan cia/periodo.' });
    }

    let cn;
    try {
        cn = await pool.getConnection();

        const [rows] = await cn.query(
            `
            SELECT 
                h.CODIGO_HISTORIAL,
                h.CODIGO_CIA,
                h.CODIGO_ENTIDAD,
                h.CODIGO_PERIODO,
                h.ESTADO,
                h.RESPUESTA,
                h.COMENTARIO_SUPERVISOR,
                h.USUARIO_CREACION,
                CONCAT_WS(' ',
                    p1.PRIMER_NOMBRE, p1.SEGUNDO_NOMBRE, p1.TERCER_NOMBRE,
                    p1.PRIMER_APELLIDO, p1.SEGUNDO_APELLIDO, p1.TERCER_APELLIDO
                ) AS NOMBRE_USUARIO_CREACION,
                h.FECHA_CREACION,
                h.USUARIO_MODIFICACION,
                CONCAT_WS(' ',
                    p2.PRIMER_NOMBRE, p2.SEGUNDO_NOMBRE, p2.TERCER_NOMBRE,
                    p2.PRIMER_APELLIDO, p2.SEGUNDO_APELLIDO, p2.TERCER_APELLIDO
                ) AS NOMBRE_USUARIO_MODIFICACION,
                h.FECHA_MODIFICACION,
                h.ESTADO_SUPERIOR,
                h.COMENTARIO_SUPERIOR,
                h.FECHA_SUPERIOR,
                h.USUARIO_SUPERIOR,
                CONCAT_WS(' ',
                    p3.PRIMER_NOMBRE, p3.SEGUNDO_NOMBRE, p3.TERCER_NOMBRE,
                    p3.PRIMER_APELLIDO, p3.SEGUNDO_APELLIDO, p3.TERCER_APELLIDO
                ) AS NOMBRE_USUARIO_SUPERIOR,
                ent.nombre  AS NOMBRE_ENTIDAD,
                ent.siglas  AS SIGLAS_ENTIDAD
            FROM gestion_riesgos.riesgos_segunda_matriz_his h
            JOIN (
                SELECT CODIGO_ENTIDAD, MAX(CODIGO_HISTORIAL) AS MAX_HIS
                FROM gestion_riesgos.riesgos_segunda_matriz_his
                WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
                GROUP BY CODIGO_ENTIDAD
            ) u ON u.CODIGO_ENTIDAD = h.CODIGO_ENTIDAD
            AND u.MAX_HIS = h.CODIGO_HISTORIAL
            LEFT JOIN seguridad.seguridad_persona p1
                ON p1.CODIGO_CIA = h.CODIGO_CIA
            AND p1.CODIGO_COLABORADOR = h.USUARIO_CREACION
            LEFT JOIN seguridad.seguridad_persona p2
                ON p2.CODIGO_CIA = h.CODIGO_CIA
            AND p2.CODIGO_COLABORADOR = h.USUARIO_MODIFICACION
            LEFT JOIN seguridad.seguridad_persona p3
                ON p3.CODIGO_CIA = h.CODIGO_CIA
            AND p3.CODIGO_COLABORADOR = h.USUARIO_SUPERIOR
            LEFT JOIN seguridad.seguridad_entidad ent
                ON ent.CODIGO_CIA = h.CODIGO_CIA
            AND ent.CODIGO_ENTIDAD = h.CODIGO_ENTIDAD
            WHERE h.CODIGO_CIA = ? 
            AND h.CODIGO_PERIODO = ?
            ORDER BY h.CODIGO_ENTIDAD;
            `,
            [cia, periodo, cia, periodo]
        );

        const historial = rows.map((r) => {
            let parsed = null;

            if (r.RESPUESTA) {
                try {
                    let temp = r.RESPUESTA.trim();

                    while (typeof temp === "string") {
                        try {
                            temp = JSON.parse(temp);
                        } catch {
                            break;
                        }
                    }

                    if (Array.isArray(temp) && temp.length === 1 && typeof temp[0] === "object") {
                        parsed = temp[0];
                    } else if (typeof temp === "object" && temp !== null) {
                        parsed = temp;
                    }
                } catch {
                    console.warn("RESPUESTA malformada:", r.CODIGO_HISTORIAL);
                }
            }

            return {
                ...r,
                RESPUESTA: parsed,
            };
        });

        return res.json({ ok: true, historial });
    } catch (err) {
        console.error('getPrimeraMatriz direcciones error', err);
        return res.status(500).json({ ok: false, message: 'Error interno al obtener matrices.' });
    } finally {
        try { cn?.release?.(); } catch { }
    }
};

/**
 * getSegundaMatriz
 *
 * Obtiene la última versión de la segunda matriz institucional para un período.
 *
 * - Localiza el registro más reciente en `riesgos_segunda_matriz` para la combinación
 *   (cia, período, tipo).
 * - Intenta deserializar el campo `RESPUESTA` a objeto/JSON y extrae el arreglo `matrices`
 *   (aceptando formatos `matrices` o `MATRICES`).
 *
 * @route GET /segunda-matriz
 * @returns {200|400|404|500} JSON con `ok`, `found`, `version`, `matrices` e `institucion`.
 */
exports.getSegundaMatriz = async (req, res) => {
    const cia = asNum(req.codigo_cia);
    const periodo = asNum(req.query?.periodo);
    const tipo = asNum(req.query?.tipo ?? 2);

    if (!cia || !periodo) {
        return res.status(400).json({ ok: false, message: 'Faltan cia/periodo.' });
    }

    let cn;
    try {
        cn = await pool.getConnection();
        const [rows] = await cn.query(
            `
        SELECT VERSION, RESPUESTA
        FROM gestion_riesgos.riesgos_matriz_insti
        WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND TIPO = ?
        ORDER BY VERSION DESC
        LIMIT 1
      `,
            [cia, periodo, tipo]
        );

        if (!rows.length) {
            return res.json({ ok: true, matrices: [], found: false, version: null });
        }

        const row = rows[0];
        let payload = {};
        try {
            const raw = row.RESPUESTA ?? '{}';
            payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
            payload = {};
        }

        const matrices = Array.isArray(payload?.matrices)
            ? payload.matrices
            : Array.isArray(payload?.MATRICES)
                ? payload.MATRICES
                : [];

        return res.json({ ok: true, found: true, version: row.VERSION, matrices, institucion: req.institucion, });
    } catch (e) {
        console.error('getSegundaMatriz', e);
        return res.status(500).json({ ok: false, message: 'Error interno al obtener.' });
    } finally {
        try { cn?.release?.(); } catch { }
    }
};

/**
 * saveSegundaMatriz
 *
 * Guarda una nueva versión de la segunda matriz institucional para un período.
 *
 * - Recibe `periodo`, `tipo` y el arreglo de `matrices` en el cuerpo.
 * - Calcula la siguiente versión (`MAX(VERSION)+1`) dentro de una transacción.
 * - Inserta o actualiza el registro de `riesgos_segunda_matriz` con la respuesta serializada.
 *
 * @route POST /segunda-matriz
 * @returns {200|400|500} JSON con `ok`, `version` y resumen de filas afectadas.
 */
exports.saveSegundaMatriz = async (req, res) => {
    const cia = asNum(req.codigo_cia);
    const usuario = (req.userId ?? 'SYSTEM').toString().slice(0, 50) || 'SYSTEM';
    const periodo = asNum(req.body?.periodo);
    const tipo = asNum(req.body?.tipo ?? 2);
    const matrices = Array.isArray(req.body?.matrices) ? req.body.matrices : [];

    if (!cia || !periodo) {
        return res.status(400).json({ ok: false, message: 'Faltan cia/periodo.' });
    }

    let cn;
    try {
        cn = await pool.getConnection();
        await cn.beginTransaction();

        const [lockRows] = await cn.query(
            `
        SELECT IFNULL(MAX(VERSION), 0) + 1 AS NEXT_VER
        FROM gestion_riesgos.riesgos_matriz_insti
        WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND TIPO = ?
        FOR UPDATE
      `,
            [cia, periodo, tipo]
        );
        const nextVersion = asNum(lockRows?.[0]?.NEXT_VER || 1);

        const jsonStr = JSON.stringify({ matrices });

        await cn.query(
            `
        INSERT INTO gestion_riesgos.riesgos_matriz_insti
          (CODIGO_CIA, CODIGO_PERIODO, TIPO, VERSION, RESPUESTA, USUARIO_CREACION, FECHA_CREACION)
        VALUES
          (?,           ?,             ?,    ?,       ?,         ?,                 NOW())
      `,
            [cia, periodo, tipo, nextVersion, jsonStr, usuario]
        );

        await cn.commit();
        return res.json({ ok: true, version: nextVersion });
    } catch (e) {
        console.error('saveSegundaMatriz', e);
        try { await cn?.rollback(); } catch { }
        return res.status(500).json({ ok: false, message: 'Error interno al guardar.' });
    } finally {
        try { cn?.release?.(); } catch { }
    }
};

/**
 * cargarInformeAnual
 *
 * Obtiene la información del informe anual institucional de un período.
 *
 * - Consulta la tabla `riesgos_informe_anual` para la compañía y período indicados.
 * - Si existe, deserializa el campo `informacion` como arreglo de secciones.
 *
 * @route GET /informe-anual
 * @returns {200|400|500} JSON con `ok`, `found`, `periodo` y `secciones`.
 */
exports.cargarInformeAnual = async (req, res) => {
    const cia = Number(req.codigo_cia);
    const periodo = Number(req.query?.periodo ?? req.body?.periodo);

    if (!cia || !periodo) {
        return res.status(400).json({ ok: false, message: "Faltan cia/periodo." });
    }

    let cn;
    try {
        cn = await pool.getConnection();

        const sql = `
      SELECT informacion
      FROM gestion_riesgos.riesgos_informe_anual
      WHERE codigo_cia = ? AND codigo_periodo = ?
      LIMIT 1
    `;
        const [rows] = await cn.query(sql, [cia, periodo]);

        let secciones = [];
        if (rows.length > 0 && rows[0]?.informacion) {
            try {
                const parsed = JSON.parse(rows[0].informacion);
                secciones = Array.isArray(parsed) ? parsed : [];
            } catch {
                secciones = [];
            }
        }

        return res.json({ periodo, secciones });
    } catch (err) {
        console.error("cargarInformeAnual error", err);
        return res.status(500).json({ ok: false, message: "Error interno al cargar informe." });
    } finally {
        try { cn?.release?.(); } catch { }
    }
};

/**
 * crearInformeAnual
 *
 * Crea o actualiza el informe anual institucional de un período.
 *
 * - Recibe en el cuerpo `periodo` y el arreglo `secciones` (contenido del informe).
 * - Serializa las secciones a JSON y hace `INSERT ... ON DUPLICATE KEY UPDATE`
 *   sobre `riesgos_informe_anual`.
 * - Registra usuario y fecha de creación/modificación.
 *
 * @route POST /informe-anual
 * @returns {200|400|500} JSON con `ok`, `action` (insert/update) y `affectedRows`.
 */
exports.crearInformeAnual = async (req, res) => {
    const cia = Number(req.codigo_cia);
    const periodo = Number(req.body?.periodo);
    const secciones = Array.isArray(req.body?.secciones) ? req.body.secciones : [];
    const informacion = JSON.stringify(secciones);

    if (!cia || !periodo) {
        return res.status(400).json({ ok: false, message: "Faltan cia/periodo." });
    }

    let cn;
    try {
        cn = await pool.getConnection();

        const sql = `
      INSERT INTO gestion_riesgos.riesgos_informe_anual (informacion, usuario_creacion, codigo_cia, codigo_periodo, fecha_creacion)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        informacion = ?,
        fecha_modificacion = NOW(),
        usuario_modificacion = ?
    `;

        const params = [informacion, req.userId, cia, periodo, informacion, req.userId];

        const [result] = await cn.query(sql, params);

        const action = result.affectedRows === 1 ? "insert" :
            result.affectedRows === 2 ? "update" : "none";

        return res.json({ ok: true, action, affectedRows: result.affectedRows });
    } catch (err) {
        console.error("crearInformeAnual error", err);
        return res.status(500).json({ ok: false, message: "Error interno al guardar informe." });
    } finally {
        try { cn?.release?.(); } catch { }
    }
};