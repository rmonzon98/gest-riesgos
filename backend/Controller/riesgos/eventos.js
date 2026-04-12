/**
 * @fileoverview
 * Gestión de eventos de riesgo: consulta de eventos por riesgo, creación y actualización.
 *
 * @module Controller/riesgos/eventos
 * @version 1.0
 * @author Equipo de Desarrollo
 * 
 */

const pool = require('../../bd/mySQLConnection');

  /**
   * obtenerEventos
   * 
   * Lista eventos de un riesgo (por período/área/riesgo y opcionalmente entidad) con conteo de monitoreos.
   *
   * - Construye un LEFT JOIN a una subconsulta que agrega cantidad de monitoreos por evento.
   * - Devuelve `TIENE_MONITOREOS` como booleano.
   *
   * @route GET /riesgos/eventos?periodo=AAAA&area=N&codigoRiesgo=N[&codigo_entidad=N]
   * @returns {200|400|500} `{eventos:[...]}`.
   */
exports.obtenerEventos = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad = req.codigo_entidad ?? req.query?.codigo_entidad;
    const CODIGO_PERIODO = Number(req.query?.periodo);
    const CODIGO_AREA = Number(req.query?.area);
    const CODIGO_RIESGO = Number(req.query?.codigoRiesgo);

    if (!codigo_cia || !CODIGO_PERIODO || !CODIGO_AREA || !CODIGO_RIESGO) {
        return res.status(400).json({ error: 'Faltan parámetros' });
    }

    const hasEntidad = codigo_entidad != null && !Number.isNaN(Number(codigo_entidad));

    try {
        const sql = `
      SELECT 
        re.CODIGO_EVENTO,
        re.SUB_TEMA,
        re.CONTROL_IMPL,
        IFNULL(m.CANT, 0) AS TOTAL_MONITOREOS,
        CASE WHEN IFNULL(m.CANT, 0) > 0 THEN 1 ELSE 0 END AS TIENE_MONITOREOS
      FROM gestion_riesgos.riesgos_evento re
      LEFT JOIN (
        SELECT 
          CODIGO_CIA,
          ${hasEntidad ? 'CODIGO_ENTIDAD,' : ''}
          CODIGO_PERIODO, CODIGO_AREA, CODIGO_RIESGO, CODIGO_EVENTO,
          COUNT(*) AS CANT
        FROM gestion_riesgos.riesgos_monitoreo
        WHERE CODIGO_CIA     = ?
          AND CODIGO_PERIODO = ?
          AND CODIGO_AREA    = ?
          AND CODIGO_RIESGO  = ?
          ${hasEntidad ? 'AND CODIGO_ENTIDAD = ?' : ''}
        GROUP BY CODIGO_CIA, ${hasEntidad ? 'CODIGO_ENTIDAD,' : ''} CODIGO_PERIODO, CODIGO_AREA, CODIGO_RIESGO, CODIGO_EVENTO
      ) m
        ON  m.CODIGO_CIA     = re.CODIGO_CIA
        AND m.CODIGO_PERIODO = re.CODIGO_PERIODO
        AND m.CODIGO_AREA    = re.CODIGO_AREA
        AND m.CODIGO_RIESGO  = re.CODIGO_RIESGO
        AND m.CODIGO_EVENTO  = re.CODIGO_EVENTO
        ${hasEntidad ? 'AND m.CODIGO_ENTIDAD = re.CODIGO_ENTIDAD' : ''}
      WHERE re.CODIGO_CIA     = ?
        AND re.CODIGO_PERIODO = ?
        AND re.CODIGO_AREA    = ?
        AND re.CODIGO_RIESGO  = ?
        ${hasEntidad ? 'AND re.CODIGO_ENTIDAD = ?' : ''}
      ORDER BY re.CODIGO_EVENTO
    `;

        const params = [
            codigo_cia, CODIGO_PERIODO, CODIGO_AREA, CODIGO_RIESGO,
            ...(hasEntidad ? [Number(codigo_entidad)] : []),
            codigo_cia, CODIGO_PERIODO, CODIGO_AREA, CODIGO_RIESGO,
            ...(hasEntidad ? [Number(codigo_entidad)] : []),
        ];

        const [rows] = await pool.execute(sql, params);

        const eventos = rows.map(r => ({
            ...r,
            TIENE_MONITOREOS: !!Number(r.TIENE_MONITOREOS),
        }));

        return res.json({ eventos });
    } catch (err) {
        console.error('obtenerEventos:', err);
        return res.status(500).json({ error: 'Error al obtener eventos' });
    }
};

  /**
   * crearEvento
   * 
   * Crea un evento para un riesgo dado (consecutivo por CIA/[Entidad]/Período/Área/Riesgo).
   *
   * - Calcula el siguiente `CODIGO_EVENTO` con `FOR UPDATE`.
   * - Inserta con subtema y control implementado.
   *
   * @route POST /riesgos/eventos
   * @returns {201|400|500} `{message, codigoEvento}`.
   */
