# Etapa 02 · Riesgo y página de detalle

## Archivos modificados

- `backend/Controller/riesgos/areas.js` y `backend/Routes/riesgos/areas.js` conservan las respuestas del catálogo y agregan `codigoEntidad` a la escritura y `entidad` al filtro. Las escrituras requieren la URL `/areas` asignada al usuario.
- `backend/Controller/riesgos/riesgosVariables.js` agrega dueño y conteo de eventos a la lista, inicializa el dueño con el usuario de la sesión y conserva los campos no incluidos en la versión activa. Valida nuevas selecciones de área y eje dentro de la institución.
- `backend/Controller/riesgos/detalleMarn.js`, `backend/Routes/riesgos/detalleMarn.js`, `backend/services/detalleRiesgos.js`, `backend/services/permisosRiesgos.js` y `backend/index.js` conectan los endpoints Prisma de detalle, eventos y catálogos bajo `/api/marn`.
- `backend/Controller/riesgos/reportesFinalizados.js` agrega a las dos proyecciones de matriz los valores de objetivo específico y eje para versiones que los incluyan. La matriz sigue usando su columna `Evento`.
- En el frontend, `RiesgoDetalle.jsx` presenta las pestañas del diseño. `IngresoRiesgos.jsx` y `TablaRiesgosBasica.jsx` agregan navegación, dueño y eventos en la evaluación de riesgos. La creación rápida reutiliza el formulario existente. El formulario compartido reutiliza `CalculoRiesgo.js` desde el modal y la pestaña Datos. `catalogosRiesgo.js` comparte la normalización de catálogos y `useBusquedaMarn.js` controla las búsquedas asíncronas.
- `AreasMain.jsx`, `FormArea.jsx` y `EjesEstrategicos.jsx` agregan los catálogos de MARN. `RiesgosRoutes.jsx`, `UpdatedNavBar.jsx` y `RequirePermission.jsx` registran las rutas y el acceso al catálogo de ejes. `MantenimientoReportes.jsx` ofrece objetivo específico y eje como propiedades de la versión.

## Migración

`6_eventos_historial` amplía `riesgos_riesgo_extendido.EVENTO` a `LONGTEXT` para guardar la lista completa de eventos como texto. Los nombres y la nulabilidad se conservan. Reinstala los tres triggers existentes del riesgo con el formato anterior e incorpora objetivo específico, eje, dueño y eficiencia a la bitácora.

## API

| Método y ruta | Acceso |
|---|---|
| `GET /api/marn/riesgo/:entidad/:periodo/:codigo` | Usuario de la dirección con permiso de la lista o usuario con permiso de vista institucional. |
| `GET /api/marn/riesgo/:entidad/:periodo/:codigo/eventos` | Igual que el detalle. |
| `POST /api/marn/riesgo/:entidad/:periodo/:codigo/eventos` | Dirección dueña con permiso de la lista, para un riesgo editable. |
| `PUT /api/marn/riesgo/:entidad/:periodo/:codigo/eventos/:evento` | Igual que el alta de eventos. |
| `PUT /api/marn/riesgo/:entidad/:periodo/:codigo/eventos/orden` | Igual que el alta. Recibe la lista completa de códigos en el orden nuevo. |
| `DELETE /api/marn/riesgo/:entidad/:periodo/:codigo/eventos/:evento` | Igual que el alta. Desactiva el evento. |
| `GET /api/marn/objetivos-historicos?q=` | Usuarios con acceso a la lista o a la vista institucional. Tres caracteres como mínimo y hasta veinte objetivos distintos. |
| `GET /api/marn/duenos?q=` | Usuarios con `/reasignar`. Devuelve personas activas de la institución. |
| `GET` y `POST /api/marn/ejes-estrategicos`, `PUT /api/marn/ejes-estrategicos/:eje` y `PATCH /api/marn/ejes-estrategicos/:eje/estado` | Usuarios con `/ejes-estrategicos`. |

## Decisiones

- El detalle hereda el permiso de `/evaluacion-gestion-riesgos`. `/riesgos-institucional` concede consulta de otras direcciones. El cambio de dueño requiere `/reasignar`. Un riesgo aprobado por el superior o eliminado solo admite consulta en el detalle.
- El texto `EVENTO` de un riesgo histórico se presenta como un evento y se convierte en registro durante la primera escritura de eventos. La transacción bloquea el riesgo, aplica la operación y sincroniza el texto que consumen los reportes. Las bajas son lógicas.
- Las pestañas Planes y responsables y Vínculos mantienen los textos de disponibilidad solicitados para esta etapa.

## Verificación

- `node --check`, `prisma validate`, `prisma generate`, `prisma migrate deploy` y `vite build` pasaron. Vite reportó archivos mayores de 500 kB. El historial reproducido en la base sombra y `schema.prisma` no presentan diferencias.
- Se verificó con HTTP la edición de un riesgo previo y la conservación de referencia, área, evento y campos de MARN. La vista institucional permitió consultar desde otra dirección en modo lectura. Un usuario de otra dirección sin ese permiso recibió 403. Un riesgo aprobado rechazó nuevas escrituras de eventos.
- Se probaron el filtro de áreas, alta y edición de ejes, cambio de estado y restricción por rol. También se probaron el dueño por defecto, la reasignación autorizada, la búsqueda de objetivos y la escritura condicionada por la versión. Enviar eficiencia en el request dejó su valor intacto.
- Se agregaron, editaron, desactivaron y reordenaron eventos. La matriz recibió la lista ordenada exacta, de más de 1000 caracteres. El conteo de la lista y la bitácora reflejaron las operaciones. En el navegador se vieron las cinco pestañas y los campos de objetivo y eje configurados. Se registró un evento que apareció en Historial.

| Probabilidad | Severidad | Código de capacidad | Variable | Inherente | Residual | Tolerancia visual |
|---:|---:|---:|:---:|---:|---:|---|
| 5 | 4 | 3 | P | 20 | 12 | Gestionable |
| 4 | 5 | 4 | S | 20 | 8 | Tolerable |
| 4 | 4 | 1 | P | 16 | 16 | No tolerable |

La base habitual no se migró. Se usó una copia aislada para las verificaciones.
