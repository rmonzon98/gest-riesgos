/**
 * @fileoverview
 * Controlador de la Segunda Matriz (Anexo 2) del módulo de Gestión de Riesgos.
 * Permite gestionar versiones, lectura, creación, copia de períodos anteriores,
 * establecimiento de versión por defecto, respuestas por entidad y supervisión.
 *
 * @module controller/riesgos/segundaMatriz
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

/* === HELPERS INTERNOS === */
const asJSONString = (v) => {
    if (v == null) return null;
    return typeof v === 'string' ? v : JSON.stringify(v);
};

const FIXED_TAIL = ['Aplica (Sí/No)', 'Comentario'];

function ensureArray(a) { return Array.isArray(a) ? a : []; }

function isTailValid(headers) {
    if (!Array.isArray(headers) || headers.length < 2) return false;
    const n = headers.length;
    return (
        headers[n - 2]?.trim?.() === FIXED_TAIL[0] &&
        headers[n - 1]?.trim?.() === FIXED_TAIL[1]
    );
}

function sanitizeRows(headers, rows) {
    const n = headers.length;
    const cut = n - FIXED_TAIL.length;
    return ensureArray(rows).map(r => {
        const row = ensureArray(r).slice(0, n);
        row[cut] = '';
        row[cut + 1] = '';
        for (let i = 0; i < n; i++) if (row[i] == null) row[i] = '';
        return row;
    });
}

const parseMaybeJSON = (v) => {
    if (v == null) return null;
    if (Buffer.isBuffer(v)) v = v.toString('utf8');
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return v; } }
    return v;
};

/**
 * obtenerVersionesPeriodo
 *
 * Lista todas las versiones registradas de la Segunda Matriz para un período.
 * - Incluye estado de cada versión (S, N).
 * - Incluye número de matrices por versión.
 *
 * @route GET /
 * @returns {200|400|500} Listado de versiones.
 */
exports.obtenerVersionesPeriodo = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const periodo = Number(req.query?.periodo ?? req.params?.periodo);

    if (!codigo_cia || !periodo) {
        return res.status(400).json({ ok: false, msg: 'Faltan parámetros: periodo' });
    }

    try {
        const sql = `
        SELECT
            v.CODIGO_CIA,
            v.CODIGO_PERIODO,
            v.VERSION,
            v.ESTADO,                      -- 'S' = por defecto, 'N' = normal
            v.USUARIO_CREACION,
            v.FECHA_CREACION,
            v.USUARIO_MODIFICACION,
            v.FECHA_MODIFICACION,
            (SELECT COUNT(*)
            FROM 
                gestion_riesgos.riesgos_segunda_matriz_est e
            WHERE 
                e.CODIGO_CIA     = v.CODIGO_CIA
                AND e.CODIGO_PERIODO = v.CODIGO_PERIODO
                AND e.VERSION        = v.VERSION) AS NUM_MATRICES
        FROM 
            gestion_riesgos.riesgos_segunda_matriz v
        WHERE 
            v.CODIGO_CIA = ? AND v.CODIGO_PERIODO = ?
        ORDER BY 
            v.VERSION
    `;

        const [rows] = await pool.execute(sql, [codigo_cia, periodo]);

        return res.json({
            ok: true,
            periodo,
            versiones: rows
        });
    } catch (err) {
        console.error('obtenerVersionesPeriodo:', err);
        return res.status(500).json({ ok: false, msg: 'Error al listar versiones' });
    }
};

/**
 * obtenerUnico
 *
 * Obtiene el contenido de una versión específica de la Segunda Matriz.
 * - Devuelve matrices con columnas y filas en formato JSON string.
 *
 * @route GET /obtener-unico
 * @returns {200|400|500} Matrices de la versión.
 */
