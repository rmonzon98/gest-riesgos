/**
 * @fileoverview 
 * Gestión de responsables/colaboradores: creación, actualización, listados, estado y contraseñas.
 *
 * @module Controller/general/responsables
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const pool = require('../../bd/mySQLConnection');
const sha1 = require('sha-1')
const { sendEmail } = require('./../../services/mail')

/**
 * Deriva una contraseña inicial a partir del correo (parte local antes de @).
 * @param {string} email
 * @returns {{contrasena:string, visible:string}} Hash (sha1) y valor visible
 */
const obtenerContrasenaCorreo = (email) => {
    const password = email.split('@')[0]
    return { contrasena: sha1(password), visible: password }
}

/**
 * Genera una contraseña aleatoria alfanumérica y retorna hash y visible.
 * @param {number} [longitud=16]
 * @returns {{contrasena:string, visible:string}}
 */
function generarContrasena(longitud = 16) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let contrasena = '';

    for (let i = 0; i < longitud; i++) {
        const randomIndex = Math.floor(Math.random() * caracteres.length);
        contrasena += caracteres[randomIndex];
    }

    return { contrasena: sha1(contrasena), visible: contrasena };
}

/**
 * actualizarContrasena
 *
 * Restablece la contraseña de un usuario por correo (flujo self-service).
 *
 * - Valida `correo`.
 * - Genera nueva contraseña (hash + visible), actualiza en DB y envía correo.
 * - Respuestas: 400 si falta correo, 404 si no existe, 200 si actualiza y envía.
 *
 * @route PUT /actualizar-contrasena
 * @param {import('express').Request} req Body: { correo:string }
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.actualizarContrasena = async (req, res) => {
    const { correo } = req.body;
    const contrasena = generarContrasena(16)
    if (!correo) {
        return res.status(400).json({ ok: false, msg: 'Debe proporcionar un correo electrónico.' });
    }
    try {
        const contrasena = generarContrasena(16)


        const sql = `
        UPDATE seguridad.seguridad_persona
        SET CONTRASENA = ?, FECHA_MODIFICACION = NOW()
        WHERE CORREO_ELECTRONICO = ?
        `;
        const [result] = await pool.execute(sql, [contrasena.contrasena, correo]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ ok: false, msg: 'No se encontró un usuario con ese correo electrónico.' });
        }

        const r = await sendEmail(
            correo,
            'Cambio de contraseña',
            `<h1>Recuperación de contraseña</h1>

<p>Estimado(a) usuario(a),</p>

<p>Hemos recibido una solicitud para restablecer la contraseña asociada a su cuenta.</p>

<p>Por favor, utilice la siguiente credencial temporal para acceder nuevamente:</p>

<p><b>Nueva contraseña:</b> ${contrasena.visible}</p>

<p>Le recomendamos cambiar esta contraseña una vez haya iniciado sesión, con el fin de mantener la seguridad de su cuenta.</p>

<p>Si usted no solicitó esta recuperación, por favor ignore este mensaje o comuníquese con el equipo de soporte técnico.</p>

<p>Atentamente,<br>
<b>Equipo de Recuperación de Cuentas</b></p>
`
        );
        res.json({
            ok: true,
            msg: 'Contraseña actualizada y correo enviado correctamente.',
        });
    } catch (err) {
        console.error('Error en actualizarContrasenaAdmin:', err);
        res.status(500).json({ ok: false, msg: 'Error interno al actualizar la contraseña.' });
    }
};

/**
 * obtenerSuperior
 *
 * Devuelve el superior (nombre y puesto) del colaborador autenticado.
 *
 * - `SELECT ... FROM gestion_riesgos.riesgos_colaborador_superior WHERE CODIGO_CIA=? AND CODIGO_COLABORADOR=?`
 * - 404 si no existe, 200 con `{ data }` si existe.
 *
 * @Route GET /obtener-superior
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.obtenerSuperior = async (req, res) => {
    try {
        const sql = `
        SELECT NOMBRE_SUPERIOR, PUESTO_SUPERIOR
        FROM gestion_riesgos.riesgos_colaborador_superior
        WHERE CODIGO_CIA = ? AND CODIGO_COLABORADOR = ?
        LIMIT 1
        `;
        const [rows] = await pool.execute(sql, [req.codigo_cia, req.userId]);
        if (!rows.length) return res.status(404).json({ error: 'Superior no encontrado' });
        return res.json({ data: rows[0] });
    } catch (error) {
        console.error('miUnidad:', error);
        return res.status(500).json({ error: 'Error Superior no encontrado.' });
    }
};

/**
 * miUnidad
 *
 * Devuelve información de la unidad/entidad del colaborador actual.
 *
 * - Valida `codigo_cia` y `codigo_entidad` (req, query o params).
 * - Ejecuta `SELECT NOMBRE,SIGLAS FROM seguridad.seguridad_entidad WHERE ...`.
 *
 * @Route GET /obtener-mi-unidad
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.miUnidad = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_entidad =
        req.codigo_entidad ?? req.query?.codigo_entidad ?? req.params?.codigo_entidad;

    if (!codigo_cia || !codigo_entidad) {
        return res.status(400).json({ error: 'Faltan codigo_cia o codigo_entidad' });
    }

    try {
        const sql = `
        SELECT 
            NOMBRE, SIGLAS
        FROM 
            seguridad.seguridad_entidad
        WHERE 
            CODIGO_CIA = ? AND CODIGO_ENTIDAD = ?
        LIMIT 1
        `;
        const [rows] = await pool.execute(sql, [codigo_cia, Number(codigo_entidad)]);
        if (!rows.length) return res.status(404).json({ error: 'Unidad no encontrada' });

        return res.json({ data: rows[0] });
    } catch (error) {
        console.error('miUnidad:', error);
        return res.status(500).json({ error: 'Error al obtener unidad' });
    }
};

/**
 * obtenerPersonasPorEmpresa
 *
 * Lista colaboradores activos/vigentes de la compañía.
 *
 * - `SELECT ... FROM seguridad_persona LEFT JOIN seguridad_entidad ... WHERE sp.CODIGO_CIA=? AND sp.ACTIVO!=0`
 * - Mapea nombres y atributos a un objeto plano y responde `{ data }`.
 *
 * @route GET /
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.obtenerPersonasPorEmpresa = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    if (!codigo_cia) return res.status(400).json({ error: 'Falta codigo_cia' });

    try {
        const sql = `
        SELECT
            sp.CODIGO_COLABORADOR,
            sp.CODIGO_ENTIDAD,
            sp.PRIMER_NOMBRE,
            sp.SEGUNDO_NOMBRE,
            sp.TERCER_NOMBRE,
            sp.PRIMER_APELLIDO,
            sp.SEGUNDO_APELLIDO,
            sp.TERCER_APELLIDO,
            se.NOMBRE                          AS UNIDAD,
            sp.correo_electronico,
            sp.activo,
            sp.vigente
        FROM 
            seguridad.seguridad_persona sp
        LEFT JOIN 
            seguridad.seguridad_entidad se
        ON  
            sp.CODIGO_CIA    = se.CODIGO_CIA
            AND sp.CODIGO_ENTIDAD = se.CODIGO_ENTIDAD
        WHERE 
            sp.CODIGO_CIA = ?
            AND sp.ACTIVO != 0
        ORDER BY sp.activo DESC, sp.PRIMER_NOMBRE, sp.PRIMER_APELLIDO
        `;

        const [rows] = await pool.execute(sql, [codigo_cia]);

        const personas = rows.map(p => {
            const nombres = [
                p.PRIMER_NOMBRE,
                p.SEGUNDO_NOMBRE,
                p.TERCER_NOMBRE,
                p.PRIMER_APELLIDO,
                p.SEGUNDO_APELLIDO,
                p.TERCER_APELLIDO
            ].filter(Boolean).join(' ');

            return {
                codigo_colaborador: p.CODIGO_COLABORADOR,
                nombre_completo: nombres,
                codigo_entidad: p.CODIGO_ENTIDAD,
                unidad: p.UNIDAD || null,
                correo: p.correo_electronico,
                activo: Number(p.activo),
                vigente: Number(p.vigente)
            };
        });

        return res.json({ data: personas });
    } catch (error) {
        console.error('Error al obtener personas:', error);
        return res.status(500).json({ error: 'Error al obtener personas' });
    }
};

/**
 * obtenerResponsableUnico
 *
 * Devuelve datos de un colaborador por `codigo` (id) con su superior si existe.
 *
 * - LEFT JOIN entre `seguridad_persona` y `riesgos_colaborador_superior`.
 *
 * @Route GET /obtener-responsable
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.obtenerResponsableUnico = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const { codigo } = req.query;
    try {
        const [rows] = await pool.execute(`
            SELECT
                a.CODIGO_COLABORADOR, a.PRIMER_NOMBRE, 
                a.SEGUNDO_NOMBRE, a.TERCER_NOMBRE,
                a.PRIMER_APELLIDO, a.SEGUNDO_APELLIDO, 
                a.TERCER_APELLIDO, a.CORREO_ELECTRONICO, 
                a.CODIGO_ENTIDAD, b.NOMBRE_SUPERIOR,
                b.PUESTO_SUPERIOR
            FROM seguridad.seguridad_persona a
            LEFT JOIN gestion_riesgos.riesgos_colaborador_superior b
            ON a.codigo_cia = b.codigo_cia AND a.codigo_colaborador = b.codigo_colaborador
            WHERE a.CODIGO_CIA = ? AND a.CODIGO_COLABORADOR = ?
        `, [codigo_cia, codigo]);

        res.json({ data: rows[0] });
    } catch (error) {
        console.error('Error al obtener información de persona:', error);
        return res.status(500).json({ error: 'Error al obtener información de persona.' });
    }
};

/**
 * cambiarVigente
 *
 * Cambia flag `vigente` (1/0) de un colaborador.
 *
 * - Valida `codigo_cia` y `codigo_colaborador`.
 * - `UPDATE seguridad_persona SET vigente=?, USUARIO_MODIFICACION=?, FECHA_MODIFICACION=...`
 *
 * @Route PUT /cambiar-vigente
 * @param {import('express').Request} req Body: { codigo_colaborador:number, valor:0|1 }
 * @param {import('express').Response} res
 */
