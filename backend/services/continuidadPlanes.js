const { consultar, ejecutar, insertar } = require('../bd/consultas');

/**
 * Copia dependencias activas (eventos, planes con responsables y vínculos) dentro de la transacción que copia el riesgo.
 * @param {object} tx Cliente de la transacción de Prisma en curso.
 * @param {object} datos Origen, destino, año destino y usuario.
 */
async function copiarDependenciasRiesgo(tx, { codigoCia, codigoEntidad, periodoOrigen, codigoOrigen,
    periodoDestino, codigoDestino, anioDestino, usuario }) {
    const origen = [codigoCia, codigoEntidad, periodoOrigen, codigoOrigen];
    const destino = [periodoDestino, codigoDestino, usuario];
    await ejecutar(`
        INSERT INTO gestion_riesgos.riesgos_riesgo_evento
            (CODIGO_CIA, CODIGO_ENTIDAD, CODIGO_PERIODO, CODIGO_RIESGO, DESCRIPCION, ORDEN, ACTIVO, USUARIO_CREACION)
        SELECT CODIGO_CIA, CODIGO_ENTIDAD, ?, ?, DESCRIPCION, ORDEN, 1, ?
        FROM gestion_riesgos.riesgos_riesgo_evento
        WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND CODIGO_RIESGO = ? AND ACTIVO = 1
        ORDER BY ORDEN, CODIGO_EVENTO`, [...destino, ...origen], tx);

    const planes = await consultar(`SELECT CODIGO_PLAN, DESCRIPCION, PORCENTAJE_MITIGACION, ORDEN
        FROM gestion_riesgos.riesgos_plan_accion
        WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND CODIGO_RIESGO = ? AND ACTIVO = 1
        ORDER BY ORDEN, CODIGO_PLAN`, origen, tx);
    for (const plan of planes) {
        const { insertId } = await insertar(`INSERT INTO gestion_riesgos.riesgos_plan_accion
            (CODIGO_CIA, CODIGO_ENTIDAD, CODIGO_PERIODO, CODIGO_RIESGO, DESCRIPCION,
             PORCENTAJE_MITIGACION, ORDEN, CODIGO_PLAN_ANTERIOR, ACTIVO, USUARIO_CREACION)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`, [codigoCia, codigoEntidad, periodoDestino, codigoDestino,
            plan.DESCRIPCION, plan.PORCENTAJE_MITIGACION, plan.ORDEN, plan.CODIGO_PLAN, usuario], tx);
        await ejecutar(`INSERT INTO gestion_riesgos.riesgos_plan_responsable
            (CODIGO_CIA, CODIGO_PLAN, CODIGO_COLABORADOR, NOMBRE_EXTERNO, PUESTO_EXTERNO, CODIGO_FRECUENCIA,
             METODO, RECURSO, FECHA_INICIO, FECHA_FIN, ACTIVO, USUARIO_CREACION)
            SELECT CODIGO_CIA, ?, CODIGO_COLABORADOR, NOMBRE_EXTERNO, PUESTO_EXTERNO, CODIGO_FRECUENCIA, METODO, RECURSO,
                TIMESTAMPADD(YEAR, ? - YEAR(FECHA_INICIO), FECHA_INICIO), TIMESTAMPADD(YEAR, ? - YEAR(FECHA_FIN), FECHA_FIN), 1, ?
            FROM gestion_riesgos.riesgos_plan_responsable WHERE CODIGO_CIA = ? AND CODIGO_PLAN = ? AND ACTIVO = 1
            ORDER BY CODIGO_RESPONSABLE_PLAN`, [insertId, anioDestino, anioDestino, usuario, codigoCia, plan.CODIGO_PLAN], tx);
    }

    await ejecutar(`INSERT INTO gestion_riesgos.riesgos_riesgo_vinculo
        (CODIGO_CIA, CODIGO_ENTIDAD, CODIGO_PERIODO, CODIGO_RIESGO, CODIGO_ENTIDAD_VINCULADA, CODIGO_AREA_VINCULADA, ACTIVO, USUARIO_CREACION)
        SELECT CODIGO_CIA, CODIGO_ENTIDAD, ?, ?, CODIGO_ENTIDAD_VINCULADA, CODIGO_AREA_VINCULADA, 1, ?
        FROM gestion_riesgos.riesgos_riesgo_vinculo
        WHERE CODIGO_CIA = ? AND CODIGO_ENTIDAD = ? AND CODIGO_PERIODO = ? AND CODIGO_RIESGO = ? AND ACTIVO = 1
        ORDER BY CODIGO_VINCULO`, [...destino, ...origen], tx);
}

module.exports = { copiarDependenciasRiesgo };
