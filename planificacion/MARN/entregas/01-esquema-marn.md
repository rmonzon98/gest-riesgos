# Etapa 01 · Esquema de MARN

## Archivos y migraciones

| Archivo | Cambio |
|---|---|
| `backend/prisma/schema.prisma` | Seis tablas existentes ampliadas y doce tablas nuevas según las secciones 1 y 2 del modelo. Las relaciones por institución usan llaves compuestas. |
| `backend/prisma/migrations/3_marn_esquema/migration.sql` | Crea las columnas, tablas, índices, FKs y restricciones de dominio y unicidad condicional. |
| `backend/prisma/migrations/4_marn_triggers/migration.sql` | Instala 36 triggers de bitácora para INSERT, UPDATE y DELETE. Conserva la forma de `riesgos_area`: `registro` para altas y bajas, y `antes` y `despues` para cambios. |
| `backend/prisma/migrations/5_marn_datos_iniciales/migration.sql` | Carga `CORTES_ANIO` por descripción y registra las siete URLs de pantallas y el permiso técnico `/permiso/eliminar-sin-autorizacion` en la aplicación 1. |

## Decisiones

- `seguridad_persona_tour` conserva la llave `(CODIGO_CIA, CODIGO_COLABORADOR, PANTALLA)`. Las otras once tablas tienen un código autoincremental y `CODIGO_CIA` en su llave primaria.
- Las columnas generadas de MariaDB y sus índices únicos impiden simultáneamente dos solicitudes pendientes por riesgo, dos vínculos activos equivalentes y dos cargos vigentes por persona. Los registros históricos siguen admitidos. Prisma conserva los índices en su esquema y omite las columnas técnicas del cliente mediante `@ignore`.
- La auditoría usa `FECHA_CREACION` obligatoria con valor por defecto del servidor. Las columnas de autor y modificación aceptan `NULL`, en línea con el patrón de documentos existente.
- Cada institución crea los roles y asigna las URLs desde la administración. El detalle del riesgo hereda el permiso de la lista. Los datos iniciales registran URLs solo cuando existe la aplicación 1 y conservan sus entradas previas.
- Las restricciones de código de estado y recurso usan comparación binaria para rechazar también las variantes en minúsculas.

## Endpoints

Esta etapa se limita al esquema y los datos iniciales. No se agregaron endpoints ni se modificaron controladores o pantallas.

## Verificación

- MariaDB 10.3.27, con una copia restaurada del dump y migrada a la etapa 00. `prisma migrate deploy` aplicó las tres migraciones nuevas.
- Se compararon las huellas de los registros previos de 46 tablas usando sus columnas originales. Los registros se conservaron. Se comprobaron los nueve valores de `CORTES_ANIO` y las ocho URLs nuevas. Los triggers previos registraron las operaciones de datos iniciales en la bitácora.
- Se ejecutó dos veces el SQL de datos iniciales. La segunda ejecución dejó intactos los conteos de URLs y bitácoras.
- Se contaron 150 triggers en total. Inserción y actualización dejaron autor y JSON de auditoría en las doce tablas nuevas. Una eliminación en eventos registró la imagen anterior.
- Se rechazaron ambos responsables o ninguno, recursos y estados inválidos, mitigaciones de 0 y 101, una segunda solicitud pendiente, un vínculo activo duplicado sin área, un segundo cargo vigente, un tour duplicado y una referencia a otra institución. Se aceptaron estados históricos y se permitió una nueva solicitud o vínculo después de cerrar el activo anterior.
- `prisma validate`, `prisma generate` y `prisma migrate diff` pasaron. No hubo diferencias entre el esquema y la base migrada ni entre el esquema y el historial reproducido en una base sombra.
- Se verificaron altas con `AUTO_INCREMENT` y rollback desde el cliente Prisma. El backend arrancó, con `/healthz` en 200 y `/me` anónimo en 401. Emitió un aviso de dependencia circular.
- `npx vite build` pasó con un aviso por archivos JavaScript mayores de 500 kB. No hubo archivos JavaScript de aplicación modificados que requirieran `node --check`.

La base habitual no se migró. Las verificaciones se ejecutaron en una instancia aislada de MariaDB.
