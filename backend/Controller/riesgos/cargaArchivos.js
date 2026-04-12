/**
 * @fileoverview
 * Carga y gestión de documentos por módulo/flag: subir, listar, descargar individual y en lote, marcar como 'final', y listados por dirección/institución y período.
 *
 * @module Controller/riesgos/cargaArchivos
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const pool = require('../../bd/mySQLConnection');
const { absInDocs, relToDocs, safeInDocs } = require('../../services/paths');

const FLAG_DIR = {
    control_interno: 'control_interno',
    fraude: 'fraude',
    evaluacion_riesgo: 'evaluacion_riesgo',
    continuidad: 'continuidad',
    mapa_riesgos: 'mapa_riesgos',
    seguimiento: 'seguimiento',
    informe_anual: 'informe_anual',
    monitoreo: 'monitoreo',
};

function mapFlagToDir(flag) {
    const k = String(flag || '').trim().toLowerCase();
    return FLAG_DIR[k] || null;
}

const RESERVED_WIN = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
function sanitizeFileName(name = 'archivo') {
    let s = String(name).normalize('NFC');
    s = s.replace(/[\u0000-\u001F\u007F]/g, '');
    s = s.replace(/[\/\\]/g, '-');
    s = s.replace(/[<>:"|?*]+/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    s = s.replace(/^\.+/, '');
    if (!s) s = 'archivo';
    if (RESERVED_WIN.test(s)) s = `_${s}`;
    const ext = path.extname(s);
    const base = path.basename(s, ext);
    return `${base.slice(0, 160)}${ext}`;
}

const ALLOWED_MIME = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp'
]);

const ALLOWED_EXT = new Set([
    '.pdf', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.doc', '.docx'
]);

/**
 * subirDocumento
 * 
 * Sube un documento a `/docs/entidad{cia}/{flag}/{periodo}` y crea el registro en BD.
 *
 * - Valida archivo/flag/periodo/CIA.
 * - Determina el siguiente `CODIGO_DOCUMENTO` por compañía/entidad.
 * - Guarda físicamente y registra metadatos (PATH relativo `docs/...`).
 *
 * @route POST /
 * @returns {200|400|500} `{ok, result:{...}}`
 */
