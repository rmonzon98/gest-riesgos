/**
 * @fileoverview 
 * Autenticación: valida credenciales, genera JWT y registra rastro de login.
 *
 * @module Auth/login
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const sha1 = require('sha-1');
const jwt = require('jsonwebtoken');
const pool = require('../bd/mySQLConnection');
const jwtSecret = process.env.SECRET_KEY;

const EXPIRES_IN = 60 * 60 * 10;

/**
 * login
 *
 * Inicia sesión verificando usuario/contraseña y devuelve un JWT para el frontend.
 *
 * - Valida `usuario` y `contra` (body).
 * - Consulta usuario activo y acceso vigente a la app.
 * - Compara el hash `sha1(contra)` con la contraseña almacenada.
 * - Firma un JWT con `{ id, codigo_cia }` (expira en 10h).
 * - Inserta un rastro de login (no bloquea si falla).
 * - Responde `{ auth, token, result }` o mensaje acorde.
 *
 * @route POST /
 * @param {import('express').Request} req Body: { usuario:string, contra:string }
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.login = async (req, res) => {
    const { usuario, contra } = req.body;

    if (!usuario || !contra) {
        return res.status(400).json({ auth: false, message: 'Faltan campos' });
    }

    try {
        const sql = `
        SELECT 
            sp.CODIGO_COLABORADOR   AS CODIGO_PERSONA,
            sp.CONTRASENA,
            sp.CODIGO_ENTIDAD,
            sp.CORREO_ELECTRONICO,
            sp.CODIGO_CIA
        FROM 
            seguridad.seguridad_persona sp
        LEFT JOIN
            seguridad.seguridad_institucion_acceso_app siap
        ON
            sp.codigo_cia = siap.codigo_cia
        WHERE 
            sp.CORREO_ELECTRONICO = ?
            AND sp.ACTIVO = 1
            AND siap.vigente =1
        LIMIT 1
        `;

        const [rows] = await pool.execute(sql, [usuario]);

        if (rows.length === 0) {
            return res.json({ auth: false, message: 'Este usuario no existe' });
        }

        const u = rows[0];

        if (u.CONTRASENA !== sha1(contra)) {
            return res.json({ auth: false, message: 'Ha ingresado el usuario o contraseña equivocada' });
        }

        const payload = { id: u.CODIGO_PERSONA, codigo_cia: u.CODIGO_CIA };
        const token = jwt.sign(payload, jwtSecret, { expiresIn: EXPIRES_IN });

        const result = [{
            CODIGO_CIA: u.CODIGO_CIA,
            CODIGO_PERSONA: u.CODIGO_PERSONA,
            CODIGO_ENTIDAD: u.CODIGO_ENTIDAD
        }];

        try {
            await pool.execute(
                `
            INSERT INTO seguridad.seguridad_rastro_login
            (usuario_creacion, fecha_creacion, codigo_aplicacion, codigo_cia)
            VALUES (?, NOW(), '1', ?)`,
                [u.CODIGO_PERSONA, u.CODIGO_CIA]
            );
        } catch (traceErr) {
            console.warn('No se pudo registrar rastro:', traceErr.message);
        }

        return res.json({ auth: true, token, result });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ auth: false, message: 'Error en el login' });
    }
};
