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
 * verifyJWT
 *
 * Protege rutas validando JWT y asegurando que el usuario exista en la BD.
 *
 * - Extrae token; si falta entonces, 401.
 * - `jwt.verify` con `SECRET_KEY` (lanza si es inválido/expirado).
 * - Consulta MySQL para confirmar `id` y `codigo_cia`.
 *
 * @middleware
 */
exports.verifyJWT = async (req, res, next) => {
    try {
        const token = req.cookies?.access_token;

        if (!token) {
            return res.status(401).json({
                auth: false,
                message: 'Token no enviado'
            });
        }

        const decoded = jwt.verify(token, jwtSecret);

        const { id, codigo_cia, sid } = decoded;

        if (!id || !codigo_cia || !sid) {
            return res.status(401).json({
                auth: false,
                message: 'Token incompleto'
            });
        }

        const sql = `
            SELECT 
                sp.CODIGO_COLABORADOR AS CODIGO_PERSONA,
                sp.CODIGO_ENTIDAD,
                sp.CODIGO_CIA,
                s.id_sesion
            FROM 
                gestion_riesgos.seguridad_sesion s
            INNER JOIN
                gestion_riesgos.seguridad_persona sp
            ON
                sp.CODIGO_CIA = s.codigo_cia
                AND sp.CODIGO_COLABORADOR = s.codigo_colaborador
            WHERE 
                s.id_sesion = ?
                AND s.codigo_cia = ?
                AND s.codigo_colaborador = ?
                AND s.activo = 1
                AND s.fecha_revocacion IS NULL
                AND s.fecha_expiracion > NOW()
                AND sp.ACTIVO = 1
            LIMIT 1
        `;

        const [rows] = await pool.execute(sql, [sid, codigo_cia, id]);

        if (rows.length === 0) {
            return res.status(401).json({
                auth: false,
                message: 'Sesión inválida o expirada'
            });
        }

        const u = rows[0];

        req.user = {
            id: u.CODIGO_PERSONA,
            codigo_cia: u.CODIGO_CIA,
            codigo_entidad: u.CODIGO_ENTIDAD,
            id_sesion: u.id_sesion
        };

        req.userId = u.CODIGO_PERSONA;
        req.sessionId = u.id_sesion;

        req.codigoEntidad = u.CODIGO_ENTIDAD;
        req.codigo_cia = u.CODIGO_CIA;
        req.codigo_entidad = u.CODIGO_ENTIDAD;

        return next();
    } catch (err) {
        console.log('Error en verifyJWT:', err);
        const msg = err.name === 'TokenExpiredError'
            ? 'Token expirado'
            : 'Autenticación fallida';

        return res.status(401).json({
            auth: false,
            message: msg
        });
    }
};
