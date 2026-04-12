/**
 * @fileoverview
 * Controlador de períodos anuales utilizados para la planificación y evaluación de riesgos.
 *
 * @module controller/riesgos/periodos
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

/**
 * obtenerPeriodos
 * 
 * Lista los períodos activos registrados para la institución del usuario.
 *
 * - Valida que exista `codigo_cia` en la petición.
 * - Ejecuta un SELECT ordenando por `CODIGO_PERIODO` (generalmente el año).
 * - Devuelve fechas inicial y final formateadas como `YYYY-MM-DD`.
 *
 * @route GET /
 * @returns {200|400|500} Lista `{result:[{CODIGO_PERIODO, PERIODO_INICIAL, PERIODO_FINAL}]}` o mensaje de error.
 */
exports.obtenerPeriodos = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    if (!codigo_cia) return res.status(400).json({ error: 'Falta codigo_cia' });

    try {
        const sql = `
      SELECT 
        CODIGO_PERIODO,
        DATE_FORMAT(PERIODO_INICIAL, '%Y-%m-%d') AS PERIODO_INICIAL,
        DATE_FORMAT(PERIODO_FINAL,   '%Y-%m-%d') AS PERIODO_FINAL
      FROM gestion_riesgos.riesgos_periodo
      WHERE CODIGO_CIA = ? AND ACTIVO = 1
      ORDER BY CODIGO_PERIODO ASC
    `;
        const [rows] = await pool.execute(sql, [codigo_cia]);
        return res.json({ result: rows });
    } catch (err) {
        console.error('obtenerPeriodos:', err);
        return res.status(500).json({ error: 'Error al obtener periodos' });
    }
};

/**
 * obtenerPeriodoUnico
 * 
 * Obtiene la información de un período específico identificado por su código.
 *
 * - Valida que vengan `codigo_cia` y el código de período en la request.
 * - Ejecuta un SELECT por llave (`CODIGO_CIA`, `CODIGO_PERIODO`).
 * - Devuelve un solo registro con fechas inicial y final.
 *
 * @route GET /obtener-periodo
 * @returns {200|400|404|500} `{result:[{CODIGO_PERIODO, PERIODO_INICIAL, PERIODO_FINAL}]}` o mensaje de error.
 */
exports.obtenerPeriodoUnico = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo = req.query?.codigo ?? req.params?.codigo;
    if (!codigo_cia || !codigo) {
        return res.status(400).json({ error: 'Faltan codigo_cia o codigo' });
    }

    try {
        const sql = `
      SELECT 
        CODIGO_PERIODO,
        DATE_FORMAT(PERIODO_INICIAL, '%Y-%m-%d') AS PERIODO_INICIAL,
        DATE_FORMAT(PERIODO_FINAL,   '%Y-%m-%d') AS PERIODO_FINAL
      FROM gestion_riesgos.riesgos_periodo
      WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
      LIMIT 1
    `;
        const [rows] = await pool.execute(sql, [codigo_cia, codigo]);
        if (!rows.length) return res.status(404).json({ error: 'Periodo no encontrado' });
        return res.json({ result: rows });
    } catch (err) {
        console.error('obtenerPeriodoUnico:', err);
        return res.status(500).json({ error: 'Error al obtener periodo' });
    }
};

/**
 * crearPeriodo
 * 
 * Crea un nuevo período anual a partir de las fechas recibidas en el cuerpo de la petición.
 *
 * - Valida que existan `inicio` y `final` y que pertenecen al mismo año.
 * - Usa el año de las fechas como `CODIGO_PERIODO` (p. ej. 2025).
 * - Inserta el período como activo, registrando usuario y fecha de creación.
 * - Maneja el error de duplicado cuando ya existe un período para ese año.
 *
 * @route POST /
 * @returns {201|400|409|500} Mensaje de confirmación o detalle del error.
 */
