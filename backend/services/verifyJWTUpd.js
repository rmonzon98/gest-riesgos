const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

const jwtSecret = process.env.SECRET_KEY;

exports.verifyJWT = async (req, res, next) => {
    try {
        const token = req.cookies?.access_token;

        if (!token) {
            return res.status(401).json({
                auth: false,
                message: 'Token no enviado'
            });
        }

        const decoded = jwt.verify(token, jwtSecret);
        const { id, codigo_cia, sid } = decoded;

        if (!id || !codigo_cia || !sid) {
            return res.status(401).json({
                auth: false,
                message: 'Token incompleto'
            });
        }

        const sesion = await prisma.seguridadSesion.findFirst({
            where: {
                idSesion: String(sid),
                codigoCia: Number(codigo_cia),
                codigoColaborador: Number(id),
                activo: 1,
                fechaRevocacion: null,
                fechaExpiracion: { gt: new Date() }
            }
        });

        if (!sesion) {
            return res.status(401).json({
                auth: false,
                message: 'Sesion invalida o expirada'
            });
        }

        const persona = await prisma.seguridadPersona.findFirst({
            where: {
                codigoCia: Number(codigo_cia),
                codigoColaborador: Number(id),
                activo: 1
            }
        });

        if (!persona) {
            return res.status(401).json({
                auth: false,
                message: 'Usuario invalido o inactivo'
            });
        }

        req.user = {
            id: persona.codigoColaborador,
            codigo_cia: persona.codigoCia,
            codigo_entidad: persona.codigoEntidad,
            id_sesion: sesion.idSesion
        };

        req.userId = persona.codigoColaborador;
        req.sessionId = sesion.idSesion;
        req.codigoEntidad = persona.codigoEntidad;
        req.codigo_cia = persona.codigoCia;
        req.codigo_entidad = persona.codigoEntidad;

        return next();
    } catch (err) {
        console.log('Error en verifyJWT:', err);
        const msg = err.name === 'TokenExpiredError'
            ? 'Token expirado'
            : 'Autenticacion fallida';

        return res.status(401).json({
            auth: false,
            message: msg
        });
    }
};
