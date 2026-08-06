/**
 * @fileoverview
 * Controlador de la Primera Matriz: definición de versiones, matrices y flujo de envío/historial.
 *
 * @module controller/riesgos/primeraMatriz
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

const asJSON = (v) => (typeof v === 'string' ? v : JSON.stringify(v ?? null));

const tryParseJSON = (v) => {
    if (v == null) return null;
    if (typeof v === 'string') {
        try { return JSON.parse(v); } catch { return v; }
    }
    return v;
};

const parseMaybeJSON = (v) => {
    if (v == null) return null;
    if (typeof v === 'string') {
        try { return JSON.parse(v); } catch { return v; }
    }
    if (Buffer.isBuffer(v)) {
        const s = v.toString('utf8');
        try { return JSON.parse(s); } catch { return s; }
    }
    return v;
};

const DEFAULT_FLAG = 'S';
const INACTIVE_FLAG = 'N';

/**
 * obtenerVersiones
 * 
 * Lista las versiones configuradas de la primera matriz para un período.
 *
 * - Valida `codigo_cia` y `periodo` desde la request (query o params).
 * - Lee el maestro y el detalle (`riesgos_primera_matriz_ext` / `_est`) para cada versión.
 * - Calcula cantidad de matrices por versión y su estado (activa/inactiva).
 * - Devuelve un arreglo con la versión, estado y conteo de matrices asociadas.
 *
 * @route GET /
 * @returns {200|400|500} `{ok, versiones:[{VERSION, ESTADO, NUM_MATRICES}]}` o mensaje de error.
 */
exports.obtenerVersiones = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const periodo = req.query?.periodo ?? req.params?.periodo;

    if (!codigo_cia || !periodo) {
        return res.status(400).json({ ok: false, msg: 'Faltan codigo_cia o periodo' });
    }

    try {
        const sqlDetalle = `
        SELECT 
            re.VERSION,
            COALESCE(rm.ESTADO, 'N') AS ESTADO,
            COUNT(*) AS NUM_MATRICES
        FROM 
            gestion_riesgos.riesgos_primera_matriz_est re
        LEFT JOIN 
            gestion_riesgos.riesgos_primera_matriz rm
        ON 
            re.CODIGO_CIA = rm.CODIGO_CIA
            AND re.CODIGO_PERIODO = rm.CODIGO_PERIODO
            AND re.VERSION = rm.VERSION
        WHERE 
            re.CODIGO_CIA = ? AND re.CODIGO_PERIODO = ?
        GROUP BY 
            re.VERSION, COALESCE(rm.ESTADO, 'N')
        ORDER BY 
            re.VERSION DESC
        `;
        const [rows] = await pool.execute(sqlDetalle, [codigo_cia, Number(periodo)]);

        if (rows.length === 0) {
            const sqlMaestro = `
        SELECT 
            VERSION, ESTADO, 0 AS NUM_MATRICES
        FROM
            gestion_riesgos.riesgos_primera_matriz
        WHERE 
            CODIGO_CIA = ? AND CODIGO_PERIODO = ?
        ORDER BY 
            VERSION DESC
        `;
            const [rows2] = await pool.execute(sqlMaestro, [codigo_cia, Number(periodo)]);
            return res.json(rows2);
        }

        return res.json(rows);
    } catch (err) {
        console.error('obtenerVersiones:', err);
        return res.status(500).json({ ok: false, msg: 'Error al obtener versiones' });
    }
};

/**
 * obtenerVersionUnica
 * 
 * Obtiene la definición completa de una versión de la primera matriz.
 *
 * - Valida `codigo_cia`, `periodo` y `version`.
 * - Consulta las matrices de la versión (título, columnas, filas, obligatoriedad).
 * - Intenta parsear las columnas/filas almacenadas como JSON.
 * - Devuelve la estructura lista para usarse en el frontend de diseño de matriz.
 *
 * @route GET /obtener-unico
 * @returns {200|400|404|500} `{ok, matrices:[{MATRIZ, TITULO, COLUMNAS, FILAS, OBLIGATORIO}]}` o error.
 */
