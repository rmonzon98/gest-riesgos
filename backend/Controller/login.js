/**
 * @fileoverview
 * Autenticación actualizada con JWT, cookies HTTP-only, refresh tokens y doble factor
 * de autenticación mediante TOTP.
 *
 * Este controlador permite:
 *
 * - Validar credenciales de usuario.
 * - Solicitar segundo factor cuando el usuario tiene 2FA activo.
 * - Verificar códigos TOTP o códigos de recuperación.
 * - Crear sesiones persistentes con refresh token.
 * - Renovar sesiones activas.
 * - Cerrar sesión y revocar la sesión actual.
 * - Consultar información del usuario autenticado.
 * - Configurar, confirmar y desactivar 2FA.
 *
 * @module Auth/loginActualizado
 * @version 2.0
 * @author Equipo de Desarrollo
 */

const sha1 = require('sha-1');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../bd/mySQLConnection');

const {
    encryptSecret,
    decryptSecret,
    generateTotpSecret,
    getOtpAuthUrl,
    generateQrDataUrl,
    verifyTotpCode,
    hashValue,
    generateRecoveryCodes,
    normalizeRecoveryCode
} = require('../utils/totp');

const jwtSecret = process.env.SECRET_KEY;

/**
 * Tiempo de vida del access token en minutos.
 * Por defecto: 15 minutos.
 *
 * @constant {number}
 */
const ACCESS_TOKEN_MINUTES = Number(process.env.ACCESS_TOKEN_MINUTES || 15);

/**
 * Tiempo de vida del refresh token en días.
 * Por defecto: 7 días.
 *
 * @constant {number}
 */
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 7);

/**
 * Tiempo de vida del token temporal de 2FA en minutos.
 * Por defecto: 5 minutos.
 *
 * @constant {number}
 */
const TWO_FACTOR_TOKEN_MINUTES = Number(process.env.TWO_FACTOR_TOKEN_MINUTES || 5);

/**
 * Determina si las cookies deben enviarse únicamente por HTTPS.
 *
 * - Si existe COOKIE_SECURE en variables de entorno, usa ese valor.
 * - Si no existe, usa `true` únicamente en producción.
 *
 * @returns {boolean} `true` si la cookie debe ser segura.
 */
function isSecureCookie() {
    if (process.env.COOKIE_SECURE !== undefined) {
        return String(process.env.COOKIE_SECURE).toLowerCase() === 'true';
    }

    return process.env.NODE_ENV === 'production';
}

/**
 * Obtiene la política SameSite que se aplicará a las cookies.
 *
 * Valores permitidos:
 * - strict
 * - lax
 * - none
 *
 * Si el valor configurado no es válido, se usa `strict`.
 *
 * @returns {'strict'|'lax'|'none'} Política SameSite de cookies.
 */
function getSameSite() {
    const value = String(process.env.COOKIE_SAMESITE || 'strict').toLowerCase();

    if (['strict', 'lax', 'none'].includes(value)) {
        return value;
    }

    return 'strict';
}

/**
 * Construye la configuración base para cookies de autenticación.
 *
 * @param {object} [extra={}] Opciones adicionales para sobrescribir o extender la configuración.
 * @returns {object} Opciones finales para `res.cookie` o `res.clearCookie`.
 */
function baseCookieOptions(extra = {}) {
    return {
        secure: isSecureCookie(),
        sameSite: getSameSite(),
        ...extra
    };
}

/**
 * Obtiene la IP de origen de la solicitud.
 *
 * Si la aplicación está detrás de proxy o balanceador, intenta leer primero
 * el encabezado `x-forwarded-for`.
 *
 * @param {import('express').Request} req Solicitud HTTP.
 * @returns {string|null} IP detectada o `null`.
 */
