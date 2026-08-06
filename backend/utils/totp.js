const crypto = require('crypto');
const QRCode = require('qrcode');

let authenticator;

try {
    const otplib = require('otplib');

    authenticator =
        otplib.authenticator ||
        otplib.default?.authenticator ||
        otplib.otplib?.authenticator;
} catch (err) {
    throw new Error(`No se pudo cargar otplib: ${err.message}`);
}

if (!authenticator) {
    throw new Error(
        'No se pudo cargar authenticator desde otplib. Ejecuta: npm uninstall otplib && npm install otplib@12.0.1 qrcode'
    );
}

const ISSUER = process.env.TOTP_ISSUER || 'SIGERI';

authenticator.options = {
    step: 30,
    window: 1,
    digits: 6
};

function getEncryptionKey() {
    const keyBase64 = process.env.TOTP_ENCRYPTION_KEY;

    if (!keyBase64) {
        throw new Error('Falta TOTP_ENCRYPTION_KEY en variables de entorno');
    }

    const key = Buffer.from(keyBase64, 'base64');

    if (key.length !== 32) {
        throw new Error('TOTP_ENCRYPTION_KEY debe ser una llave base64 de 32 bytes');
    }

    return key;
}

function encryptSecret(secret) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
    };
}

function decryptSecret({ encrypted, iv, authTag }) {
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

function generateTotpSecret() {
    return authenticator.generateSecret();
}

function getOtpAuthUrl({ email, secret }) {
    return authenticator.keyuri(email, ISSUER, secret);
}

async function generateQrDataUrl(otpauthUrl) {
    return QRCode.toDataURL(otpauthUrl);
}

function verifyTotpCode({ secret, codigo }) {
    if (!codigo) return false;

    const cleanCode = String(codigo).trim();

    if (!/^\d{6}$/.test(cleanCode)) {
        return false;
    }

    return authenticator.verify({
        token: cleanCode,
        secret
    });
}

function hashValue(value) {
    return crypto
        .createHash('sha256')
        .update(String(value))
        .digest('hex');
}

function generateRecoveryCodes(total = 8) {
    const codes = [];

    for (let i = 0; i < total; i += 1) {
        const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
        codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
    }

    return codes;
}

function normalizeRecoveryCode(code) {
    return String(code || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');
}

module.exports = {
    encryptSecret,
    decryptSecret,
    generateTotpSecret,
    getOtpAuthUrl,
    generateQrDataUrl,
    verifyTotpCode,
    hashValue,
    generateRecoveryCodes,
    normalizeRecoveryCode
};
