# Etapa 03 · Planes de acción, responsables y vínculos

## Archivos modificados

- `backend/Controller/riesgos/planesMarn.js` agrega planes, responsables, buscador de personas y vínculos mediante Prisma. `backend/Routes/riesgos/detalleMarn.js` registra sus rutas bajo `/api/marn`.
- `backend/services/detalleRiesgos.js` centraliza la autorización y la transacción de escritura del riesgo. `backend/Controller/riesgos/detalleMarn.js` reutiliza esa regla para eventos y permite que una dirección vinculada consulte el detalle.
- `backend/Controller/riesgos/riesgosVariables.js` incluye riesgos vinculados, el nombre de la dirección dueña y el número de planes en la lista. El año de origen se calcula por dirección dueña.
- `PlanesRiesgo.jsx`, `VinculosRiesgo.jsx` y `RiesgoDetalle.jsx` incorporan las dos pestañas, con tablas y formularios MUI. `TablaRiesgosBasica.jsx` agrega Planes y la etiqueta de vínculo.

## Migraciones

Se reutilizaron las tablas, los índices y los triggers de la etapa 01. Esta etapa no agrega migraciones.

## API

El prefijo `R` representa `/api/marn/riesgo/:entidad/:periodo/:codigo`.

| Método y ruta | Operación y acceso |
|---|---|
| `GET R/planes` | Lista planes activos y sus responsables. Dirección dueña, dirección vinculada o acceso institucional. |
| `POST R/planes` y `PUT R/planes/:plan` | Crea o edita una acción y su porcentaje. Dirección dueña, permiso de la lista y riesgo editable. |
| `DELETE R/planes/:plan` | Desactiva un plan bajo la misma regla de escritura. |
| `POST R/planes/:plan/responsables` y `PUT R/planes/:plan/responsables/:responsable` | Guarda un responsable usuario o externo bajo la misma regla de escritura. |
| `DELETE R/planes/:plan/responsables/:responsable` | Baja lógica bajo la misma regla. Devuelve 409 si tiene actividades verificadas. |
| `GET /api/marn/usuarios?q=` | Busca personas activas de la institución y devuelve nombre, dirección y cargo vigente. Requiere acceso a la evaluación de riesgos o a Reasignar. |
| `GET R/vinculos` | Lista vínculos activos con los permisos de lectura del riesgo. |
| `POST R/vinculos` y `DELETE R/vinculos/:vinculo` | Agrega o desactiva un vínculo bajo la misma regla de escritura. |

## Decisiones y pendientes

- La interfaz presenta una tabla de planes con una sección desplegable para los responsables del plan seleccionado. Valida la selección de usuario o los datos de la persona externa y envía solo el grupo correspondiente.
- El año de las fechas se toma del inicio configurado para el periodo. Si falta el inicio, se usa el código del periodo. La baja de un plan conserva sus responsables y su historial en la base.
- La columna Cortes queda vacía hasta la etapa 04. La inclusión de vinculados en los reportes y métricas por dirección queda para la etapa 08.

## Verificación

- `node --check`, `prisma validate`, `prisma generate` y `vite build` pasaron. Vite conserva el aviso de archivos mayores de 500 kB.
- Dos cuentas sintéticas de direcciones distintas verificaron alta, edición y baja lógica. Se guardaron y recargaron un responsable usuario de otra dirección y uno externo, con sus datos correctos. El buscador devolvió el cargo vigente.
- La API rechazó porcentajes fuera de 1–100, fechas inválidas o fuera del periodo y datos incompatibles de usuario/externo. La baja de un responsable con una actividad verificada devolvió 409.
- Se verificaron rechazo de vínculos duplicados y de áreas ajenas, lectura desde la dirección vinculada, 403 en las mutaciones y revocación de la consulta al retirar el vínculo.
- En el navegador, la dirección vinculada vio el plan y el vínculo en solo lectura. Su lista mostró la etiqueta de la dirección dueña y ocultó las acciones de edición y baja.

Las pruebas se ejecutaron sobre la copia aislada de MariaDB.