exports.subirDocumento = async (req, res) => {
    const file = req.file;
    const { flag, periodo, nombre_real, categoria } = req.body || {};
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = req.codigo_entidad;

    if (!file) return res.status(400).json({ ok: false, msg: 'Falta el archivo (file).' });
    if (!flag) return res.status(400).json({ ok: false, msg: 'Falta el flag.' });
    if (!periodo) return res.status(400).json({ ok: false, msg: 'Falta el periodo.' });
    if (!codigo_cia) return res.status(400).json({ ok: false, msg: 'No se pudo resolver CODIGO_CIA.' });

    const mime = (file.mimetype || '').toLowerCase();
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isImage = mime.startsWith('image/');

    if (!(ALLOWED_MIME.has(mime) || ALLOWED_EXT.has(ext) || isImage)) {
        return res.status(400).json({
            ok: false,
            msg: 'Tipo de archivo no permitido (PDF, Excel, Word e imágenes).'
        });
    }

    const dirFlag = mapFlagToDir(flag);
    if (!dirFlag) return res.status(400).json({ ok: false, msg: 'Flag inválido.' });

    let cn;
    let absDestino;
    try {
        cn = await pool.getConnection();
        await cn.beginTransaction();

        const [rNext] = await cn.execute(
            `
            SELECT IFNULL(MAX(CODIGO_DOCUMENTO), 0) + 1 AS NEXT_ID
            FROM gestion_riesgos.riesgos_documentos
            WHERE CODIGO_CIA = ? AND codigo_entidad = ? 
            FOR UPDATE`,
            [codigo_cia, codigo_entidad]
        );
        const CODIGO_DOCUMENTO = rNext?.[0]?.NEXT_ID || 1;

        const carpetaAbs = absInDocs(`entidad${codigo_cia}`, dirFlag, String(periodo));
        await fsp.mkdir(carpetaAbs, { recursive: true });

        const original = nombre_real || file.originalname || 'archivo';
        const clean = sanitizeFileName(original);
        const fisico = `${Date.now()}-${clean}`;

        absDestino = path.join(carpetaAbs, fisico);
        await fsp.writeFile(absDestino, file.buffer, { flag: 'wx' });

        const rutaRel = relToDocs(`entidad${codigo_cia}`, dirFlag, String(periodo), fisico);
        await cn.execute(
            `
            INSERT INTO gestion_riesgos.riesgos_documentos
            (CODIGO_CIA, CODIGO_DOCUMENTO, NOMBRE_REAL, PATH, TIPO, CODIGO_PERIODO, FECHA_CREACION, CATEGORIA, CODIGO_ENTIDAD, USUARIO_CREACION)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
            [codigo_cia, CODIGO_DOCUMENTO, original, rutaRel.replace(/\\/g, '/'), mime, String(periodo), categoria, codigo_entidad, req.userId]
        );

        await cn.commit();

        const url = `${req.protocol}://${req.get('host')}/${rutaRel.replace(/\\/g, '/')}`;
        return res.json({
            ok: true,
            msg: 'Documento guardado correctamente.',
            result: {
                id: CODIGO_DOCUMENTO,
                filename: original,
                contentType: mime,
                PATH: rutaRel.replace(/\\/g, '/'),
                url,
                CODIGO_CIA: codigo_cia,
                CODIGO_PERIODO: String(periodo)
            }
        });
    } catch (err) {
        try { await cn?.rollback(); } catch { }
        if (absDestino) { try { await fsp.unlink(absDestino); } catch { } }
        console.error('subirDocumento', err);
        return res.status(500).json({ ok: false, msg: 'Error al subir documento', error: err.message });
    } finally {
        try { cn?.release?.(); } catch { }
    }
};

/**
 * listarPorFlagPeriodo
 * 
 * Lista documentos por `flag` y `periodo` de la entidad del token.
 *
 * - Trae metadatos de BD, intenta anexar `size` desde disco y arma `url` pública.
 *
 * @route GET /:flag
 * @returns {200|400|500} `items: Array<{...}>`
 */
exports.listarPorFlagPeriodo = async (req, res) => {
    const { flag } = req.params;
    const { periodo } = req.query || {};
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = req.codigo_entidad;

    const dirFlag = mapFlagToDir(flag);
    if (!dirFlag) return res.status(400).json({ ok: false, msg: 'Flag inválido.' });
    if (!periodo) return res.status(400).json({ ok: false, msg: 'Falta periodo.' });

    try {
        const [rows] = await pool.execute(
            `
            SELECT CODIGO_DOCUMENTO as id, NOMBRE_REAL as filename, PATH, TIPO as contentType, CODIGO_PERIODO, FECHA_CREACION, FINAL, CATEGORIA
            FROM gestion_riesgos.riesgos_documentos
            WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ? AND codigo_entidad = ?
            AND PATH LIKE CONCAT('docs/entidad', ?, '/${dirFlag}/', ?, '/%') AND ACTIVO = 1
            ORDER BY CODIGO_DOCUMENTO DESC`,
            [codigo_cia, String(periodo), codigo_entidad, codigo_cia, String(periodo)]
        );

        const items = await Promise.all(
            rows.map(async (r) => {
                const rel = String(r.PATH).replace(/^docs\//, '');
                const abs = safeInDocs(rel);
                let size = null;
                try { size = (await fsp.stat(abs)).size; } catch { }
                const url = `${req.protocol}://${req.get('host')}/${String(r.PATH)}`;
                return {
                    id: r.id,
                    filename: r.filename,
                    contentType: r.contentType,
                    size,
                    createdAt: r.FECHA_CREACION,
                    url,
                    final: r.FINAL,
                    categoria: r.categoria
                };
            })
        );

        return res.json(items);
    } catch (err) {
        console.error('listarPorFlagPeriodo', err);
        return res.status(500).json({ ok: false, msg: 'Error al listar', error: err.message });
    }
};

/**
 * descargar
 * 
 * Descarga un documento por ID y período.
 *
 * - Valida llaves y busca la ruta `PATH` en BD.
 * - Resuelve la ruta segura y dispara `res.download()`.
 *
 * @route GET /:flag/:id/download
 * @returns {200|400|404|500} descarga del recurso o error.
 */
exports.descargar = async (req, res) => {
    const { id } = req.params;
    const { periodo } = req.query || {};
    const codigo_cia = req.codigo_cia;

    if (!id) return res.status(400).json({ ok: false, msg: 'Falta id.' });
    if (!periodo) return res.status(400).json({ ok: false, msg: 'Falta periodo.' });

    try {
        const [rows] = await pool.execute(
            `SELECT NOMBRE_REAL, PATH, TIPO
         FROM gestion_riesgos.riesgos_documentos
        WHERE CODIGO_CIA = ? AND CODIGO_DOCUMENTO = ? AND CODIGO_PERIODO = ? AND ACTIVO = 1
        LIMIT 1`,
            [codigo_cia, Number(id), String(periodo)]
        );
        if (!rows.length) return res.status(404).json({ ok: false, msg: 'Documento no encontrado.' });

        const { NOMBRE_REAL, PATH: ruta, TIPO } = rows[0];
        const rel = String(ruta).replace(/^docs\//, '');
        const abs = safeInDocs(rel);

        res.setHeader('Content-Type', TIPO || 'application/octet-stream');
        return res.download(abs, NOMBRE_REAL || path.basename(abs), (err) => {
            if (err) {
                console.error('descargar', err);
                if (!res.headersSent) res.status(500).send('Error al descargar el archivo');
            }
        });
    } catch (err) {
        console.error('descargar', err);
        return res.status(500).json({ ok: false, msg: 'Error en descarga', error: err.message });
    }
};

/**
 * obtenerFinales
 * 
 * Lista PDFs marcados como `FINAL=1` por período y categoría (por entidad).
 *
 * - Une con `seguridad_entidad` para incluir nombre de dirección.
 * - Devuelve URLs relativas (`/docs/...`) y, si es posible, tamaño en bytes.
 *
 * @route GET /consolidados
 * @returns {200|500} `{ok, data:[...]}` ordenado por dirección/nombre.
 */
exports.obtenerFinales = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const { periodo, categoria } = req.query || {};


    try {
        const [rows] = await pool.execute(
            `
        SELECT 
            a.CODIGO_DOCUMENTO AS id,
            a.NOMBRE_REAL      AS filename,
            a.PATH,
            a.TIPO             AS contentType,
            a.FECHA_CREACION,
            b.NOMBRE,
            concat(a.codigo_entidad,'-',a.codigo_documento) AS tempId
        FROM gestion_riesgos.riesgos_documentos a
        LEFT JOIN seguridad.seguridad_entidad b
        ON a.codigo_cia = b.codigo_cia AND b.codigo_entidad = a.codigo_entidad
        WHERE 
            a.CODIGO_CIA = ?
            AND a.FINAL = 1
            AND a.CODIGO_PERIODO = ?
            AND a.CATEGORIA = ?
            AND a.TIPO = 'application/pdf'
            AND ACTIVO = 1
        ORDER BY b.nombre ASC
      `,
            [codigo_cia, periodo, categoria,]
        );

        const items = await Promise.all(
            rows.map(async (r) => {
                const rel = String(r.PATH).replace(/^docs\//, '');
                const abs = safeInDocs(rel);
                let size = null;
                try { size = (await fsp.stat(abs)).size; } catch { /* archivo pudo haberse movido/eliminado */ }

                const url = `/${String(r.PATH).replace(/\\/g, '/')}`;

                return {
                    contentType: r.contentType,
                    createdAt: r.FECHA_CREACION,
                    filename: r.filename,
                    id: r.id,
                    size,
                    url,
                    direccion: r.NOMBRE,
                    tempId: r.tempId
                };
            })
        );

        return res.json({ ok: true, data: items });
    } catch (err) {
        console.error('obtenerFinales', err);
        return res.status(500).json({ ok: false, msg: 'Error al obtener PDFs.', });
    }
};

/**
 * descargarLoteConsolidados
 * 
 * Descarga en bloque múltiples PDFs previamente listados.
 *
 * - Valida cantidad y límites de tamaño por archivo y total.
 * - Lee cada recurso desde `/docs/...`, valida que sea PDF y responde arreglo de archivos en Base64.
 *
 * @route POST /descargar-lote
 * @returns {200|400|500} `{ok, files:[{key, filename, contentType, size, base64}]}`.
 */
exports.descargarLoteConsolidados = async (req, res) => {
    try {
        const items = Array.isArray(req.body?.items) ? req.body.items : [];
        if (!items.length) {
            return res.status(400).json({ ok: false, msg: 'Debes enviar items (lista de PDFs).' });
        }

        const MAX_FILES = 30;
        const MAX_FILE_BYTES = 25 * 1024 * 1024;
        const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

        if (items.length > MAX_FILES) {
            return res.status(400).json({ ok: false, msg: `Máximo ${MAX_FILES} archivos por solicitud.` });
        }

        let totalBytes = 0;
        const files = [];

        const getDocsRelPath = (it) => {
            const p = it.PATH || it.path || it.Path;
            if (p && typeof p === 'string') {
                const s = p.replace(/\\/g, '/');
                return s.startsWith('docs/') ? s : `docs/${s.replace(/^\/+/, '')}`;
            }
            const u = it.url || it.URL || it.link;
            if (u && typeof u === 'string') {
                try {
                    let pathname = u;
                    if (/^https?:\/\//i.test(u)) {
                        const parsed = new URL(u);
                        pathname = parsed.pathname || '';
                    }
                    pathname = pathname.replace(/\\/g, '/').replace(/^\/+/, '');
                    return pathname.startsWith('docs/') ? pathname : null;
                } catch {
                    return null;
                }
            }
            return null;
        };

        const getKeyFromUrl = (it) => {
            const u = it.url || it.URL || it.link;
            if (!u) return null;
            try {
                if (/^https?:\/\//i.test(u)) {
                    return String(new URL(u).toString());
                }
                return String(u).replace(/\\/g, '/').replace(/^\/+/, '');
            } catch {
                return String(u);
            }
        };

        for (let i = 0; i < items.length; i++) {
            const it = items[i] || {};
            const relDocsPath = getDocsRelPath(it);

            const urlKey = getKeyFromUrl(it);

            if (!relDocsPath) {
                const k = urlKey ?? `idx-${i}`;
                return res.status(400).json({ ok: false, msg: `Item sin PATH/url válido (key=${k}).` });
            }

            const rel = String(relDocsPath).replace(/^docs\//, '');
            const abs = safeInDocs(rel);

            let stat;
            try {
                stat = await fsp.stat(abs);
            } catch {
                const k = urlKey ?? `docs/${rel}`;
                return res.status(404).json({ ok: false, msg: `Archivo no encontrado en disco (key=${k}).` });
            }

            if (!stat.isFile()) {
                const k = urlKey ?? `docs/${rel}`;
                return res.status(400).json({ ok: false, msg: `Ruta no es un archivo (key=${k}).` });
            }
            if (stat.size > MAX_FILE_BYTES) {
                const k = urlKey ?? `docs/${rel}`;
                return res.status(400).json({ ok: false, msg: `Archivo excede ${MAX_FILE_BYTES} bytes (key=${k}).` });
            }

            const buf = await fsp.readFile(abs);

            const looksPdf =
                path.extname(abs).toLowerCase() === '.pdf' ||
                buf.slice(0, 4).toString('utf8') === '%PDF';
            if (!looksPdf) {
                const k = urlKey ?? `docs/${rel}`;
                return res.status(400).json({ ok: false, msg: `El recurso no parece PDF (key=${k}).` });
            }

            totalBytes += buf.length;
            if (totalBytes > MAX_TOTAL_BYTES) {
                return res.status(400).json({ ok: false, msg: `Total supera ${MAX_TOTAL_BYTES} bytes.` });
            }

            const filename =
                it.filename && typeof it.filename === 'string' && it.filename.trim()
                    ? it.filename
                    : path.basename(abs);

            files.push({
                key: urlKey ?? `docs/${rel}`,
                filename,
                contentType: 'application/pdf',
                size: buf.length,
                base64: buf.toString('base64'),
            });
        }

        return res.json({ ok: true, files });
    } catch (err) {
        console.error('descargarLoteConsolidados:', err?.message || err);
        return res.status(500).json({ ok: false, msg: 'Error al descargar el lote de PDFs.' });
    }
};

exports.eliminarDocumento = async (req, res) => {
    const { id } = req.params;
    const codigo_cia = req.codigo_cia;
    try {
        const sql = `
        UPDATE gestion_riesgos.riesgos_documentos
        SET ACTIVO                  = '0',
            FINAL                   = '0',
            USUARIO_MODIFICACION    = ?,
            FECHA_MODIFICACION      = NOW()
       WHERE CODIGO_CIA = ? AND CODIGO_DOCUMENTO = ? AND CODIGO_ENTIDAD = ?
    `;
        const params = [req.userId, codigo_cia, id, req.codigo_entidad];

        console.log(codigo_cia, id, req.codigo_entidad, sql)

        const [result] = await pool.execute(sql, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Error al eliminar documento' });
        }

        return res.json({ mensaje: 'Error al eliminar documento' });
    } catch (err) {
        console.error('actualizar documento:', err);
        return res.status(500).json({ error: 'Error al eliminar documento' });
    }

}

/**
 * actualizarFinalDocumento
 * 
 * Marca o desmarca un PDF como “final” dentro del grupo (CIA, PERIODO, CATEGORÍA, ENTIDAD).
 *
 * - Valida que sea PDF, verifica coherencia de período/categoría y aplica exclusividad (si `final=1`, apaga los otros).
 *
 * @route POST /:flag/final
 * @returns {200|400|404|409|500} `{ok, data:{...}}`
 */
exports.actualizarFinalDocumento = async (req, res) => {
    const codigo_cia = Number(req.codigo_cia);
    const { id, periodo, categoria, final } = req.body || {};
    const codigo_entidad = req.codigo_entidad;

    if (!Number.isFinite(Number(id))) {
        return res.status(400).json({ ok: false, msg: 'Falta o es inválido el id.' });
    }
    if (!Number.isFinite(Number(periodo))) {
        return res.status(400).json({ ok: false, msg: 'Falta o es inválido el periodo.' });
    }
    if (categoria == null || categoria === '') {
        return res.status(400).json({ ok: false, msg: 'Falta la categoría.' });
    }
    const finalNum = Number(final);
    if (!(finalNum === 0 || finalNum === 1)) {
        return res.status(400).json({ ok: false, msg: 'El valor de final debe ser 0 o 1.' });
    }

    let conn;
    try {
        const [rows] = await pool.execute(
            `
            SELECT CODIGO_DOCUMENTO, CODIGO_CIA, CODIGO_PERIODO, CATEGORIA, TIPO, FINAL
            FROM gestion_riesgos.riesgos_documentos
            WHERE CODIGO_CIA = ? AND CODIGO_DOCUMENTO = ? AND codigo_entidad = ? `,
            [codigo_cia, Number(id), codigo_entidad]
        );

        if (!rows.length) {
            return res.status(404).json({ ok: false, msg: 'Documento no encontrado.' });
        }

        const doc = rows[0];

        if (doc.TIPO !== 'application/pdf') {
            return res.status(400).json({ ok: false, msg: 'Solo los PDF pueden marcarse como final.' });
        }

        if (Number(doc.CODIGO_PERIODO) !== Number(periodo) || String(doc.CATEGORIA) !== String(categoria)) {
            return res.status(400).json({ ok: false, msg: 'El periodo/categoría no coincide con el documento.' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        if (finalNum === 1) {
            await conn.execute(
                `UPDATE gestion_riesgos.riesgos_documentos
            SET FINAL = 0,
            USUARIO_MODIFICACION = ?,
            FECHA_MODIFICACION = NOW()
          WHERE CODIGO_CIA = ?
            AND CODIGO_PERIODO = ?
            AND CATEGORIA = ?
            AND codigo_entidad = ?
            AND TIPO = 'application/pdf'`,
                [req.userId, codigo_cia, Number(periodo), String(categoria), codigo_entidad]
            );
        }

        const [upd] = await conn.execute(
            `UPDATE gestion_riesgos.riesgos_documentos
            SET FINAL = ?,
            USUARIO_MODIFICACION = ?,
            FECHA_MODIFICACION = NOW()
            WHERE CODIGO_CIA = ?
            AND CODIGO_DOCUMENTO = ?
            AND CODIGO_ENTIDAD = ?`,
            [req.userId, finalNum, codigo_cia, Number(id), codigo_entidad]
        );

        if (upd.affectedRows !== 1) {
            await conn.rollback();
            return res.status(409).json({ ok: false, msg: 'No fue posible actualizar el documento.' });
        }

        await conn.commit();
        return res.json({
            ok: true,
            msg: finalNum ? 'Documento marcado como final.' : 'Documento desmarcado como final.',
            data: { id: Number(id), periodo: Number(periodo), categoria: String(categoria), final: finalNum }
        });
    } catch (err) {
        if (conn) try { await conn.rollback(); } catch { }
        console.error('actualizarFinalDocumento:', err);
        return res.status(500).json({ ok: false, msg: 'Error al actualizar el estado final del documento.' });
    } finally {
        if (conn) try { conn.release(); } catch { }
    }
};

const mapCategoriaToTipo = (categoria) => {
    switch (Number(categoria)) {
        case 1:
            return 'módulo de control interno y gobernanza';
        case 2:
            return 'módulo de evaluación de riesgos asociados a fraude o corrupción';
        case 3:
            return 'módulo de evaluación y gestión de riesgos';
        case 4:
            return 'módulo de continuidad y monitoreo';
        case 5:
            return 'módulo de mapa de riesgos';
        case 6:
            return 'Seguimiento institucional';
        case 7:
            return 'Informe anual institucional';
        default:
            return 'otro';
    }
};

/**
 * listarArchivosDireccionPeriodo
 * 
 * Consolida archivos de una dirección (entidad) y período, incluyendo módulos generales y seguimiento.
 *
 * - Consulta documentos generales y de seguimiento, normaliza y ordena (recientes primero).
 *
 * @route GET /listar-archivos-direccion-periodo
 * @returns {200|400|500} `{ok, result:[...], total,...}`
 */
exports.listarArchivosDireccionPeriodo = async (req, res) => {
    const codigo_cia = Number(req.codigo_cia);
    const codigo_entidad = Number(req.query.codigo_entidad);
    const codigo_periodo = Number(req.query.codigo_periodo);

    if (!codigo_cia || !codigo_entidad || !codigo_periodo) {
        return res.status(400).json({
            ok: false,
            msg: 'Faltan parámetros: codigo_cia, codigo_entidad o codigo_periodo.',
        });
    }

    try {
        const sqlDocs = `
            SELECT
                NOMBRE_REAL   AS nombre,
                PATH          AS ruta,
                CATEGORIA     AS categoria,
                FECHA_CREACION
            FROM gestion_riesgos.riesgos_documentos
            WHERE CODIGO_CIA     = ?
              AND CODIGO_ENTIDAD = ?
              AND CODIGO_PERIODO = ?
              AND categoria NOT IN (6,7)
              AND ACTIVO = 1
        `;

        const sqlSeg = `
            SELECT
                NOMBRE        AS nombre,
                RUTA          AS ruta,
                FECHA_CREACION
            FROM gestion_riesgos.riesgos_seguimiento_docs
            WHERE CODIGO_CIA     = ?
              AND CODIGO_ENTIDAD = ?
              AND CODIGO_PERIODO = ?
              AND ACTIVO = 1
        `;

        const params = [codigo_cia, codigo_entidad, codigo_periodo];

        const [[docsRows], [segRows]] = await Promise.all([
            pool.execute(sqlDocs, params),
            pool.execute(sqlSeg, params),
        ]);

        const fromDocs = (docsRows || []).map(r => ({
            nombre: r.nombre,
            ruta: r.ruta,
            tipo: mapCategoriaToTipo(r.categoria),
            fecha_creacion: r.FECHA_CREACION,
        }));

        const fromSeg = (segRows || []).map(r => ({
            nombre: r.nombre,
            ruta: r.ruta,
            tipo: 'módulo de monitoreo del comportamiento de los riesgos',
            fecha_creacion: r.FECHA_CREACION,
        }));

        const all = [...fromDocs, ...fromSeg].sort((a, b) => {
            const fa = a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0;
            const fb = b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0;
            if (fb !== fa) return fb - fa;
            return (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
        });

        return res.json({
            ok: true,
            found: all.length > 0,
            total: all.length,
            codigo_cia,
            codigo_entidad,
            codigo_periodo,
            result: all,
        });
    } catch (error) {
        console.error('Error al listar archivos por dirección y período:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno al listar los archivos.',
        });
    }
};

/**
 * listarArchivosInstiPeriodo
 * 
 * Lista documentos institucionales (categorías 6 y 7) para un período.
 *
 * - Devuelve archivos institucionales ordenados por fecha (desc) y nombre.
 *
 * @route GET /listar-archivos-insti-periodo
 * @returns {200|400|500} `{ok, result:[...], total,...}`
 */
exports.listarArchivosInstiPeriodo = async (req, res) => {
    const codigo_cia = Number(req.codigo_cia);
    const codigo_periodo = Number(req.query.codigo_periodo);

    if (!codigo_cia || !codigo_periodo) {
        return res.status(400).json({
            ok: false,
            msg: 'Faltan parámetros: codigo_cia o codigo_periodo.',
        });
    }

    try {
        const sqlDocs = `
            SELECT
                NOMBRE_REAL   AS nombre,
                PATH          AS ruta,
                CATEGORIA     AS categoria,
                FECHA_CREACION
            FROM gestion_riesgos.riesgos_documentos
            WHERE CODIGO_CIA     = ? AND CODIGO_PERIODO = ? AND categoria IN (6,7)
            AND ACTIVO = 1
        `;

        const params = [codigo_cia, codigo_periodo];

        const [[docsRows]] = await Promise.all([
            pool.execute(sqlDocs, params),
        ]);

        const fromDocs = (docsRows || []).map(r => ({
            nombre: r.nombre,
            ruta: r.ruta,
            tipo: mapCategoriaToTipo(r.categoria),
            fecha_creacion: r.FECHA_CREACION,
        }));

        const all = [...fromDocs].sort((a, b) => {
            const fa = a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0;
            const fb = b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0;
            if (fb !== fa) return fb - fa;
            return (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
        });

        return res.json({
            ok: true,
            found: all.length > 0,
            total: all.length,
            codigo_cia,
            codigo_periodo,
            result: all,
        });
    } catch (error) {
        console.error('Error al listar archivos por dirección y período:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno al listar los archivos.',
        });
    }
};