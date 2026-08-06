/**
 * @fileoverview 
 * Administración general de la institución: obtiene y actualiza el nombre/tipo de la institución.
 *
 * @module Controller/general/administracion
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

/**
 * obtenerGeneral
 *
 * Devuelve los datos básicos (NOMBRE, TIPO) de la institución de la sesión.
 *
 * - Lee `codigo_cia` desde `req.user` | `req.codigo_cia` | `req.query.codigo_cia`.
 * - Ejecuta `SELECT ... FROM gestion_riesgos.seguridad_institucion WHERE CODIGO_CIA = ?`.
 * - Responde 400 si falta `codigo_cia`, 404 si no hay registro, 200 con `{ result }` si existe.
 *
 * @route GET /general
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.obtenerGeneral = async (req, res) => {
    const codigo_cia = req.user?.codigo_cia ?? req.codigo_cia ?? req.query?.codigo_cia;
    if (!codigo_cia) return res.status(400).json({ msg: 'Falta codigo_cia' });

    try {
        const sql = `
        SELECT NOMBRE, TIPO, CORREO_SOPORTE
        FROM gestion_riesgos.seguridad_institucion
        WHERE CODIGO_CIA = ?
        LIMIT 1
        `;
        const [rows] = await pool.execute(sql, [codigo_cia]);

        if (!rows.length) return res.status(404).json({ msg: 'Institución no encontrada' });
        return res.json({ result: rows });
    } catch (err) {
        console.error('obtenerGeneral error:', err);
        return res.status(500).json({ message: 'Error al obtener institución' });
    }
};

/**
 * actualizarGeneral
 *
 * Actualiza el `NOMBRE` y `TIPO` de la institución.
 *
 * - Valida que existan `codigo_cia`, `nombre` y `tipo`.
 * - Ejecuta `UPDATE gestion_riesgos.seguridad_institucion SET ... WHERE CODIGO_CIA = ?`.
 * - Responde 404 si no hubo filas afectadas, 200 si se actualiza.
 *
 * @route PUT /general
 * @param {import('express').Request} req  Body: { nombre:string, tipo:string }
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.actualizarGeneral = async (req, res) => {
    const { nombre, tipo, correo } = req.body;
    const codigo_cia = req.codigo_cia;

    if (!codigo_cia || !nombre || !tipo || !correo) {
        return res.status(400).json({ error: 'Faltan codigo_cia, correo, nombre o tipo' });
    }

    try {
        const sql = `
      UPDATE gestion_riesgos.seguridad_institucion
         SET NOMBRE = ?, TIPO = ?, CORREO_SOPORTE = ?, usuario_modificacion = ?, fecha_modificacion = now()
       WHERE CODIGO_CIA = ?
      LIMIT 1
    `;
        const params = [nombre, tipo, correo, req.userId, codigo_cia];

        const [result] = await pool.execute(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Entrada no encontrada o sin cambios.' });
        }

        return res.status(200).json({
            ok: true,
            message: 'Entrada actualizada correctamente.'
        });
    } catch (err) {
        console.error('actualizarGeneral:', err);
        return res.status(500).json({ error: 'Error al actualizar' });
    }
};

exports.obtenerLogsPorTabla = async (req, res) => {
    const { tabla } = req.query;
    const codigoCia = req.codigo_cia;

    try {
        if (!tabla) {
            return res.status(400).json({
                ok: false,
                msg: 'Debes enviar el parámetro ?tabla=nombre_tabla'
            });
        }

        if (codigoCia === undefined || codigoCia === null) {
            return res.status(400).json({
                ok: false,
                msg: 'No se encontró codigo_cia en la petición'
            });
        }

        // prefijo antes del "_": riesgos_xxx | seguridad_xxx
        const prefijo = String(tabla).split('_')[0];

        let logsTable;
        let idField;

        switch (prefijo) {
            case 'riesgos':
                logsTable = 'riesgos_logs';
                // En riesgos_logs el correlativo se llama codigo_log
                idField = 'codigo_log';
                break;

            case 'seguridad':
                logsTable = 'seguridad_logs';
                // En seguridad_logs el correlativo se llama codigo_entrada
                idField = 'codigo_entrada';
                break;

            default:
                return res.status(400).json({
                    ok: false,
                    msg: `El nombre de tabla debe iniciar con "riesgos_" o "seguridad_". Valor recibido: "${tabla}"`
                });
        }

        const sql = `
            SELECT
                codigo_cia,
                ${idField} AS codigo_log,
                usuario_creacion,
                fecha_creacion,
                nombre_tabla,
                accion,
                informacion
            FROM gestion_riesgos.${logsTable}
            WHERE nombre_tabla = ?
              AND codigo_cia IN (?, 0, -1)
            ORDER BY fecha_creacion DESC, codigo_log DESC
        `;

        const [rows] = await pool.query(sql, [tabla, codigoCia]);

        return res.json({
            ok: true,
            tabla,
            logs_table: logsTable,
            total: rows.length,
            data: rows
        });

    } catch (error) {
        console.error('❌ Error al obtener logs por tabla:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado al obtener los logs',
            error: error.message
        });
    }
};

exports.obtenerMetricas = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    try {
        const [
            riesgos, primeraMatriz,
            segundaMatriz, seguimientos
        ] = await Promise.all([
            pool.execute(
                `
                SELECT codigo_entidad, codigo_tipo_objetivo, riesgo_residual, riesgo_inherente, codigo_periodo
                FROM gestion_riesgos.riesgos_riesgo_extendido
                WHERE eliminado = 0 AND codigo_cia = ?
                `, [codigo_cia]
            ).then(([rows]) => rows),
            pool.execute(
                `
                SELECT codigo_cia, codigo_entidad, codigo_periodo
                FROM gestion_riesgos.riesgos_primera_matriz_his
                WHERE codigo_cia = ?
                GROUP BY codigo_cia, codigo_entidad, codigo_periodo
                `, [codigo_cia]
            ).then(([rows]) => rows),
            pool.execute(
                `
                SELECT codigo_cia, codigo_entidad, codigo_periodo
                FROM gestion_riesgos.riesgos_segunda_matriz_his
                WHERE codigo_cia = ?
                GROUP BY codigo_cia, codigo_entidad, codigo_periodo
                `, [codigo_cia]
            ).then(([rows]) => rows),
            // Seguimientos
            pool.execute(
                `
                SELECT codigo_entidad, mes, codigo_periodo
                FROM gestion_riesgos.riesgos_seguimiento
                WHERE codigo_cia = ?
                `, [codigo_cia]
            ).then(([rows]) => rows),
        ]);

        return res.json({
            riesgos, primeraMatriz,
            segundaMatriz, seguimientos
        });
    } catch (err) {
        console.error('metricas:', err);
        return res.status(500).json({ error: 'Error interno al obtener métricas' });
    }
}
