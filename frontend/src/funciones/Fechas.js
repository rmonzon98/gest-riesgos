/**
 * @fileoverview
 * Utilidades para formateo y manipulación de fechas.
 * Provee funciones para mostrar fechas en formato largo, corto o seguro
 *
 * @module funciones/Fechas
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Convierte una fecha ISO en un formato largo con día, mes y año.
 * @param {string} iso - Fecha en formato ISO (YYYY-MM-DD o similar).
 * @returns {string} Fecha formateada en formato largo (ej. “Lunes, 01 de Enero de 2024”).
 */
export function fechaLarga(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
        .replace(/^./, c => c.toUpperCase());
}
function parseISO(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }

/**
 * Convierte una fecha ISO a formato “DD Mes”.
 * @param {string} iso - Fecha en formato ISO.
 * @returns {string} Fecha formateada (ej. “05 Mayo”).
 */
export function fmt(iso) { const d = parseISO(iso); return `${String(d.getDate()).padStart(2, '0')} ${meses[d.getMonth()]}`; }

/**
 * Devuelve una fecha formateada de manera segura, aceptando múltiples tipos de entrada.
 *
 * @param {Date|string|number|null} d - Objeto Date, string ISO o timestamp.
 * @returns {string|null} Fecha formateada o null si no es válida.
 *
 * @description
 * Esta función es tolerante a tipos de dato; evita errores cuando
 * el valor recibido no es una fecha válida.
 */
export function safefmt(d) {
    if (!d) return null;

    if (d instanceof Date) {
        try {
            return fmt(d.toISOString());
        } catch {
            return null;
        }
    }
    if (typeof d === 'number') {
        try {
            return fmt(new Date(d).toISOString());
        } catch {
            return null;
        }
    }
    if (typeof d === 'string') {
        try {
            return fmt(d);
        } catch {
            return null;
        }
    }

    return null;
};