exports.obtenerUnico = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const periodo = Number(req.query?.periodo ?? req.params?.periodo);
    const version = Number(req.query?.version ?? req.params?.version);

    if (!codigo_cia || !periodo || !version) {
        return res.status(400).json({ ok: false, msg: 'Faltan parámetros: periodo y version' });
    }

    try {
        const sql = `
        SELECT 
            MATRIZ, TITULO, COLUMNAS, FILAS
        FROM 
            gestion_riesgos.riesgos_segunda_matriz_est   
        WHERE 
            CODIGO_CIA = ? 
            AND CODIGO_PERIODO = ? 
            AND VERSION = ?
        ORDER BY 
            MATRIZ
    `;
        const [rows] = await pool.execute(sql, [codigo_cia, periodo, version]);

        const matrices = rows.map(r => ({
            MATRIZ: r.MATRIZ,
            TITULO: r.TITULO,
            COLUMNAS: asJSONString(r.COLUMNAS),
            FILAS: asJSONString(r.FILAS),
        }));

        return res.json({
            ok: true,
            periodo,
            version,
            matrices
        });
    } catch (err) {
        console.error('obtenerUnico:', err);
        return res.status(500).json({ ok: false, msg: 'Error al obtener versión' });
    }
};

/**
 * crearSegundaMatriz
 *
 * Crea una nueva versión de la Segunda Matriz.
 * - Calcula versión correlativa (MAX+1).
 * - Inserta la versión como 'S' (por defecto).
 * - Inserta matrices con columnas y filas sanitizadas.
 * - Cambia versiones anteriores a estado 'N'.
 *
 * @route POST /
 * @returns {201|400|500} Nueva versión creada.
 */
exports.crearSegundaMatriz = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;
    const { periodo, matrices } = req.body || {};

    if (!codigo_cia || !periodo || !Array.isArray(matrices)) {
        return res.status(400).json({ ok: false, msg: 'Faltan parámetros: periodo y matrices[]' });
    }

    for (const m of matrices) {
        const headers = m?.columnas?.headers;
        if (!isTailValid(headers)) {
            return res.status(400).json({
                ok: false,
                msg: `Las últimas dos columnas deben ser: ${FIXED_TAIL.join(', ')}`
            });
        }
        m.filas = sanitizeRows(headers, m.filas);
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [[maxRow]] = await conn.execute(
            `
            SELECT 
                COALESCE(MAX(VERSION), 0) AS MAXV
            FROM 
                gestion_riesgos.riesgos_segunda_matriz
            WHERE 
                CODIGO_CIA = ? AND CODIGO_PERIODO = ?
            FOR UPDATE`,
            [codigo_cia, Number(periodo)]
        );
        const nextVersion = Number(maxRow?.MAXV || 0) + 1;

        await conn.execute(
            `
            INSERT INTO 
                gestion_riesgos.riesgos_segunda_matriz (
                    CODIGO_CIA, CODIGO_PERIODO, VERSION,
                    USUARIO_CREACION, FECHA_CREACION, ESTADO
                )
                VALUES (
                    ?, ?, ?, 
                    ?, CURRENT_TIMESTAMP, 'S'
                )`,
            [codigo_cia, Number(periodo), nextVersion, usuario ?? null]
        );

        let idx = 0;
        const sqlDet = `
        INSERT INTO 
            gestion_riesgos.riesgos_segunda_matriz_est (
                CODIGO_CIA, CODIGO_PERIODO, VERSION, 
                MATRIZ, TITULO, COLUMNAS, FILAS
            )
            VALUES (
                ?, ?, ?, 
                ?, ?, ?, ?
            )`;
        for (const m of matrices) {
            idx += 1;
            const titulo = (m.titulo ?? '').toString();
            const headers = m?.columnas?.headers ?? [];
            const filas = m?.filas ?? [];
            const columnasJSON = JSON.stringify({ headers });
            const filasJSON = JSON.stringify(filas);

            await conn.execute(sqlDet, [
                codigo_cia,
                Number(periodo),
                nextVersion,
                idx,
                titulo,
                columnasJSON,
                filasJSON
            ]);
        }

        await conn.execute(
            `
            UPDATE 
                gestion_riesgos.riesgos_segunda_matriz
            SET 
                ESTADO = 'N',
                USUARIO_MODIFICACION = ?,
                FECHA_MODIFICACION   = CURRENT_TIMESTAMP
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_PERIODO = ? 
                AND VERSION <> ?`,
            [usuario ?? null, codigo_cia, Number(periodo), nextVersion]
        );

        await conn.commit();
        return res.status(201).json({
            ok: true,
            periodo: Number(periodo),
            version: nextVersion,
            num_matrices: matrices.length,
            msg: 'Versión creada y establecida por defecto; las demás quedaron en N.'
        });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error('crearSegundaMatriz:', err);
        return res.status(500).json({ ok: false, msg: 'Error al guardar Anexo 2' });
    } finally {
        conn?.release();
    }
};

