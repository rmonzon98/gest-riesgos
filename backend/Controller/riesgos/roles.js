/** 
 * @fileoverview
 * Controlador de roles y permisos.
 *
 * @module controller/seguridad/roles
 * @version 1.0
 * @author Equipo de Desarrollo
 */

const { consultar, ejecutar, transaccion, marcadores } = require('../../bd/consultas');
const { accesoAdministracion, asignacionVigente, bloquearInstitucion, errorAdministracion,
    fechaCivil, mensajeLimite, obtenerLicencia } = require('../../services/administracionRiesgos');

/**
 * obtenerRoles
 *
 * Función del controlador encargada de procesar la operación obtenerRoles.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerRoles = async (req, res) => {
    try {
        const codigo_cia = req.user?.codigo_cia ?? req.codigo_cia;
        const codigo_colaborador = req.user?.id ?? req.userId;

        if (!codigo_cia || !codigo_colaborador) {
            return res.status(400).json({ msg: 'Faltan credenciales (codigo_cia / usuario)' });
        }

        const sql = `
        SELECT
            smr.CODIGO_CIA,
            smru.CODIGO_COLABORADOR,
            smu.URL,
            smu.NOMBRE
        FROM 
            gestion_riesgos.seguridad_menu_rol_usuario smru
        LEFT JOIN 
            gestion_riesgos.seguridad_menu_rol smr
        ON 
            smru.CODIGO_CIA = smr.CODIGO_CIA
            AND smru.CODIGO_ROL = smr.CODIGO_ROL
            AND smru.codigo_aplicacion = smr.codigo_aplicacion
        LEFT JOIN 
            gestion_riesgos.seguridad_menu_rol_url smrur
        ON 
            smrur.CODIGO_CIA = smru.CODIGO_CIA
            AND smrur.CODIGO_ROL = smru.CODIGO_ROL
            AND smrur.codigo_aplicacion = smru.codigo_aplicacion
        LEFT JOIN 
            gestion_riesgos.seguridad_menu_urls smu
        ON 
            smrur.CODIGO_URL = smu.CODIGO_URL
            AND smru.CODIGO_APLICACION = smu.CODIGO_APLICACION
        WHERE 
            smru.CODIGO_CIA = ?
            AND smru.CODIGO_COLABORADOR = ?
            AND smru.codigo_aplicacion = 1
            AND ${asignacionVigente.replaceAll('asignacion.', 'smru.')}
        ORDER BY smu.NOMBRE ASC
        `;
        const rows = await consultar(sql, [codigo_cia, codigo_colaborador]);
        return res.json({ result: rows });
    } catch (err) {
        console.error('Error en roles:', err);
        return res.status(500).json({ msg: 'Error al obtener roles' });
    }
};

/**
 * obtenerUrls
 *
 * Función del controlador encargada de procesar la operación obtenerUrls.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerUrls = async (req, res, next) => {
    try {
        const sql = `
        SELECT 
            CODIGO_URL, NOMBRE, URL
        FROM 
            gestion_riesgos.seguridad_menu_urls
        WHERE
            codigo_aplicacion = 1
        ORDER BY NOMBRE ASC
        `;
        const rows = await consultar(sql);
        req.urls = rows;
        return next();
    } catch (err) {
        console.error('Error en obtenerUrls:', err);
        return res.status(500).json({ msg: 'Error al obtener urls' });
    }
};

/**
 * obtenerRolesInfo
 *
 * Función del controlador encargada de procesar la operación obtenerRolesInfo.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /informacion-roles
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerRolesInfo = async (req, res) => {
    try {
        const codigo_cia = req.user?.codigo_cia ?? req.codigo_cia ?? req.query?.codigo_cia;
        if (!codigo_cia) return res.status(400).json({ msg: 'Falta codigo_cia' });

        const sql = `
        SELECT 
            smr.CODIGO_ROL,
            smr.NOMBRE,
            smr.GENERAL,
            smu.NOMBRE AS NOMBRE_URL,
            smu.URL
        FROM 
            gestion_riesgos.seguridad_menu_rol smr
        LEFT JOIN 
            gestion_riesgos.seguridad_menu_rol_url smru
        ON 
            smr.CODIGO_CIA = smru.CODIGO_CIA
            AND smr.CODIGO_ROL = smru.CODIGO_ROL
        LEFT JOIN
            gestion_riesgos.seguridad_menu_urls smu
        ON 
            smru.CODIGO_URL = smu.CODIGO_URL
        WHERE 
            smr.CODIGO_CIA = ?
            AND smr.codigo_aplicacion = 1
            AND smru.codigo_aplicacion = 1
            AND smu.codigo_aplicacion = 1
        ORDER BY smu.NOMBRE
        `;

        const rows = await consultar(sql, [codigo_cia]);

        const rolesMap = new Map();
        for (const row of rows) {
            const rolId = row.CODIGO_ROL;
            if (!rolesMap.has(rolId)) {
                rolesMap.set(rolId, {
                    codigo_rol: rolId,
                    nombre: row.NOMBRE,
                    general: row.GENERAL,
                    urls: []
                });
            }
            if (row.NOMBRE_URL && row.URL) {
                rolesMap.get(rolId).urls.push({
                    nombre_url: row.NOMBRE_URL,
                    url: row.URL
                });
            }
        }

        return res.json({
            urls: req.urls || [],
            roles: Array.from(rolesMap.values())
        });
    } catch (err) {
        console.error('Error en obtenerRolesInfo:', err);
        return res.status(500).json({ msg: 'Error al obtener roles' });
    }
};

/**
 * obtenerRolesInfoDireccion
 *
 * Función del controlador encargada de procesar la operación obtenerRolesInfoDireccion.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /informacion-roles-direccion
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerRolesInfoDireccion = async (req, res) => {
    try {
        const codigo_cia = req.user?.codigo_cia ?? req.codigo_cia ?? req.query?.codigo_cia;
        if (!codigo_cia) return res.status(400).json({ msg: 'Falta codigo_cia' });

        const sql = `
        SELECT 
            smr.CODIGO_ROL,
            smr.NOMBRE,
            smr.GENERAL,
            smu.NOMBRE AS NOMBRE_URL,
            smu.URL
        FROM 
            gestion_riesgos.seguridad_menu_rol smr
        LEFT JOIN 
            gestion_riesgos.seguridad_menu_rol_url smru
        ON 
            smr.CODIGO_CIA = smru.CODIGO_CIA
            AND smr.CODIGO_ROL = smru.CODIGO_ROL
        LEFT JOIN
            gestion_riesgos.seguridad_menu_urls smu
        ON 
            smru.CODIGO_URL = smu.CODIGO_URL
        WHERE 
            smr.CODIGO_CIA = ?
            AND smr.codigo_aplicacion = 1
            AND smru.codigo_aplicacion = 1
            AND smu.codigo_aplicacion = 1
            AND smr.GENERAL = 1
        ORDER BY smu.NOMBRE
        `;

        const rows = await consultar(sql, [codigo_cia]);

        const rolesMap = new Map();
        for (const row of rows) {
            const rolId = row.CODIGO_ROL;
            if (!rolesMap.has(rolId)) {
                rolesMap.set(rolId, {
                    codigo_rol: rolId,
                    nombre: row.NOMBRE,
                    general: row.GENERAL,
                    urls: []
                });
            }
            if (row.NOMBRE_URL && row.URL) {
                rolesMap.get(rolId).urls.push({
                    nombre_url: row.NOMBRE_URL,
                    url: row.URL
                });
            }
        }

        return res.json({
            urls: req.urls || [],
            roles: Array.from(rolesMap.values())
        });
    } catch (err) {
        console.error('Error en obtenerRolesInfo:', err);
        return res.status(500).json({ msg: 'Error al obtener roles' });
    }
};

/**
 * obtenerRolPorId
 *
 * Función del controlador encargada de procesar la operación obtenerRolPorId.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /obtener-rol
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerRolPorId = async (req, res) => {
    const codigo_cia = req.user?.codigo_cia ?? req.codigo_cia ?? req.query?.codigo_cia;
    const { id } = req.query;

    if (!codigo_cia || !id) {
        return res.status(400).json({ msg: 'Faltan parámetros (codigo_cia, id, codigo_aplicacion)' });
    }

    try {
        const rolSql = `
        SELECT 
            smr.CODIGO_ROL, smr.NOMBRE
        FROM 
            gestion_riesgos.seguridad_menu_rol smr
        WHERE 
            smr.CODIGO_CIA = ?
            AND smr.CODIGO_ROL = ?
            AND smr.CODIGO_APLICACION = ?
        LIMIT 1
        `;
        const rolRows = await consultar(rolSql, [codigo_cia, id, 1]);
        if (!rolRows.length) return res.status(404).json({ msg: 'Rol no encontrado' });

        const rol = rolRows[0];

        const urlsSql = `
        SELECT 
            smu.NOMBRE AS NOMBRE_URL,
            smu.URL    AS URL
        FROM 
            gestion_riesgos.seguridad_menu_rol_url smru
        LEFT JOIN 
            gestion_riesgos.seguridad_menu_urls smu
        ON  
            smru.CODIGO_APLICACION = smu.CODIGO_APLICACION
            AND smru.CODIGO_URL        = smu.CODIGO_URL
        WHERE 
            smru.CODIGO_CIA        = ?
            AND smru.CODIGO_ROL        = ?
            AND smru.CODIGO_APLICACION = ?
        ORDER BY smu.NOMBRE ASC
        `;
        const urlsRows = await consultar(urlsSql, [codigo_cia, id, 1]);

        return res.json({
            codigo_rol: rol.CODIGO_ROL,
            nombre: rol.NOMBRE,
            urls: urlsRows
        });

    } catch (err) {
        console.error('Error al obtener rol por ID:', err);
        return res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

/**
 * actualizarRolConUrls
 *
 * Función del controlador encargada de procesar la operación actualizarRolConUrls.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.actualizarRolConUrls = async (req, res) => {
    const { id, nombre, urls } = req.body;
    const codigo_aplicacion = 1;
    const codigo_rol = id;
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;

    if (!codigo_rol || !nombre || !Array.isArray(urls) || !codigo_aplicacion) {
        return res.status(400).json({ msg: 'Datos incompletos (id, nombre, urls[], codigo_aplicacion).' });
    }

    try {
        await transaccion(async tx => {
            await ejecutar(
                `
                UPDATE 
                    \`gestion_riesgos\`.\`seguridad_menu_rol\`
                SET 
                    NOMBRE = ?, USUARIO_MODIFICACION = ?, FECHA_MODIFICACION = NOW()
                WHERE 
                    CODIGO_CIA = ? AND CODIGO_APLICACION = ? AND CODIGO_ROL = ?`,
                [nombre, usuario, codigo_cia, codigo_aplicacion, codigo_rol], tx
            );

            await ejecutar(
                `
                DELETE FROM 
                    \`gestion_riesgos\`.\`seguridad_menu_rol_url\`
                WHERE 
                    CODIGO_CIA = ? AND CODIGO_APLICACION = ? AND CODIGO_ROL = ?`,
                [codigo_cia, codigo_aplicacion, codigo_rol], tx
            );

            for (const codigo_url of urls) {
                await ejecutar(
                    `
                INSERT INTO \`gestion_riesgos\`.\`seguridad_menu_rol_url\`
                (CODIGO_APLICACION, CODIGO_CIA, CODIGO_ROL, CODIGO_URL)
                VALUES (?, ?, ?, ?)`,
                    [codigo_aplicacion, codigo_cia, codigo_rol, codigo_url], tx
                );
            }
        });
        return res.json({ msg: 'Rol actualizado correctamente.' });
    } catch (err) {
        console.error('Error al actualizar rol:', err);
        return res.status(500).json({ msg: 'Error al actualizar rol.' });
    }
};

/**
 * cambiarGeneral
 *
 * Función del controlador encargada de procesar la operación cambiarGeneral.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route PUT /cambiar-general/:id
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.cambiarGeneral = async (req, res) => {
    const { id } = req.params;
    const { general } = req.body;
    try {
        await ejecutar(
            "UPDATE gestion_riesgos.seguridad_menu_rol SET GENERAL = ? WHERE CODIGO_ROL = ? AND codigo_cia = ? AND codigo_aplicacion = ?",
            [general, id, req.codigo_cia, 1]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: "Error al actualizar el rol" });
    }
};

/**
 * crearRolConUrls
 *
 * Función del controlador encargada de procesar la operación crearRolConUrls.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route POST /
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.crearRolConUrls = async (req, res) => {
    const { nombre, urls } = req.body;
    const codigo_aplicacion = 1
    const codigo_cia = req.codigo_cia;
    const usuario = req.userId;

    if (!nombre || !Array.isArray(urls) || urls.length === 0 || !codigo_aplicacion) {
        return res.status(400).json({ msg: 'Debe enviar nombre, urls[] y codigo_aplicacion.' });
    }

    try {
        const codigo_rol = await transaccion(async tx => {
            const maxRows = await consultar(
                `SELECT COALESCE(MAX(CODIGO_ROL), 0) AS maxRol
             FROM \`gestion_riesgos\`.\`seguridad_menu_rol\`
            WHERE CODIGO_CIA = ? AND CODIGO_APLICACION = ?`,
                [codigo_cia, codigo_aplicacion], tx
            );
            const codigo = (maxRows[0]?.maxRol ?? 0) + 1;

            await ejecutar(
                `INSERT INTO \`gestion_riesgos\`.\`seguridad_menu_rol\`
             (CODIGO_APLICACION, CODIGO_CIA, CODIGO_ROL, NOMBRE, ACTIVO,
              USUARIO_CREACION, USUARIO_MODIFICACION, FECHA_CREACION, FECHA_MODIFICACION)
           VALUES (?, ?, ?, ?, 1, ?, ?, NOW(), NOW())`,
                [codigo_aplicacion, codigo_cia, codigo, nombre, usuario, usuario], tx
            );

            for (const codigo_url of urls) {
                await ejecutar(
                    `INSERT INTO \`gestion_riesgos\`.\`seguridad_menu_rol_url\`
               (CODIGO_APLICACION, CODIGO_CIA, CODIGO_ROL, CODIGO_URL)
             VALUES (?, ?, ?, ?)`,
                    [codigo_aplicacion, codigo_cia, codigo, codigo_url], tx
                );
            }
            return codigo;
        });
        return res.json({ msg: 'Rol creado correctamente.', codigo_rol });
    } catch (err) {
        console.error('Error al crear rol:', err);
        return res.status(500).json({ msg: 'Error al crear rol.' });
    }
};

/**
 * obtenerPersonasRoles
 *
 * Función del controlador encargada de procesar la operación obtenerPersonasRoles.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /obtener-personas-con-roles
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerPersonasRoles = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_aplicacion = 1;

    if (!codigo_cia || !codigo_aplicacion) {
        return res.status(400).json({ msg: 'Faltan parámetros (codigo_cia, codigo_aplicacion).' });
    }

    try {
        const sql = `
        SELECT
            sp.CODIGO_COLABORADOR,
            CONCAT(COALESCE(sp.PRIMER_NOMBRE,''),' ',COALESCE(sp.PRIMER_APELLIDO,'')) AS NOMBRE,
            smru.CODIGO_ROL,
            smr.NOMBRE AS NOMBRE_ROL,
            DATE_FORMAT(smru.FECHA_INICIO, '%Y-%m-%d') AS FECHA_INICIO,
            DATE_FORMAT(smru.FECHA_FIN, '%Y-%m-%d') AS FECHA_FIN,
            COALESCE(smru.FECHA_FIN < CURDATE(), 0) AS VENCIDO
        FROM 
            \`gestion_riesgos\`.\`seguridad_menu_rol_usuario\` smru
        LEFT JOIN 
            \`gestion_riesgos\`.\`seguridad_persona\` sp
        ON 
            sp.CODIGO_CIA = smru.CODIGO_CIA
            AND sp.CODIGO_COLABORADOR = smru.CODIGO_COLABORADOR
        LEFT JOIN 
            \`gestion_riesgos\`.\`seguridad_menu_rol\` smr
        ON 
            smr.CODIGO_CIA = smru.CODIGO_CIA
            AND smr.CODIGO_ROL = smru.CODIGO_ROL
            AND smr.CODIGO_APLICACION = smru.CODIGO_APLICACION
        WHERE 
            smru.CODIGO_CIA = ?
            AND smru.CODIGO_APLICACION = ?
            AND sp.activo != 0
        ORDER BY sp.PRIMER_NOMBRE, sp.PRIMER_APELLIDO, smru.CODIGO_ROL
        `;
        const rows = await consultar(sql, [codigo_cia, codigo_aplicacion]);

        const agrupado = [];
        const idx = new Map();

        for (const row of rows) {
            const key = row.CODIGO_COLABORADOR;
            if (!idx.has(key)) {
                idx.set(key, agrupado.length);
                agrupado.push({
                    persona: {
                        codigo_colaborador: row.CODIGO_COLABORADOR,
                        nombre: row.NOMBRE
                    },
                    roles: []
                });
            }
            agrupado[idx.get(key)].roles.push({
                codigo_rol: row.CODIGO_ROL,
                nombre: row.NOMBRE_ROL,
                fecha_inicio: row.FECHA_INICIO, fecha_fin: row.FECHA_FIN, vencido: Boolean(row.VENCIDO)
            });
        }

        return res.json({ data: agrupado });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Error al obtener las personas con sus roles' });
    }
};

/**
 * obtenerPersonasRolesDireccion
 *
 * Función del controlador encargada de procesar la operación obtenerPersonasRolesDireccion.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /obtener-personas-con-roles-direccion
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerPersonasRolesDireccion = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_aplicacion = 1;

    if (!codigo_cia || !codigo_aplicacion) {
        return res.status(400).json({ msg: 'Faltan parámetros (codigo_cia, codigo_aplicacion).' });
    }

    try {
        const sql = `
        SELECT
            sp.CODIGO_COLABORADOR,
            CONCAT(COALESCE(sp.PRIMER_NOMBRE,''),' ',COALESCE(sp.PRIMER_APELLIDO,'')) AS NOMBRE,
            smru.CODIGO_ROL,
            smr.NOMBRE AS NOMBRE_ROL,
            DATE_FORMAT(smru.FECHA_INICIO, '%Y-%m-%d') AS FECHA_INICIO,
            DATE_FORMAT(smru.FECHA_FIN, '%Y-%m-%d') AS FECHA_FIN,
            COALESCE(smru.FECHA_FIN < CURDATE(), 0) AS VENCIDO
        FROM 
            \`gestion_riesgos\`.\`seguridad_menu_rol_usuario\` smru
        LEFT JOIN 
            \`gestion_riesgos\`.\`seguridad_persona\` sp
        ON 
            sp.CODIGO_CIA = smru.CODIGO_CIA
            AND sp.CODIGO_COLABORADOR = smru.CODIGO_COLABORADOR
        LEFT JOIN 
            \`gestion_riesgos\`.\`seguridad_menu_rol\` smr
        ON 
            smr.CODIGO_CIA = smru.CODIGO_CIA
            AND smr.CODIGO_ROL = smru.CODIGO_ROL
            AND smr.CODIGO_APLICACION = smru.CODIGO_APLICACION
        WHERE 
            smru.CODIGO_CIA = ?
            AND smru.CODIGO_APLICACION = ?
            AND sp.activo != 0
            AND sp.codigo_entidad = ?
        ORDER BY sp.PRIMER_NOMBRE, sp.PRIMER_APELLIDO, smru.CODIGO_ROL
        `;
        const rows = await consultar(sql, [codigo_cia, codigo_aplicacion, req.codigo_entidad]);

        const agrupado = [];
        const idx = new Map();

        for (const row of rows) {
            const key = row.CODIGO_COLABORADOR;
            if (!idx.has(key)) {
                idx.set(key, agrupado.length);
                agrupado.push({
                    persona: {
                        codigo_colaborador: row.CODIGO_COLABORADOR,
                        nombre: row.NOMBRE
                    },
                    roles: []
                });
            }
            agrupado[idx.get(key)].roles.push({
                codigo_rol: row.CODIGO_ROL,
                nombre: row.NOMBRE_ROL,
                fecha_inicio: row.FECHA_INICIO, fecha_fin: row.FECHA_FIN, vencido: Boolean(row.VENCIDO)
            });
        }

        return res.json({ data: agrupado });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Error al obtener las personas con sus roles' });
    }
};

/**
 * obtenerPersonasRolesUnico
 *
 * Función del controlador encargada de procesar la operación obtenerPersonasRolesUnico.
 *
 * - Ejecuta la lógica correspondiente del módulo.
 * - Interactúa con la base de datos según sea necesario.
 *
 * @route GET /obtener-personas-con-roles-unico
 * @returns {200|400|404|500} Respuesta del servicio.
 */
