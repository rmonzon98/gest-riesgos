# Prompt 01 · Esquema de base de datos de MARN

> Etapa 1 de 10. Requiere la etapa 00. Lee primero `AGENTS.md` y `planificacion/MARN/02-modelo-datos.md` (secciones 1, 2 y 4). Reporte en `planificacion/MARN/entregas/01-esquema-marn.md`.

## Objetivo

Crear en Prisma **todos** los cambios de esquema de MARN, sin pantallas ni endpoints.

## Tareas

1. En `schema.prisma`, modela los cambios a tablas existentes de la **sección 1** de `02-modelo-datos.md`:
   - `riesgos_area.CODIGO_ENTIDAD` (nullable, FK a `seguridad_entidad`, índice `(CODIGO_CIA, CODIGO_ENTIDAD)`).
   - `riesgos_riesgo_extendido`: `OBJETIVO_TEXTO`, `CODIGO_EJE`, `EFICIENCIA_MITIGADOR` y `CODIGO_DUENO`.
   - `riesgos_colaborador_superior.CODIGO_SUPERIOR`.
   - `seguridad_menu_rol_usuario`: `FECHA_INICIO` y `FECHA_FIN`.
   - `seguridad_institucion_acceso_app.FECHA_INICIO_VIGENCIA`.
   - `riesgos_frecuencia.CORTES_ANIO`.
2. Modela las **12 tablas nuevas** de la **sección 2**, con los tipos, nulls, defaults y FKs exactos del documento. Llaves `AUTO_INCREMENT` más `CODIGO_CIA`. Columnas de auditoría.
3. Restricciones que Prisma no expresa: agrégalas en SQL en la misma migración.
   - `riesgos_plan_responsable`: `CHECK` de que haya `CODIGO_COLABORADOR` **o** `NOMBRE_EXTERNO`, no ambos.
   - `riesgos_plan_actividad.ESTADO IN ('P','V','O')`, `riesgos_solicitud_eliminacion.ESTADO IN ('P','A','D','C')`, `riesgos_plan_responsable.RECURSO IN ('I','E')`, `PORCENTAJE_MITIGACION BETWEEN 1 AND 100`.
   - Una sola solicitud de eliminación **pendiente** por riesgo: índice único sobre una columna generada, o validación en el backend si MariaDB no lo permite. Anota cuál usaste.
4. **Triggers de bitácora** (`trg_<tabla>_insert|update|delete`) para cada tabla nueva, copiando el formato de `trg_riesgos_area_*`.
5. **Datos iniciales**, en migración SQL idempotente:
   - `CORTES_ANIO` de las frecuencias existentes: semanal 52, quincenal 24, mensual 12, bimestral 6, trimestral 4, cuatrimestral 3, semestral 2, anual 1, "cuando se necesite" NULL. Busca por `DESCRIPCION`, no por código.
   - Las URLs nuevas en `seguridad_menu_urls` (aplicación 1), con las rutas de `03-pantallas.md`: `/mis-planes`, `/verificacion-actividades`, `/planes-viceministerio`, `/autorizaciones-eliminacion`, `/reasignar`, `/ejes-estrategicos`, `/glosario`. El detalle del riesgo **no** lleva URL de menú: hereda el permiso de la lista de riesgos.
   - Un permiso sin pantalla para "Eliminar riesgos sin autorización": usa una URL técnica `/permiso/eliminar-sin-autorizacion` y anótalo en el reporte.
   - **No** crees roles ni asignes URLs a roles: eso lo hace cada institución desde la administración.
6. Nombre de las migraciones: `3_marn_esquema`, `4_marn_triggers` y `5_marn_datos_iniciales` (o una sola si lo prefieres, explicándolo en el reporte).

## Criterios de aceptación

- `prisma validate`, `prisma generate` y `prisma migrate deploy` pasan sobre la base de la etapa 00.
- Los datos existentes no cambian (salvo `CORTES_ANIO` y las URLs nuevas).
- Insertar y actualizar una fila en cada tabla nueva deja su registro en `riesgos_logs`.
- Los `CHECK` rechazan valores inválidos (pruébalo y deja el resultado en el reporte).
- La aplicación actual sigue funcionando: `vite build` pasa y el backend arranca.

## Fuera de alcance

Endpoints, pantallas y cambios en controladores existentes.
