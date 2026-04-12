/**
 * @fileoverview 
 * Middleware de autenticación JWT: extrae token, valida firma/expiración y popula `req.user`.
 *
 * @module middleware/auth/verifyJWT
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const jwt = require('jsonwebtoken');
const pool = require('../bd/mySQLConnection'); 
const jwtSecret = process.env.SECRET_KEY;

/**
 * extractToken
 *
 * Obtiene el token desde `Authorization: Bearer <token>` o encabezado `x-access-token`.
 *
 * @param {import('express').Request} req
 * @returns {string|undefined} Token JWT si existe.
 */
function extractToken(req) {
    const bearer = req.headers.authorization || req.headers.Authorization;
    if (bearer && bearer.startsWith('Bearer ')) {
        return bearer.slice(7);
    }
    return req.headers['x-access-token'];
}

/**
 * verifyJWT
 *
 * Protege rutas validando JWT y asegurando que el usuario exista en la BD.
 *
 * - Extrae token; si falta entonces, 401.
 * - `jwt.verify` con `SECRET_KEY` (lanza si es inválido/expirado).
 * - Consulta MySQL para confirmar `id` y `codigo_cia`.
 *
 * @middleware
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
exports.verifyJWT = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(401).json({ auth: false, message: 'Token no enviado' });
        }

        const decoded = jwt.verify(token, jwtSecret); 
        const { id, codigo_cia } = decoded;
        const sql = `
        SELECT 
            sp.CODIGO_ENTIDAD,
            sp.CODIGO_CIA
        FROM 
            seguridad.seguridad_persona sp
        WHERE 
            sp.CODIGO_COLABORADOR = ?
            AND sp.CODIGO_CIA = ?
        LIMIT 1
        `;
        const [rows] = await pool.execute(sql, [id, codigo_cia]);

        if (rows.length === 0) {
            return res.status(401).json({ auth: false, message: 'Autenticación inválida' });
        }

        const u = rows[0];

        req.user = { id, codigo_entidad: u.CODIGO_ENTIDAD, codigo_cia: u.CODIGO_CIA, };


        req.userId = id;
        req.codigoEntidad = u.CODIGO_ENTIDAD;
        req.codigo_cia = u.CODIGO_CIA;
        req.codigo_entidad = u.CODIGO_ENTIDAD;
        return next();
    } catch (err) {
        const msg = err.name === 'TokenExpiredError'
            ? 'Token expirado'
            : 'Autenticación fallida';
        return res.status(401).json({ auth: false, message: msg });
    }
};