/**
 * copiarDefectoAnioPasado
 *
 * Copia la versión por defecto (ESTADO='S') del año anterior
 * y la guarda como nueva versión para el período actual.
 *
 * @route POST /copiar-defecto-anio-pasado
 * @returns {200|404|500} Nueva versión creada por copia.
 */
exports.copiarDefectoAnioPasado = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;
    const periodo = Number(req.body?.periodo);

    if (!codigo_cia || !periodo) {
        return res.status(400).json({ ok: false, msg: 'Falta parámetro: periodo' });
    }

    const periodoPrev = periodo - 1;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [[rowPrev]] = await conn.execute(
            `
        SELECT 
            VERSION
        FROM 
            gestion_riesgos.riesgos_segunda_matriz
        WHERE 
            CODIGO_CIA = ? 
            AND CODIGO_PERIODO = ? 
            AND ESTADO = 'S'
        ORDER BY 
            VERSION DESC
        LIMIT 1`,
            [codigo_cia, periodoPrev]
        );
        const prevVersion = rowPrev?.VERSION;
        if (!prevVersion) {
            await conn.rollback();
            return res.status(404).json({
                ok: false,
                msg: `No existe versión por defecto en el período ${periodoPrev}.`
            });
        }

        const [[rowMax]] = await conn.execute(
            `
        SELECT 
            COALESCE(MAX(VERSION), 0) + 1 AS NEXT_VER
        FROM 
            gestion_riesgos.riesgos_segunda_matriz
        WHERE 
            CODIGO_CIA = ? 
            AND CODIGO_PERIODO = ?
        FOR UPDATE`,
            [codigo_cia, periodo]
        );
        const nextVersion = Number(rowMax?.NEXT_VER || 1);

        await conn.execute(
            `
        INSERT INTO 
            gestion_riesgos.riesgos_segunda_matriz (
                CODIGO_CIA, CODIGO_PERIODO, VERSION,
                USUARIO_CREACION, FECHA_CREACION, ESTADO
            )
            VALUES (
                ?, ?, ?, 
                ?, CURRENT_TIMESTAMP, 'N'
            )`,
            [codigo_cia, periodo, nextVersion, usuario ?? null]
        );

        const [mats] = await conn.execute(
            `
            SELECT 
                MATRIZ, TITULO, COLUMNAS, FILAS
            FROM 
                gestion_riesgos.riesgos_segunda_matriz_est
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_PERIODO = ? 
                AND VERSION = ?
            ORDER BY 
                MATRIZ`,
            [codigo_cia, periodoPrev, prevVersion]
        );

        const sqlDet = `
        INSERT INTO 
            gestion_riesgos.riesgos_segunda_matriz_est (
                CODIGO_CIA, CODIGO_PERIODO, VERSION, 
                MATRIZ, TITULO, COLUMNAS, FILAS
            )
            VALUES (
                ?, ?, ?, 
                ?, ?, ?, ?
            )
    `;
        let count = 0;
        for (const r of mats) {
            count += 1;
            await conn.execute(sqlDet, [
                codigo_cia,
                periodo,
                nextVersion,
                count,
                r.TITULO ?? null,
                asJSONString(r.COLUMNAS),
                asJSONString(r.FILAS)
            ]);
        }

        await conn.commit();
        return res.json({
            ok: true,
            periodo,
            version: nextVersion,
            num_matrices: mats.length
        });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error('copiarDefectoAnioPasado:', err);
        return res.status(500).json({ ok: false, msg: 'Error al copiar del año pasado' });
    } finally {
        conn?.release();
    }
};

/**
 * establecerDefecto
 *
 * Establece una versión como “por defecto” para un período.
 * - Todas pasan a 'N' excepto la seleccionada, que pasa a 'S'.
 *
 * @route PUT /establecer-defecto
 * @returns {200|400|404|500} Versión marcada exitosamente.
 */