exports.obtenerVersionUnica = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const periodo = req.query?.periodo ?? req.params?.periodo;
    const version = req.query?.version ?? req.params?.version;

    if (!codigo_cia || !periodo || !version) {
        return res.status(400).json({ ok: false, msg: 'Faltan codigo_cia, periodo o version' });
    }

    try {
        const sql = `
        SELECT 
            MATRIZ, TITULO, COLUMNAS, FILAS, OBLIGATORIO
        FROM 
            gestion_riesgos.riesgos_primera_matriz_est
        WHERE 
            CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND VERSION = ?
        ORDER BY 
            MATRIZ
    `;
        const params = [codigo_cia, Number(periodo), Number(version)];

        const [rows] = await pool.execute(sql, params);

        const matrices = rows.map(r => ({
            MATRIZ: r.MATRIZ,
            TITULO: r.TITULO,
            COLUMNAS: typeof r.COLUMNAS === 'string' ? r.COLUMNAS : JSON.stringify(r.COLUMNAS ?? null),
            FILAS: typeof r.FILAS === 'string' ? r.FILAS : JSON.stringify(r.FILAS ?? null),
            OBLIGATORIO: tryParseJSON(r.OBLIGATORIO)
        }));

        return res.json({
            periodo: Number(periodo),
            version: Number(version),
            matrices
        });
    } catch (err) {
        console.error('obtenerVersionUnica:', err);
        return res.status(500).json({ ok: false, msg: 'Error al obtener la versión solicitada' });
    }
};

/**
 * crearVersion
 * 
 * Crea una nueva versión de la primera matriz para un período determinado.
 *
 * - Valida `codigo_cia`, `periodo` y el arreglo `matrices` del cuerpo.
 * - Calcula el siguiente número de versión (MAX(VERSION) + 1) para el período.
 * - Inserta registro maestro de la versión en `riesgos_primera_matriz_ext`.
 * - Inserta el detalle de cada matriz en `riesgos_primera_matriz_est`.
 * - Marca como no activas las versiones anteriores del mismo período, si corresponde.
 *
 * @route POST /
 * @returns {201|400|500} `{ok, version}` creada o mensaje de error.
 */
exports.crearVersion = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;
    const { periodo, matrices = [] } = req.body;

    if (!codigo_cia || !periodo) {
        return res.status(400).json({ ok: false, msg: 'Faltan codigo_cia o periodo' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1) Siguiente versión por (cia, periodo) con bloqueo de rango
        const [[vrow]] = await conn.execute(
            `
            SELECT 
                COALESCE(MAX(VERSION), 0) + 1 AS NEXT_VER
            FROM 
                gestion_riesgos.riesgos_primera_matriz
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
            FOR UPDATE`,
            [codigo_cia, Number(periodo)]
        );
        const version = Number(vrow?.NEXT_VER || 1);

        // 2) Insert maestro (marcamos nueva versión como ACTIVA)
        await conn.execute(
            `
            INSERT INTO 
                gestion_riesgos.riesgos_primera_matriz (
                    CODIGO_CIA, CODIGO_PERIODO, VERSION, 
                    ESTADO, USUARIO_CREACION, FECHA_CREACION
                )
            VALUES (
                    ?, ?, ?, 
                    'S', ?, CURRENT_TIMESTAMP
                )`,
            [codigo_cia, Number(periodo), version, usuario ?? null]
        );

        // 3) Insert detalle (matrices)
        if (matrices.length > 0) {
            const sqlDet = `
            INSERT INTO 
                gestion_riesgos.riesgos_primera_matriz_est (
                    CODIGO_CIA, CODIGO_PERIODO, VERSION, 
                    MATRIZ, TITULO, COLUMNAS, FILAS, 
                    OBLIGATORIO
                )
            VALUES (
                    ?, ?, ?, 
                    ?, ?, ?, ?, 
                    ?
                )`;
            let i = 1;
            for (const m of matrices) {
                await conn.execute(sqlDet, [
                    codigo_cia,
                    Number(periodo),
                    version,
                    i++,
                    m.titulo ?? null,
                    asJSON(m.columnas),
                    asJSON(m.filas),
                    m.direcciones ? asJSON(m.direcciones) : '[]'
                ]);
            }
        }

        // 4) Desactivar versiones anteriores del mismo periodo
        await conn.execute(
            `
            UPDATE 
                gestion_riesgos.riesgos_primera_matriz
            SET ESTADO = 'N',
                USUARIO_MODIFICACION = ?,
                FECHA_MODIFICACION   = CURRENT_TIMESTAMP
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_PERIODO = ? 
                AND VERSION <> ?`,
            [usuario ?? null, codigo_cia, Number(periodo), version]
        );

        await conn.commit();
        return res
            .status(201)
            .json({ ok: true, periodo: Number(periodo), version, msg: 'Versión creada' });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error('crearVersion:', err);
        return res.status(500).json({ ok: false, msg: 'Error al crear la versión' });
    } finally {
        conn?.release();
    }
};

