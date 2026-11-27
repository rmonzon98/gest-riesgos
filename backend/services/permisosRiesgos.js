const prisma = require('../prisma/client');
const permisoEliminacionDirecta = '/permiso/eliminar-sin-autorizacion';

/** Obtiene las URLs asignadas al usuario de la institución autenticada. */
async function permisosUsuario(req, urls, { vigentes = true } = {}) {
    const asignacion = { codigoColaborador: req.userId };
    if (vigentes) {
        const [{ hoy }] = await prisma.$queryRaw`SELECT CURDATE() AS hoy`;
        asignacion.AND = [
            { OR: [{ fechaInicio: null }, { fechaInicio: { lte: hoy } }] },
            { OR: [{ fechaFin: null }, { fechaFin: { gte: hoy } }] }
        ];
    }
    const rows = await prisma.seguridadMenuRolUrl.findMany({
        where: {
            codigoAplicacion: 1,
            codigoCia: req.codigo_cia,
            seguridadMenuRol: { seguridadMenuRolUsuario: { some: asignacion } },
            seguridadMenuUrls: { url: { in: urls } }
        },
        select: { seguridadMenuUrls: { select: { url: true } } }
    });
    return new Set(rows.map(row => row.seguridadMenuUrls.url));
}

/** Protege una operación de catálogo por la misma URL asignada en el menú. */
function requiereUrl(url, opciones) {
    return async (req, res, next) => {
        try {
            if (!(await permisosUsuario(req, [url], opciones)).has(url)) {
                return res.status(403).json({ error: 'No tiene permiso para esta operación.' });
            }
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

module.exports = { permisoEliminacionDirecta, permisosUsuario, requiereUrl };