exports.establecerDefecto = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;
    const periodo = Number(req.body?.periodo);
    const version = Number(req.body?.version);

    if (!codigo_cia || !periodo || !version) {
        return res.status(400).json({
            ok: false,
            msg: 'Faltan parámetros: periodo y version son requeridos.'
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [updAll] = await conn.execute(
            `
            UPDATE 
                gestion_riesgos.riesgos_segunda_matriz
            SET 
                ESTADO = 'N',
                USUARIO_MODIFICACION = ?,
                FECHA_MODIFICACION   = CURRENT_TIMESTAMP
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_PERIODO = ?`,
            [usuario, codigo_cia, periodo]
        );

        const [updOne] = await conn.execute(
            `
            UPDATE 
                gestion_riesgos.riesgos_segunda_matriz
            SET 
                ESTADO = 'S',
                USUARIO_MODIFICACION = ?,
                FECHA_MODIFICACION   = CURRENT_TIMESTAMP
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_PERIODO = ? 
                AND VERSION = ?
            LIMIT 1`,
            [usuario, codigo_cia, periodo, version]
        );

        if (updOne.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({
                ok: false,
                msg: `No existe la versión ${version} para el período ${periodo}.`
            });
        }

        await conn.commit();
        return res.json({
            ok: true,
            periodo,
            version,
            actualizadas_a_N: updAll.affectedRows ?? 0,
            marcada_por_defecto: updOne.affectedRows ?? 0
        });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error('establecerDefecto:', err);
        return res.status(500).json({ ok: false, msg: 'Error al establecer por defecto' });
    } finally {
        conn?.release();
    }
};

/**
 * obtenerMatrizDefecto
 *
 * Obtiene la matriz correspondiente a la versión por defecto (ESTADO='S')
 * o, si no existe, la última versión disponible.
 *
 * @route GET /matriz-defecto
 * @returns {200|404|500} Matriz por defecto.
 */
exports.obtenerMatrizDefecto = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const periodo = Number(req.query?.periodo ?? req.params?.periodo);

    if (!codigo_cia || !periodo) {
        return res.status(400).json({ ok: false, msg: 'Falta parámetro: periodo' });
    }

    try {
        const [def] = await pool.execute(
            `
                SELECT 
                    VERSION
                FROM 
                    gestion_riesgos.riesgos_segunda_matriz
                WHERE 
                    CODIGO_CIA = ? 
                    AND CODIGO_PERIODO = ? 
                    AND ESTADO = 'S'
                ORDER BY 
                    VERSION DESC
                LIMIT 1`,
            [codigo_cia, periodo]
        );

        let version = def[0]?.VERSION ?? null;
        let isFallback = false;

        if (!version) {
            const [maxv] = await pool.execute(
                `
                SELECT 
                    MAX(VERSION) AS VMAX
                FROM 
                    gestion_riesgos.riesgos_segunda_matriz
                WHERE 
                    CODIGO_CIA = ? 
                    AND CODIGO_PERIODO = ?`,
                [codigo_cia, periodo]
            );
            version = maxv[0]?.VMAX ?? null;

            if (!version) {
                return res.status(404).json({
                    ok: false,
                    msg: `No hay versiones registradas para el período ${periodo}.`
                });
            }
            isFallback = true;
        }

        const [rows] = await pool.execute(
            `
            SELECT 
                MATRIZ, TITULO, COLUMNAS, FILAS
            FROM 
                gestion_riesgos.riesgos_segunda_matriz_est
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_PERIODO = ? 
                AND VERSION = ?
            ORDER BY MATRIZ`,
            [codigo_cia, periodo, version]
        );

        const matrices = rows.map(r => ({
            MATRIZ: r.MATRIZ,
            TITULO: r.TITULO,
            COLUMNAS: asJSONString(r.COLUMNAS),
            FILAS: asJSONString(r.FILAS)
        }));

        return res.json({
            ok: true,
            periodo,
            version: Number(version),
            is_fallback: isFallback,
            matrices
        });
    } catch (err) {
        console.error('obtenerMatrizDefecto:', err);
        return res.status(500).json({ ok: false, msg: 'Error al obtener matriz por defecto' });
    }
};

/**
 * guardarRespuesta
 *
 * Guarda la respuesta de la entidad para la Segunda Matriz.
 * - Registra historial (CODIGO_HISTORIAL correlativo).
 * - Guarda estado inicial 'I' (Ingresado).
 *
 * @route POST /guardar-respuesta
 * @returns {201|400|500} Respuesta registrada.
 */
