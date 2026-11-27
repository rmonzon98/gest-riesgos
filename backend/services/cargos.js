/** Selecciona el cargo que cubre la fecha civil actual de Guatemala. */
function cargoVigente() {
    const dia = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Guatemala' }).format(new Date());
    const hoy = new Date(dia + 'T00:00:00Z');
    return {
        where: { fechaPosesion: { lte: hoy }, OR: [{ fechaEntrega: null }, { fechaEntrega: { gte: hoy } }] },
        orderBy: { fechaPosesion: 'desc' }, take: 1, select: { nombreCargo: true }
    };
}

module.exports = { cargoVigente };
