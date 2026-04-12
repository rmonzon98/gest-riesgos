/**
 * @fileoverview
 * Utilitario para el manejo centralizado de errores provenientes de peticiones HTTP.
 * Permite estandarizar los mensajes devueltos al usuario según el tipo de error
 * retornado por el servidor o detectado por Axios.
 *
 * @module funciones/errors
 * @version 1.0
 * @author Equipo de Desarrollo
 */

/**
 * Genera un mensaje de error legible a partir de un error Axios.
 *
 * @function apiErrorMessage
 * @param {any} err - Objeto de error capturado, generalmente de Axios.
 * @returns {string} Mensaje de error descriptivo para mostrar al usuario.
 *
 * @description
 * La función interpreta la estructura de los errores HTTP capturados por Axios:
 * - `err.response`: error devuelto por el servidor (con código de estado).
 * - `err.request`: solicitud enviada pero sin respuesta.
 * - Otros errores inesperados.
 */
export function apiErrorMessage(err) {
    // Axios error shape
    if (err?.response) {
        const { status, data } = err.response;
        const serverMsg = data?.error || data?.message;

        if (status === 409) return serverMsg || 'El correo ya está registrado.';
        if (status === 400) return serverMsg || 'Datos incompletos.';
        if (status === 408) return 'La solicitud tardó demasiado. Inténtalo de nuevo.';
        if (status === 422) return serverMsg || 'Revisa los campos enviados.';
        if (status === 401) return serverMsg || 'Debe iniciar sesión nuevamente.';
        return serverMsg || 'Error interno del servidor.';
    }
    if (err?.request) return 'No se pudo contactar al servidor.';
    return 'Error inesperado.';
}