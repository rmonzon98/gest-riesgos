/**
 * @fileoverview
 * Gestión de archivos institucionales: lectura del logo institucional, actualización de logo y descarga segura por ruta.
 *
 * @module Controller/general/archivos
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const { DOCS_DIR, relToDocs, absInDocs, safeInDocs } = require('../../services/paths');

/**
 * obtenerLogo
 * 
 * Devuelve el logo de la institución (en Base64 data URL) según `codigo_cia`.
 *
 * - Lee la ruta del logo almacenada en BD (tabla `seguridad.seguridad_institucion`).
 * - Resuelve la ubicación en disco dentro de `DOCS_DIR` y la envía como `data:<mime>;base64,...`.
 *
 * @route GET /general/logo
 * @returns {200|400|404|500} JSON con `{logo}` o error.
 */
exports.obtenerLogo = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    if (!codigo_cia) {
        return res.status(400).json({ msg: 'Falta codigo_cia' });
    }
    try {
        const sql = `
        SELECT 
            path "LOGO"
        FROM 
            seguridad.seguridad_institucion
        WHERE 
            CODIGO_CIA = ?
        LIMIT 1
        `;
        const [rows] = await pool.execute(sql, [codigo_cia]);
        if (!rows.length || !rows[0].LOGO) {
            return res.status(404).json({ msg: 'Logo no encontrado' });
        }

        const ruta = rows[0].LOGO;

        const relFromDocs = ruta.startsWith('docs/') ? ruta.slice(5) : ruta;
        const filePath = path.join(DOCS_DIR, relFromDocs);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ msg: 'Archivo de logo no existe en disco', ruta });
        }

        const imageBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType =
            ext === '.png' ? 'image/png' :
                ext === '.jpg' ? 'image/jpeg' :
                    ext === '.jpeg' ? 'image/jpeg' :
                        ext === '.gif' ? 'image/gif' :
                            'application/octet-stream';

        const base64Image = imageBuffer.toString('base64');
        return res.json({ logo: `data:${mimeType};base64,${base64Image}` });
    } catch (err) {
        console.error('Error al obtener logo:', err);
        return res.status(500).json({ msg: 'Error al obtener logo', error: err.message });
    }
};

exports.obtenerLogoBarra = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    if (!codigo_cia) {
        return res.status(400).json({ msg: 'Falta codigo_cia' });
    }
    try {
        const sql = `
        SELECT 
            path_barra "LOGO"
        FROM 
            seguridad.seguridad_institucion
        WHERE 
            CODIGO_CIA = ?
        LIMIT 1
        `;
        const [rows] = await pool.execute(sql, [codigo_cia]);
        if (!rows.length || !rows[0].LOGO) {
            return res.status(404).json({ msg: 'Logo no encontrado' });
        }

        const ruta = rows[0].LOGO;

        const relFromDocs = ruta.startsWith('docs/') ? ruta.slice(5) : ruta;
        const filePath = path.join(DOCS_DIR, relFromDocs);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ msg: 'Archivo de logo no existe en disco', ruta });
        }

        const imageBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType =
            ext === '.png' ? 'image/png' :
                ext === '.jpg' ? 'image/jpeg' :
                    ext === '.jpeg' ? 'image/jpeg' :
                        ext === '.gif' ? 'image/gif' :
                            'application/octet-stream';

        const base64Image = imageBuffer.toString('base64');
        return res.json({ logo: `data:${mimeType};base64,${base64Image}` });
    } catch (err) {
        console.error('Error al obtener logo:', err);
        return res.status(500).json({ msg: 'Error al obtener logo', error: err.message });
    }
};

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']);
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * actualizarLogo
 * 
 * Actualiza el logo institucional guardando el archivo en `/docs/...` y actualizando la ruta en BD.
 *
 * - Valida tipo/tamaño del archivo.
 * - Crea carpeta destino por compañía.
 * - Escribe archivo físico, actualiza BD, y elimina el anterior si existía.
 * - Responde con la ruta relativa `docs/...`.
 *
 * @route PUT /update-image-logo
 * @returns {200|400|500} JSON con `{ok, logo}` o error.
 */
