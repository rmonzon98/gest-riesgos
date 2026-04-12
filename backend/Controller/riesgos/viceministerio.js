/**
 * @fileoverview
 * Controlador de Viceministerios institucionales.
 * Permite listar, consultar, crear y actualizar viceministerios por institución.
 *
 * @module controller/riesgos/viceministerios
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

/**
 * obtenerViceministerios
 *
 * Lista todos los viceministerios de la institución.
 * - Permite filtro opcional por nombre (?q=texto).
 *
 * @route GET /
 * @returns {200|500} Lista de viceministerios.
 */
async function obtenerViceministerios(req, res) {
    const codigo_cia = req.codigo_cia;
    const q = (req.query.q || '').trim();

    try {
        const sql = `
      SELECT CODIGO_CIA, CODIGO_VICEMINISTERIO, NOMBRE
      FROM gestion_riesgos.riesgos_viceministerio
      WHERE CODIGO_CIA = ?
        ${q ? 'AND NOMBRE LIKE ?' : ''}
      ORDER BY CODIGO_VICEMINISTERIO ASC
    `;
        const params = q ? [codigo_cia, `%${q}%`] : [codigo_cia];
        const [rows] = await pool.query(sql, params);
        return res.json({ ok: true, viceministerios: rows });
    } catch (err) {
        console.error('obtenerViceministerios', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al listar viceministerios.' });
    }
}


/**
 * obtenerViceministerio
 *
 * Obtiene un viceministerio por su código.
 * - Devuelve 404 si no existe.
 *
 * @route GET /obtener-viceministerio
 * @returns {200|400|404|500} Viceministerio encontrado o error.
 */
async function obtenerViceministerio(req, res) {
    const codigo_cia = req.codigo_cia;
    const codigo_viceministerio = Number(req.query.codigo_viceministerio || 0);

    if (!codigo_viceministerio) {
        return res.status(400).json({ ok: false, mensaje: 'codigo_viceministerio es requerido.' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT CODIGO_CIA, CODIGO_VICEMINISTERIO, NOMBRE
       FROM gestion_riesgos.riesgos_viceministerio
       WHERE CODIGO_CIA = ? AND CODIGO_VICEMINISTERIO = ?`,
            [codigo_cia, codigo_viceministerio]
        );

        if (!rows.length) {
            return res.status(404).json({ ok: false, mensaje: 'Viceministerio no encontrado.' });
        }
        return res.json({ ok: true, viceministerio: rows[0] });
    } catch (err) {
        console.error('obtenerViceministerio', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al obtener el viceministerio.' });
    }
}

/**
 * crearViceministerio
 *
 * Crea un nuevo viceministerio institucional.
 * - Valida duplicado de nombre insensible a mayúsculas.
 * - Calcula CODIGO_VICEMINISTERIO correlativo (MAX+1).
 *
 * @route POST /
 * @returns {201|400|409|500} Nuevo registro creado.
 */
async function crearViceministerio(req, res) {
    const codigo_cia = req.codigo_cia;
    const nombre = (req.body?.nombre || '').trim();

    if (!nombre) {
        return res.status(400).json({ ok: false, mensaje: 'El nombre es requerido.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [dup] = await conn.query(
            `SELECT 1
       FROM gestion_riesgos.riesgos_viceministerio
       WHERE CODIGO_CIA = ? AND UPPER(NOMBRE) = UPPER(?)
       LIMIT 1`,
            [codigo_cia, nombre]
        );
        if (dup.length) {
            await conn.rollback();
            return res.status(409).json({ ok: false, mensaje: 'Ya existe un viceministerio con ese nombre.' });
        }

        const [mx] = await conn.query(
            `SELECT COALESCE(MAX(CODIGO_VICEMINISTERIO), 0) AS max_cod
       FROM gestion_riesgos.riesgos_viceministerio
       WHERE CODIGO_CIA = ?
       FOR UPDATE`,
            [codigo_cia]
        );
        const codigo_viceministerio = Number(mx[0].max_cod) + 1;

        await conn.query(
            `INSERT INTO gestion_riesgos.riesgos_viceministerio
        (CODIGO_CIA, CODIGO_VICEMINISTERIO, NOMBRE, USUARIO_CREACION, FECHA_CREACION)
       VALUES (?, ?, ?, ?, NOW())`,
            [codigo_cia, codigo_viceministerio, nombre, req.userId]
        );

        await conn.commit();
        return res.status(201).json({
            ok: true,
            mensaje: 'Viceministerio creado.',
            viceministerio: {
                CODIGO_CIA: codigo_cia,
                CODIGO_VICEMINISTERIO: codigo_viceministerio,
                NOMBRE: nombre
            }
        });
    } catch (err) {
        if (conn) try { await conn.rollback(); } catch { }
        console.error('crearViceministerio', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al crear el viceministerio.' });
    } finally {
        if (conn) conn.release();
    }
}

/**
 * actualizarViceministerio
 *
 * Actualiza el nombre de un viceministerio existente.
 * - Verifica que exista.
 * - Evita duplicados de nombre.
 *
 * @route PUT /
 * @returns {200|404|409|500} Resultado de la actualización.
 */
async function actualizarViceministerio(req, res) {
    const codigo_cia = req.codigo_cia;
    const codigo_viceministerio = Number(req.body?.codigo_viceministerio || 0);
    const nombre = (req.body?.nombre || '').trim();

    if (!codigo_viceministerio) {
        return res.status(400).json({ ok: false, mensaje: 'codigo_viceministerio es requerido.' });
    }
    if (!nombre) {
        return res.status(400).json({ ok: false, mensaje: 'El nombre es requerido.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [cur] = await conn.query(
            `SELECT 1
       FROM gestion_riesgos.riesgos_viceministerio
       WHERE CODIGO_CIA = ? AND CODIGO_VICEMINISTERIO = ?
       LIMIT 1`,
            [codigo_cia, codigo_viceministerio]
        );
        if (!cur.length) {
            await conn.rollback();
            return res.status(404).json({ ok: false, mensaje: 'Viceministerio no encontrado.' });
        }

        const [dup] = await conn.query(
            `SELECT 1
       FROM gestion_riesgos.riesgos_viceministerio
       WHERE CODIGO_CIA = ?
         AND UPPER(NOMBRE) = UPPER(?)
         AND CODIGO_VICEMINISTERIO <> ?
       LIMIT 1`,
            [codigo_cia, nombre, codigo_viceministerio]
        );
        if (dup.length) {
            await conn.rollback();
            return res.status(409).json({ ok: false, mensaje: 'Ya existe otro viceministerio con ese nombre.' });
        }

        await conn.query(
            `UPDATE gestion_riesgos.riesgos_viceministerio
       SET NOMBRE = ?, USUARIO_MODIFICACION = ?, FECHA_MODIFICACION = NOW()
       WHERE CODIGO_CIA = ? AND CODIGO_VICEMINISTERIO = ?`,
            [nombre, codigo_cia, codigo_viceministerio, req.userId]
        );

        await conn.commit();
        return res.json({ ok: true, mensaje: 'Viceministerio actualizado.' });
    } catch (err) {
        if (conn) try { await conn.rollback(); } catch { }
        console.error('actualizarViceministerio', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al actualizar el viceministerio.' });
    } finally {
        if (conn) conn.release();
    }
}

module.exports = {
    obtenerViceministerios,
    obtenerViceministerio,
    crearViceministerio,
    actualizarViceministerio,
};
