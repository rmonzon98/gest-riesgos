/**
 * @fileoverview 
 * Helpers de rutas y carpeta de documentos del backend (/docs): resolución absoluta/relativa y validaciones.
 *
 * @module services/paths
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const path = require('path');
const fs = require('fs');

const ENV_DIR = process.env.DOCS_DIR;

const DEFAULT_DIR = path.resolve(__dirname, '..', 'docs');
const DOCS_DIR = path.resolve(ENV_DIR || DEFAULT_DIR);

// Validaciones básicas y creación del directorio si no existe
if (!DOCS_DIR || DOCS_DIR === '/' || DOCS_DIR.trim() === '') {
    throw new Error('DOCS_DIR inválido');
}
if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
}

/**
 * absInDocs
 *
 * Obtiene una ruta absoluta segura dentro de `/docs`.
 *
 * - Une segmentos, resuelve contra DOCS_DIR y valida que no escape del directorio.
 *
 * @param {...string} segs Segmentos de ruta.
 * @returns {string} Ruta absoluta segura dentro de /docs.
 * @throws {Error} Si la ruta resultante sale de /docs.
 */
function absInDocs(...segs) {
    const abs = path.resolve(DOCS_DIR, path.join(...segs));
    if (!abs.startsWith(DOCS_DIR)) throw new Error('Ruta fuera de /docs');
    return abs;
}

/**
 * relToDocs
 *
 * Devuelve una ruta “web-friendly” relativa a `/docs` (prefijada con `docs/`).
 *
 * - Calcula la ruta relativa con separadores `/` para URL.
 *
 * @param {...string} segs Segmentos de ruta.
 * @returns {string} Ruta relativa con prefijo `docs/`.
 */
function relToDocs(...segs) {
    const abs = absInDocs(...segs);
    const rel = path.relative(DOCS_DIR, abs).replace(/\\/g, '/');
    return `docs/${rel}`;
}

/**
 * safeInDocs
 *
 * Limpia rutas relativas que ya vengan con el prefijo `docs/` y devuelve absoluta segura.
 *
 * - Quita `docs/` inicial y usa `absInDocs` para validar/internar la ruta dentro de /docs.
 *
 * @param {string} rel Ruta relativa (con o sin `docs/`).
 * @returns {string} Ruta absoluta segura.
 */
function safeInDocs(rel) {
    const clean = String(rel || '').replace(/^docs\//, '');
    return absInDocs(clean);
}

module.exports = { DOCS_DIR, absInDocs, relToDocs, safeInDocs };