exports.obtenerPersonasRolesUnico = async (req, res) => {
    const codigo_cia = req.codigo_cia;
    const codigo_aplicacion = 1;
    const { codigo_colaborador } = req.query;

    if (!codigo_cia || !codigo_colaborador || !codigo_aplicacion) {
        return res.status(400).json({ msg: 'Faltan parámetros (codigo_cia, codigo_colaborador, codigo_aplicacion).' });
    }

    try {
        const { direccion } = await accesoAdministracion(req);
        const sql = `
        SELECT 
            smru.CODIGO_ROL,
            smr.NOMBRE AS NOMBRE_ROL,
            DATE_FORMAT(smru.FECHA_INICIO, '%Y-%m-%d') AS FECHA_INICIO,
            DATE_FORMAT(smru.FECHA_FIN, '%Y-%m-%d') AS FECHA_FIN,
            COALESCE(smru.FECHA_FIN < CURDATE(), 0) AS VENCIDO
        FROM 
            \`gestion_riesgos\`.\`seguridad_menu_rol_usuario\` smru
        LEFT JOIN 
            \`gestion_riesgos\`.\`seguridad_menu_rol\` smr
            ON smr.CODIGO_CIA = smru.CODIGO_CIA
            AND smr.CODIGO_ROL = smru.CODIGO_ROL
            AND smr.CODIGO_APLICACION = smru.CODIGO_APLICACION
        WHERE 
            smru.CODIGO_CIA = ?
            AND smru.CODIGO_COLABORADOR = ?
            AND smru.CODIGO_APLICACION = ?
            AND (? IS NULL OR EXISTS (
                SELECT 1 FROM gestion_riesgos.seguridad_persona persona
                WHERE persona.CODIGO_CIA = smru.CODIGO_CIA AND persona.CODIGO_COLABORADOR = smru.CODIGO_COLABORADOR
                    AND persona.CODIGO_ENTIDAD = ?
            ))
        ORDER BY smr.NOMBRE
        `;
        const rows = await consultar(sql, [codigo_cia, codigo_colaborador, codigo_aplicacion, direccion, direccion]);
        return res.json({ data: rows });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ msg: err.message });
        console.error(err);
        return res.status(500).json({ msg: 'Error al obtener roles del colaborador' });
    }
};

