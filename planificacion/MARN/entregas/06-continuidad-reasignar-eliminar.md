# Etapa 06 · Continuidad, reasignación y autorización de eliminación

## Archivos y migraciones

- `backend/Controller/riesgos/seguimientos.js` y `backend/services/continuidadPlanes.js` copian el riesgo y sus dependencias activas. Se conserva una sola conexión y transacción de mysql2 para esta operación.
- `reasignacionMarn.js`, `solicitudesEliminacion.js` y el router de MARN agregan reasignación, bandeja y gestión de solicitudes. `detalleMarn.js` incorpora el historial. `riesgosVariables.js` protege la eliminación directa y devuelve los permisos y la marca de solicitud pendiente en la lista. `permisosRiesgos.js` y `detalleRiesgos.js` verifican los permisos vigentes.
- `Reasignar.jsx`, `AutorizacionesEliminacion.jsx` y `DialogoEliminacion.jsx` agregan las pantallas y el diálogo. El detalle y la lista de evaluación muestran el estado de la solicitud. Las rutas están en `RiesgosRoutes.jsx` y el menú en `UpdatedNavBar.jsx`.
- Se reutilizaron las tablas, los triggers y las URLs de la etapa 01. No hubo migraciones ni dependencias nuevas.

## Endpoints

| Método y ruta | Acceso |
|---|---|
| `POST /api/seguimientos-actualizados/copiar-riesgo-proximo-periodo` | Flujo existente de continuidad de la dirección de la sesión. |
| `GET /api/marn/reasignar/catalogos` | Usuario con asignación vigente de `/reasignar`. |
| `GET` y `PATCH /api/marn/reasignar/riesgos` | Usuario con asignación vigente de `/reasignar`. Filtra por dirección, periodo y área opcional. |
| `GET` y `PATCH /api/marn/reasignar/responsabilidades` | Usuario con asignación vigente de `/reasignar`. Las responsabilidades de origen deben seguir activas. |
| `POST /api/marn/riesgo/:entidad/:periodo/:codigo/solicitudes-eliminacion` | Usuario con permiso de la lista de evaluación y de la dirección dueña. |
| `GET /api/marn/autorizaciones-eliminacion?estado=` y `PATCH /api/marn/autorizaciones-eliminacion/:solicitud` | Usuario con asignación vigente de `/autorizaciones-eliminacion`. |
| `PATCH /api/marn/solicitudes-eliminacion/:solicitud/cancelar` | Persona que creó la solicitud pendiente. |
| `PUT /api/riesgos-variables-actualizados/eliminar` | Usuario de la dirección dueña con la URL técnica vigente `/permiso/eliminar-sin-autorizacion`. |

## Decisiones

- Cada plan copiado señala a su plan anterior. Las fechas se desplazan al año del periodo destino y MariaDB ajusta el 29 de febrero al 28 cuando corresponde. Se conserva el texto del evento para los riesgos históricos y se copian los eventos activos en orden.
- El riesgo se bloquea antes de crear o resolver una solicitud. La restricción de la etapa 01 impide duplicar una solicitud pendiente. La cancelación se ofrece desde Historial y la bandeja abre por defecto en Pendientes.
- La autorización y la eliminación lógica comparten transacción. Las actividades previas a una reasignación conservan su autor.

## Verificación

- Pasaron `node --check`, las 14 pruebas de `npm test`, `prisma validate`, `prisma generate` y `vite build`. Vite mantuvo el aviso de archivos mayores a 500 kB. `prisma migrate deploy` confirmó las siete migraciones aplicadas en la instancia desechable.
- Se comprobó la copia de dos planes, tres responsables, dos eventos y un vínculo. El nuevo riesgo conservó dueño, eje y referencia de origen. Los responsables pasaron del 29 de febrero de 2024 al 28 de febrero de 2025 y quedaron sin actividades ni mensajes. Un fallo inyectado al copiar el vínculo revirtió el riesgo y el plan ya escritos.
- Se reasignaron cinco responsabilidades y dos dueños. Las cinco aparecieron en Mis planes de la persona destino y desaparecieron de la persona origen. Se comprobó el autor original de la actividad, el autor del cambio registrado en la bitácora y el rechazo al usuario con rol vencido.
- La API rechazó la eliminación directa sin el permiso. Se comprobaron el motivo obligatorio, la solicitud única, el rechazo al cancelar la solicitud de otra persona, el historial, la denegación sin eliminar, la autorización con eliminación lógica y el restablecimiento.
- Los triggers heredados calculan el código de bitácora con `MAX(CODIGO_LOG) + 1`. Durante la preparación se observó una colisión entre escrituras simultáneas para la misma institución. Se prepararon los datos de la prueba secuencialmente.

## Corrección en la revisión

La eliminación directa pasó a exigir `/permiso/eliminar-sin-autorizacion` en todas las instituciones, pero la etapa 01 solo registraba la URL. Sin ninguna asignación, las instituciones existentes habrían perdido la eliminación directa. La migración `8_permiso_eliminar_directo` asigna el permiso a los roles que ya tienen `/evaluacion-gestion-riesgos`. Es idempotente y se verificó sobre una copia del dump: los 2 roles con la lista recibieron el permiso. Las instituciones nuevas, como MARN, no lo reciben y usan el flujo de autorización.
