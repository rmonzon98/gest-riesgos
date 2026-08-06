const pool = require('../bd/mySQLConnection');
const { hashValue } = require('./totp');

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

exports.verifyCSRF = async (req, res, next) => {
    try {
        if (SAFE_METHODS.includes(req.method)) {
            return next();
        }

        const csrfHeader = req.headers['x-csrf-token'];
        const csrfCookie = req.cookies?.csrf_token;

        if (!req.sessionId) {
            return res.status(401).json({
                auth: false,
                message: 'Sesión no identificada para validar CSRF'
            });
        }

        if (!csrfHeader || !csrfCookie) {
            return res.status(403).json({
                auth: false,
                message: 'Token CSRF no enviado'
            });
        }

        if (String(csrfHeader) !== String(csrfCookie)) {
            return res.status(403).json({
                auth: false,
                message: 'Token CSRF inválido'
            });
        }

        const csrfHash = hashValue(csrfHeader);

        const [rows] = await pool.execute(
            `
            SELECT id_sesion
            FROM gestion_riesgos.seguridad_sesion
            WHERE id_sesion = ?
              AND csrf_token_hash = ?
              AND activo = 1
              AND fecha_revocacion IS NULL
              AND fecha_expiracion > NOW()
            LIMIT 1
            `,
            [req.sessionId, csrfHash]
        );

        if (rows.length === 0) {
            return res.status(403).json({
                auth: false,
                message: 'Token CSRF no coincide con la sesión'
            });
        }

        return next();
    } catch (err) {
        console.error('Error validando CSRF:', err);
        return res.status(500).json({
            auth: false,
            message: 'Error validando CSRF'
        });
    }
};