/**
 * copiarDefecto
 * 
 * Copia la versión por defecto de la primera matriz desde un período de origen
 * hacia un período de destino.
 *
 * - Valida períodos de origen y destino.
 * - Busca la versión marcada como defecto en el período de origen.
 * - Duplica maestro y detalle de la versión, creando una nueva versión en el destino.
 * - Actualiza estados para dejar activa solo la nueva versión en el período destino.
 *
 * @route POST /copiar-defecto-anio-pasado
 * @returns {200|400|404|500} Mensaje con el detalle del copiado o error.
 */
exports.copiarDefecto = async (req, res) => {
    const cia = req.codigo_cia;
    const periodoDestino = Number(req.body?.periodo);
    const usuario = req.userId;

    if (!cia || !periodoDestino) {
        return res.status(400).json({ ok: false, message: 'Falta cia o periodo' });
    }

    const periodoOrigen = periodoDestino - 1;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1) Versión por defecto del año anterior
        const [[defRow]] = await conn.execute(
            `
            SELECT 
                VERSION
            FROM 
                gestion_riesgos.riesgos_primera_matriz
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_PERIODO = ? 
                AND ESTADO = ?
            LIMIT 1`,
            [cia, periodoOrigen, DEFAULT_FLAG]
        );
        if (!defRow) {
            await conn.rollback();
            return res.status(404).json({
                ok: false,
                message: `No existe versión por defecto en ${periodoOrigen}.`
            });
        }
        const versionOrigen = Number(defRow.VERSION);

        // 2) Matrices de esa versión
        const [mats] = await conn.execute(
            `
            SELECT 
                MATRIZ, TITULO, COLUMNAS, FILAS, OBLIGATORIO
            FROM 
                gestion_riesgos.riesgos_primera_matriz_est
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_PERIODO = ? 
                AND VERSION = ?
            ORDER BY 
                MATRIZ`,
            [cia, periodoOrigen, versionOrigen]
        );
        if (mats.length === 0) {
            await conn.rollback();
            return res.status(404).json({
                ok: false,
                message: `La versión ${versionOrigen} del ${periodoOrigen} no tiene matrices.`
            });
        }

        // 3) Nueva versión en el periodo destino (MAX+1 con bloqueo)
        const [[nextRow]] = await conn.execute(
            `
            SELECT 
                COALESCE(MAX(VERSION), 0) + 1 AS NEXT_VER
            FROM 
                gestion_riesgos.riesgos_primera_matriz
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_PERIODO = ?
            FOR UPDATE`,
            [cia, periodoDestino]
        );
        const versionNueva = Number(nextRow?.NEXT_VER || 1);

        // 4) Insert maestro (marcar como default 'S')
        await conn.execute(
            `
            INSERT INTO 
                gestion_riesgos.riesgos_primera_matriz (
                    CODIGO_CIA, CODIGO_PERIODO, VERSION, 
                    USUARIO_CREACION, FECHA_CREACION, ESTADO
                )
                VALUES (
                    ?, ?, ?, 
                    ?, CURRENT_TIMESTAMP, ?
                )`,
            [cia, periodoDestino, versionNueva, usuario ?? null, DEFAULT_FLAG]
        );

        // 5) Insert detalle (iteramos simple; suele ser un set pequeño)
        const sqlDet = `
        INSERT INTO 
            gestion_riesgos.riesgos_primera_matriz_est (
                CODIGO_CIA, CODIGO_PERIODO, VERSION, 
                MATRIZ, TITULO, COLUMNAS, FILAS, OBLIGATORIO
            )
        VALUES (
            ?, ?, ?, 
            ?, ?, ?, ?, ?
        )`;
        for (const m of mats) {
            await conn.execute(sqlDet, [
                cia,
                periodoDestino,
                versionNueva,
                Number(m.MATRIZ),
                m.TITULO ?? null,
                asJSON(m.COLUMNAS),
                asJSON(m.FILAS),
                m.OBLIGATORIO
            ]);
        }

        // 6) Desactivar otras versiones del periodo destino
        await conn.execute(
            `
            UPDATE 
                gestion_riesgos.riesgos_primera_matriz
            SET 
                ESTADO = ?, 
                USUARIO_MODIFICACION = ?, 
                FECHA_MODIFICACION = CURRENT_TIMESTAMP
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_PERIODO = ? 
                AND VERSION <> ?`,
            [INACTIVE_FLAG, usuario ?? null, cia, periodoDestino, versionNueva]
        );

        await conn.commit();

        return res.json({
            ok: true,
            message: `Copiado desde ${periodoOrigen} (v${versionOrigen}) a ${periodoDestino} (v${versionNueva}).`,
            periodo_origen: periodoOrigen,
            version_origen: versionOrigen,
            periodo_destino: periodoDestino,
            version_destino: versionNueva,
            num_matrices: mats.length
        });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error('copiarDefecto:', err);
        return res.status(500).json({ ok: false, message: 'Error interno' });
    } finally {
        conn?.release();
    }
};