exports.cambiarVigente = async (req, res) => {
    const { codigo_colaborador, valor } = req.body;

    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;

    if (!codigo_cia || !codigo_colaborador) {
        return res.status(400).json({ error: 'Faltan codigo_cia o codigo_colaborador' });
    }

    try {
        const sql = `
        UPDATE seguridad.seguridad_persona
        SET 
            vigente               = ?,
            USUARIO_MODIFICACION  = ?,
            FECHA_MODIFICACION    = CURRENT_TIMESTAMP
       WHERE CODIGO_CIA = ? AND CODIGO_COLABORADOR = ?
    `;

        const params = [valor, usuario, codigo_cia, codigo_colaborador];

        const [result] = await pool.execute(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Colaborador no encontrado' });
        }

        return res.json({ mensaje: 'Colaborador actualizado correctamente' });

    } catch (error) {
        console.error('Error al actualizar colaborador:', error);
        return res.status(500).json({ error: 'Error al actualizar colaborador' });
    }
};

/**
 * cambiarActivo
 *
 * Cambia flag `activo` (1/0) de un colaborador.
 *
 * @Route PUT /cambiar-activo
 * @param {import('express').Request} req Body: { codigo_colaborador:number, valor:0|1 }
 * @param {import('express').Response} res
 */
exports.cambiarActivo = async (req, res) => {
    const { codigo_colaborador, valor } = req.body;

    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;

    if (!codigo_cia || !codigo_colaborador) {
        return res.status(400).json({ error: 'Faltan codigo_cia o codigo_colaborador' });
    }

    try {
        const sql = `
        UPDATE seguridad.seguridad_persona
        SET 
            activo                = ?,
            USUARIO_MODIFICACION  = ?,
            FECHA_MODIFICACION    = CURRENT_TIMESTAMP
       WHERE CODIGO_CIA = ? AND CODIGO_COLABORADOR = ?
    `;

        const params = [valor, usuario, codigo_cia, codigo_colaborador];

        const [result] = await pool.execute(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Colaborador no encontrado' });
        }

        return res.json({ mensaje: 'Colaborador actualizado correctamente' });

    } catch (error) {
        console.error('Error al actualizar colaborador:', error);
        return res.status(500).json({ error: 'Error al actualizar colaborador' });
    }
};

