/**
 * @fileoverview
 * Dependencias: listado, consulta, creación y actualización.
 *
 * @module Controller/riesgos/dependencias
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');

  /**
   * obtenerDependencias
   * 
   * Lista dependencias (áreas) activas para `codigo_cia`.
   *
   * - Ejecuta SELECT con filtros por CIA y estado.
   *
   * @route GET /
   * @returns {200|500} `{result:[...]}`.
   */
exports.obtenerDependencias = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const conn = await getConnection();
    try {

        const sql = `
        SELECT 
            codigo_area, descripcion, abreviatura
        FROM
            riesgos_area
        WHERE 
            CODIGO_CIA = :codigo_cia
            AND estado = 1
            `;
        const binds = {
            codigo_cia
        };
        let result = await conn.execute(sql, binds);
        res.send({ result: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: "An error occurred" });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (clErr) {
                console.warn('Cerrar conexión falló:', clErr);
            }
        }
    }
}

  /**
   * obtenerAreaUnica
   * 
   * Obtiene una dependencia específica por `area` y `codigo_cia`.
   * 
   * - Devuelve un área específica por `area` y `codigo_cia`.
   * 
   * @route GET /obtener-area
   */
exports.obtenerAreaUnica = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const { area } = req.query
    const conn = await getConnection();
    try {

        const sql = `
        SELECT 
            codigo_area, descripcion, abreviatura
        FROM
            riesgos_area
        WHERE 
            CODIGO_CIA = :codigo_cia
            AND codigo_area = :area
            `;
        const binds = {
            codigo_cia,
            area
        };
        let result = await conn.execute(sql, binds);
        res.send({ result: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: "An error occurred" });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (clErr) {
                console.warn('Cerrar conexión falló:', clErr);
            }
        }
    }
}

  /**
   * crearAreas
   * 
   * Crea una nueva área para la institución.
   * 
   * @route POST /
   */
exports.crearAreas = async (req, res) => {
    const { descripcion, abreviatura } = req.body;
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;

    const conn = await getConnection();

    try {
        if (!descripcion || !abreviatura) {
            return res.status(400).json({ error: "Faltan campos requeridos" });
        }

        const getMaxSQL = `
            SELECT NVL(MAX(CODIGO_AREA), 0) + 1 AS NUEVO_CODIGO
            FROM RIESGOS_AREA
            WHERE CODIGO_CIA = :codigo_cia
        `;
        const resultMax = await conn.execute(getMaxSQL, { codigo_cia });
        const codigo_area = resultMax.rows[0].NUEVO_CODIGO;

        const insertSQL = `
            INSERT INTO RIESGOS_AREA (
                CODIGO_CIA, CODIGO_AREA, DESCRIPCION, ABREVIATURA, ESTADO,
                USUARIO_CREACION, FECHA_CREACION
            ) VALUES (
                :codigo_cia, :codigo_area, :descripcion, :abreviatura, 1,
                :usuario_creacion, SYSDATE
            )
        `;

        const binds = {
            codigo_cia,
            codigo_area,
            descripcion,
            abreviatura,
            usuario_creacion: usuario
        };

        await conn.execute(insertSQL, binds, { autoCommit: true });

        res.status(201).json({ mensaje: "Área creada correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al crear el área" });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (clErr) {
                console.warn('Cerrar conexión falló:', clErr);
            }
        }
    }
};

  /**
   * actualizarAreas
   * 
   * Actualiza los datos de un área.
   * 
   * @route PUT /
   */
exports.actualizarAreas = async (req, res) => {
    const { descripcion, abreviatura, id } = req.body;
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;

    const conn = await getConnection();

    try {
        if (!descripcion || !abreviatura || !id) {
            return res.status(400).json({ error: "Faltan campos requeridos" });
        }

        const updateSQL = `
            UPDATE RIESGOS_AREA
            SET
                DESCRIPCION = :descripcion,
                ABREVIATURA = :abreviatura,
                USUARIO_MODIFICACION = :usuario_modificacion,
                FECHA_MODIFICACION = SYSDATE
            WHERE
                CODIGO_CIA = :codigo_cia AND
                CODIGO_AREA = :codigo_area
        `;

        const binds = {
            codigo_cia,
            codigo_area: parseInt(id),
            descripcion,
            abreviatura,
            usuario_modificacion: usuario
        };

        const result = await conn.execute(updateSQL, binds, { autoCommit: true });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: "Área no encontrada" });
        }

        res.json({ mensaje: "Área actualizada correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar el área" });
    } finally {
        if (conn) {
            try { await conn.close(); } catch (clErr) {
                console.warn('Cerrar conexión falló:', clErr);
            }
        }
    }
};