/**
 * establecerDefecto
 * 
 * Marca una versión de la primera matriz como versión por defecto para un período.
 *
 * - Valida `codigo_cia`, `periodo` y `version`.
 * - Actualiza la tabla maestro para activar la versión indicada.
 * - Desactiva las demás versiones del mismo período.
 *
 * @route PUT /establecer-defecto
 * @returns {200|400|404|500} Mensaje de confirmación o error.
 */
exports.establecerDefecto = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;
    const periodo = req.body?.periodo;
    const version = req.body?.version;

    if (!codigo_cia || !periodo || !version) {
        return res.status(400).json({ ok: false, msg: 'Faltan codigo_cia, periodo o version' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1) Desactivar otras versiones del periodo
        await conn.execute(
            `UPDATE 
                gestion_riesgos.riesgos_primera_matriz
            SET 
                ESTADO = 'N',
                USUARIO_MODIFICACION = ?,
                FECHA_MODIFICACION   = CURRENT_TIMESTAMP
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_PERIODO = ? 
                AND VERSION <> ?`,
            [usuario ?? null, codigo_cia, Number(periodo), Number(version)]
        );

        // 2) Activar la versión indicada
        const [resUpd] = await conn.execute(
            `UPDATE 
                gestion_riesgos.riesgos_primera_matriz
            SET 
                ESTADO = 'S',
                USUARIO_MODIFICACION = ?,
                FECHA_MODIFICACION   = CURRENT_TIMESTAMP
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_PERIODO = ? 
                AND VERSION = ?`,
            [usuario ?? null, codigo_cia, Number(periodo), Number(version)]
        );

        if (resUpd.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ ok: false, msg: 'Versión no encontrada' });
        }

        await conn.commit();
        return res.json({
            ok: true,
            periodo: Number(periodo),
            version: Number(version),
            msg: 'Versión por defecto establecida'
        });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error('establecerDefecto:', err);
        return res.status(500).json({ ok: false, msg: 'Error al establecer versión por defecto' });
    } finally {
        conn?.release();
    }
};

/**
 * obtenerEstadoEHistorial
 * 
 * Obtiene el historial de envíos y estados de la primera matriz para una entidad.
 *
 * - Valida `codigo_cia`, `entidad` y `periodo`.
 * - Consulta la tabla de historial (`riesgos_primera_matriz_his`) con joins a usuarios y entidad.
 * - Devuelve los registros de envíos con sus estados, comentarios y datos de auditoría.
 *
 * @route GET /estado-historial
 * @returns {200|400|500} `{ok, historial:[...]}` o mensaje de error.
 */