exports.crearEvento = async (req, res) => {
    const b = req.body || {};
    const cia = req.codigo_cia;
    const entidad = req.codigo_entidad; 
    const usuario = req.userId;

    for (const k of ['periodo', 'area', 'codigoRiesgo']) {
        if (!b[k]) return res.status(400).json({ error: `Falta ${k}` });
    }

    const p = Number(b.periodo);
    const a = Number(b.area);
    const r = Number(b.codigoRiesgo);
    const hasEntidad = entidad != null && !Number.isNaN(Number(entidad));

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const selNextSQL = `
        SELECT 
            COALESCE(MAX(CODIGO_EVENTO), 0) + 1 AS NEXTVAL
        FROM 
            gestion_riesgos.riesgos_evento
        WHERE 
            CODIGO_CIA = ?
            ${hasEntidad ? 'AND CODIGO_ENTIDAD = ?' : ''}
            AND CODIGO_PERIODO = ?
            AND CODIGO_AREA    = ?
            AND CODIGO_RIESGO  = ?
        FOR UPDATE
    `;
        const selParams = hasEntidad
            ? [cia, Number(entidad), p, a, r]
            : [cia, p, a, r];

        const [[row]] = await conn.execute(selNextSQL, selParams);
        const codigoEvento = Number(row?.NEXTVAL || 1);

        const cols = `
        CODIGO_CIA${hasEntidad ? ', CODIGO_ENTIDAD' : ''},
        CODIGO_PERIODO, CODIGO_AREA, CODIGO_RIESGO, CODIGO_EVENTO,
        SUB_TEMA, CONTROL_IMPL,
        USUARIO_CREACION, FECHA_CREACION
     `;
        const vals = `
        ?${hasEntidad ? ', ?' : ''},
        ?, ?, ?, ?,
        ?, ?,
        ?, CURRENT_TIMESTAMP
    `;
        const insSQL = `
      INSERT INTO gestion_riesgos.riesgos_evento (${cols})
      VALUES (${vals})
    `;
        const insParams = hasEntidad
            ? [
                cia, Number(entidad),
                p, a, r, codigoEvento,
                b.subTema ?? null, b.controlImpl ?? null,
                usuario
            ]
            : [
                cia,
                p, a, r, codigoEvento,
                b.subTema ?? null, b.severidad != null ? Number(b.severidad) : null, b.controlImpl ?? null,
                usuario
            ];
        await conn.execute(insSQL, insParams);
        await conn.commit();

        return res.status(201).json({ message: 'Evento creado', codigoEvento });
    } catch (err) {
        try { await conn?.rollback(); } catch { }
        console.error('crearEvento:', err);
        return res.status(500).json({ error: err.message || 'Error al crear evento' });
    } finally {
        conn?.release();
    }
};

  /**
   * actualizarEvento
   * 
   * Actualiza campos editables de un evento (subtema/control implementado).
   *
   * - Valida llaves (CIA, periodo, área, riesgo, evento) y ejecuta UPDATE con auditoría.
   *
   * @route PUT /riesgos/eventos
   * @returns {200|400|404|500} `{message}`.
   */
exports.actualizarEvento = async (req, res) => {
    const cia = req.codigo_cia;
    const entidad = req.codigo_entidad ?? req.body?.codigo_entidad;
    const usuario = req.userId;

    const {
        periodo,
        area,
        codigoRiesgo,
        codigoEvento,
        subTema,
        controlImpl,
    } = req.body || {};

    if (!cia || !periodo || !area || !codigoRiesgo || !codigoEvento
        || subTema == null || controlImpl == null) {
        return res.status(400).json({ error: 'Faltan llaves para actualizar' });
    }

    const hasEntidad = entidad != null && !Number.isNaN(Number(entidad));

    try {
        const sql = `
      UPDATE gestion_riesgos.riesgos_evento
         SET 
            SUB_TEMA = ?,
            CONTROL_IMPL = ?,
            USUARIO_MODIFICACION = ?,
            FECHA_MODIFICACION = CURRENT_TIMESTAMP
       WHERE CODIGO_CIA = ?
         ${hasEntidad ? 'AND CODIGO_ENTIDAD = ?' : ''}
         AND CODIGO_PERIODO = ?
         AND CODIGO_AREA = ?
         AND CODIGO_RIESGO = ?
         AND CODIGO_EVENTO = ?
       LIMIT 1
    `;

        const params = [
            subTema ?? null,
            controlImpl ?? null,
            usuario,
            cia,
            ...(hasEntidad ? [Number(entidad)] : []),
            Number(periodo),
            Number(area),
            Number(codigoRiesgo),
            Number(codigoEvento),
        ];

        const [result] = await pool.execute(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No se encontró el evento' });
        }
        return res.json({ message: 'Evento actualizado' });
    } catch (err) {
        console.error('actualizarEvento:', err);
        return res.status(500).json({ error: 'Error al actualizar evento' });
    }
};