exports.guardarRespuesta = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_usuario = req.userId;
    const codigo_entidad = req.codigo_entidad;
    const { periodo, matrices } = req.body || {};

    if (!codigo_cia || !codigo_usuario) {
        return res.status(401).json({ ok: false, msg: 'Sesión inválida.' });
    }
    if (!codigo_entidad) {
        return res.status(400).json({ ok: false, msg: 'No se encontró la unidad (codigo_entidad).' });
    }
    if (!periodo || !Array.isArray(matrices)) {
        return res.status(400).json({ ok: false, msg: 'Parámetros inválidos: periodo y matrices son requeridos.' });
    }

    const respuestaObj = { periodo, matrices };
    const respuestaStr =
        typeof req.body?.respuesta === 'string' ? req.body.respuesta : JSON.stringify(respuestaObj);

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [[perChk]] = await conn.execute(
            `SELECT 1 AS ok FROM gestion_riesgos.riesgos_periodo WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? LIMIT 1`,
            [codigo_cia, Number(periodo)]
        );
        if (!perChk) {
            await conn.rollback();
            return res.status(400).json({ ok: false, msg: `Período ${periodo} no existe.` });
        }

        const [[entChk]] = await conn.execute(
            `SELECT 1 AS ok FROM gestion_riesgos.seguridad_entidad WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? LIMIT 1`,
            [codigo_cia, Number(codigo_entidad)]
        );
        if (!entChk) {
            await conn.rollback();
            return res.status(400).json({ ok: false, msg: `Entidad ${codigo_entidad} no existe.` });
        }

        const [[row]] = await conn.execute(
            `
            SELECT 
                COALESCE(MAX(CODIGO_HISTORIAL), 0) + 1 AS NEXTVAL
            FROM 
                gestion_riesgos.riesgos_segunda_matriz_his
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_ENTIDAD = ? 
                AND CODIGO_PERIODO = ?
            FOR UPDATE`,
            [codigo_cia, Number(codigo_entidad), Number(periodo)]
        );
        const codigo_historial = Number(row?.NEXTVAL || 1);

        await conn.execute(
            `
            INSERT INTO gestion_riesgos.riesgos_segunda_matriz_his (
                CODIGO_CIA, CODIGO_ENTIDAD, CODIGO_PERIODO, CODIGO_HISTORIAL,
                RESPUESTA, COMENTARIO_SUPERVISOR, USUARIO_CREACION, FECHA_CREACION,
                ESTADO, ESTADO_SUPERIOR
            ) VALUES (
                ?, ?, ?, ?, 
                ?, NULL, ?, CURRENT_TIMESTAMP, 
                ${codigo_historial === 1 ? "'I'" : "'M'"}, ${codigo_historial === 1 ? "'I'" : "'M'"}
            )`,
            [
                codigo_cia,
                Number(codigo_entidad),
                Number(periodo),
                codigo_historial,
                respuestaStr,
                codigo_usuario
            ]
        );

        await conn.commit();

        return res.json({
            ok: true,
            periodo: Number(periodo),
            codigo_historial,
            estado: 'I',
            msg: 'Respuesta guardada correctamente.'
        });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error('guardarRespuesta (Anexo2):', err);
        return res.status(500).json({ ok: false, msg: 'Error al guardar la respuesta.' });
    } finally {
        conn?.release();
    }
};

/**
 * obtenerEstadoEHistorial
 *
 * Obtiene el historial de envíos y supervisión de una entidad.
 * - Devuelve cada versión enviada, supervisada o rechazada.
 *
 * @route GET /estado-historial
 * @returns {200|400|500} Historial completo.
 */
exports.obtenerEstadoEHistorial = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = (req.query?.entidad ?? req.codigo_entidad);
    const periodo = req.query?.periodo;

    if (!codigo_cia || !codigo_entidad || !periodo) {
        return res.status(400).json({ ok: false, msg: 'Faltan parámetros: entidad y periodo son requeridos.' });
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
                gestion_riesgos.riesgos_segunda_matriz_his h
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
        console.error('obtenerEstadoEHistorial (segunda):', err);
        return res.status(500).json({ ok: false, msg: 'Error al consultar historial' });
    }
};

/**
 * estadoActualizar
 *
 * Actualiza el estado de una respuesta en el historial:
 * - Estados permitidos: A, R, I, P.
 * - Permite actualizar comentario y estado supervisado o normal.
 *
 * @route PUT /estado-actualizar
 * @returns {200|400|404|500} Estado actualizado.
 */
