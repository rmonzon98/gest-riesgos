/**
 * @fileoverview
 * Controlador de Objetivos del módulo de Gestión de Riesgos.
 * Gestiona catálogos de objetivos por tipo: consulta, creación y actualización.
 *
 * @module controller/riesgos/objetivos
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

/**
 * obtenerObjetivos
 *
 * Obtiene todos los objetivos pertenecientes a un tipo específico.
 *
 * - Utiliza `req.codigo_cia` para filtrar por institución.
 * - Recupera los objetivos en el orden natural de su código.
 *
 * @route GET /
 * @returns {200|400|500} Lista de objetivos o error.
 */
exports.obtenerObjetivos = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const tipoObjetivo = req.query?.tipoObjetivo ?? req.params?.tipoObjetivo;

    if (!codigo_cia || !tipoObjetivo) {
        return res.status(400).json({ error: 'Faltan codigo_cia o tipoObjetivo' });
    }

    try {
        const sql = `
        SELECT 
            CODIGO_OBJETIVO AS CODIGO,
            DESCRIPCION,
            ABREVIATURA
        FROM gestion_riesgos.riesgos_objetivo
        WHERE CODIGO_CIA = ? AND CODIGO_TIPO_OBJETIVO = ?
        ORDER BY CODIGO_OBJETIVO
        `;
        const [rows] = await pool.execute(sql, [codigo_cia, tipoObjetivo]);
        return res.json({ result: rows });
    } catch (err) {
        console.error('obtenerObjetivos:', err);
        return res.status(500).json({ error: 'Error al obtener objetivos' });
    }
};

/**
 * obtenerObjetivoUnico
 *
 * Obtiene un objetivo específico según su código interno.
 *
 * - Verifica existencia del objetivo por (CIA, tipoObjetivo, id).
 * - Devuelve error 404 si el objetivo no existe.
 *
 * @route GET /obtener-objetivo
 * @returns {200|400|404|500} Objetivo encontrado o mensaje de error.
 */
exports.obtenerObjetivoUnico = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const tipoObjetivo = req.query?.tipoObjetivo ?? req.params?.tipoObjetivo;
    const codigo = req.query?.id ?? req.params?.id;

    if (!codigo_cia || !tipoObjetivo || !codigo) {
        return res.status(400).json({ error: 'Faltan codigo_cia, tipoObjetivo o id' });
    }

    try {
        const sql = `
        SELECT 
            CODIGO_OBJETIVO,
            DESCRIPCION,
            ABREVIATURA
        FROM gestion_riesgos.riesgos_objetivo
        WHERE CODIGO_CIA = ? AND CODIGO_TIPO_OBJETIVO = ? AND CODIGO_OBJETIVO = ?
        LIMIT 1
        `;
        const [rows] = await pool.execute(sql, [codigo_cia, tipoObjetivo, codigo]);
        if (!rows.length) return res.status(404).json({ error: 'Objetivo no encontrado' });
        return res.json({ result: rows });
    } catch (err) {
        console.error('obtenerObjetivoUnico:', err);
        return res.status(500).json({ error: 'Error al obtener objetivo' });
    }
};

/**
 * crearObjetivo
 *
 * Crea un nuevo objetivo dentro de un tipo específico.
 *
 * - Calcula el próximo código correlativo mediante `MAX+1` dentro de una transacción.
 * - Inserta un nuevo registro marcando usuario creador y fecha de creación.
 *
 * @route POST /
 * @returns {201|400|500} Id generado o mensaje de error.
 */
exports.crearObjetivo = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;
    const { tipo, descripcion, abreviatura } = req.body;
    const tipoObjetivo = tipo;

    if (!codigo_cia || !tipoObjetivo || !descripcion) {
        return res.status(400).json({ error: 'Faltan codigo_cia, tipo, descripcion o abreviatura' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [[row]] = await conn.execute(
            `SELECT COALESCE(MAX(CODIGO_OBJETIVO), 0) + 1 AS NUEVO
         FROM gestion_riesgos.riesgos_objetivo
        WHERE CODIGO_CIA = ? AND CODIGO_TIPO_OBJETIVO = ?
        FOR UPDATE`,
            [codigo_cia, tipoObjetivo]
        );
        const nuevo_codigo = Number(row?.NUEVO || 1);

        await conn.execute(
            `INSERT INTO gestion_riesgos.riesgos_objetivo (
         CODIGO_CIA, CODIGO_TIPO_OBJETIVO, CODIGO_OBJETIVO,
         DESCRIPCION, ABREVIATURA, ESTADO,
         USUARIO_CREACION, FECHA_CREACION
       ) VALUES (
         ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP
       )`,
            [codigo_cia, tipoObjetivo, nuevo_codigo, descripcion, abreviatura ?? null, usuario ?? null]
        );

        await conn.commit();
        return res.status(201).json({ mensaje: 'Objetivo creado correctamente', id: nuevo_codigo });
    } catch (err) {
        if (conn) { try { await conn.rollback(); } catch { } }
        console.error('crearObjetivo:', err);
        return res.status(500).json({ error: 'Error al crear objetivo' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * actualizarObjetivo
 *
 * Actualiza un objetivo existente dentro de un tipo.
 *
 * - Verifica existencia del objetivo.
 * - Actualiza descripción, abreviatura y registra usuario modificador.
 *
 * @route PUT /
 * @returns {200|400|404|500} Mensaje de confirmación o error.
 */
exports.actualizarObjetivo = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;
    const { tipo, id, descripcion, abreviatura } = req.body;
    const tipoObjetivo = tipo;
    const codigo = id;

    if (!codigo_cia || !tipoObjetivo || !codigo || !descripcion) {
        return res.status(400).json({ error: 'Faltan codigo_cia, tipo, id, descripcion o abreviatura' });
    }

    try {
        const [result] = await pool.execute(
            `UPDATE gestion_riesgos.riesgos_objetivo
          SET DESCRIPCION          = ?,
              ABREVIATURA          = ?,
              USUARIO_MODIFICACION = ?,
              FECHA_MODIFICACION   = CURRENT_TIMESTAMP
        WHERE CODIGO_CIA = ? AND CODIGO_TIPO_OBJETIVO = ? AND CODIGO_OBJeTIVO = ?`,
            [descripcion, abreviatura ?? null, usuario ?? null, codigo_cia, tipoObjetivo, Number(codigo)]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Objetivo no encontrado' });
        }

        return res.json({ mensaje: 'Objetivo actualizado correctamente' });
    } catch (err) {
        console.error('actualizarObjetivo:', err);
        return res.status(500).json({ error: 'Error al actualizar objetivo' });
    }
};