exports.actualizarLogo = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ ok: false, msg: 'No se recibió ningún archivo' });
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
        return res.status(400).json({ ok: false, msg: 'Tipo de archivo no permitido' });
    }
    if (file.size > MAX_BYTES) {
        return res.status(400).json({ ok: false, msg: 'El archivo excede el tamaño máximo permitido (5MB)' });
    }

    let cn;
    let oldPathRel = null;
    let newPathRel = null;
    let newPathAbs = null;

    try {
        cn = await pool.getConnection();

        const [rows] = await cn.query(
            `SELECT PATH FROM seguridad.seguridad_institucion WHERE CODIGO_CIA = ? LIMIT 1`,
            [codigo_cia]
        );
        oldPathRel = rows?.[0]?.PATH || null;

        const carpetaDestino = absInDocs(`entidad${codigo_cia}`, 'logo');
        await fsp.mkdir(carpetaDestino, { recursive: true });

        const rawExt = (path.extname(file.originalname || '') || '').toLowerCase();
        const mimeExt = {
            'image/png': '.png',
            'image/jpeg': '.jpg',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg'
        }[file.mimetype] || '.bin';
        const ext = rawExt || mimeExt;

        const rawName = path.basename(file.originalname || 'logo', rawExt);
        const baseName =
            rawName
                .replace(/[^\w.\-]+/g, '_')
                .replace(/^_+/, '')
                .slice(0, 80)
                .replace(/_+$/, '') || 'logo';

        const nombreArchivo = `${Date.now()}-${baseName}${ext}`;
        newPathRel = relToDocs(`entidad${codigo_cia}`, 'logo', nombreArchivo);
        newPathAbs = absInDocs(`entidad${codigo_cia}`, 'logo', nombreArchivo);

        await fsp.writeFile(newPathAbs, file.buffer, { flag: 'wx' });

        await cn.beginTransaction();
        await cn.query(
            `UPDATE seguridad.seguridad_institucion
        SET PATH = ?, FECHA_MODIFICACION = NOW(), usuario_modificacion = ?
        WHERE CODIGO_CIA = ?`,
            [newPathRel, req.userId, codigo_cia]
        );
        await cn.commit();

        if (oldPathRel) {
            try { await fsp.unlink(safeInDocs(oldPathRel.replace(/^docs\//, ''))); } catch { }
        }

        return res.json({
            ok: true,
            msg: 'Logo actualizado correctamente',
            logo: newPathRel.replace(/\\/g, '/')
        });
    } catch (err) {
        if (newPathAbs) { try { await fsp.unlink(newPathAbs); } catch { } }
        try { await cn?.rollback(); } catch { }
        console.error('Error al actualizar logo:', err);
        return res.status(500).json({ ok: false, msg: 'Error al actualizar logo', error: err.message });
    } finally {
        try { cn?.release?.(); } catch { }
    }
};

exports.actualizarLogoBarra = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ ok: false, msg: 'No se recibió ningún archivo' });
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
        return res.status(400).json({ ok: false, msg: 'Tipo de archivo no permitido' });
    }
    if (file.size > MAX_BYTES) {
        return res.status(400).json({ ok: false, msg: 'El archivo excede el tamaño máximo permitido (5MB)' });
    }

    let cn;
    let oldPathRel = null;
    let newPathRel = null;
    let newPathAbs = null;

    try {
        cn = await pool.getConnection();

        const [rows] = await cn.query(
            `SELECT PATH_BARRA FROM seguridad.seguridad_institucion WHERE CODIGO_CIA = ? LIMIT 1`,
            [codigo_cia]
        );
        oldPathRel = rows?.[0]?.PATH || null;

        const carpetaDestino = absInDocs(`entidad${codigo_cia}`, 'logo');
        await fsp.mkdir(carpetaDestino, { recursive: true });

        const rawExt = (path.extname(file.originalname || '') || '').toLowerCase();
        const mimeExt = {
            'image/png': '.png',
            'image/jpeg': '.jpg',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg'
        }[file.mimetype] || '.bin';
        const ext = rawExt || mimeExt;

        const rawName = path.basename(file.originalname || 'logo', rawExt);
        const baseName =
            rawName
                .replace(/[^\w.\-]+/g, '_')
                .replace(/^_+/, '')
                .slice(0, 80)
                .replace(/_+$/, '') || 'logo';

        const nombreArchivo = `${Date.now()}-${baseName}${ext}`;
        newPathRel = relToDocs(`entidad${codigo_cia}`, 'logo', nombreArchivo);
        newPathAbs = absInDocs(`entidad${codigo_cia}`, 'logo', nombreArchivo);

        await fsp.writeFile(newPathAbs, file.buffer, { flag: 'wx' });

        await cn.beginTransaction();
        await cn.query(
            `UPDATE seguridad.seguridad_institucion
        SET PATH_BARRA = ?, FECHA_MODIFICACION = NOW(), usuario_modificacion = ? 
        WHERE CODIGO_CIA = ?`,
            [newPathRel, req.userId, codigo_cia]
        );
        await cn.commit();

        if (oldPathRel) {
            try { await fsp.unlink(safeInDocs(oldPathRel.replace(/^docs\//, ''))); } catch { }
        }

        return res.json({
            ok: true,
            msg: 'Logo actualizado correctamente',
            logo: newPathRel.replace(/\\/g, '/')
        });
    } catch (err) {
        if (newPathAbs) { try { await fsp.unlink(newPathAbs); } catch { } }
        try { await cn?.rollback(); } catch { }
        console.error('Error al actualizar logo:', err);
        return res.status(500).json({ ok: false, msg: 'Error al actualizar logo', error: err.message });
    } finally {
        try { cn?.release?.(); } catch { }
    }
};

/**
 * obtenerArchivo
 * 
 * Descarga de archivos genéricos almacenados bajo `/docs`.
 *
 * - Recibe `ruta` (acepta `docs/...` o relativa).
 * - Normaliza y valida la ruta (prevención de path traversal).
 * - Inicia `res.download()` del recurso.
 *
 * @route GET /
 * @returns {200|400|500} Descarga del archivo o error.
 */
exports.obtenerArchivo = (req, res) => {
    const { ruta } = req.query;

    if (!ruta) return res.status(400).send('Falta ruta');

    const rel = ruta.replace(/^docs\//, '');
    let filePath;
    try {
        filePath = safeInDocs(rel);
    } catch {
        return res.status(400).send('Ruta inválida');
    }

    res.download(filePath, (err) => {
        if (err) {
            console.error('Error al descargar:', err);
            res.status(500).send('Error al descargar el archivo');
        }
    });
};

exports.obtenerFotoPerfil = async (req, res) => {
    try {
        const sql = `
            SELECT 
                path AS foto
            FROM 
                seguridad.seguridad_persona
            WHERE 
                CODIGO_CIA = ?
                AND codigo_colaborador = ?
            LIMIT 1
        `;

        const [rows] = await pool.execute(sql, [req.codigo_cia, req.userId]);

        if (!rows.length || !rows[0].foto) {
            return res.status(404).json({ msg: 'Foto de perfil no encontrada' });
        }

        const rutaBD = rows[0].foto; // ej. 'docs/entidad1/foto-perfil/xxx.jpg'

        let filePath;
        if (path.isAbsolute(rutaBD)) {
            // Si ya viene absoluta, la usamos directo
            filePath = rutaBD;
        } else {
            // Quitamos un posible prefijo 'docs/' o 'docs\' para que no se duplique
            const relFromDocs = rutaBD.replace(/^docs[\\/]/, '');
            filePath = path.join(DOCS_DIR, relFromDocs);
        }

        if (!fs.existsSync(filePath)) {
            console.error('No existe archivo de foto de perfil en disco:', filePath);
            return res.status(404).json({ msg: 'Archivo de foto de perfil no existe en disco', ruta: filePath });
        }

        const imageBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();

        const mimeType =
            ext === '.png' ? 'image/png' :
                ext === '.jpg' ? 'image/jpeg' :
                    ext === '.jpeg' ? 'image/jpeg' :
                        ext === '.gif' ? 'image/gif' :
                            'application/octet-stream';

        const base64Image = imageBuffer.toString('base64');
        return res.json({ foto: `data:${mimeType};base64,${base64Image}` });
    } catch (err) {
        console.error('Error al obtener foto de perfil:', err);
        return res.status(500).json({ msg: 'Error al obtener foto de perfil', error: err.message });
    }
};

exports.actualizarFotoPerfil = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId
    const file = req.file;

    if (!file) {
        return res.status(400).json({ ok: false, msg: 'No se recibió ningún archivo' });
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
        return res.status(400).json({ ok: false, msg: 'Tipo de archivo no permitido' });
    }
    if (file.size > MAX_BYTES) {
        return res.status(400).json({ ok: false, msg: 'El archivo excede el tamaño máximo permitido (5MB)' });
    }

    let cn;
    let oldPathRel = null;
    let newPathRel = null;
    let newPathAbs = null;

    try {
        cn = await pool.getConnection();

        const [rows] = await cn.query(
            `SELECT PATH FROM seguridad.seguridad_persona WHERE CODIGO_CIA = ? AND codigo_colaborador = ?`,
            [codigo_cia, usuario]
        );
        oldPathRel = rows?.[0]?.PATH || null;

        const carpetaDestino = absInDocs(`entidad${codigo_cia}`, 'foto-perfil');
        await fsp.mkdir(carpetaDestino, { recursive: true });

        const rawExt = (path.extname(file.originalname || '') || '').toLowerCase();
        const mimeExt = {
            'image/png': '.png',
            'image/jpeg': '.jpg',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg'
        }[file.mimetype] || '.bin';
        const ext = rawExt || mimeExt;

        const rawName = path.basename(file.originalname || 'foto-perfil', rawExt);
        const baseName =
            rawName
                .replace(/[^\w.\-]+/g, '_')
                .replace(/^_+/, '')
                .slice(0, 80)
                .replace(/_+$/, '') || 'foto-perfil';

        const nombreArchivo = `${Date.now()}-${baseName}${ext}`;
        newPathRel = relToDocs(`entidad${codigo_cia}`, 'foto-perfil', nombreArchivo);
        newPathAbs = absInDocs(`entidad${codigo_cia}`, 'foto-perfil', nombreArchivo);

        await fsp.writeFile(newPathAbs, file.buffer, { flag: 'wx' });

        await cn.beginTransaction();
        await cn.query(
            `UPDATE seguridad.seguridad_persona
        SET PATH = ?, FECHA_MODIFICACION = NOW(), usuario_modificacion = '${req.userId}'
        WHERE CODIGO_CIA = ? AND codigo_colaborador = ?`,
            [newPathRel, codigo_cia, req.userId]
        );
        await cn.commit();

        if (oldPathRel) {
            try { await fsp.unlink(safeInDocs(oldPathRel.replace(/^foto-perfil\//, ''))); } catch { }
        }

        return res.json({
            ok: true,
            msg: 'Foto de perfil actualizada correctamente',
            logo: newPathRel.replace(/\\/g, '/')
        });
    } catch (err) {
        if (newPathAbs) { try { await fsp.unlink(newPathAbs); } catch { } }
        try { await cn?.rollback(); } catch { }
        console.error('Error al actualizar foto de perfil:', err);
        return res.status(500).json({ ok: false, msg: 'Error al actualizar foto de perfil', error: err.message });
    } finally {
        try { cn?.release?.(); } catch { }
    }
};