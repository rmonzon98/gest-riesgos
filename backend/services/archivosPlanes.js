const fs = require('node:fs/promises');
const path = require('node:path');
const { absInDocs, relToDocs, safeInDocs } = require('./paths');

function nombreSeguro(value) {
    const name = path.posix.basename(String(value ?? '').replaceAll('\\', '/'))
        .replace(/[\x00-\x1f<>:"/\\|?*]/g, '_').trim().replace(/[. ]+$/, '');
    let limite = '';
    for (const char of name) {
        if (Buffer.byteLength(limite) + Buffer.byteLength(char) > 200) break;
        limite += char;
    }
    return limite || 'archivo';
}

/** Guarda archivos con un nombre único, conservando la ruta de documentos del plan. */
async function guardarAdjuntosPlan(contexto, files) {
    if (!files.length) return [];
    const { codigoCia, codigoPlan, plan } = contexto;
    const segmentos = [`entidad${codigoCia}`, 'planes', String(plan.codigoPeriodo), String(codigoPlan)];
    await fs.mkdir(absInDocs(...segmentos), { recursive: true });
    const guardados = [];
    try {
        for (const file of files) {
            const nombre = nombreSeguro(file.originalname);
            let timestamp = Date.now();
            for (;;) {
                const nombreDisco = `${timestamp}__${nombre}`;
                const ruta = relToDocs(...segmentos, nombreDisco);
                let destino;
                try {
                    destino = await fs.open(safeInDocs(ruta), 'wx');
                    guardados.push({ ruta, nombre, mime: file.mimetype?.slice(0, 150) || null, tamano: BigInt(file.size) });
                } catch (error) {
                    if (error.code !== 'EEXIST') throw error;
                    timestamp++;
                    continue;
                }
                try { await destino.writeFile(file.buffer); }
                finally { await destino.close(); }
                break;
            }
        }
        return guardados;
    } catch (error) {
        await descartarAdjuntosPlan(guardados);
        throw error;
    }
}

/** Compensa los archivos de una operación de creación que no llegó a confirmarse. */
async function descartarAdjuntosPlan(guardados) {
    const resultados = await Promise.allSettled(guardados.map(({ ruta }) => fs.rm(safeInDocs(ruta), { force: true })));
    for (const resultado of resultados) {
        if (resultado.status === 'rejected') console.error('No se pudo retirar un adjunto no registrado:', resultado.reason.code);
    }
}

module.exports = { guardarAdjuntosPlan, descartarAdjuntosPlan };
