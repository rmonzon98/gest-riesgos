# Backend de Gestión de Riesgos

## Instalación y configuración

Usa una versión de Node.js compatible con Prisma 7 (`^20.19`, `^22.12` o `>=24.0`). Desde `backend/`, ejecuta `npm ci`. El script `postinstall` ejecuta `prisma generate`. Si cambia `prisma/schema.prisma`, regenera el cliente con `npx prisma generate` o `npm run prisma:generate`.

El backend se conecta a MariaDB con `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`. Usa `gestion_riesgos` como nombre de la base de la aplicación. La CLI de Prisma acepta `DATABASE_URL` como destino explícito, por ejemplo al verificar migraciones en una base de prueba. En ausencia de esa variable, usa los mismos valores `DB_*` del backend.

## Base nueva

Configura la conexión a una base vacía y ejecuta:

```bash
npx prisma migrate deploy
npx prisma migrate status
npm start
```

`0_init` crea las tablas y los 114 triggers de bitácora. Las migraciones `1_fk_entidad_viceministerio` y `2_es_nuevo_riesgo` aplican los dos cambios posteriores al dump. Las migraciones contienen el esquema. Carga los datos iniciales que correspondan al entorno antes de iniciar sesión.

## Base existente

Haz una copia de seguridad y comprueba que las tablas y los triggers correspondan a la base inicial. Registra esa migración como aplicada, sin volver a ejecutar su SQL:

```bash
npx prisma migrate resolve --applied 0_init
```

Si alguno de los cambios posteriores ya existe, verifica su definición con `SHOW CREATE TABLE` y registra solamente la migración que coincida:

- `1_fk_entidad_viceministerio` apunta de `seguridad_entidad` a `riesgos_viceministerio` con la llave `(CODIGO_CIA, CODIGO_VICEMINISTERIO)`, `ON DELETE RESTRICT` y `ON UPDATE CASCADE`.
- `2_es_nuevo_riesgo` tiene `ES_NUEVO TINYINT(1) NOT NULL DEFAULT 0` después de `PERIODO_ANTERIOR`.

```bash
# Ejecuta cada comando solo si su cambio ya está presente en esta base.
npx prisma migrate resolve --applied 1_fk_entidad_viceministerio
npx prisma migrate resolve --applied 2_es_nuevo_riesgo
```

Aplica las migraciones pendientes con `npx prisma migrate deploy`. Comprueba las diferencias que Prisma puede representar con `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`. Revisa los triggers por separado con `SHOW TRIGGERS`.

## Desarrollo de migraciones

Actualiza `prisma/schema.prisma` y crea la migración en una base de desarrollo:

```bash
npx prisma migrate dev --name nombre_del_cambio
npx prisma generate
```

`migrate dev` reproduce el historial en una base sombra. Para que Prisma la cree y elimine, el usuario de migración necesita permisos para `CREATE DATABASE` y `DROP DATABASE`, además de los permisos para ejecutar las migraciones. Si la creación de bases está restringida, configura `SHADOW_DATABASE_URL` con una base sombra dedicada y permisos de esquema. `prisma.config.ts` la asigna a `shadowDatabaseUrl`. Prisma reinicia el esquema de la base sombra en cada uso, por lo que debe ser una base distinta de la base de la aplicación.

Para revisar SQL personalizado antes de aplicarlo, usa `npx prisma migrate dev --create-only --name nombre_del_cambio`. Agrega los triggers de auditoría en el SQL de la migración correspondiente. Para despliegues usa `npx prisma migrate deploy`, que no usa la base sombra.

Inicia el backend con `npm start` o, para recarga en desarrollo, `npm run devStart`.
