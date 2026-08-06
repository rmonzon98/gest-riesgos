/**
 * @fileoverview 
 * Endpoints generales de acceso a aplicaciones del sistema (listado y validación por institución).
 *
 * @module Controller/menu/General
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

/**
 * obtenerAplicaciones
 *
 * Lista las aplicaciones habilitadas para la institución de la sesión.
 *
 * - Valida `codigo_cia`.
 * - Ejecuta `SELECT` con `LEFT JOIN` entre `seguridad_institucion_acceso_app` y `seguridad_aplicacion`,
 *   filtrando por `vigente=1` y fecha de vigencia válida.
 * - Devuelve `{ result: rows }` ordenado por nombre de aplicación.
 *
 * @route GET /
 * @param {import('express').Request} req  (usa `req.codigo_cia`)
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.obtenerAplicaciones = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    if (!codigo_cia) return res.status(400).json({ error: 'Falta codigo_cia' });

    try {
        const sql = `
        SELECT 
            b.NOMBRE, b.URL_BASE, IMAGEN
        FROM 
            gestion_riesgos.seguridad_institucion_acceso_app a
        LEFT JOIN
            gestion_riesgos.seguridad_aplicacion b
        ON
            a.codigo_aplicacion = b.codigo_aplicacion
        WHERE 
            a.CODIGO_CIA = ? 
            AND vigente = 1
            AND (fecha_vigencia > NOW() OR fecha_vigencia IS NULL)
        ORDER BY b.NOMBRE
        `;
        const [rows] = await pool.execute(sql, [codigo_cia]);
        return res.json({ result: rows });
    } catch (err) {
        console.error('obtenerApps:', err);
        return res.status(500).json({ error: 'Error al obtener áreas' });
    }
};

/**
 * checkApp
 *
 * Verifica si la institución del usuario tiene permiso para acceder a una app (por `url_base`).
 *
 * - Valida parámetros `app` (query) y `codigo_cia` (en req).
 * - Consulta la relación de acceso vigente y retorna `permitido: true|false` y un `detalle` si aplica.
 *
 * @route GET /auth/puede-acceder
 * @param {import('express').Request} req  Query: { app:string }
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.checkApp = async (req, res) => {
    try {
        const app = String(req.query.app || '').trim().toLowerCase().replace(/^\/+/, '');
        const codigo_cia = req.codigo_cia

        if (!app) {
            return res.status(400).json({ ok: false, error: 'Falta parámetro "app".' });
        }
        if (!codigo_cia) {
            return res.status(400).json({ ok: false, error: 'Falta codigo_cia.' });
        }

        const sql = `
        SELECT 
            b.NOMBRE, b.URL_BASE, b.IMAGEN
        FROM gestion_riesgos.seguridad_institucion_acceso_app a
        LEFT JOIN gestion_riesgos.seguridad_aplicacion b
            ON a.codigo_aplicacion = b.codigo_aplicacion
        WHERE 
            a.CODIGO_CIA = ?
            AND a.vigente = 1
            AND (a.fecha_vigencia > NOW() OR a.fecha_vigencia IS NULL)
            AND LOWER(TRIM(LEADING '/' FROM TRIM(b.url_base))) = ?
        ORDER BY b.NOMBRE
        LIMIT 1
        `;

        const [rows] = await pool.execute(sql, [codigo_cia, app]);
        const permitido = rows.length > 0;

        return res.json({
            ok: true,
            permitido,
            app,
            detalle: permitido ? rows[0] : null,
        });
    } catch (err) {
        console.error('checkApp error:', err);
        return res.status(500).json({ ok: false, error: 'Error interno al verificar permisos.' });
    }
};