function getIp(req) {
    const forwarded = req.headers['x-forwarded-for'];

    if (forwarded) {
        return String(forwarded).split(',')[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || null;
}

/**
 * Obtiene el User-Agent del cliente.
 *
 * @param {import('express').Request} req Solicitud HTTP.
 * @returns {string|null} User-Agent o `null`.
 */
function getUserAgent(req) {
    return req.headers['user-agent'] || null;
}

/**
 * Genera un token aleatorio seguro en formato URL-safe base64.
 *
 * Se usa para refresh tokens, CSRF tokens y otros valores sensibles.
 *
 * @param {number} [bytes=48] Cantidad de bytes aleatorios.
 * @returns {string} Token generado.
 */
function randomToken(bytes = 48) {
    return crypto
        .randomBytes(bytes)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Calcula la fecha de expiración del refresh token.
 *
 * @returns {Date} Fecha de expiración.
 */
function getRefreshExpirationDate() {
    return new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Firma un access token JWT para el usuario autenticado.
 *
 * El token incluye:
 * - id del colaborador/persona.
 * - código de compañía.
 * - id de sesión.
 *
 * @param {object} params Parámetros del token.
 * @param {number|string} params.codigoPersona Código del usuario.
 * @param {number|string} params.codigoCia Código de compañía.
 * @param {string} params.idSesion ID único de la sesión.
 * @returns {string} JWT firmado.
 */
function signAccessToken({ codigoPersona, codigoCia, idSesion }) {
    return jwt.sign(
        {
            id: codigoPersona,
            codigo_cia: codigoCia,
            sid: idSesion
        },
        jwtSecret,
        {
            expiresIn: `${ACCESS_TOKEN_MINUTES}m`
        }
    );
}

/**
 * Firma un token temporal para completar el flujo de doble factor.
 *
 * Este token no autentica completamente al usuario. Solo permite validar
 * que existe un desafío 2FA pendiente.
 *
 * @param {object} params Parámetros del token 2FA.
 * @param {string} params.idDesafio ID del desafío 2FA.
 * @param {number|string} params.codigoPersona Código del usuario.
 * @param {number|string} params.codigoCia Código de compañía.
 * @returns {string} JWT temporal para 2FA.
 */
function signTwoFactorToken({ idDesafio, codigoPersona, codigoCia }) {
    return jwt.sign(
        {
            id_desafio: idDesafio,
            id: codigoPersona,
            codigo_cia: codigoCia,
            tipo: 'LOGIN_TOTP'
        },
        jwtSecret,
        {
            expiresIn: `${TWO_FACTOR_TOKEN_MINUTES}m`
        }
    );
}

/**
 * Crea las cookies necesarias para mantener una sesión autenticada.
 *
 * Cookies creadas:
 * - access_token: JWT de acceso, HTTP-only.
 * - refresh_token: token de renovación, HTTP-only.
 * - csrf_token: token CSRF legible por frontend.
 *
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {object} params Tokens a guardar en cookies.
 * @param {string} params.accessToken Access token JWT.
 * @param {string} params.refreshToken Refresh token aleatorio.
 * @param {string} params.csrfToken Token CSRF.
 * @returns {void}
 */
function setAuthCookies(res, { accessToken, refreshToken, csrfToken }) {
    res.cookie('access_token', accessToken, baseCookieOptions({
        httpOnly: true,
        path: '/',
        maxAge: ACCESS_TOKEN_MINUTES * 60 * 1000
    }));

    res.cookie('refresh_token', refreshToken, baseCookieOptions({
        httpOnly: true,
        path: '/api/login-actualizados/refresh',
        maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
    }));

    res.cookie('csrf_token', csrfToken, baseCookieOptions({
        httpOnly: false,
        path: '/',
        maxAge: ACCESS_TOKEN_MINUTES * 60 * 1000
    }));
}

/**
 * Limpia todas las cookies relacionadas con autenticación.
 *
 * Incluye:
 * - access_token
 * - refresh_token
 * - csrf_token
 * - two_factor_token
 *
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {void}
 */
function clearAuthCookies(res) {
    res.clearCookie('access_token', baseCookieOptions({
        httpOnly: true,
        path: '/'
    }));

    res.clearCookie('refresh_token', baseCookieOptions({
        httpOnly: true,
        path: '/api/login-actualizados/refresh'
    }));

    res.clearCookie('csrf_token', baseCookieOptions({
        httpOnly: false,
        path: '/'
    }));

    res.clearCookie('two_factor_token', baseCookieOptions({
        httpOnly: true,
        path: '/api/login-actualizados'
    }));
}

/**
 * Guarda en cookie el token temporal del flujo 2FA.
 *
 * Esta cookie se usa después en `verificar2FA`.
 *
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {string} token Token JWT temporal de 2FA.
 * @returns {void}
 */
function setTwoFactorCookie(res, token) {
    res.cookie('two_factor_token', token, baseCookieOptions({
        httpOnly: true,
        path: '/api/login-actualizados',
        maxAge: TWO_FACTOR_TOKEN_MINUTES * 60 * 1000
    }));
}

/**
 * Limpia la cookie temporal del flujo 2FA.
 *
 * @param {import('express').Response} res Respuesta HTTP.
 * @returns {void}
 */
function clearTwoFactorCookie(res) {
    res.clearCookie('two_factor_token', baseCookieOptions({
        httpOnly: true,
        path: '/api/login-actualizados'
    }));
}

/**
 * Construye el formato de respuesta del usuario autenticado.
 *
 * Se mantiene como arreglo para conservar compatibilidad con el frontend
 * anterior que esperaba `result` como lista.
 *
 * @param {object} u Usuario obtenido de base de datos.
 * @returns {Array<object>} Información básica del usuario.
 */
function buildResultUsuario(u) {
    return [{
        CODIGO_CIA: u.CODIGO_CIA,
        CODIGO_PERSONA: u.CODIGO_PERSONA,
        CODIGO_ENTIDAD: u.CODIGO_ENTIDAD
    }];
}

/**
 * Crea una sesión en base de datos, genera tokens y los envía en cookies.
 *
 * Flujo:
 * 1. Genera un ID de sesión.
 * 2. Genera refresh token y CSRF token.
 * 3. Firma el access token.
 * 4. Guarda hashes de refresh token y CSRF token.
 * 5. Envía cookies al navegador.
 *
 * @param {import('express').Request} req Solicitud HTTP.
 * @param {import('express').Response} res Respuesta HTTP.
 * @param {object} usuario Usuario autenticado.
 * @returns {Promise<object>} Datos internos de la sesión creada.
 */
async function crearSesionYEnviarCookies(req, res, usuario) {
    const idSesion = crypto.randomUUID();

    const refreshToken = randomToken(64);
    const csrfToken = randomToken(32);

    const accessToken = signAccessToken({
        codigoPersona: usuario.CODIGO_PERSONA,
        codigoCia: usuario.CODIGO_CIA,
        idSesion
    });

    const fechaExpiracion = getRefreshExpirationDate();

    await pool.execute(
        `
        INSERT INTO gestion_riesgos.seguridad_sesion (
            id_sesion,
            codigo_cia,
            codigo_colaborador,
            refresh_token_hash,
            csrf_token_hash,
            ip_origen,
            user_agent,
            fecha_expiracion,
            activo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `,
        [
            idSesion,
            usuario.CODIGO_CIA,
            usuario.CODIGO_PERSONA,
            hashValue(refreshToken),
            hashValue(csrfToken),
            getIp(req),
            getUserAgent(req),
            fechaExpiracion
        ]
    );

    setAuthCookies(res, {
        accessToken,
        refreshToken,
        csrfToken
    });

    return {
        idSesion,
        accessToken,
        refreshToken,
        csrfToken
    };
}

/**
 * Busca un usuario activo por correo electrónico y obtiene su configuración 2FA.
 *
 * También valida que la compañía tenga acceso vigente a la aplicación.
 *
 * @param {string} usuario Correo electrónico ingresado en login.
 * @returns {Promise<object|null>} Usuario encontrado o `null`.
 */
async function obtenerUsuarioPorCredenciales(usuario) {
    const sql = `
        SELECT 
            sp.CODIGO_COLABORADOR AS CODIGO_PERSONA,
            sp.CONTRASENA,
            sp.CODIGO_ENTIDAD,
            sp.CORREO_ELECTRONICO,
            sp.CODIGO_CIA,

            IFNULL(cfg.activo, 0) AS TOTP_ACTIVO,
            cfg.totp_secret_encrypted,
            cfg.totp_secret_iv,
            cfg.totp_secret_auth_tag
        FROM 
            gestion_riesgos.seguridad_persona sp
        LEFT JOIN
            gestion_riesgos.seguridad_institucion_acceso_app siap
        ON
            sp.codigo_cia = siap.codigo_cia
        LEFT JOIN
            gestion_riesgos.seguridad_2fa_configuracion cfg
        ON
            cfg.codigo_cia = sp.CODIGO_CIA
            AND cfg.codigo_colaborador = sp.CODIGO_COLABORADOR
        WHERE 
            sp.CORREO_ELECTRONICO = ?
            AND sp.ACTIVO = 1
            AND siap.vigente = 1
        LIMIT 1
    `;

    const [rows] = await pool.execute(sql, [usuario]);

    return rows[0] || null;
}

/**
 * Obtiene un usuario activo por compañía y código de persona.
 *
 * @param {object} params Parámetros de búsqueda.
 * @param {number|string} params.codigoCia Código de compañía.
 * @param {number|string} params.codigoPersona Código del colaborador/persona.
 * @returns {Promise<object|null>} Usuario encontrado o `null`.
 */
async function obtenerUsuarioPorId({ codigoCia, codigoPersona }) {
    const [rows] = await pool.execute(
        `
        SELECT 
            CODIGO_COLABORADOR AS CODIGO_PERSONA,
            CODIGO_CIA,
            CODIGO_ENTIDAD,
            CORREO_ELECTRONICO
        FROM gestion_riesgos.seguridad_persona
        WHERE CODIGO_CIA = ?
          AND CODIGO_COLABORADOR = ?
          AND ACTIVO = 1
        LIMIT 1
        `,
        [codigoCia, codigoPersona]
    );

    return rows[0] || null;
}

/**
 * Valida un código de recuperación 2FA.
 *
 * Si el código existe y no ha sido usado:
 * - Lo marca como usado.
 * - Registra la fecha de uso.
 *
 * @param {object} params Parámetros de validación.
 * @param {number|string} params.codigoCia Código de compañía.
 * @param {number|string} params.codigoPersona Código del usuario.
 * @param {string} params.codigo Código de recuperación ingresado.
 * @returns {Promise<boolean>} `true` si el código es válido.
 */
async function validarRecoveryCode({ codigoCia, codigoPersona, codigo }) {
    const normalized = normalizeRecoveryCode(codigo);

    if (!normalized || normalized.length < 8) {
        return false;
    }

    const codeHash = hashValue(normalized);

    const [rows] = await pool.execute(
        `
        SELECT id_recovery_code
        FROM gestion_riesgos.seguridad_2fa_recovery_code
        WHERE codigo_cia = ?
          AND codigo_colaborador = ?
          AND codigo_hash = ?
          AND usado = 0
        LIMIT 1
        `,
        [codigoCia, codigoPersona, codeHash]
    );

    if (rows.length === 0) {
        return false;
    }

    await pool.execute(
        `
        UPDATE gestion_riesgos.seguridad_2fa_recovery_code
        SET usado = 1,
            fecha_uso = NOW()
        WHERE id_recovery_code = ?
        `,
        [rows[0].id_recovery_code]
    );

    return true;
}

/**
 * login
 *
 * Inicia sesión validando usuario y contraseña.
 *
 * Si el usuario no tiene 2FA activo:
 * - Crea sesión.
 * - Envía cookies de autenticación.
 * - Responde con `auth: true`.
 *
 * Si el usuario tiene 2FA activo:
 * - Crea un desafío temporal.
 * - Firma un token temporal de 2FA.
 * - Envía cookie `two_factor_token`.
 * - Responde con `requiere2FA: true`.
 *
 * @route POST /login
 * @param {import('express').Request} req Body: { usuario:string, contra:string }
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.login = async (req, res) => {
    const { usuario, contra } = req.body;

    if (!usuario || !contra) {
        return res.status(400).json({
            auth: false,
            message: 'Faltan campos'
        });
    }

    try {
        const u = await obtenerUsuarioPorCredenciales(usuario);

        if (!u) {
            return res.json({
                auth: false,
                message: 'Este usuario no existe'
            });
        }

        if (u.CONTRASENA !== sha1(contra)) {
            return res.json({
                auth: false,
                message: 'Ha ingresado el usuario o contraseña equivocada'
            });
        }

        const tieneTOTPActivo =
            Number(u.TOTP_ACTIVO) === 1 &&
            Boolean(u.totp_secret_encrypted) &&
            Boolean(u.totp_secret_iv) &&
            Boolean(u.totp_secret_auth_tag);

        if (tieneTOTPActivo) {
            const idDesafio = crypto.randomUUID();
            const fechaExpiracion = new Date(Date.now() + TWO_FACTOR_TOKEN_MINUTES * 60 * 1000);

            await pool.execute(
                `
                INSERT INTO gestion_riesgos.seguridad_2fa_desafio (
                    id_desafio,
                    codigo_cia,
                    codigo_colaborador,
                    tipo,
                    verificado,
                    intentos,
                    max_intentos,
                    ip_origen,
                    user_agent,
                    fecha_expiracion
                )
                VALUES (?, ?, ?, 'LOGIN', 0, 0, 5, ?, ?, ?)
                `,
                [
                    idDesafio,
                    u.CODIGO_CIA,
                    u.CODIGO_PERSONA,
                    getIp(req),
                    getUserAgent(req),
                    fechaExpiracion
                ]
            );

            const twoFactorToken = signTwoFactorToken({
                idDesafio,
                codigoPersona: u.CODIGO_PERSONA,
                codigoCia: u.CODIGO_CIA
            });

            setTwoFactorCookie(res, twoFactorToken);

            return res.json({
                auth: false,
                requiere2FA: true,
                metodo: 'TOTP',
                message: 'Ingrese el código de su aplicación autenticadora'
            });
        }

        await crearSesionYEnviarCookies(req, res, u);

        return res.json({
            auth: true,
            requiere2FA: false,
            message: 'Inicio de sesión exitoso',
            result: buildResultUsuario(u)
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({
            auth: false,
            message: 'Error en el login'
        });
    }
};

/**
 * verificar2FA
 *
 * Completa el inicio de sesión cuando el usuario tiene doble factor activo.
 *
 * Permite dos tipos de códigos:
 * - Código TOTP de 6 dígitos.
 * - Código de recuperación.
 *
 * Si la validación es correcta:
 * - Marca el desafío como verificado.
 * - Actualiza la fecha de último uso del 2FA.
 * - Crea una sesión real.
 * - Envía cookies de autenticación.
 * - Limpia la cookie temporal de 2FA.
 *
 * @route POST /verificar-2fa
 * @param {import('express').Request} req Body: { codigo:string }
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.verificar2FA = async (req, res) => {
    const { codigo } = req.body;

    if (!codigo) {
        return res.status(400).json({
            auth: false,
            message: 'Debe ingresar el código de verificación'
        });
    }

    try {
        const twoFactorToken = req.cookies?.two_factor_token;

        if (!twoFactorToken) {
            return res.status(401).json({
                auth: false,
                message: 'No existe una verificación 2FA pendiente'
            });
        }

        const decoded = jwt.verify(twoFactorToken, jwtSecret);

        if (decoded.tipo !== 'LOGIN_TOTP') {
            return res.status(401).json({
                auth: false,
                message: 'Token 2FA inválido'
            });
        }

        const [desafios] = await pool.execute(
            `
            SELECT 
                id_desafio,
                codigo_cia,
                codigo_colaborador,
                verificado,
                intentos,
                max_intentos,
                fecha_expiracion
            FROM gestion_riesgos.seguridad_2fa_desafio
            WHERE id_desafio = ?
              AND codigo_cia = ?
              AND codigo_colaborador = ?
              AND tipo = 'LOGIN'
            LIMIT 1
            `,
            [decoded.id_desafio, decoded.codigo_cia, decoded.id]
        );

        if (desafios.length === 0) {
            return res.status(401).json({
                auth: false,
                message: 'Desafío 2FA no encontrado'
            });
        }

        const desafio = desafios[0];

        if (Number(desafio.verificado) === 1) {
            return res.status(400).json({
                auth: false,
                message: 'Este código ya fue utilizado'
            });
        }

        if (new Date(desafio.fecha_expiracion).getTime() < Date.now()) {
            return res.status(401).json({
                auth: false,
                message: 'El código 2FA expiró'
            });
        }

        if (Number(desafio.intentos) >= Number(desafio.max_intentos)) {
            return res.status(429).json({
                auth: false,
                message: 'Superó el máximo de intentos permitidos'
            });
        }

        const [configs] = await pool.execute(
            `
            SELECT 
                activo,
                totp_secret_encrypted,
                totp_secret_iv,
                totp_secret_auth_tag
            FROM gestion_riesgos.seguridad_2fa_configuracion
            WHERE codigo_cia = ?
              AND codigo_colaborador = ?
              AND activo = 1
            LIMIT 1
            `,
            [decoded.codigo_cia, decoded.id]
        );

        if (configs.length === 0) {
            return res.status(401).json({
                auth: false,
                message: 'El usuario no tiene 2FA activo'
            });
        }

        const config = configs[0];

        let codigoValido = false;

        if (/^\d{6}$/.test(String(codigo).trim())) {
            const secret = decryptSecret({
                encrypted: config.totp_secret_encrypted,
                iv: config.totp_secret_iv,
                authTag: config.totp_secret_auth_tag
            });

            codigoValido = verifyTotpCode({
                secret,
                codigo
            });
        } else {
            codigoValido = await validarRecoveryCode({
                codigoCia: decoded.codigo_cia,
                codigoPersona: decoded.id,
                codigo
            });
        }

        if (!codigoValido) {
            await pool.execute(
                `
                UPDATE gestion_riesgos.seguridad_2fa_desafio
                SET intentos = intentos + 1
                WHERE id_desafio = ?
                `,
                [decoded.id_desafio]
            );

            return res.status(400).json({
                auth: false,
                message: 'Código 2FA inválido'
            });
        }

        await pool.execute(
            `
            UPDATE gestion_riesgos.seguridad_2fa_desafio
            SET verificado = 1,
                fecha_verificacion = NOW()
            WHERE id_desafio = ?
            `,
            [decoded.id_desafio]
        );

        await pool.execute(
            `
            UPDATE gestion_riesgos.seguridad_2fa_configuracion
            SET fecha_ultimo_uso = NOW()
            WHERE codigo_cia = ?
              AND codigo_colaborador = ?
            `,
            [decoded.codigo_cia, decoded.id]
        );

        const usuario = await obtenerUsuarioPorId({
            codigoCia: decoded.codigo_cia,
            codigoPersona: decoded.id
        });

        if (!usuario) {
            return res.status(401).json({
                auth: false,
                message: 'Usuario no encontrado'
            });
        }

        await crearSesionYEnviarCookies(req, res, usuario);

        clearTwoFactorCookie(res);

        return res.json({
            auth: true,
            requiere2FA: false,
            message: 'Inicio de sesión exitoso',
            result: buildResultUsuario(usuario)
        });
    } catch (err) {
        console.error('Error verificando 2FA:', err);

        return res.status(401).json({
            auth: false,
            message: err.name === 'TokenExpiredError'
                ? 'La verificación 2FA expiró'
                : 'No se pudo verificar el código 2FA'
        });
    }
};

/**
 * refresh
 *
 * Renueva una sesión activa usando el refresh token guardado en cookie.
 *
 * Flujo:
 * - Lee el refresh token de la cookie.
 * - Busca una sesión activa con el hash del refresh token.
 * - Valida que la sesión no esté revocada ni expirada.
 * - Genera nuevo access token.
 * - Rota refresh token y CSRF token.
 * - Actualiza la sesión en base de datos.
 * - Envía cookies nuevas.
 *
 * @route POST /refresh
 * @param {import('express').Request} req Solicitud HTTP con cookie `refresh_token`.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refresh_token;

        if (!refreshToken) {
            clearAuthCookies(res);
            return res.status(401).json({
                auth: false,
                message: 'Refresh token no enviado'
            });
        }

        const refreshHash = hashValue(refreshToken);

        const [rows] = await pool.execute(
            `
            SELECT 
                s.id_sesion,
                s.codigo_cia,
                s.codigo_colaborador,
                sp.CODIGO_COLABORADOR AS CODIGO_PERSONA,
                sp.CODIGO_CIA,
                sp.CODIGO_ENTIDAD,
                sp.CORREO_ELECTRONICO
            FROM gestion_riesgos.seguridad_sesion s
            INNER JOIN gestion_riesgos.seguridad_persona sp
                ON sp.CODIGO_CIA = s.codigo_cia
                AND sp.CODIGO_COLABORADOR = s.codigo_colaborador
            WHERE s.refresh_token_hash = ?
              AND s.activo = 1
              AND s.fecha_revocacion IS NULL
              AND s.fecha_expiracion > NOW()
              AND sp.ACTIVO = 1
            LIMIT 1
            `,
            [refreshHash]
        );

        if (rows.length === 0) {
            clearAuthCookies(res);
            return res.status(401).json({
                auth: false,
                message: 'Sesión expirada o inválida'
            });
        }

        const sesion = rows[0];

        const nuevoRefreshToken = randomToken(64);
        const nuevoCsrfToken = randomToken(32);

        const accessToken = signAccessToken({
            codigoPersona: sesion.CODIGO_PERSONA,
            codigoCia: sesion.CODIGO_CIA,
            idSesion: sesion.id_sesion
        });

        const fechaExpiracion = getRefreshExpirationDate();

        await pool.execute(
            `
            UPDATE gestion_riesgos.seguridad_sesion
            SET refresh_token_hash = ?,
                csrf_token_hash = ?,
                fecha_ultimo_uso = NOW(),
                fecha_expiracion = ?
            WHERE id_sesion = ?
            `,
            [
                hashValue(nuevoRefreshToken),
                hashValue(nuevoCsrfToken),
                fechaExpiracion,
                sesion.id_sesion
            ]
        );

        setAuthCookies(res, {
            accessToken,
            refreshToken: nuevoRefreshToken,
            csrfToken: nuevoCsrfToken
        });

        return res.json({
            auth: true,
            message: 'Sesión renovada'
        });
    } catch (err) {
        console.error('Error en refresh:', err);

        clearAuthCookies(res);

        return res.status(500).json({
            auth: false,
            message: 'Error renovando sesión'
        });
    }
};

/**
 * logout
 *
 * Cierra la sesión actual del usuario.
 *
 * Si existe access token:
 * - Decodifica el token.
 * - Obtiene el ID de sesión.
 * - Marca la sesión como inactiva y revocada.
 *
 * Finalmente, limpia las cookies de autenticación.
 *
 * @route POST /logout
 * @param {import('express').Request} req Solicitud HTTP con cookie `access_token`.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.logout = async (req, res) => {
    try {
        const accessToken = req.cookies?.access_token;

        if (accessToken) {
            const decoded = jwt.decode(accessToken);

            if (decoded?.sid) {
                await pool.execute(
                    `
                    UPDATE gestion_riesgos.seguridad_sesion
                    SET activo = 0,
                        fecha_revocacion = NOW(),
                        motivo_revocacion = 'LOGOUT'
                    WHERE id_sesion = ?
                    `,
                    [decoded.sid]
                );
            }
        }

        clearAuthCookies(res);

        return res.json({
            auth: false,
            message: 'Sesión cerrada correctamente'
        });
    } catch (err) {
        console.error('Error en logout:', err);

        clearAuthCookies(res);

        return res.json({
            auth: false,
            message: 'Sesión cerrada'
        });
    }
};

/**
 * me
 *
 * Obtiene información básica del usuario autenticado.
 *
 * Requiere que un middleware previo haya validado el JWT y haya cargado:
 * - req.codigo_cia
 * - req.userId
 *
 * @route GET /me
 * @param {import('express').Request} req Solicitud autenticada.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.me = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `
            SELECT 
                sp.CODIGO_COLABORADOR AS CODIGO_PERSONA,
                sp.CODIGO_CIA,
                sp.CODIGO_ENTIDAD,
                sp.CORREO_ELECTRONICO,
                IFNULL(cfg.activo, 0) AS TOTP_ACTIVO
            FROM gestion_riesgos.seguridad_persona sp
            LEFT JOIN gestion_riesgos.seguridad_2fa_configuracion cfg
                ON cfg.codigo_cia = sp.CODIGO_CIA
                AND cfg.codigo_colaborador = sp.CODIGO_COLABORADOR
            WHERE sp.CODIGO_CIA = ?
              AND sp.CODIGO_COLABORADOR = ?
              AND sp.ACTIVO = 1
            LIMIT 1
            `,
            [req.codigo_cia, req.userId]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                auth: false,
                message: 'Usuario no encontrado'
            });
        }

        return res.json({
            auth: true,
            user: rows[0]
        });
    } catch (err) {
        console.error('Error en me:', err);

        return res.status(500).json({
            auth: false,
            message: 'Error obteniendo sesión'
        });
    }
};

/**
 * setupTOTP
 *
 * Inicia la configuración de doble factor TOTP para el usuario autenticado.
 *
 * Flujo:
 * - Valida que el usuario exista.
 * - Verifica que no tenga 2FA activo.
 * - Genera un secreto TOTP.
 * - Encripta el secreto antes de guardarlo.
 * - Guarda la configuración como pendiente/inactiva.
 * - Genera URL otpauth y QR para aplicación autenticadora.
 *
 * No activa el 2FA todavía. Para activarlo debe llamarse a `confirmarTOTP`.
 *
 * @route POST /setup-totp
 * @param {import('express').Request} req Solicitud autenticada.
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.setupTOTP = async (req, res) => {
    try {
        const codigoCia = req.codigo_cia;
        const codigoPersona = req.userId;

        const usuario = await obtenerUsuarioPorId({
            codigoCia,
            codigoPersona
        });

        if (!usuario) {
            return res.status(404).json({
                ok: false,
                message: 'Usuario no encontrado'
            });
        }

        const [existente] = await pool.execute(
            `
            SELECT activo
            FROM gestion_riesgos.seguridad_2fa_configuracion
            WHERE codigo_cia = ?
              AND codigo_colaborador = ?
            LIMIT 1
            `,
            [codigoCia, codigoPersona]
        );

        if (existente.length > 0 && Number(existente[0].activo) === 1) {
            return res.status(409).json({
                ok: false,
                message: 'El usuario ya tiene 2FA activo'
            });
        }

        const secret = generateTotpSecret();
        const encrypted = encryptSecret(secret);

        await pool.execute(
            `
            INSERT INTO gestion_riesgos.seguridad_2fa_configuracion (
                codigo_cia,
                codigo_colaborador,
                activo,
                metodo,
                totp_secret_encrypted,
                totp_secret_iv,
                totp_secret_auth_tag,
                usuario_creacion,
                fecha_creacion
            )
            VALUES (?, ?, 0, 'TOTP', ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                activo = 0,
                metodo = 'TOTP',
                totp_secret_encrypted = VALUES(totp_secret_encrypted),
                totp_secret_iv = VALUES(totp_secret_iv),
                totp_secret_auth_tag = VALUES(totp_secret_auth_tag),
                usuario_modificacion = VALUES(usuario_creacion),
                fecha_modificacion = NOW()
            `,
            [
                codigoCia,
                codigoPersona,
                encrypted.encrypted,
                encrypted.iv,
                encrypted.authTag,
                codigoPersona
            ]
        );

        const otpauthUrl = getOtpAuthUrl({
            email: usuario.CORREO_ELECTRONICO,
            secret
        });

        const qrDataUrl = await generateQrDataUrl(otpauthUrl);

        return res.json({
            ok: true,
            message: 'Escanee el QR con su aplicación autenticadora',
            qrDataUrl,
            otpauthUrl,
            secretoManual: secret
        });
    } catch (err) {
        console.error('Error configurando TOTP:', err);

        return res.status(500).json({
            ok: false,
            message: 'Error configurando 2FA'
        });
    }
};

/**
 * confirmarTOTP
 *
 * Confirma y activa la configuración TOTP pendiente.
 *
 * Flujo:
 * - Recibe un código generado por la app autenticadora.
 * - Descifra el secreto TOTP guardado.
 * - Verifica el código.
 * - Activa el 2FA.
 * - Elimina códigos de recuperación anteriores.
 * - Genera nuevos códigos de recuperación.
 * - Devuelve los códigos al usuario para que los guarde.
 *
 * Usa transacción porque activa 2FA y genera códigos de recuperación
 * como una sola operación lógica.
 *
 * @route POST /confirmar-totp
 * @param {import('express').Request} req Body: { codigo:string }
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.confirmarTOTP = async (req, res) => {
    const { codigo } = req.body;

    if (!codigo) {
        return res.status(400).json({
            ok: false,
            message: 'Debe ingresar el código de la aplicación autenticadora'
        });
    }

    const conn = await pool.getConnection();

    try {
        const codigoCia = req.codigo_cia;
        const codigoPersona = req.userId;

        const [configs] = await conn.execute(
            `
            SELECT 
                activo,
                totp_secret_encrypted,
                totp_secret_iv,
                totp_secret_auth_tag
            FROM gestion_riesgos.seguridad_2fa_configuracion
            WHERE codigo_cia = ?
              AND codigo_colaborador = ?
            LIMIT 1
            `,
            [codigoCia, codigoPersona]
        );

        if (configs.length === 0) {
            conn.release();

            return res.status(404).json({
                ok: false,
                message: 'No existe configuración 2FA pendiente'
            });
        }

        const config = configs[0];

        if (!config.totp_secret_encrypted || !config.totp_secret_iv || !config.totp_secret_auth_tag) {
            conn.release();

            return res.status(400).json({
                ok: false,
                message: 'La configuración 2FA está incompleta'
            });
        }

        const secret = decryptSecret({
            encrypted: config.totp_secret_encrypted,
            iv: config.totp_secret_iv,
            authTag: config.totp_secret_auth_tag
        });

        const valido = verifyTotpCode({
            secret,
            codigo
        });

        if (!valido) {
            conn.release();

            return res.status(400).json({
                ok: false,
                message: 'Código TOTP inválido'
            });
        }

        await conn.beginTransaction();

        await conn.execute(
            `
            UPDATE gestion_riesgos.seguridad_2fa_configuracion
            SET activo = 1,
                fecha_habilitacion = IFNULL(fecha_habilitacion, NOW()),
                fecha_ultimo_uso = NOW(),
                usuario_modificacion = ?,
                fecha_modificacion = NOW()
            WHERE codigo_cia = ?
              AND codigo_colaborador = ?
            `,
            [codigoPersona, codigoCia, codigoPersona]
        );

        await conn.execute(
            `
            DELETE FROM gestion_riesgos.seguridad_2fa_recovery_code
            WHERE codigo_cia = ?
              AND codigo_colaborador = ?
            `,
            [codigoCia, codigoPersona]
        );

        const recoveryCodes = generateRecoveryCodes(8);

        for (const recoveryCode of recoveryCodes) {
            await conn.execute(
                `
                INSERT INTO gestion_riesgos.seguridad_2fa_recovery_code (
                    id_recovery_code,
                    codigo_cia,
                    codigo_colaborador,
                    codigo_hash
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    crypto.randomUUID(),
                    codigoCia,
                    codigoPersona,
                    hashValue(normalizeRecoveryCode(recoveryCode))
                ]
            );
        }

        await conn.commit();
        conn.release();

        return res.json({
            ok: true,
            message: '2FA activado correctamente',
            recoveryCodes
        });
    } catch (err) {
        try {
            await conn.rollback();
        } catch (_rollbackErr) { }

        conn.release();

        console.error('Error confirmando TOTP:', err);

        return res.status(500).json({
            ok: false,
            message: 'Error confirmando 2FA'
        });
    }
};

/**
 * desactivarTOTP
 *
 * Desactiva el doble factor de autenticación del usuario autenticado.
 *
 * Acepta:
 * - Código TOTP de 6 dígitos.
 * - Código de recuperación válido.
 *
 * Si el código es correcto:
 * - Desactiva la configuración 2FA.
 * - Elimina el secreto TOTP encriptado.
 * - Elimina los códigos de recuperación.
 *
 * @route POST /desactivar-totp
 * @param {import('express').Request} req Body: { codigo:string }
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.desactivarTOTP = async (req, res) => {
    const { codigo } = req.body;

    if (!codigo) {
        return res.status(400).json({
            ok: false,
            message: 'Debe ingresar el código 2FA para desactivar'
        });
    }

    try {
        const codigoCia = req.codigo_cia;
        const codigoPersona = req.userId;

        const [configs] = await pool.execute(
            `
            SELECT 
                activo,
                totp_secret_encrypted,
                totp_secret_iv,
                totp_secret_auth_tag
            FROM gestion_riesgos.seguridad_2fa_configuracion
            WHERE codigo_cia = ?
              AND codigo_colaborador = ?
              AND activo = 1
            LIMIT 1
            `,
            [codigoCia, codigoPersona]
        );

        if (configs.length === 0) {
            return res.status(404).json({
                ok: false,
                message: 'El usuario no tiene 2FA activo'
            });
        }

        const config = configs[0];

        let codigoValido = false;

        if (/^\d{6}$/.test(String(codigo).trim())) {
            const secret = decryptSecret({
                encrypted: config.totp_secret_encrypted,
                iv: config.totp_secret_iv,
                authTag: config.totp_secret_auth_tag
            });

            codigoValido = verifyTotpCode({
                secret,
                codigo
            });
        } else {
            codigoValido = await validarRecoveryCode({
                codigoCia,
                codigoPersona,
                codigo
            });
        }

        if (!codigoValido) {
            return res.status(400).json({
                ok: false,
                message: 'Código 2FA inválido'
            });
        }

        await pool.execute(
            `
            UPDATE gestion_riesgos.seguridad_2fa_configuracion
            SET activo = 0,
                totp_secret_encrypted = NULL,
                totp_secret_iv = NULL,
                totp_secret_auth_tag = NULL,
                usuario_modificacion = ?,
                fecha_modificacion = NOW()
            WHERE codigo_cia = ?
              AND codigo_colaborador = ?
            `,
            [codigoPersona, codigoCia, codigoPersona]
        );

        await pool.execute(
            `
            DELETE FROM gestion_riesgos.seguridad_2fa_recovery_code
            WHERE codigo_cia = ?
              AND codigo_colaborador = ?
            `,
            [codigoCia, codigoPersona]
        );

        return res.json({
            ok: true,
            message: '2FA desactivado correctamente'
        });
    } catch (err) {
        console.error('Error desactivando TOTP:', err);

        return res.status(500).json({
            ok: false,
            message: 'Error desactivando 2FA'
        });
    }
};