/**
 * actualizarContrasenaAdmin
 *
 * Restablece la contraseña de un usuario por correo (flujo administrado).
 *
 * - Genera nueva contraseña, actualiza y envía correo de notificación.
 *
 * @route PUT /actualizar-contrasena-admin
 * @param {import('express').Request} req Body: { correo:string }
 * @param {import('express').Response} res
 */
exports.actualizarContrasenaAdmin = async (req, res) => {
    const { correo } = req.body;

    if (!correo) {
        return res.status(400).json({ ok: false, msg: 'Debe proporcionar un correo electrónico.' });
    }
    try {
        const contrasena = generarContrasena(16)


        const sql = `
        UPDATE seguridad.seguridad_persona
        SET CONTRASENA = ?, FECHA_MODIFICACION = NOW()
        WHERE CORREO_ELECTRONICO = ?
        `;
        const [result] = await pool.execute(sql, [contrasena.contrasena, correo]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ ok: false, msg: 'No se encontró un usuario con ese correo electrónico.' });
        }

        const r = await sendEmail(
            correo,
            'Cambio de contraseña',
            `<h1>Restablecimiento de contraseña</h1>

<p>Estimado(a) usuario(a),</p>

<p>Le informamos que su contraseña ha sido restablecida por el área de administración.</p>

<p>Por favor, utilice la siguiente credencial temporal para acceder a su cuenta:</p>

<p><b>Nueva contraseña:</b> ${contrasena.visible}</p>

<p>Por motivos de seguridad, le recomendamos cambiar esta contraseña una vez haya iniciado sesión.</p>

<p>Si usted no solicitó este cambio o considera que se trata de un error, comuníquese de inmediato con el equipo de soporte técnico.</p>

<p>Atentamente,<br>
<b>Departamento de Administración de Sistemas</b></p>`
        );
        res.json({
            ok: true,
            msg: 'Contraseña actualizada y correo enviado correctamente.',
        });
    } catch (err) {
        console.error('Error en actualizarContrasenaAdmin:', err);
        res.status(500).json({ ok: false, msg: 'Error interno al actualizar la contraseña.' });
    }
};