function idsRoles(valores) {
    const ids = valores.map(Number);
    if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
        throw errorAdministracion(400, 'La selección contiene identificadores inválidos.');
    }
    return [...new Set(ids)];
}

function datosRol(valor) {
    const objeto = valor != null && typeof valor === 'object';
    const [codigo] = idsRoles([objeto ? valor.codigo_rol : valor]);
    if (!objeto) return { codigo, conservaFechas: true };
    const desde = fechaCivil(valor.fecha_inicio);
    const hasta = fechaCivil(valor.fecha_fin);
    if (desde && hasta && desde > hasta) throw errorAdministracion(400, 'La vigencia inicial debe ser anterior o igual a la final.');
    return { codigo, desde, hasta };
}

function cuentaHoy(roles, hoy) {
    return [...roles.values()].some(({ desde, hasta }) => (!desde || desde <= hoy) && (!hasta || hasta >= hoy));
}

async function asignarPersonasRoles(req, res, actualizar) {
    const { colaboradores, roles } = req.body || {};
    const cia = req.codigo_cia;
    if (!cia || !Array.isArray(colaboradores) || !colaboradores.length || !Array.isArray(roles) || (!actualizar && !roles.length)) {
        return res.status(400).json({ msg: 'Seleccione colaboradores y roles válidos.' });
    }
    try {
        const { direccion } = await accesoAdministracion(req);
        const personas = idsRoles(colaboradores);
        const solicitados = new Map(roles.map(valor => {
            const rol = datosRol(valor);
            return [rol.codigo, rol];
        }));
        const asignaciones = await transaccion(async tx => {
            await bloquearInstitucion(tx, cia);
            const licencia = await obtenerLicencia(tx, cia);
            if (solicitados.size) {
                const codigos = [...solicitados.keys()];
                const catalogo = await consultar(
                    `SELECT CODIGO_ROL FROM gestion_riesgos.seguridad_menu_rol WHERE CODIGO_CIA = ? AND CODIGO_APLICACION = 1 AND CODIGO_ROL IN (${marcadores(codigos)})`,
                    [cia, ...codigos], tx);
                if (catalogo.length !== solicitados.size) throw errorAdministracion(400, 'Seleccione roles de la institución.');
            }
            const cambios = [];
            let aumento = 0;
            for (const id of personas) {
                const [persona] = await consultar(
                    'SELECT ACTIVO, CODIGO_ENTIDAD FROM gestion_riesgos.seguridad_persona WHERE CODIGO_CIA = ? AND CODIGO_COLABORADOR = ?',
                    [cia, id], tx);
                if (!persona || (direccion != null && persona.CODIGO_ENTIDAD !== direccion)) {
                    throw errorAdministracion(403, 'El colaborador queda fuera de su administración.');
                }
                const filas = await consultar(`
                    SELECT CODIGO_ROL AS codigo, DATE_FORMAT(FECHA_INICIO, '%Y-%m-%d') AS desde, DATE_FORMAT(FECHA_FIN, '%Y-%m-%d') AS hasta
                    FROM gestion_riesgos.seguridad_menu_rol_usuario
                    WHERE CODIGO_CIA = ? AND CODIGO_APLICACION = 1 AND CODIGO_COLABORADOR = ?`, [cia, id], tx);
                const antes = new Map(filas.map(rol => [rol.codigo, rol]));
                const despues = actualizar ? new Map() : new Map(antes);
                for (const [codigo, rol] of solicitados) {
                    if (!actualizar && antes.has(codigo)) continue;
                    despues.set(codigo, rol.conservaFechas ? antes.get(codigo) ?? { codigo, desde: null, hasta: null } : rol);
                }
                if (persona.ACTIVO === '1') aumento += Number(cuentaHoy(despues, licencia.hoy)) - Number(cuentaHoy(antes, licencia.hoy));
                cambios.push({ id, antes, despues });
            }
            if (licencia.limite != null && aumento > 0 && licencia.usados + aumento > licencia.limite) {
                throw errorAdministracion(409, mensajeLimite);
            }
            let total = 0;
            for (const { id, antes, despues } of cambios) {
                const removidos = [...antes.keys()].filter(codigo => !despues.has(codigo));
                if (removidos.length) await ejecutar(`
                    DELETE FROM gestion_riesgos.seguridad_menu_rol_usuario
                    WHERE CODIGO_CIA = ? AND CODIGO_APLICACION = 1 AND CODIGO_COLABORADOR = ? AND CODIGO_ROL IN (${marcadores(removidos)})`,
                    [cia, id, ...removidos], tx);
                for (const [codigo, { desde, hasta }] of despues) {
                    const anterior = antes.get(codigo);
                    if (anterior?.desde === desde && anterior?.hasta === hasta) continue;
                    await ejecutar(`
                        INSERT INTO gestion_riesgos.seguridad_menu_rol_usuario
                            (CODIGO_APLICACION, CODIGO_CIA, CODIGO_COLABORADOR, CODIGO_ROL, FECHA_INICIO, FECHA_FIN)
                        VALUES (1, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE FECHA_INICIO = VALUES(FECHA_INICIO), FECHA_FIN = VALUES(FECHA_FIN)`,
                        [cia, id, codigo, desde ?? null, hasta ?? null], tx);
                    total++;
                }
            }
            return total;
        });
        return res.json({ msg: actualizar ? 'Roles actualizados correctamente.' : 'Roles asignados correctamente.', asignaciones });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ msg: err.message });
        console.error('Error al asignar roles:', err);
        return res.status(500).json({ msg: 'Error al asignar roles.' });
    }
}

/** Reemplaza las asignaciones de roles dentro del ámbito administrativo. */
exports.actualizarPersonasRoles = (req, res) => asignarPersonasRoles(req, res, true);

/** Agrega asignaciones a las personas seleccionadas y verifica capacidad de la licencia. */
exports.crearPersonasRoles = (req, res) => asignarPersonasRoles(req, res, false);
