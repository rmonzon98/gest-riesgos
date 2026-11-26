# Prompt 00 · Base de Prisma en la rama MARN

> Etapa 0 de 10. Lee primero `AGENTS.md`. Reporte en `planificacion/MARN/entregas/00-base-prisma.md`.

## Objetivo

Dejar Prisma (adaptador MariaDB) como **única** herramienta de esquema y ORM para el código nuevo, sin romper nada de lo existente.

## Contexto

- La rama `cambio-orm` (commit `d56978a`) tiene el arranque de Prisma: `backend/prisma.config.ts`, `backend/prisma/schema.prisma` (modelos `SeguridadPersona` y `SeguridadSesion`), `backend/prisma/client.js`, `backend/prisma/databaseUrl.js`, dependencias `prisma`, `@prisma/client` y `@prisma/adapter-mariadb` 7.9, y un cambio en `services/verifyJWTUpd.js` para usar Prisma.
- `MARN` (igual a `master`) **no** tiene esa rama, pero sí tiene:
  - el cliente generado y commiteado en `backend/generated/prisma/` (no debe estar en git);
  - sequelize-cli para migraciones (`backend/.sequelizerc`, `backend/sequelize/`), con 2 migraciones: la FK de `seguridad_entidad` → `riesgos_viceministerio` y la columna `riesgos_riesgo_extendido.ES_NUEVO`.
- La bitácora usa triggers (`trg_<tabla>_*`); hay 114 en el dump `dump-gestion_riesgos-202608051530.sql`.

## Tareas

1. **Traer Prisma de `cambio-orm`:** aplica a la rama actual los cambios de `d56978a` (por ejemplo `git cherry-pick -n d56978a`, sin commit) y resuelve los conflictos de `package.json` y `package-lock.json` conservando **las dos** partes. No hagas commit.
2. **Quitar el cliente generado de git:** agrega `backend/generated/` a `backend/.gitignore` y sácalo del índice (`git rm -r --cached backend/generated`). El cliente se genera con `postinstall: prisma generate`.
3. **Esquema completo por introspección:** con una base local cargada desde el dump, ejecuta `npx prisma db pull` para modelar **todas** las tablas existentes.
   - Conserva los nombres de tabla y columna con `@@map` y `@map`.
   - Nombres de modelo en PascalCase y campos en camelCase, como los dos modelos que ya existen.
   - Revisa las relaciones con llaves compuestas (`CODIGO_CIA` + …) y corrige lo que la introspección deje ambiguo.
4. **Migración base (baseline):** crea `prisma/migrations/0_init/migration.sql` con `prisma migrate diff --from-empty --to-schema-datamodel` y **agrega al final los 114 triggers** del dump (sin `DEFINER`), para que una base nueva quede igual que la actual. Documenta en el README cómo marcarla como aplicada en una base existente (`prisma migrate resolve --applied 0_init`).
5. **Migrar lo de sequelize a Prisma:** convierte las 2 migraciones de sequelize en migraciones de Prisma, **en orden y después de `0_init`**:
   - `1_fk_entidad_viceministerio`: la FK de `seguridad_entidad` hacia `riesgos_viceministerio`.
   - `2_es_nuevo_riesgo`: `ES_NUEVO TINYINT(1) NOT NULL DEFAULT 0 AFTER PERIODO_ANTERIOR`.

   Si el dump ya tiene alguno de estos cambios, ese cambio queda en `0_init` y no se repite. Luego **elimina** `.sequelizerc`, `backend/sequelize/` y las dependencias `sequelize` y `sequelize-cli`.
6. **Actualizar `backend/README.md`:** quita la sección de Sequelize y documenta el flujo con Prisma: `generate`, `migrate dev` (requiere una base sombra; explica el permiso `CREATE DATABASE` o `shadowDatabaseUrl`), `migrate deploy` y `migrate resolve` para el baseline.
7. **`verifyJWTUpd.js`:** queda la versión de `cambio-orm` con Prisma. Verifica que siga llenando `req.user`, `req.codigo_cia` y `req.codigo_entidad` igual que antes.

## Criterios de aceptación

- `npx prisma validate` y `npx prisma generate` pasan.
- `npx prisma migrate deploy` sobre una base vacía crea todas las tablas **y los triggers**.
- `npx prisma migrate diff` entre la base del dump (con la baseline marcada) y el schema no muestra diferencias.
- El backend arranca y el login funciona igual (prueba `/api/login-actualizados` y `/me`).
- No quedan referencias a sequelize en el código ni en `package.json`.
- `backend/generated/` está ignorado y fuera del índice de git.

## Fuera de alcance

- Reescribir controladores existentes de `mysql2` a Prisma.
- Tablas o columnas nuevas de MARN (eso es la etapa 01).
