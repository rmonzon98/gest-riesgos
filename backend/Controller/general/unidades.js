/**
 * @fileoverview 
 * Gestión de unidades/direcciones (entidades): listar, obtener única, crear y actualizar.
 *
 * @module controllers/general/unidades
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

/**
 * obtenerDirecciones
 *
 * Lista las direcciones (entidades) activas de la compañía.
 *
 * - `SELECT CODIGO_ENTIDAD, NOMBRE, SIGLAS FROM seguridad_entidad WHERE CODIGO_CIA=? AND ESTADO='1'`
 *
 * @route GET /
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.obtenerDirecciones = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    if (!codigo_cia) return res.status(400).json({ error: 'Falta codigo_cia' });

    try {
        const sql = `
        SELECT 
            CODIGO_ENTIDAD,   
            NOMBRE,
            SIGLAS
        FROM \`seguridad\`.\`seguridad_entidad\`
        WHERE CODIGO_CIA = ?
            AND ESTADO = '1'      
        ORDER BY NOMBRE ASC
        `;
        const [rows] = await pool.execute(sql, [codigo_cia]);
        return res.json({ result: rows });
    } catch (err) {
        console.error('Error al obtener direcciones:', err);
        return res.status(500).json({ error: 'Error al obtener direcciones' });
    }
};

/**
 * obtenerDireccionUnica
 *
 * Recupera una dirección por su código de entidad.
 *
 * @route GET /obtener-direccion
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.obtenerDireccionUnica = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const direccion = req.query.direccion;

    if (!codigo_cia || !direccion) {
        return res.status(400).json({ error: 'Faltan codigo_cia o direccion' });
    }

    try {
        const sql = `
      SELECT CODIGO_ENTIDAD, NOMBRE, SIGLAS, DESCRIPCION
      FROM seguridad.seguridad_entidad
      WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ?
      LIMIT 1
    `;
        const [rows] = await pool.execute(sql, [codigo_cia, direccion]);

        if (!rows.length) return res.status(404).json({ error: 'Dirección no encontrada' });
        return res.json({ result: rows });
    } catch (err) {
        console.error('obtenerDireccionUnica:', err);
        return res.status(500).json({ error: 'Error al obtener la dirección' });
    }
};

/**
 * crearDirecciones
 *
 * Crea una nueva dirección (entidad) usando transacción corta y correlativo por `MAX+1`.
 *
 * - Calcula el siguiente `CODIGO_ENTIDAD` con `FOR UPDATE`.
 * - Inserta registro con nombre/siglas/descripcion y auditoría de creación.
 *
 * @route POST /
 * @param {import('express').Request} req Body: { descripcion:string, abreviatura:string }
 * @param {import('express').Response} res
 */
exports.crearDirecciones = async (req, res) => {
    const { descripcion, abreviatura } = req.body;
    const siglas = abreviatura;
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;

    if (!codigo_cia || !siglas || !descripcion) {
        return res.status(400).json({ error: 'Faltan campos requeridos (codigo_cia, siglas, descripcion)' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [[row]] = await conn.execute(
            `SELECT COALESCE(MAX(CODIGO_ENTIDAD), 0) + 1 AS NUEVO
         FROM seguridad.seguridad_entidad
        WHERE CODIGO_CIA = ?
        FOR UPDATE`,
            [codigo_cia]
        );
        const codigo_entidad = Number(row?.NUEVO || 1);

        await conn.execute(
            `INSERT INTO seguridad.seguridad_entidad (
         CODIGO_ENTIDAD, CODIGO_CIA, NOMBRE, SIGLAS, DESCRIPCION, ESTADO,
         USUARIO_CREACION, FECHA_CREACION
       ) VALUES (
         ?, ?, ?, ?, ?, 1,
         ?, CURRENT_TIMESTAMP
       )`,
            [codigo_entidad, codigo_cia, descripcion, siglas, descripcion, usuario ?? null]
        );

        await conn.commit();
        return res.status(201).json({ mensaje: 'Dirección creada correctamente', id: codigo_entidad });
    } catch (err) {
        if (conn) { try { await conn.rollback(); } catch { } }
        console.error('crearDirecciones:', err);
        return res.status(500).json({ error: 'Error al crear la dirección' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * actualizarDirecciones
 *
 * Actualiza nombre, siglas y descripción de una dirección existente.
 *
 * @route PUT /
 * @param {import('express').Request} req Body: { id:number, descripcion:string, abreviatura:string }
 * @param {import('express').Response} res
 */
exports.actualizarDirecciones = async (req, res) => {
    const { descripcion, abreviatura, id } = req.body;
    const siglas = abreviatura;
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;

    if (!codigo_cia || !id || !siglas || !descripcion) {
        return res.status(400).json({ error: 'Faltan campos requeridos (codigo_cia, id, siglas, descripcion)' });
    }

    try {
        const [result] = await pool.execute(
            `UPDATE seguridad.seguridad_entidad
          SET NOMBRE               = ?,
              SIGLAS               = ?,
              DESCRIPCION          = ?,
              USUARIO_MODIFICACION = ?,
              FECHA_MODIFICACION   = CURRENT_TIMESTAMP
        WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ?`,
            [descripcion, siglas, descripcion, usuario ?? null, codigo_cia, Number(id)]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Dirección no encontrada' });
        }

        return res.json({ mensaje: 'Dirección actualizada correctamente' });
    } catch (err) {
        console.error('actualizarDirecciones:', err);
        return res.status(500).json({ error: 'Error al actualizar la dirección' });
    }
};