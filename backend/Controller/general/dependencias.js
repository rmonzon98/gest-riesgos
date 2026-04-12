/**
 * @fileoverview 
 * Gestión de dependencias (unidades/departamentos) de una entidad: listar, crear, actualizar y cambiar estado.
 *
 * @module Controller/general/dependencias
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

/**
 * Convierte valores a número o `null` para facilitar validaciones.
 * @param {any} v
 * @returns {number|null}
 */
const toNum = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

/**
 * obtenerDependencias
 *
 * Lista las dependencias de una entidad dada.
 *
 * - Valida `codigo_cia` y `codigo_entidad`.
 * - Ejecuta `SELECT ... FROM seguridad.seguridad_dependencia WHERE codigo_cia = ? AND codigo_entidad = ?`.
 * - Responde `{ data: rows }`.
 *
 * @route GET /
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.obtenerDependencias = async (req, res) => {
    const cia = toNum(req.codigo_cia);
    const codigo_entidad = toNum(req.query?.codigo_entidad);

    if (!cia) return res.status(401).json({ msg: 'Falta o es inválido codigo_cia' });
    if (!codigo_entidad) return res.status(400).json({ msg: 'Falta el parámetro "codigo_entidad"' });

    try {
        const sql = `
      SELECT codigo_dependencia, nombre, siglas, estado
      FROM seguridad.seguridad_dependencia
      WHERE codigo_cia = ? AND codigo_entidad = ?
      ORDER BY nombre ASC
    `;
        const [rows] = await pool.execute(sql, [cia, codigo_entidad]);
        return res.json({ msg: '✅ Dependencias obtenidas', data: rows });
    } catch (err) {
        console.error('obtenerDependencias', { cia, codigo_entidad, err });
        return res.status(500).json({ msg: '❌ Error al obtener dependencias' });
    }
};

/**
 * crearDependencia
 *
 * Crea una nueva dependencia dentro de una entidad.
 *
 * - Valida campos mínimos (`codigo_entidad`, `nombre`, `siglas`).
 * - Usa transacción para calcular `MAX(codigo_dependencia)+1` y hacer `INSERT`.
 * - Devuelve 201 con datos básicos creados.
 *
 * @route POST /
 * @param {import('express').Request} req Body: { codigo_entidad:number, nombre:string, siglas:string, descripcion?:string }
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.crearDependencia = async (req, res) => {
    const cia = toNum(req.codigo_cia);
    const userId = req.userId ?? null;
    const codigo_entidad = toNum(req.body?.codigo_entidad);
    const nombre = (req.body?.nombre || '').trim();
    const siglas = (req.body?.siglas || '').trim();
    const descripcion = (req.body?.descripcion ?? null) === '' ? null : req.body?.descripcion ?? null;

    if (!cia) return res.status(401).json({ msg: 'Falta o es inválido codigo_cia' });
    if (!codigo_entidad || !nombre || !siglas) {
        return res.status(400).json({ msg: 'Faltan campos: codigo_entidad, nombre y siglas' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [nextRows] = await conn.execute(
            `SELECT IFNULL(MAX(codigo_dependencia), 0) + 1 AS next
         FROM seguridad.seguridad_dependencia
        WHERE codigo_cia = ? AND codigo_entidad = ?`,
            [cia, codigo_entidad]
        );
        const codigo_dependencia = Number(nextRows?.[0]?.next || 1);

        const insertSQL = `
      INSERT INTO seguridad.seguridad_dependencia
        (codigo_dependencia, codigo_entidad, codigo_cia,
         nombre, siglas, descripcion, estado,
         usuario_creacion, fecha_creacion)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW())
    `;
        await conn.execute(insertSQL, [
            codigo_dependencia, codigo_entidad, cia,
            nombre, siglas, descripcion, userId
        ]);

        await conn.commit();
        return res.status(201).json({
            msg: '✅ Dependencia creada',
            data: { codigo_dependencia, codigo_entidad, nombre, siglas, estado: 1 }
        });
    } catch (err) {
        await conn.rollback();
        console.error('crearDependencia', { cia, codigo_entidad, userId, err });
        return res.status(500).json({ msg: '❌ Error al crear la dependencia' });
    } finally {
        conn.release();
    }
};

/**
 * actualizarDependencia
 *
 * Actualiza nombre/siglas de una dependencia.
 *
 * - Valida mínimos (`codigo_entidad`, `codigo_dependencia`, `nombre`, `siglas`).
 * - Ejecuta `UPDATE ... WHERE codigo_cia AND codigo_entidad AND codigo_dependencia`.
 * - Devuelve 404 si no existía.
 *
 * @route PUT /
 * @param {import('express').Request} req Body: { codigo_entidad:number, codigo_dependencia:number, nombre:string, siglas:string }
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.actualizarDependencia = async (req, res) => {
    const cia = toNum(req.codigo_cia);
    const userId = req.userId ?? null;
    const codigo_entidad = toNum(req.body?.codigo_entidad);
    const codigo_dependencia = toNum(req.body?.codigo_dependencia);
    const nombre = (req.body?.nombre || '').trim();
    const siglas = (req.body?.siglas || '').trim();

    if (!cia) return res.status(401).json({ msg: 'Falta o es inválido codigo_cia' });
    if (!codigo_entidad || !codigo_dependencia || !nombre || !siglas) {
        return res.status(400).json({ msg: 'Faltan campos: codigo_entidad, codigo_dependencia, nombre y siglas' });
    }

    try {
        const updateSQL = `
      UPDATE seguridad.seguridad_dependencia
         SET nombre = ?, siglas = ?,
             usuario_modificacion = ?, fecha_modificacion = NOW()
       WHERE codigo_cia = ? AND codigo_entidad = ? AND codigo_dependencia = ?
    `;
        const [r] = await pool.execute(updateSQL, [
            nombre, siglas, userId, cia, codigo_entidad, codigo_dependencia
        ]);

        if (r.affectedRows === 0) return res.status(404).json({ msg: 'Dependencia no encontrada' });

        return res.json({
            msg: '✅ Dependencia actualizada',
            data: { codigo_dependencia, codigo_entidad, nombre, siglas }
        });
    } catch (err) {
        console.error('actualizarDependencia', { cia, codigo_entidad, codigo_dependencia, err });
        return res.status(500).json({ msg: '❌ Error al actualizar la dependencia' });
    }
};

/**
 * cambiarEstadoDependencia
 *
 * Alterna el estado (1/0) activo/inactivo de una dependencia.
 *
 * - Valida `codigo_entidad` y `codigo_dependencia`.
 * - Ejecuta `UPDATE ... SET estado = CASE WHEN estado = 1 THEN 0 ELSE 1 END`.
 * - Devuelve el registro actualizado.
 *
 * @route PATCH /estado
 * @param {import('express').Request} req Body: { codigo_entidad:number, codigo_dependencia:number }
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.cambiarEstadoDependencia = async (req, res) => {
    const cia = toNum(req.codigo_cia);
    const userId = req.userId ?? null;
    const codigo_entidad = toNum(req.body?.codigo_entidad);
    const codigo_dependencia = toNum(req.body?.codigo_dependencia);

    if (!cia) return res.status(401).json({ msg: 'Falta o es inválido codigo_cia' });
    if (!codigo_entidad || !codigo_dependencia) {
        return res.status(400).json({ msg: 'Faltan campos: codigo_entidad y codigo_dependencia' });
    }

    try {
        const toggleSQL = `
      UPDATE seguridad.seguridad_dependencia
         SET estado = CASE WHEN estado = 1 THEN 0 ELSE 1 END,
             usuario_modificacion = ?, fecha_modificacion = NOW()
       WHERE codigo_cia = ? AND codigo_entidad = ? AND codigo_dependencia = ?
    `;
        const [r] = await pool.execute(toggleSQL, [userId, cia, codigo_entidad, codigo_dependencia]);
        if (r.affectedRows === 0) return res.status(404).json({ msg: 'Dependencia no encontrada' });

        const [rows] = await pool.execute(
            `SELECT codigo_dependencia, nombre, siglas, estado
         FROM seguridad.seguridad_dependencia
        WHERE codigo_cia = ? AND codigo_entidad = ? AND codigo_dependencia = ?`,
            [cia, codigo_entidad, codigo_dependencia]
        );

        return res.json({ msg: '✅ Estado actualizado', data: rows?.[0] || null });
    } catch (err) {
        console.error('cambiarEstadoDependencia', { cia, codigo_entidad, codigo_dependencia, err });
        return res.status(500).json({ msg: '❌ Error al cambiar estado' });
    }
};
