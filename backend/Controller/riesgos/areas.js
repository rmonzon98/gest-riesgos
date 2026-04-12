/**
 * @fileoverview
 * Catálogo de áreas (gestión y consulta): listado, consulta única, creación y actualización.
 *
 * @module Controller/riesgos/areas
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

  /**
   * obtenerAreas
   * 
   * Lista áreas activas de la institución del token.
   *
   * - Valida `codigo_cia`.
   * - Ejecuta SELECT filtrando por `estado=1` y ordena por `codigo_area`.
   *
   * @route GET /
   * @returns {200|400|500} `result: Area[]`
   */
exports.obtenerAreas = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    if (!codigo_cia) return res.status(400).json({ error: 'Falta codigo_cia' });

    try {
        const sql = `
        SELECT CODIGO_AREA, DESCRIPCION, ABREVIATURA
        FROM gestion_riesgos.riesgos_area
        WHERE CODIGO_CIA = ? AND estado = 1
        ORDER BY codigo_area
        `;
        const [rows] = await pool.execute(sql, [codigo_cia]);
        return res.json({ result: rows });
    } catch (err) {
        console.error('obtenerAreas:', err);
        return res.status(500).json({ error: 'Error al obtener áreas' });
    }
};

  /**
   * obtenerAreaUnica
   * 
   * Devuelve una sola área por `codigo_area`.
   *
   * - Valida `codigo_cia` y `area` (query/params).
   * - Ejecuta SELECT con `LIMIT 1`.
   *
   * @route GET /obtener-area
   * @returns {200|400|404|500} `result: Area`
   */
exports.obtenerAreaUnica = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const area = req.query?.area ?? req.params?.area;

    if (!codigo_cia || !area) {
        return res.status(400).json({ error: 'Faltan codigo_cia o area' });
    }

    try {
        const sql = `
        SELECT CODIGO_AREA, DESCRIPCION, ABREVIATURA
        FROM gestion_riesgos.riesgos_area
        WHERE CODIGO_CIA = ? AND codigo_area = ?
        LIMIT 1
        `;
        const [rows] = await pool.execute(sql, [codigo_cia, area]);

        if (!rows.length) return res.status(404).json({ error: 'Área no encontrada' });
        return res.json({ result: rows });
    } catch (err) {
        console.error('obtenerAreaUnica:', err);
        return res.status(500).json({ error: 'Error al obtener el área' });
    }
};

  /**
   * crearAreas
   * 
   * Crea un registro de área para la institución.
   *
   * - Calcula el siguiente `CODIGO_AREA` por CIA (MAX+1 con bloqueo).
   * - Inserta con metadatos de auditoría.
   *
   * @route POST /
   * @returns {201|400|500} `{mensaje, id}`
   */
exports.crearAreas = async (req, res) => {
    const { descripcion, abreviatura } = req.body;
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;

    if (!codigo_cia || !descripcion) {
        return res.status(400).json({ error: 'Faltan campos requeridos (codigo_cia, descripcion, abreviatura)' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [[row]] = await conn.execute(
            `
            SELECT COALESCE(MAX(CODIGO_AREA), 0) + 1 AS NUEVO_CODIGO
            FROM gestion_riesgos.riesgos_area
            WHERE CODIGO_CIA = ?
            FOR UPDATE`,
            [codigo_cia]
        );
        const codigo_area = Number(row?.NUEVO_CODIGO || 1);

        await conn.execute(
            `
            INSERT INTO gestion_riesgos.riesgos_area (
            CODIGO_CIA, CODIGO_AREA, DESCRIPCION, ABREVIATURA, ESTADO,
            USUARIO_CREACION, FECHA_CREACION
            ) VALUES (
            ?, ?, ?, ?, 1,
            ?, CURRENT_TIMESTAMP
            )`,
            [codigo_cia, codigo_area, descripcion, abreviatura ?? null, usuario ?? null]
        );

        await conn.commit();
        return res.status(201).json({ mensaje: 'Área creada correctamente', id: codigo_area });
    } catch (err) {
        if (conn) { try { await conn.rollback(); } catch { } }
        console.error('crearAreas:', err);
        return res.status(500).json({ error: 'Error al crear el área' });
    } finally {
        if (conn) conn.release();
    }
};

  /**
   * actualizarAreas
   * 
   * Actualiza la descripción/abreviatura de un área existente.
   *
   * - Valida llaves y ejecuta UPDATE con auditoría.
   *
   * @route PUT /
   * @returns {200|400|404|500} `{mensaje}`
   */
exports.actualizarAreas = async (req, res) => {
    const { descripcion, abreviatura, id } = req.body;
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;

    if (!codigo_cia || !id || !descripcion) {
        return res.status(400).json({ error: 'Faltan campos requeridos (codigo_cia, id, descripcion, abreviatura)' });
    }

    try {
        const [result] = await pool.execute(
            `
            UPDATE gestion_riesgos.riesgos_area
            SET 
                DESCRIPCION          = ?,
                ABREVIATURA          = ?,
                USUARIO_MODIFICACION = ?,
                FECHA_MODIFICACION   = CURRENT_TIMESTAMP
            WHERE CODIGO_CIA = ? AND CODIGO_AREA = ?`,
            [descripcion, abreviatura ?? null, usuario ?? null, codigo_cia, Number(id)]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Área no encontrada' });
        }

        return res.json({ mensaje: 'Área actualizada correctamente' });
    } catch (err) {
        console.error('actualizarAreas:', err);
        return res.status(500).json({ error: 'Error al actualizar el área' });
    }
};