exports.estadoActualizar = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario_mod = req.userId;
    const { entidad = req.codigo_entidad, periodo, codigo_historial, estado, comentario, superior = false } = req.body || {};
    const codigo_entidad = entidad;


    if (!codigo_cia || !codigo_entidad || !periodo || !codigo_historial || !estado) {
        return res.status(400).json({ ok: false, msg: 'Faltan parámetros requeridos.' });
    }
    const ESTADOS_PERMITIDOS = new Set(['A', 'R', 'I', 'P']);
    if (!ESTADOS_PERMITIDOS.has(estado)) {
        return res.status(400).json({ ok: false, msg: `Estado inválido: ${estado}` });
    }

    try {
        const [sel] = await pool.execute(
            `
            SELECT 
                COMENTARIO_SUPERVISOR
            FROM 
                gestion_riesgos.riesgos_segunda_matriz_his
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_ENTIDAD = ? 
                AND CODIGO_PERIODO = ? 
                AND CODIGO_HISTORIAL = ?
            LIMIT 1`,
            [codigo_cia, Number(codigo_entidad), Number(periodo), Number(codigo_historial)]
        );
        if (!sel.length) {
            return res.status(404).json({ ok: false, msg: 'No existe el registro de historial indicado.' });
        }

        const comentarioPrevio = sel[0]?.COMENTARIO_SUPERVISOR ?? null;
        let comentarioBloqueado = false;
        let comentarioFinal = comentario ?? null;
        if (comentarioPrevio && String(comentarioPrevio).trim() !== '') {
            comentarioBloqueado = true;
            comentarioFinal = comentarioPrevio;
        }

        const [upd] = await pool.execute(
            `
            UPDATE 
                gestion_riesgos.riesgos_segunda_matriz_his
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
            LIMIT 1`,
            [
                estado,
                comentarioFinal,
                usuario_mod ?? null,
                codigo_cia,
                Number(codigo_entidad),
                Number(periodo),
                Number(codigo_historial)
            ]
        );

        if (upd.affectedRows === 0) {
            return res.status(404).json({ ok: false, msg: 'No se encontró la entrada a actualizar.' });
        }

        const [get] = await pool.execute(
            `
            SELECT 
                ESTADO, COMENTARIO_SUPERVISOR, USUARIO_MODIFICACION, FECHA_MODIFICACION
            FROM 
                gestion_riesgos.riesgos_segunda_matriz_his
            WHERE 
                CODIGO_CIA = ? 
                AND CODIGO_ENTIDAD = ? 
                AND CODIGO_PERIODO = ? 
                AND CODIGO_HISTORIAL = ?
            LIMIT 1`,
            [codigo_cia, Number(codigo_entidad), Number(periodo), Number(codigo_historial)]
        );
        const row = get[0] ?? null;

        return res.json({
            ok: true,
            msg: comentarioBloqueado
                ? 'Estado actualizado. El comentario previo ya existía y no se modificó.'
                : 'Estado y comentario actualizados correctamente.',
            comentario_bloqueado: comentarioBloqueado,
            updated: {
                codigo_historial: Number(codigo_historial),
                estado: row?.ESTADO ?? estado,
                comentario_supervisor: row?.COMENTARIO_SUPERVISOR ?? comentario,
                usuario_modificacion: row?.USUARIO_MODIFICACION ?? usuario_mod ?? null,
                fecha_modificacion: row?.FECHA_MODIFICACION ?? null
            }
        });
    } catch (err) {
        console.error('estadoActualizar (segunda):', err);
        return res.status(500).json({ ok: false, msg: 'Error al actualizar estado' });
    }
};

/**
 * obtenerUltimaVersion
 *
 * Obtiene el historial de envíos y supervisión de una entidad.
 * - Devuelve cada versión enviada, supervisada o rechazada.
 *
 * @route GET /estado-historial
 * @returns {200|400|500} Historial completo.
 */
exports.obtenerUltimaVersion = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = (req.query?.entidad ?? req.codigo_entidad);
    const periodo = req.query?.periodo;

    if (!codigo_cia || !codigo_entidad || !periodo) {
        return res.status(400).json({ ok: false, msg: 'Faltan parámetros: entidad y periodo son requeridos.' });
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
                gestion_riesgos.riesgos_segunda_matriz_his h
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
            LIMIT 1
            `,
            [codigo_cia, Number(codigo_entidad), Number(periodo)]
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
        console.error('obtenerEstadoEHistorial (segunda):', err);
        return res.status(500).json({ ok: false, msg: 'Error al consultar historial' });
    }
};