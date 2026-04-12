/**
 * @fileoverview 
 * Servicio de correo SMTP (Nodemailer): configuración de transporter y envío de emails (HTML/texto, CC/BCC, adjuntos).
 *
 * @module services/mail
 * @version 1.0
 * @author Equipo de Desarrollo
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * parseSecureFlag
 *
 * Normaliza el flag de seguridad del SMTP (true/false) a partir de valores de .env.
 *
 * - Acepta 'true' | '1' | 'yes' | 'ssl' como verdadero; resto = falso.
 *
 * @param {any} v Valor a evaluar (string/boolean).
 * @returns {boolean}
 */
function parseSecureFlag(v) {
    if (v == null) return false;
    const s = String(v).trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'ssl';
}

/**
 * ensure
 *
 * Valida que exista una variable requerida y, si no, lanza error descriptivo.
 *
 * @param {any} value Valor a asegurar.
 * @param {string} name Nombre legible de la variable (para el error).
 * @returns {any}
 * @throws {Error} Si el valor es falsy.
 */
function ensure(value, name) {
    if (!value) throw new Error(`Falta configurar ${name} en .env`);
    return value;
}

/**
 * stripHtml
 *
 * Convierte HTML a texto plano “básico” para adjuntar `text` junto con `html`.
 *
 * - Remueve <style>/<script>, tags, entidades HTML comunes y espacios innecesarios.
 *
 * @param {string} [html=''] Contenido HTML.
 * @returns {string} Texto plano depurado.
 */
function stripHtml(html = '') {
    return String(html)
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+\n/g, '\n')
        .trim();
}

// Configuración SMTP desde .env
const SMTP_HOST = ensure(process.env.SMTP_HOST, 'SMTP_HOST');
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = parseSecureFlag(process.env.SMTP_SECURE);
const SMTP_USER = ensure(process.env.SMTP_USER, 'SMTP_USER');
const SMTP_PASS = ensure(process.env.SMTP_PASS, 'SMTP_PASS');
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER;

/**
 * transporter (singleton)
 *
 * Mantiene una conexión SMTP reutilizable para enviar correos.
 *
 * - Configura host/puerto/secure y autenticación.
 * - Define timeouts y TLS (opcionalmente permisivo si se usa cert autofirmado).
 */
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE, 
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    tls: {
        rejectUnauthorized: true,
    },
});

/**
 * sendEmail
 *
 * Envía un correo electrónico (texto o HTML), con soporte CC/BCC, replyTo y adjuntos.
 *
 * - Construye `mailOptions` (from/to/subject/html|text/cc/bcc/attachments).
 * - Usa el transporter (Nodemailer) para enviar y devuelve resultado normalizado.
 * - “Heurística HTML”: si el cuerpo parece HTML, adjunta también `text` usando `stripHtml`.
 *
 * @param {string|string[]} to Destinatario(s).
 * @param {string} subject Asunto.
 * @param {string} body Cuerpo del mensaje (texto o HTML).
 * @param {Object} [options]
 * @param {boolean} [options.isHtml] Forzar tratamiento de `body` como HTML.
 * @param {string} [options.from] Remitente (por defecto, MAIL_FROM).
 * @param {string|string[]} [options.cc]
 * @param {string|string[]} [options.bcc]
 * @param {string} [options.replyTo]
 * @param {Array<{filename:string, path?:string, content?:any, contentType?:string}>} [options.attachments]
 * @returns {Promise<{ok:boolean, messageId?:string, response?:string, accepted?:string[], rejected?:string[], error?:string}>}
 */
async function sendEmail(to, subject, body, options = {}) {
    if (!to) throw new Error('Debes especificar el destinatario "to".');
    if (!subject) throw new Error('Debes especificar el "subject".');
    if (body == null) throw new Error('Debes especificar el "body".');

    const {
        isHtml,
        from = MAIL_FROM,
        cc,
        bcc,
        replyTo,
        attachments,
    } = options;

    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(String(body));
    const treatAsHtml = isHtml ?? looksLikeHtml;

    const mailOptions = {
        from,
        to,
        subject,
        ...(treatAsHtml
            ? { html: body, text: stripHtml(body) }
            : { text: String(body) }),
        ...(cc ? { cc } : {}),
        ...(bcc ? { bcc } : {}),
        ...(replyTo ? { replyTo } : {}),
        ...(attachments ? { attachments } : {}),
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return {
            ok: true,
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected,
        };
    } catch (err) {
        return {
            ok: false,
            error: `Error enviando correo: ${err?.message || String(err)}`,
        };
    }
}

module.exports = { sendEmail };