/**
 * obtenerPersonasPorEmpresaDireccion
 *
 * Lista colaboradores de una dirección (entidad) específica.
 *
 * @route GET /administracion-direccion
 * @param {import('express').Request} req  (usa req.codigo_entidad)
 * @param {import('express').Response} res
 */
exports.obtenerPersonasPorEmpresaDireccion = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    if (!codigo_cia) return res.status(400).json({ error: 'Falta codigo_cia' });

    try {
        const sql = `
        SELECT
            sp.CODIGO_COLABORADOR,
            sp.CODIGO_ENTIDAD,
            sp.PRIMER_NOMBRE,
            sp.SEGUNDO_NOMBRE,
            sp.TERCER_NOMBRE,
            sp.PRIMER_APELLIDO,
            sp.SEGUNDO_APELLIDO,
            sp.TERCER_APELLIDO,
            se.NOMBRE                          AS UNIDAD,
            sp.correo_electronico,
            sp.activo,
            sp.vigente
        FROM 
            seguridad.seguridad_persona sp
        LEFT JOIN 
            seguridad.seguridad_entidad se
        ON  
            sp.CODIGO_CIA    = se.CODIGO_CIA
            AND sp.CODIGO_ENTIDAD = se.CODIGO_ENTIDAD
        WHERE 
            sp.CODIGO_CIA = ?
            AND sp.codigo_entidad = ?
        ORDER BY sp.activo DESC, sp.PRIMER_NOMBRE, sp.PRIMER_APELLIDO
        `;

        const [rows] = await pool.execute(sql, [codigo_cia, req.codigo_entidad]);

        const personas = rows.map(p => {
            const nombres = [
                p.PRIMER_NOMBRE,
                p.SEGUNDO_NOMBRE,
                p.TERCER_NOMBRE,
                p.PRIMER_APELLIDO,
                p.SEGUNDO_APELLIDO,
                p.TERCER_APELLIDO
            ].filter(Boolean).join(' ');

            return {
                codigo_colaborador: p.CODIGO_COLABORADOR,
                nombre_completo: nombres,
                codigo_entidad: p.CODIGO_ENTIDAD,
                unidad: p.UNIDAD || null,
                correo: p.correo_electronico,
                activo: Number(p.activo),
                vigente: Number(p.vigente)
            };
        });

        return res.json({ data: personas });
    } catch (error) {
        console.error('Error al obtener personas:', error);
        return res.status(500).json({ error: 'Error al obtener personas' });
    }
};

/**
 * crearResponsableDireccion
 *
 * Crea colaborador asignado a la dirección de sesión (`req.codigo_entidad`).
 *
 * - Verifica duplicado por correo (LOWER).
 * - Calcula `MAX(CODIGO_COLABORADOR)+1` con `FOR UPDATE`.
 * - Inserta en `seguridad_persona` y en `riesgos_colaborador_superior`.
 *
 * @route POST /direccion
 * @param {import('express').Request} req Body: { nombres, apellidos, correo, nombre_superior, puesto_superior }
 * @param {import('express').Response} res
 */