exports.crearPeriodo = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;
    const { inicio, final } = req.body;

    if (!codigo_cia || !inicio || !final) {
        return res.status(400).json({ error: 'Debe completar ambas fechas' });
    }

    const yIni = Number(String(inicio).slice(0, 4));
    const yFin = Number(String(final).slice(0, 4));
    if (Number.isNaN(yIni) || Number.isNaN(yFin)) {
        return res.status(400).json({ error: 'Formato de fecha inválido (esperado YYYY-MM-DD)' });
    }
    if (yIni !== yFin) {
        return res.status(400).json({ error: 'Las fechas deben pertenecer al mismo año' });
    }
    
    if (new Date(inicio) > new Date(final)) {
        return res.status(400).json({ error: 'La fecha final no puede ser anterior a la inicial' });
    }

    const codigo_periodo = yIni;

    try {
        const sql = `
      INSERT INTO gestion_riesgos.riesgos_periodo (
        CODIGO_CIA, CODIGO_PERIODO, PERIODO_INICIAL, PERIODO_FINAL,
        ACTIVO, USUARIO_CREACION, FECHA_CREACION
      ) VALUES (
        ?, ?, STR_TO_DATE(?, '%Y-%m-%d'), STR_TO_DATE(?, '%Y-%m-%d'),
        1, ?, CURRENT_TIMESTAMP
      )
    `;
        const params = [codigo_cia, codigo_periodo, inicio, final, usuario ?? null];

        await pool.execute(sql, params);
        return res.status(201).json({ mensaje: 'Periodo creado correctamente' });
    } catch (err) {
        if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
            return res.status(409).json({ error: 'Ya existe un periodo para ese año' });
        }
        console.error('crearPeriodo:', err);
        return res.status(500).json({ error: 'Error al crear periodo' });
    }
};

/**
 * actualizarPeriodo
 * 
 * Actualiza las fechas de un período existente.
 *
 * - Valida presencia de `codigo`, `inicio` y `final`.
 * - Verifica que las fechas sean coherentes (la final no puede ser menor que la inicial).
 * - Actualiza las columnas de fecha y auditoría (usuario y fecha de modificación).
 * - Notifica si el período no existe para la compañía.
 *
 * @route PUT /
 * @returns {200|400|404|500} Mensaje de confirmación o error.
 */
exports.actualizarPeriodo = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;
    const { codigo, inicio, final } = req.body;

    if (!codigo_cia || !codigo || !inicio || !final) {
        return res.status(400).json({ error: 'Debe completar código y ambas fechas' });
    }

    const yIni = Number(String(inicio).slice(0, 4));
    const yFin = Number(String(final).slice(0, 4));
    if (Number.isNaN(yIni) || Number.isNaN(yFin)) {
        return res.status(400).json({ error: 'Formato de fecha inválido (esperado YYYY-MM-DD)' });
    }
    if (yIni !== yFin || Number(codigo) !== yIni) {
        return res.status(400).json({ error: 'El código y las fechas deben pertenecer al mismo año' });
    }
    if (new Date(inicio) > new Date(final)) {
        return res.status(400).json({ error: 'La fecha final no puede ser anterior a la inicial' });
    }

    try {
        const sql = `
      UPDATE gestion_riesgos.riesgos_periodo
         SET PERIODO_INICIAL      = STR_TO_DATE(?, '%Y-%m-%d'),
             PERIODO_FINAL        = STR_TO_DATE(?, '%Y-%m-%d'),
             USUARIO_MODIFICACION = ?,
             FECHA_MODIFICACION   = CURRENT_TIMESTAMP
       WHERE CODIGO_CIA = ? AND CODIGO_PERIODO = ?
    `;
        const params = [inicio, final, usuario ?? null, codigo_cia, Number(codigo)];

        const [result] = await pool.execute(sql, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Periodo no encontrado' });
        }

        return res.json({ mensaje: 'Periodo actualizado correctamente' });
    } catch (err) {
        console.error('actualizarPeriodo:', err);
        return res.status(500).json({ error: 'Error al actualizar periodo' });
    }
};