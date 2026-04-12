/**
 * @fileoverview
 * Controlador de Órganos institucionales.
 * Gestiona catálogos de órganos: consulta, creación y actualización.
 *
 * @module controller/riesgos/organos
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

/**
 * obtenerOrganos
 *
 * Lista todos los órganos registrados para la institución del usuario.
 *
 * - Recupera todos los órganos asociados al `codigo_cia`.
 * - Ordena por código ascendente.
 *
 * @route GET /
 * @returns {200|500} Lista de órganos o error interno.
 */
async function obtenerOrganos(req, res) {
    const codigo_cia = req.codigo_cia;
    try {
        const sql = `
      SELECT CODIGO_CIA, CODIGO_ORGANO, NOMBRE
      FROM gestion_riesgos.riesgos_organos
      WHERE CODIGO_CIA = ?
      ORDER BY CODIGO_ORGANO ASC
    `;
        const params = [codigo_cia];
        const [rows] = await pool.query(sql, params);
        return res.json({ ok: true, organos: rows });
    } catch (err) {
        console.error('obtenerOrganos', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al listar órganos.' });
    }
}

/**
 * obtenerOrgano
 *
 * Obtiene a detalle un órgano por su código.
 *
 * - Valida que `codigo_organo` sea un número válido.
 * - Devuelve el órgano si existe dentro de la compañía.
 *
 * @route GET /obtener-organo
 * @returns {200|400|404|500} Detalle del órgano o error.
 */
async function obtenerOrgano(req, res) {
    const codigo_cia = req.codigo_cia;
    const codigo_organo = Number(req.query.codigo_organo || 0);

    if (!codigo_organo) {
        return res.status(400).json({ ok: false, mensaje: 'codigo_organo es requerido.' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT CODIGO_CIA, CODIGO_ORGANO, NOMBRE
       FROM gestion_riesgos.riesgos_organos
       WHERE CODIGO_CIA = ? AND CODIGO_ORGANO = ?`,
            [codigo_cia, codigo_organo]
        );
        if (!rows.length) {
            return res.status(404).json({ ok: false, mensaje: 'Órgano no encontrado.' });
        }
        return res.json({ ok: true, organo: rows[0] });
    } catch (err) {
        console.error('obtenerOrgano', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al obtener el órgano.' });
    }
}

/**
 * crearOrgano
 *
 * Crea un nuevo órgano institucional.
 *
 * - Valida duplicados insensibles a mayúsculas dentro de la misma institución.
 * - Calcula el siguiente código correlativo `MAX+1`.
 * - Inserta un registro nuevo con el nombre del órgano.
 *
 * @route POST /
 * @returns {201|400|409|500} Órgano creado o error.
 */
async function crearOrgano(req, res) {
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
       FROM gestion_riesgos.riesgos_organos
       WHERE CODIGO_CIA = ? AND UPPER(NOMBRE) = UPPER(?) 
       LIMIT 1`,
            [codigo_cia, nombre]
        );
        if (dup.length) {
            await conn.rollback();
            return res.status(409).json({ ok: false, mensaje: 'Ya existe un órgano con ese nombre.' });
        }

        const [mx] = await conn.query(
            `SELECT COALESCE(MAX(CODIGO_ORGANO), 0) AS max_cod
       FROM gestion_riesgos.riesgos_organos
       WHERE CODIGO_CIA = ?
       FOR UPDATE`,
            [codigo_cia]
        );
        const codigo_organo = Number(mx[0].max_cod) + 1;

        await conn.query(
            `INSERT INTO gestion_riesgos.riesgos_organos (CODIGO_CIA, CODIGO_ORGANO, NOMBRE, USUARIO_CREACION, FECHA_CREACION)
       VALUES (?, ?, ?, ?, now())`,
            [codigo_cia, codigo_organo, nombre, req.userId]
        );

        await conn.commit();
        return res.status(201).json({
            ok: true,
            mensaje: 'Órgano creado.',
            organo: { CODIGO_CIA: codigo_cia, CODIGO_ORGANO: codigo_organo, NOMBRE: nombre }
        });
    } catch (err) {
        if (conn) try { await conn.rollback(); } catch { }
        console.error('crearOrgano', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al crear el órgano.' });
    } finally {
        if (conn) conn.release();
    }
}

/**
 * actualizarOrgano
 *
 * Actualiza el nombre de un órgano existente.
 *
 * - Verifica existencia del órgano.
 * - Evita duplicidad de nombre dentro de la institución.
 * - Actualiza el registro con el nuevo nombre.
 *
 * @route PUT /
 * @returns {200|400|404|409|500} Resultado de la actualización.
 */
async function actualizarOrgano(req, res) {
    const codigo_cia = req.codigo_cia;
    const codigo_organo = Number(req.body?.codigo_organo || 0);
    const nombre = (req.body?.nombre || '').trim();

    if (!codigo_organo) {
        return res.status(400).json({ ok: false, mensaje: 'codigo_organo es requerido.' });
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
       FROM gestion_riesgos.riesgos_organos
       WHERE CODIGO_CIA = ? AND CODIGO_ORGANO = ?
       LIMIT 1`,
            [codigo_cia, codigo_organo]
        );
        if (!cur.length) {
            await conn.rollback();
            return res.status(404).json({ ok: false, mensaje: 'Órgano no encontrado.' });
        }

        const [dup] = await conn.query(
            `SELECT 1
       FROM gestion_riesgos.riesgos_organos
       WHERE CODIGO_CIA = ?
         AND UPPER(NOMBRE) = UPPER(?)
         AND CODIGO_ORGANO <> ?
       LIMIT 1`,
            [codigo_cia, nombre, codigo_organo]
        );
        if (dup.length) {
            await conn.rollback();
            return res.status(409).json({ ok: false, mensaje: 'Ya existe otro órgano con ese nombre.' });
        }

        await conn.query(
            `UPDATE gestion_riesgos.riesgos_organos
       SET NOMBRE = ?, USUARIO_MODIFICACION = ?, FECHA_MODIFICACION = NOW()
       WHERE CODIGO_CIA = ? AND CODIGO_ORGANO = ?`,
            [nombre, codigo_cia, codigo_organo, req.userId]
        );

        await conn.commit();
        return res.json({ ok: true, mensaje: 'Órgano actualizado.' });
    } catch (err) {
        if (conn) try { await conn.rollback(); } catch { }
        console.error('actualizarOrgano', err);
        return res.status(500).json({ ok: false, mensaje: 'Error al actualizar el órgano.' });
    } finally {
        if (conn) conn.release();
    }
}

module.exports = {
    obtenerOrganos,
    obtenerOrgano,
    crearOrgano,
    actualizarOrgano,
};