exports.crearResponsableDireccion = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;
    const codigo_entidad = req.codigo_entidad;

    const {
        primer_nombre, segundo_nombre, tercer_nombre,
        primer_apellido, segundo_apellido, tercer_apellido,
        correo, nombre_superior, puesto_superior
    } = req.body;

    if (!codigo_cia || !primer_nombre || !primer_apellido || !correo) {
        return res.status(400).json({
            error: 'Faltan campos obligatorios (codigo_cia, primer_nombre, primer_apellido, correo)'
        });
    }

    const email = String(correo).trim().toLowerCase();

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [dups] = await conn.execute(
            `SELECT 1
         FROM seguridad.seguridad_persona
        WHERE CODIGO_CIA = ? AND LOWER(CORREO_ELECTRONICO) = ?
        LIMIT 1`,
            [codigo_cia, email]
        );
        if (dups.length) {
            await conn.rollback();
            return res.status(409).json({ error: 'El correo ya está registrado para esta empresa.' });
        }

        const [[row]] = await conn.execute(
            `SELECT COALESCE(MAX(CODIGO_COLABORADOR), 0) + 1 AS NUEVO
         FROM seguridad.seguridad_persona
        WHERE CODIGO_CIA = ?
        FOR UPDATE`,
            [codigo_cia]
        );
        const nuevo_codigo = Number(row?.NUEVO || 1);

        const { contrasena, visible } = obtenerContrasenaCorreo(email);

        await conn.execute(
            `INSERT INTO seguridad.seguridad_persona (
         CODIGO_CIA, CODIGO_COLABORADOR,
         PRIMER_NOMBRE, SEGUNDO_NOMBRE, TERCER_NOMBRE,
         PRIMER_APELLIDO, SEGUNDO_APELLIDO, TERCER_APELLIDO,
         CORREO_ELECTRONICO, CODIGO_ENTIDAD,
         CONTRASENA, ACTIVO, USUARIO_CREACION, FECHA_CREACION
       ) VALUES (
         ?, ?, ?, ?, ?,
         ?, ?, ?,
         ?, ?, 
         ?, '1', ?, CURRENT_TIMESTAMP
       )`,
            [
                codigo_cia, nuevo_codigo,
                primer_nombre ?? null, segundo_nombre ?? null, tercer_nombre ?? null,
                primer_apellido ?? null, segundo_apellido ?? null, tercer_apellido ?? null,
                email, codigo_entidad ?? null,
                contrasena, usuario ?? null
            ]
        );

        // Inserta relación con superior (tabla de gestión de riesgos)
        await conn.execute(
            `
        INSERT INTO gestion_riesgos.riesgos_colaborador_superior (
            CODIGO_CIA, CODIGO_COLABORADOR,
            nombre_superior, puesto_superior,
            ususario_creacion, fecha_creacion
        ) VALUES (
            ?, ?, 
            ?, ?, 
            ?, now()
        )`,
            [
                codigo_cia, nuevo_codigo,
                nombre_superior, puesto_superior,
                req.userId
            ]
        );

        await conn.commit();
        return res.status(201).json({
            mensaje: 'Colaborador creado correctamente',
            codigo_colaborador: nuevo_codigo,
            contra: visible
        });
    } catch (error) {
        if (conn) { try { await conn.rollback(); } catch { } }

        if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
            return res.status(409).json({ error: 'El correo ya está registrado para este sistema.' });
        }

        if (error?.code === 'PROTOCOL_SEQUENCE_TIMEOUT') {
            return res.status(408).json({ error: 'La operación tardó demasiado. Inténtalo de nuevo.' });
        }

        console.error('Error al crear colaborador:', error);
        return res.status(500).json({ error: 'Error al crear colaborador' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * actualizarResponsableDireccion
 *
 * Actualiza datos personales y su superior en el contexto de dirección.
 *
 * - `UPDATE seguridad_persona ...` y `UPDATE riesgos_colaborador_superior ...` en transacción.
 *
 * @route PUT /direccion
 * @param {import('express').Request} req Body con nombres, apellidos, correo y superior
 * @param {import('express').Response} res
 */
exports.actualizarResponsableDireccion = async (req, res) => {
    const {
        codigo_colaborador,
        primer_nombre, segundo_nombre, tercer_nombre,
        primer_apellido, segundo_apellido, tercer_apellido,
        correo, nombre_superior, puesto_superior
    } = req.body;

    const codigo_cia = req.codigo_cia;
    const codigo_entidad = req.codigo_entidad;
    const usuario = req.userId;

    if (!codigo_cia || !codigo_colaborador) {
        return res.status(400).json({ error: 'Faltan codigo_cia o codigo_colaborador' });
    }

    const email = correo ? String(correo).trim().toLowerCase() : null;

    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        const sql = `
        UPDATE seguridad.seguridad_persona
        SET 
            PRIMER_NOMBRE        = ?,
            SEGUNDO_NOMBRE       = ?,
            TERCER_NOMBRE        = ?,
            PRIMER_APELLIDO      = ?,
            SEGUNDO_APELLIDO     = ?,
            TERCER_APELLIDO      = ?,
            CORREO_ELECTRONICO   = ?,
            USUARIO_MODIFICACION = ?,
            FECHA_MODIFICACION   = CURRENT_TIMESTAMP
        WHERE CODIGO_CIA = ? AND CODIGO_COLABORADOR = ?
        `;

        const params = [
            primer_nombre ?? null, segundo_nombre ?? null, tercer_nombre ?? null,
            primer_apellido ?? null, segundo_apellido ?? null, tercer_apellido ?? null,
            email,
            usuario ?? null, codigo_cia, codigo_colaborador
        ];

        const [result] = await conn.execute(sql, params);

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Colaborador no encontrado' });
        }

        const sqlSup = `
        UPDATE gestion_riesgos.riesgos_colaborador_superior
        SET nombre_superior = ?, puesto_superior = ?, usuario_modificacion = ?, fecha_modificacion = now()
        WHERE CODIGO_CIA = ? AND CODIGO_COLABORADOR = ?
        `

        const [resultSup] = await conn.execute(sqlSup, [nombre_superior, puesto_superior, req.userId, codigo_cia, codigo_colaborador]);

        if (resultSup.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Colaborador no encontrado' });
        }
        await conn.commit();
        return res.json({ mensaje: 'Colaborador actualizado correctamente' });
    } catch (error) {
        if (conn) { try { await conn.rollback(); } catch { } }

        if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
            return res.status(409).json({ error: 'El correo ya está registrado para esta empresa.' });
        }
        console.error('Error al actualizar colaborador:', error);
        return res.status(500).json({ error: 'Error al actualizar colaborador' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * obtenerPersonasPorEmpresaAdministracion
 *
 * Lista colaboradores de toda la empresa (sin filtrar por `codigo_entidad`).
 *
 * @route GET /administracion-general
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.obtenerPersonasPorEmpresaAdministracion = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    if (!codigo_cia) return res.status(400).json({ error: 'Falta codigo_cia' });

    try {
        const sql = `
        SELECT
            sp.CODIGO_COLABORADOR,
            sp.CODIGO_ENTIDAD,
            sp.PRIMER_NOMBRE,
            sp.SEGUNDO_NOMBRE,
            sp.TERCER_NOMBRE,
            sp.PRIMER_APELLIDO,
            sp.SEGUNDO_APELLIDO,
            sp.TERCER_APELLIDO,
            se.NOMBRE                          AS UNIDAD,
            sp.correo_electronico,
            sp.activo,
            sp.vigente
        FROM 
            seguridad.seguridad_persona sp
        LEFT JOIN 
            seguridad.seguridad_entidad se
        ON  
            sp.CODIGO_CIA    = se.CODIGO_CIA
            AND sp.CODIGO_ENTIDAD = se.CODIGO_ENTIDAD
        WHERE 
            sp.CODIGO_CIA = ?
        ORDER BY sp.activo DESC, sp.PRIMER_NOMBRE, sp.PRIMER_APELLIDO
        `;

        const [rows] = await pool.execute(sql, [codigo_cia]);

        const personas = rows.map(p => {
            const nombres = [
                p.PRIMER_NOMBRE,
                p.SEGUNDO_NOMBRE,
                p.TERCER_NOMBRE,
                p.PRIMER_APELLIDO,
                p.SEGUNDO_APELLIDO,
                p.TERCER_APELLIDO
            ].filter(Boolean).join(' ');

            return {
                codigo_colaborador: p.CODIGO_COLABORADOR,
                nombre_completo: nombres,
                codigo_entidad: p.CODIGO_ENTIDAD,
                unidad: p.UNIDAD || '',
                correo: p.correo_electronico,
                activo: Number(p.activo),
                vigente: Number(p.vigente)
            };
        });

        return res.json({ data: personas });
    } catch (error) {
        console.error('Error al obtener personas:', error);
        return res.status(500).json({ error: 'Error al obtener personas' });
    }
};

/**
 * crearResponsable
 *
 * Crea colaborador (empresa en general) y su registro de superior.
 *
 * - Valida duplicado por correo, calcula correlativo, inserta en ambas tablas.
 *
 * @route POST /
 * @param {import('express').Request} req Body: datos personales, correo, codigo_entidad (opcional)
 * @param {import('express').Response} res
 */
exports.crearResponsable = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;

    const {
        primer_nombre, segundo_nombre, tercer_nombre,
        primer_apellido, segundo_apellido, tercer_apellido,
        correo, codigo_entidad, nombre_superior, puesto_superior
    } = req.body;

    if (!codigo_cia || !primer_nombre || !primer_apellido || !correo) {
        return res.status(400).json({
            error: 'Faltan campos obligatorios (codigo_cia, primer_nombre, primer_apellido, correo)'
        });
    }

    const email = String(correo).trim().toLowerCase();

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [dups] = await conn.execute(
            `
        SELECT 1
        FROM seguridad.seguridad_persona
        WHERE CODIGO_CIA = ? AND LOWER(CORREO_ELECTRONICO) = ?
        LIMIT 1`,
            [codigo_cia, email]
        );
        if (dups.length) {
            await conn.rollback();
            return res.status(409).json({ error: 'El correo ya está registrado para esta empresa.' });
        }

        const [[row]] = await conn.execute(
            `
        SELECT COALESCE(MAX(CODIGO_COLABORADOR), 0) + 1 AS NUEVO
        FROM seguridad.seguridad_persona
        WHERE CODIGO_CIA = ?
        FOR UPDATE`,
            [codigo_cia]
        );
        const nuevo_codigo = Number(row?.NUEVO || 1);

        const { contrasena, visible } = obtenerContrasenaCorreo(email);

        await conn.execute(
            `
        INSERT INTO seguridad.seguridad_persona (
            CODIGO_CIA, CODIGO_COLABORADOR,
            PRIMER_NOMBRE, SEGUNDO_NOMBRE, TERCER_NOMBRE,
            PRIMER_APELLIDO, SEGUNDO_APELLIDO, TERCER_APELLIDO,
            CORREO_ELECTRONICO, CODIGO_ENTIDAD,
            CONTRASENA, ACTIVO, USUARIO_CREACION, FECHA_CREACION
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, 
            ?, '1', ?, CURRENT_TIMESTAMP
        )`,
            [
                codigo_cia, nuevo_codigo,
                primer_nombre ?? null, segundo_nombre ?? null, tercer_nombre ?? null,
                primer_apellido ?? null, segundo_apellido ?? null, tercer_apellido ?? null,
                email, codigo_entidad ?? null,
                contrasena, usuario ?? null
            ]
        );

        await conn.execute(
            `
        INSERT INTO gestion_riesgos.riesgos_colaborador_superior (
            CODIGO_CIA, CODIGO_COLABORADOR,
            NOMBRE_SUPERIOR, PUESTO_SUPERIOR,
            USUARIO_CREACION, FECHA_CREACION
        ) VALUES (
            ?, ?, 
            ?, ?,
            ?, now()
        )`,
            [
                codigo_cia, nuevo_codigo,
                nombre_superior, puesto_superior,
                req.userId
            ]
        );

        await conn.commit();
        return res.status(201).json({
            mensaje: 'Colaborador creado correctamente',
            codigo_colaborador: nuevo_codigo,
            contra: visible
        });
    } catch (error) {
        if (conn) { try { await conn.rollback(); } catch { } }

        if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
            return res.status(409).json({ error: 'El correo ya está registrado para este sistema.' });
        }

        if (error?.code === 'PROTOCOL_SEQUENCE_TIMEOUT') {
            return res.status(408).json({ error: 'La operación tardó demasiado. Inténtalo de nuevo.' });
        }

        console.error('Error al crear colaborador:', error);
        return res.status(500).json({ error: 'Error al crear colaborador' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * actualizarResponsable
 *
 * Actualiza datos de colaborador y su `codigo_entidad` si aplica.
 *
 * @route PUT /
 * @param {import('express').Request} req Body con datos personales y `codigo_entidad`
 * @param {import('express').Response} res
 */
exports.actualizarResponsable = async (req, res) => {
    const {
        codigo_colaborador,
        primer_nombre, segundo_nombre, tercer_nombre,
        primer_apellido, segundo_apellido, tercer_apellido,
        correo, codigo_entidad, nombre_superior, puesto_superior
    } = req.body;

    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;

    if (!codigo_cia || !codigo_colaborador) {
        return res.status(400).json({ error: 'Faltan codigo_cia o codigo_colaborador' });
    }

    const email = correo ? String(correo).trim().toLowerCase() : null;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        const sql = `
        UPDATE seguridad.seguridad_persona
        SET 
            PRIMER_NOMBRE        = ?,
            SEGUNDO_NOMBRE       = ?,
            TERCER_NOMBRE        = ?,
            PRIMER_APELLIDO      = ?,
            SEGUNDO_APELLIDO     = ?,
            TERCER_APELLIDO      = ?,
            CORREO_ELECTRONICO   = ?,
            CODIGO_ENTIDAD       = ?,
            USUARIO_MODIFICACION = ?,
            FECHA_MODIFICACION   = CURRENT_TIMESTAMP
        WHERE CODIGO_CIA = ? AND CODIGO_COLABORADOR = ?
        `;

        const params = [
            primer_nombre ?? null, segundo_nombre ?? null, tercer_nombre ?? null,
            primer_apellido ?? null, segundo_apellido ?? null, tercer_apellido ?? null,
            email, codigo_entidad ?? null,
            usuario ?? null, codigo_cia, codigo_colaborador
        ];

        const [result] = await conn.execute(sql, params);

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Colaborador no encontrado' });
        }

        const sqlSup = `
        UPDATE gestion_riesgos.riesgos_colaborador_superior
        SET nombre_superior = ?, puesto_superior = ?, usuario_modificacion = ?, fecha_modificacion = now()
        WHERE CODIGO_CIA = ? AND CODIGO_COLABORADOR = ?
        `

        const [resultSup] = await conn.execute(sqlSup, [nombre_superior, puesto_superior, req.userId, codigo_cia, codigo_colaborador]);

        if (resultSup.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Colaborador no encontrado' });
        }
        await conn.commit();
        return res.json({ mensaje: 'Colaborador actualizado correctamente' });
    } catch (error) {
        if (conn) { try { await conn.rollback(); } catch { } }

        if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
            return res.status(409).json({ error: 'El correo ya está registrado para esta empresa.' });
        }
        console.error('Error al actualizar colaborador:', error);
        return res.status(500).json({ error: 'Error al actualizar colaborador' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * actualizarContrasenaPerfil
 *
 * Cambia la contraseña del usuario autenticado verificando la actual.
 *
 * - Compara `sha1(vieja)` con la almacenada y, si coincide, actualiza por `sha1(nueva)`.
 *
 * @route PUT /actualizar-contrasena-perfil
 * @param {import('express').Request} req Body: { vieja:string, nueva:string }
 * @param {import('express').Response} res
 */
exports.actualizarContrasenaPerfil = async (req, res) => {
    const { vieja, nueva } = req.body;

    if (!vieja || !nueva) {
        return res.status(400).json({
            ok: false,
            msg: "Debes enviar la contraseña actual y la nueva."
        });
    }

    try {
        const sqlVerificar = `
            SELECT CONTRASENA 
            FROM seguridad.seguridad_persona
            WHERE CODIGO_CIA = ? AND CODIGO_COLABORADOR = ? AND VIGENTE = '1'
        `;
        const [rows] = await pool.execute(sqlVerificar, [req.codigo_cia, req.userId]);

        if (rows.length === 0) {
            return res.status(404).json({
                ok: false,
                msg: "Usuario no encontrado o inactivo."
            });
        }

        const contrasenaActual = rows[0].CONTRASENA;
        if (contrasenaActual !== sha1(vieja)) {
            return res.status(401).json({
                ok: false,
                msg: "La contraseña actual no es correcta."
            });
        }
        const sqlActualizar = `
            UPDATE seguridad.seguridad_persona
            SET CONTRASENA = ?, USUARIO_MODIFICACION = ?, FECHA_MODIFICACION = NOW()
            WHERE CODIGO_CIA = ? AND CODIGO_COLABORADOR = ? AND VIGENTE = '1'
        `;
        await pool.execute(sqlActualizar, [sha1(nueva), req.userId, req.codigo_cia, req.userId]);

        res.json({
            ok: true,
            msg: "Contraseña actualizada correctamente."
        });
    } catch (err) {
        console.error("Error en actualizarContrasenaPerfil:", err);
        res.status(500).json({
            ok: false,
            msg: "Error interno al actualizar la contraseña."
        });
    }
};

/**
 * obtenerSuperiorPerfil
 *
 * Devuelve datos personales básicos y el superior del usuario autenticado.
 *
 * @route GET /obtener-superior-perfil
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.obtenerSuperiorPerfil = async (req, res) => {
    try {

        const codigo_cia = req.codigo_cia;
        const codigo_colaborador = req.userId;

        const sqlInformacion = `
        SELECT
            sp.PRIMER_NOMBRE,
            sp.SEGUNDO_NOMBRE,
            sp.TERCER_NOMBRE,
            sp.PRIMER_APELLIDO,
            sp.SEGUNDO_APELLIDO,
            sp.TERCER_APELLIDO,
            sp.CORREO_ELECTRONICO,
            cs.NOMBRE_SUPERIOR,
            cs.PUESTO_SUPERIOR
        FROM
            seguridad.seguridad_persona sp
        LEFT JOIN
            gestion_riesgos.riesgos_colaborador_superior cs
        ON
            sp.codigo_cia = cs.codigo_cia
            AND sp.codigo_colaborador = cs.codigo_colaborador
        WHERE
            sp.codigo_cia = ?
            AND sp.codigo_colaborador = ?
        `

        const response = await pool.execute(sqlInformacion, [codigo_cia, codigo_colaborador]);

        res.json({ ok: true, result: response });
    } catch (err) {
        console.error("Error en obtener información:", err);
        res.status(500).json({
            ok: false,
            msg: "Error en obtener información"
        });
    }
}

/**
 * actualizarSuperior
 *
 * Actualiza nombre/puesto del superior del colaborador autenticado.
 *
 * @param {import('express').Request} req Body: { nombre_superior:string, puesto_superior:string }
 * @param {import('express').Response} res
 */
exports.actualizarSuperior = async (req, res) => {
    try {

        const codigo_cia = req.codigo_cia;
        const codigo_colaborador = req.userId;
        const nombre_superior = req.body.nombre_superior;
        const puesto_superior = req.body.puesto_superior;

        const sqlUpdate = `
        UPDATE gestion_riesgos.riesgos_colaborador_superior 
        SET
            NOMBRE_SUPERIOR = ?,
            PUESTO_SUPERIOR = ?,
            usuario_modificacion = ?,
            fecha_modificacion = now()
        WHERE
            codigo_cia = ?
            AND codigo_colaborador = ?
        `
        await pool.execute(sqlUpdate, [nombre_superior, puesto_superior, req.userId, codigo_cia, codigo_colaborador]);

        res.json({ ok: true, });
    } catch (err) {
        console.error("Error en obtener información:", err);
        res.status(500).json({
            ok: false,
            msg: "Error en obtener información"
        });
    }
}