exports.obtenerEstadoEHistorial = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = req.query?.entidad ?? req.codigo_entidad;
    const periodo = req.query?.periodo;

    if (!codigo_cia || !codigo_entidad || !periodo) {
        return res.status(400).json({
            ok: false,
            msg: "Faltan parámetros: entidad y periodo son requeridos.",
        });
    }

    try {
        const [rows] = await pool.execute(
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
                ) AS NOMBRE_USUARIO_SUPERIOR
            FROM 
                gestion_riesgos.riesgos_primera_matriz_his h
                LEFT JOIN gestion_riesgos.seguridad_persona p1
                    ON p1.CODIGO_CIA = h.CODIGO_CIA
                    AND p1.CODIGO_COLABORADOR = h.USUARIO_CREACION
                LEFT JOIN gestion_riesgos.seguridad_persona p2
                    ON p2.CODIGO_CIA = h.CODIGO_CIA
                    AND p2.CODIGO_COLABORADOR = h.USUARIO_MODIFICACION
                LEFT JOIN gestion_riesgos.seguridad_persona p3
                    ON p3.CODIGO_CIA = h.CODIGO_CIA
                    AND p3.CODIGO_COLABORADOR = h.USUARIO_SUPERIOR
            WHERE 
                h.CODIGO_CIA = ?
                AND h.CODIGO_ENTIDAD = ?
                AND h.CODIGO_PERIODO = ?
            ORDER BY 
                h.FECHA_CREACION DESC, h.CODIGO_HISTORIAL DESC
            `,
            [codigo_cia, Number(codigo_entidad), Number(periodo)]
        );

        const historial = rows.map((r) => {
            let parsed = null;

            if (r.RESPUESTA) {
                try {
                    let temp = r.RESPUESTA.trim();

                    // Deserializa hasta obtener un objeto
                    while (typeof temp === "string") {
                        try {
                            temp = JSON.parse(temp);
                        } catch {
                            break;
                        }
                    }

                    // Si es array con un solo objeto, toma ese objeto
                    if (Array.isArray(temp) && temp.length === 1 && typeof temp[0] === "object") {
                        parsed = temp[0];
                    } else if (typeof temp === "object" && temp !== null) {
                        parsed = temp;
                    }
                } catch (e) {
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
        console.error("obtenerEstadoEHistorial:", err);
        return res.status(500).json({ ok: false, msg: "Error al consultar historial" });
    }
};

/**
 * obtenerMatrizDefecto
 * 
 * Obtiene la matriz por defecto que debe utilizar una entidad en un período dado.
 *
 * - Valida `codigo_cia`, `entidad` y `periodo`.
 * - Identifica la versión marcada como defecto para el período.
 * - Carga las matrices (títulos, columnas, filas) y las parsea desde JSON.
 * - Considera configuración institucional/general según los campos de la tabla.
 *
 * @route GET /matriz-defecto
 * @returns {200|400|404|500} `{ok, matriz:{version, matrices:[...]}}` o error.
 */
exports.obtenerMatrizDefecto = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const periodo = req.query?.periodo ?? req.params?.periodo;
    const codigo_entidad = req.codigo_entidad;
    const institucional = req.query.institucional || false;

    if (!codigo_cia || !periodo) {
        return res.status(400).json({ ok: false, msg: 'Faltan codigo_cia o periodo' });
    }

    try {
        const sqlDef = `
            SELECT VERSION
            FROM gestion_riesgos.riesgos_primera_matriz
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND ESTADO = 'S'
            LIMIT 1
        `;
        const [defRow] = await pool.execute(sqlDef, [codigo_cia, Number(periodo)]);
        if (!defRow.length) {
            return res.status(404).json({ ok: false, msg: `No hay versión por defecto en ${periodo}.` });
        }
        const version = Number(defRow[0].VERSION);

        const sqlMatrices = `
            SELECT
                MATRIZ,
                TITULO,
                COLUMNAS,
                FILAS,
                ${institucional ? '1 AS OBLIGATORIO' : `
                CASE
                    WHEN JSON_VALID(COALESCE(OBLIGATORIO,'[]'))
                        AND JSON_CONTAINS(COALESCE(OBLIGATORIO,'[]'), JSON_ARRAY(?), '$')
                    THEN 1
                    ELSE 0
                END AS OBLIGATORIO
                    `
            }
            FROM gestion_riesgos.riesgos_primera_matriz_est
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND VERSION = ?
            ORDER BY MATRIZ
        `;
        let params = []
        if (institucional) {
            params = [Number(codigo_cia), Number(periodo), Number(version)];
        } else {
            params = [Number(codigo_entidad), Number(codigo_cia), Number(periodo), Number(version)];
        }
        const [rows] = await pool.execute(sqlMatrices, params);
        const matrices = rows.map(r => ({
            matriz: r.MATRIZ,
            titulo: r.TITULO,
            columnas: tryParseJSON(r.COLUMNAS),
            filas: tryParseJSON(r.FILAS),
            obligatorio: Number(r.OBLIGATORIO)
        }));

        return res.json({ ok: true, periodo: Number(periodo), version, matrices });
    } catch (err) {
        console.error('obtenerMatrizDefecto:', err);
        return res.status(500).json({ ok: false, msg: 'Error al obtener la matriz por defecto' });
    }
};

/**
 * guardarRespuesta
 * 
 * Registra un nuevo envío de respuestas de la primera matriz para una entidad.
 *
 * - Valida `codigo_cia`, `entidad`, `periodo` y el cuerpo con la información respondida.
 * - Calcula el siguiente `CODIGO_HISTORIAL` para la llave (CIA, entidad, período).
 * - Inserta el registro en la tabla de historial con el estado inicial correspondiente.
 * - Registra usuario y fecha de creación para fines de auditoría.
 *
 * @route POST /guardar-respuesta
 * @returns {201|400|500} `{ok, codigo_historial}` o mensaje de error.
 */
exports.guardarRespuesta = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad =
        req.codigo_entidad ?? req.body?.codigo_entidad ?? req.query?.codigo_entidad;
    const usuario = req.userId;

    const { periodo, matrices } = req.body || {};

    if (!codigo_cia || !codigo_entidad || !periodo || !Array.isArray(matrices)) {
        return res.status(400).json({
            ok: false,
            msg: 'Body inválido. Se esperaba { codigo_cia, codigo_entidad, periodo, matrices[] }'
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1) Serializar respuesta
        const respuestaStr = JSON.stringify({ matrices });

        // 2) Siguiente CODIGO_HISTORIAL por cia, entidad, periodo
        const [[row]] = await conn.execute(
            `
            SELECT 
                COALESCE(MAX(CODIGO_HISTORIAL), 0) + 1 AS NEXT_ID
            FROM 
                gestion_riesgos.riesgos_primera_matriz_his
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_ENTIDAD = ? 
                AND CODIGO_PERIODO = ?
            FOR UPDATE`,
            [codigo_cia, Number(codigo_entidad), Number(periodo)]
        );
        const codigo_historial = Number(row?.NEXT_ID || 1);

        // 3) Insert en historial (ESTADO = 'I' por defecto)
        await conn.execute(
            `
            INSERT INTO 
            gestion_riesgos.riesgos_primera_matriz_his (
                CODIGO_CIA, CODIGO_ENTIDAD, CODIGO_PERIODO, 
                CODIGO_HISTORIAL, RESPUESTA, COMENTARIO_SUPERVISOR,
                USUARIO_CREACION, FECHA_CREACION, ESTADO, ESTADO_SUPERIOR
            ) 
            VALUES (
                ?, ?, ?, 
                ?, ?, NULL, 
                ?, CURRENT_TIMESTAMP, ${codigo_historial === 1 ? "'I'" : "'M'"}, ${codigo_historial === 1 ? "'I'" : "'M'"})
            `,
            [
                codigo_cia,
                Number(codigo_entidad),
                Number(periodo),
                codigo_historial,
                respuestaStr,
                usuario ?? null
            ]
        );

        await conn.commit();
        return res.json({
            ok: true,
            msg: 'Respuestas guardadas en historial.',
            codigo_historial
        });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error('guardarRespuesta:', err);
        return res.status(500).json({ ok: false, msg: 'Error al guardar las respuestas' });
    } finally {
        conn?.release();
    }
};

/**
 * estadoActualizar
 * 
 * Actualiza el estado de un registro del historial de la primera matriz.
 *
 * - Valida `entidad`, `periodo` y `codigo_historial`.
 * - Determina si la actualización la realiza supervisor o nivel superior (`superior`).
 * - Actualiza campos de estado, comentario y usuario/fecha de modificación.
 * - Permite avanzar o devolver el flujo de revisión de la matriz.
 *
 * @route PUT /estado-actualizar
 * @returns {200|400|500} Mensaje de confirmación o error.
 */
exports.estadoActualizar = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;
    const { entidad = req.codigo_entidad, periodo, codigo_historial, estado, comentario, superior = false } = req.body || {};

    if (!codigo_cia || !entidad || !periodo || !codigo_historial || !estado) {
        return res.status(400).json({ ok: false, msg: 'Faltan parámetros requeridos.' });
    }

    try {
        const sql = `
        UPDATE 
            gestion_riesgos.riesgos_primera_matriz_his
        SET 
            ${superior ? 'ESTADO_SUPERIOR' : 'ESTADO'} = ?,
            ${superior ? 'COMENTARIO_SUPERIOR' : 'COMENTARIO_SUPERVISOR'} = ?,
            ${superior ? 'USUARIO_SUPERIOR' : 'USUARIO_MODIFICACION'} = ?,
            ${superior ? 'FECHA_SUPERIOR' : 'FECHA_MODIFICACION'} = CURRENT_TIMESTAMP
        WHERE 
            CODIGO_CIA = ?
            AND CODIGO_ENTIDAD = ?
            AND CODIGO_PERIODO = ?
            AND CODIGO_HISTORIAL = ?
        LIMIT 1
    `;
        const params = [
            String(estado).trim(),
            comentario ?? null,
            usuario ?? null,
            codigo_cia,
            Number(entidad),
            Number(periodo),
            Number(codigo_historial)
        ];

        const [result] = await pool.execute(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ ok: false, msg: 'No se encontró la entrada a actualizar.' });
        }

        return res.json({
            ok: true,
            msg: 'Estado actualizado',
            data: {
                entidad: Number(entidad),
                periodo: Number(periodo),
                codigo_historial: Number(codigo_historial),
                estado: String(estado).trim(),
                comentario: comentario ?? null,
                usuario_modificacion: usuario ?? null,
                fecha_modificacion: new Date()
            }
        });
    } catch (err) {
        console.error('estadoActualizar:', err);
        return res.status(500).json({ ok: false, msg: 'Error al actualizar la entrada' });
    }
};

/**
 * obtenerEstadoEHistorial
 * 
 * Obtiene el historial de envíos y estados de la primera matriz para una entidad.
 *
 * - Valida `codigo_cia`, `entidad` y `periodo`.
 * - Consulta la tabla de historial (`riesgos_primera_matriz_his`) con joins a usuarios y entidad.
 * - Devuelve los registros de envíos con sus estados, comentarios y datos de auditoría.
 *
 * @route GET /estado-historial
 * @returns {200|400|500} `{ok, historial:[...]}` o mensaje de error.
 */
exports.obtenerUltimaVersion = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = req.query?.entidad ?? req.codigo_entidad;
    const periodo = req.query?.periodo;

    if (!codigo_cia || !codigo_entidad || !periodo) {
        return res.status(400).json({
            ok: false,
            msg: "Faltan parámetros: entidad y periodo son requeridos.",
        });
    }

    try {
        const [rows] = await pool.execute(
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
                ) AS NOMBRE_USUARIO_SUPERIOR
            FROM 
                gestion_riesgos.riesgos_primera_matriz_his h
                LEFT JOIN gestion_riesgos.seguridad_persona p1
                    ON p1.CODIGO_CIA = h.CODIGO_CIA
                    AND p1.CODIGO_COLABORADOR = h.USUARIO_CREACION
                LEFT JOIN gestion_riesgos.seguridad_persona p2
                    ON p2.CODIGO_CIA = h.CODIGO_CIA
                    AND p2.CODIGO_COLABORADOR = h.USUARIO_MODIFICACION
                LEFT JOIN gestion_riesgos.seguridad_persona p3
                    ON p3.CODIGO_CIA = h.CODIGO_CIA
                    AND p3.CODIGO_COLABORADOR = h.USUARIO_SUPERIOR
            WHERE 
                h.CODIGO_CIA = ?
                AND h.CODIGO_ENTIDAD = ?
                AND h.CODIGO_PERIODO = ?
            ORDER BY 
                h.CODIGO_HISTORIAL DESC
            LIMIT 1
            `,
            [codigo_cia, Number(codigo_entidad), Number(periodo)]
        );

        const historial = rows.map((r) => {
            let parsed = null;

            if (r.RESPUESTA) {
                try {
                    let temp = r.RESPUESTA.trim();

                    // Deserializa hasta obtener un objeto
                    while (typeof temp === "string") {
                        try {
                            temp = JSON.parse(temp);
                        } catch {
                            break;
                        }
                    }

                    // Si es array con un solo objeto, toma ese objeto
                    if (Array.isArray(temp) && temp.length === 1 && typeof temp[0] === "object") {
                        parsed = temp[0];
                    } else if (typeof temp === "object" && temp !== null) {
                        parsed = temp;
                    }
                } catch (e) {
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
        console.error("obtenerEstadoEHistorial:", err);
        return res.status(500).json({ ok: false, msg: "Error al consultar historial" });
    }
};
