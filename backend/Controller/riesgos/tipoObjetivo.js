/**
 * @fileoverview
 * Controlador de Tipos de Objetivo dentro del módulo de gestión de riesgos.
 * Permite listar, consultar, crear y actualizar tipos de objetivo.
 *
 * @module controller/riesgos/tipoObjetivo
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

/**
 * obtenerTiposObjetivo
 *
 * Lista todos los tipos de objetivo activos.
 * - Filtra por empresa vía req.codigo_cia.
 * - Ordena por código ascendente.
 *
 * @route GET /
 * @returns {200|400|500} Listado de tipos de objetivo activos.
 */
exports.obtenerTiposObjetivo = async (req, res) => {
  const codigo_cia = req.codigo_cia;
  if (!codigo_cia) return res.status(400).json({ error: 'Falta codigo_cia' });

  try {
    const sql = `
      SELECT CODIGO_TIPO_OBJETIVO, DESCRIPCION
      FROM gestion_riesgos.riesgos_tipo_objetivo
      WHERE CODIGO_CIA = ? AND ESTADO = 1
      ORDER BY CODIGO_TIPO_OBJETIVO
    `;
    const [rows] = await pool.execute(sql, [codigo_cia]);
    return res.json({ result: rows });
  } catch (err) {
    console.error('obtenerTiposObjetivo:', err);
    return res.status(500).json({ error: 'Error al obtener tipos de objetivo' });
  }
};

/**
 * obtenerTipoObjetivoUnico
 *
 * Obtiene un tipo de objetivo específico según su código.
 * - Devuelve error 404 si no existe.
 *
 * @route GET /obtener-tipo
 * @returns {200|400|404|500} Tipo de objetivo encontrado o error.
 */
exports.obtenerTipoObjetivoUnico = async (req, res) => {
  const codigo_cia = req.codigo_cia;
  const codigo = req.query?.codigo ?? req.params?.codigo;
  if (!codigo_cia || !codigo) {
    return res.status(400).json({ error: 'Faltan codigo_cia o codigo' });
  }

  try {
    const sql = `
      SELECT CODIGO_TIPO_OBJETIVO, DESCRIPCION
      FROM gestion_riesgos.riesgos_tipo_objetivo
      WHERE CODIGO_CIA = ? AND CODIGO_TIPO_OBJETIVO = ?
      LIMIT 1
    `;
    const [rows] = await pool.execute(sql, [codigo_cia, codigo]);
    if (!rows.length) return res.status(404).json({ error: 'Tipo de objetivo no encontrado' });
    return res.json({ result: rows });
  } catch (err) {
    console.error('obtenerTipoObjetivoUnico:', err);
    return res.status(500).json({ error: 'Error al obtener tipo de objetivo' });
  }
};

/**
 * crearTipoObjetivo
 *
 * Crea un tipo de objetivo.
 * - El cliente envía el código manualmente.
 * - Verifica duplicados por clave primaria.
 *
 * @route POST /
 * @returns {201|400|409|500} Confirmación de creación.
 */
exports.crearTipoObjetivo = async (req, res) => {
  const { codigo, descripcion } = req.body;
  const codigo_cia = req.codigo_cia;
  const usuario = req.userId;

  if (!codigo_cia || !codigo || !descripcion) {
    return res.status(400).json({ error: 'Faltan campos requeridos (codigo_cia, codigo, descripcion)' });
  }

  try {
    const sql = `
      INSERT INTO gestion_riesgos.riesgos_tipo_objetivo (
        CODIGO_CIA, CODIGO_TIPO_OBJETIVO, DESCRIPCION, ESTADO,
        USUARIO_CREACION, FECHA_CREACION
      ) VALUES (
        ?, ?, ?, 1,
        ?, CURRENT_TIMESTAMP
      )
    `;
    const params = [codigo_cia, codigo, descripcion, usuario ?? null];

    await pool.execute(sql, params);
    return res.status(201).json({ mensaje: 'Tipo de objetivo creado correctamente' });
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      return res.status(409).json({ error: 'Ya existe un tipo de objetivo con ese código' });
    }
    console.error('crearTipoObjetivo:', err);
    return res.status(500).json({ error: 'Error al crear el tipo de objetivo' });
  }
};

/**
 * actualizarTipoObjetivo
 *
 * Actualiza la descripción de un tipo de objetivo.
 * - Si no existe, responde 404.
 *
 * @route PUT /
 * @returns {200|404|500} Resultado de la actualización.
 */
exports.actualizarTipoObjetivo = async (req, res) => {
  const { codigo, descripcion } = req.body;
  const codigo_cia = req.codigo_cia;
  const usuario = req.userId;

  if (!codigo_cia || !codigo || !descripcion) {
    return res.status(400).json({ error: 'Faltan campos requeridos (codigo_cia, codigo, descripcion)' });
  }

  try {
    const sql = `
      UPDATE gestion_riesgos.riesgos_tipo_objetivo
         SET DESCRIPCION          = ?,
             USUARIO_MODIFICACION = ?,
             FECHA_MODIFICACION   = CURRENT_TIMESTAMP
       WHERE CODIGO_CIA = ? AND CODIGO_TIPO_OBJETIVO = ?
    `;
    const params = [descripcion, usuario ?? null, codigo_cia, codigo];

    const [result] = await pool.execute(sql, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tipo de objetivo no encontrado' });
    }

    return res.json({ mensaje: 'Tipo de objetivo actualizado correctamente' });
  } catch (err) {
    console.error('actualizarTipoObjetivo:', err);
    return res.status(500).json({ error: 'Error al actualizar el tipo de objetivo' });
  }
};