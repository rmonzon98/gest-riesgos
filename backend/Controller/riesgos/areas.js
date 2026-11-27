/** Catálogo de áreas de la institución autenticada. */
const prisma = require('../../prisma/client');
const { Prisma } = require('../../generated/prisma/client');

const selection = { codigoArea: true, descripcion: true, abreviatura: true, codigoEntidad: true };
const resultArea = area => ({ CODIGO_AREA: area.codigoArea, DESCRIPCION: area.descripcion,
    ABREVIATURA: area.abreviatura, CODIGO_ENTIDAD: area.codigoEntidad });
const code = value => /^\d+$/.test(String(value)) && Number(value) > 0 && Number(value) <= 2147483647;

/** Lista áreas activas y, si se pide una dirección, también las áreas generales. */
exports.obtenerAreas = async (req, res) => {
    const { entidad } = req.query;
    if (entidad !== undefined && !code(entidad)) return res.status(400).json({ error: 'Dirección inválida.' });
    try {
        const rows = await prisma.riesgosArea.findMany({
            where: { codigoCia: req.codigo_cia, estado: '1',
                ...(entidad !== undefined && { OR: [{ codigoEntidad: Number(entidad) }, { codigoEntidad: null }] }) },
            select: selection,
            orderBy: { codigoArea: 'asc' }
        });
        return res.json({ result: rows.map(resultArea) });
    } catch (error) {
        console.error('obtenerAreas:', error);
        return res.status(500).json({ error: 'Error al obtener áreas' });
    }
};

/** Consulta un área por su código dentro de la institución. */
exports.obtenerAreaUnica = async (req, res) => {
    const area = req.query?.area ?? req.params?.area;
    if (!code(area)) return res.status(400).json({ error: 'Faltan codigo_cia o area' });
    try {
        const row = await prisma.riesgosArea.findUnique({
            where: { codigoCia_codigoArea: { codigoCia: req.codigo_cia, codigoArea: Number(area) } },
            select: selection
        });
        if (!row) return res.status(404).json({ error: 'Área no encontrada' });
        return res.json({ result: [resultArea(row)] });
    } catch (error) {
        console.error('obtenerAreaUnica:', error);
        return res.status(500).json({ error: 'Error al obtener el área' });
    }
};

async function areaData(req, res) {
    const { descripcion, abreviatura, codigoEntidad } = req.body || {};
    if (typeof descripcion !== 'string' || !descripcion.trim() || descripcion.length > 200 ||
        (abreviatura != null && (typeof abreviatura !== 'string' || abreviatura.length > 10))) {
        res.status(400).json({ error: 'Indique una descripción de hasta 200 caracteres y una abreviatura de hasta 10.' });
        return null;
    }
    const data = { descripcion, abreviatura: abreviatura ?? null };
    if (codigoEntidad === undefined) return data;
    if (codigoEntidad === null || codigoEntidad === '') return { ...data, codigoEntidad: null };
    const direction = code(codigoEntidad) && await prisma.seguridadEntidad.findUnique({
        where: { codigoCia_codigoEntidad: { codigoCia: req.codigo_cia, codigoEntidad: Number(codigoEntidad) } },
        select: { codigoEntidad: true }
    });
    if (!direction) {
        res.status(400).json({ error: 'La dirección no pertenece a la institución.' });
        return null;
    }
    return { ...data, codigoEntidad: Number(codigoEntidad) };
}

/** Crea un área y conserva la numeración histórica por institución. */
exports.crearAreas = async (req, res) => {
    try {
        const data = await areaData(req, res);
        if (!data) return;
        const codigoCia = req.codigo_cia;
        const id = await prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT CODIGO_CIA FROM seguridad_institucion WHERE CODIGO_CIA = ${codigoCia} FOR UPDATE`;
            const { _max } = await tx.riesgosArea.aggregate({ where: { codigoCia }, _max: { codigoArea: true } });
            const codigoArea = (_max.codigoArea ?? 0) + 1;
            await tx.riesgosArea.create({ data: { ...data, codigoCia, codigoArea, usuarioCreacion: req.userId, fechaCreacion: new Date() } });
            return codigoArea;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
        return res.status(201).json({ mensaje: 'Área creada correctamente', id });
    } catch (error) {
        if (error.code === 'P2003') return res.status(400).json({ error: 'La dirección ya no está disponible.' });
        console.error('crearAreas:', error);
        return res.status(500).json({ error: 'Error al crear el área' });
    }
};

/** Edita el área. Si el cliente omite la dirección, la asociación anterior se conserva. */
exports.actualizarAreas = async (req, res) => {
    const { id } = req.body || {};
    if (!code(id)) return res.status(400).json({ error: 'Identificador de área inválido.' });
    try {
        const data = await areaData(req, res);
        if (!data) return;
        await prisma.riesgosArea.update({
            where: { codigoCia_codigoArea: { codigoCia: req.codigo_cia, codigoArea: Number(id) } },
            data: { ...data, usuarioModificacion: req.userId, fechaModificacion: new Date() }
        });
        return res.json({ mensaje: 'Área actualizada correctamente' });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Área no encontrada' });
        if (error.code === 'P2003') return res.status(400).json({ error: 'La dirección ya no está disponible.' });
        console.error('actualizarAreas:', error);
        return res.status(500).json({ error: 'Error al actualizar el área' });
    }
};
