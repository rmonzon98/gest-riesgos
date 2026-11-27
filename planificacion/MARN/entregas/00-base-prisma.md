# Etapa 00 · Base de Prisma en MARN

## Archivos y dependencias

- `backend/prisma.config.ts`, `backend/prisma/databaseUrl.js` y `backend/prisma/client.js` configuran la CLI y el cliente con el adaptador MariaDB. Se incorporaron `prisma`, `@prisma/client` y `@prisma/adapter-mariadb` 7.9.1 para el esquema, las migraciones y el código nuevo.
- `backend/prisma/schema.prisma` representa las 46 tablas del dump con los dos cambios posteriores. Usa modelos en PascalCase y campos en camelCase. Los mapeos conservan los nombres físicos y las relaciones compuestas conservan el orden de sus columnas.
- `backend/services/verifyJWTUpd.js` consulta la sesión y la persona con Prisma. Usa los tipos introspectados (`Boolean` para la sesión y `String` para la persona) y conserva los campos del request y el mensaje de rechazo de la sesión.
- `backend/index.js` incorpora del commit `d56978a` el requisito de sesión para `/Pictures` y `/docs`. `backend/.env.example` y `backend/README.md` documentan la configuración y el flujo de migraciones.
- `backend/package.json` y `backend/package-lock.json` incorporan Prisma y `postinstall`. Se retiraron `.sequelizerc`, `backend/sequelize/` y sus dependencias. `backend/.gitignore` excluye `generated/` y el cliente se retiró del índice de Git.

## Migraciones

| Migración | Contenido |
|---|---|
| `0_init` | Esquema de las 46 tablas del dump y sus 114 triggers, sin `DEFINER`. Conserva en el SQL las colaciones, los comentarios, `ck_docs_mes` y el modo SQL original de los triggers. |
| `1_fk_entidad_viceministerio` | Reemplaza la FK anterior por la relación compuesta de `seguridad_entidad` a `riesgos_viceministerio`, con `ON DELETE RESTRICT` y `ON UPDATE CASCADE`. |
| `2_es_nuevo_riesgo` | Agrega `ES_NUEVO TINYINT(1) NOT NULL DEFAULT 0` después de `PERIODO_ANTERIOR`. |

Se generó `0_init` con `prisma migrate diff --from-empty --to-schema`, el nombre de la opción en Prisma 7. Se crearon las otras dos migraciones porque el dump todavía tenía la FK anterior y carecía de `ES_NUEVO`. El archivo `migration_lock.toml` registra el proveedor `mysql` para MariaDB.

## Endpoints

No se agregaron endpoints. Se verificaron `GET /healthz`, `POST /api/login-actualizados`, `POST /api/login-actualizados/verificar-2fa` y `GET /api/login-actualizados/me`. Este último requiere una sesión válida.

## Verificación

- `node --check` pasó en `backend/index.js`, `prisma/client.js`, `prisma/databaseUrl.js` y `services/verifyJWTUpd.js`.
- `npx prisma validate` y `npx prisma generate` pasaron. `npm install` también ejecutó `postinstall` y generó el cliente.
- En MariaDB 10.3.27, `prisma migrate deploy` aplicó las tres migraciones sobre una base vacía. Se comprobó la equivalencia con la copia migrada del dump en las 46 tablas, los 114 triggers y la presencia del `CHECK` `ck_docs_mes`.
- En la copia restaurada se marcó `0_init` con `migrate resolve --applied` y se aplicaron las dos migraciones pendientes. `migrate diff --exit-code` devolvió 0 para ambas bases y para el historial reproducido en una base sombra. `migrate status` confirmó el historial al día.
- El backend inició contra la base de prueba. El login con y sin TOTP y `/me` autenticado devolvieron 200. `/me` anónimo o con sesión revocada devolvió 401. Se verificaron `req.user`, `req.codigo_cia`, `req.codigo_entidad` y los campos de compatibilidad. `/Pictures/default.png` devolvió 200 con sesión y 401 sin sesión.
- `npx vite build` pasó con un aviso por archivos JavaScript de más de 500 kB. El backend emitió un aviso de dependencia circular durante el arranque.
- Se verificó que `backend/generated/` está ignorado y que el índice no contiene sus archivos. El backend y sus manifiestos de dependencias ya no contienen referencias a Sequelize.

Las pruebas de esquema y autenticación se hicieron en un contenedor temporal. La base local de trabajo quedó sin migrar. Los cambios están en `MARN`, sin commit.
