/**
 * @fileoverview
 * Catálogo de entidades/direcciones por institución.
 *
 * @module Controller/seguridad/entidades
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

  /**
   * obtenerEntidades
   * 
   * Lista entidades activas (`estado=1`) para una compañía.
   *
   * - Ejecuta SELECT ordenado por nombre.
   * - Nota: en la versión actual el `codigo_cia` está fijo a 1.
   *
   * @route GET /listado-entidades-login
   * @returns {200|400|500} `{result:[{CODIGO_ENTIDAD, NOMBRE}]}`.
   */
exports.obtenerEntidades = async (req, res) => {
    try {
        const codigo_cia = 1;
        if (!codigo_cia) {
            return res.status(400).json({ error: 'Falta codigo_cia' });
        }

        const sql = `
        SELECT codigo_entidad "CODIGO_ENTIDAD", nombre "NOMBRE"
        FROM seguridad.seguridad_entidad
        WHERE estado = ? AND codigo_cia = ?
        ORDER BY nombre ASC
        `;

        const [rows] = await pool.execute(sql, [1, codigo_cia]);

        return res.json({ result: rows });
    } catch (err) {
        console.error('obtenerEntidades error:', err);
        return res.status(500).json({ error: 'Error al obtener entidades' });
    }
};