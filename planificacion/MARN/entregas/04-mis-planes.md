# Etapa 04 · Cumplimiento, Mis planes y actividades

## Archivos y migraciones

- `backend/services/cumplimientoPlanes.js` implementa el calendario, la clasificación y el resumen. `backend/tests/cumplimientoPlanes.test.js` y el script `npm test` verifican el cálculo sin base de datos.
- `backend/services/planesSeguimiento.js` comparte el cálculo con el detalle y la lista de riesgos. `backend/Controller/riesgos/actividadesMarn.js` y `backend/Routes/riesgos/detalleMarn.js` exponen Mis planes, actividades y chat.
- `backend/services/archivosPlanes.js` guarda los adjuntos y compensa una escritura fallida. `backend/services/paths.js`, `backend/index.js` y `backend/Controller/riesgos/archivos.js` reservan la descarga de estos documentos a la ruta que verifica la asignación.
- `MisPlanes.jsx`, `LineaCortes.jsx`, `ActividadesPlan.jsx` y `ChatPlan.jsx` implementan el resumen, la línea de cortes, el panel de actividades, el modal de registro y el chat. `PlanesRiesgo.jsx`, `TablaRiesgosBasica.jsx`, `RiesgosRoutes.jsx` y `UpdatedNavBar.jsx` incorporan el cumplimiento a las pantallas existentes y registran Mis planes en Monitoreo.
- Se reutilizaron la URL `/mis-planes` y las tablas de la etapa 01. No se agregaron migraciones ni dependencias.

## Endpoints

Todas las rutas llevan el prefijo `/api/marn` y requieren sesión.

| Método y ruta | Acceso |
|---|---|
| `GET /mis-planes?periodo=` | Usuarios con `/mis-planes`. Devuelve sus asignaciones internas activas y las externas de los riesgos de los que son dueños. |
| `GET /asignaciones/:asignacion/actividades?corte=` | Responsable o dueño que representa al externo, su superior y operador autorizado de la dirección para un externo. |
| `POST /asignaciones/:asignacion/actividades` | Responsable interno, o dueño u operador autorizado cuando el responsable es externo. Admite hasta 10 adjuntos de 50 MB. |
| `PUT` y `DELETE /asignaciones/:asignacion/actividades/:actividad` | Mismo acceso de escritura. Las actividades verificadas devuelven 409. |
| `GET /asignaciones/:asignacion/actividades/:actividad/documentos/:documento` | Los mismos permisos de consulta de la actividad. |
| `GET` y `POST /asignaciones/:asignacion/chat`, `PATCH /asignaciones/:asignacion/chat/leidos` | Responsable interno o dueño que representa al externo, y su superior asignado. |

## Decisiones

- Una actividad verificada hace cumplir el corte. Si hay actividades pendientes u observadas, el corte queda `por_verificar` incluso si ya cerró. Una actividad observada conserva `O` y se señala con un punto rojo. Al editarla vuelve a `P`.
- Los días y el tiempo de registro se comparan con la fecha civil de Guatemala. El periodo inicial abarca el día actual, si está configurado. Para registrar dentro de un corte cerrado, el formulario propone el último día del corte y permite seleccionar cualquier fecha dentro de él.
- La proporción de cumplimiento usa el número de cortes cumplidos dividido entre los cortes cerrados. Sin cortes cerrados, el porcentaje se muestra sin valor. La frecuencia «Cuando se necesite» permite registrar actividades sin cortes.
- El permiso de operador para actividades externas se comprueba con la URL de entrada de evaluación de riesgos y la dirección dueña. El chat queda limitado a los dos participantes designados.
- El comando literal `node --test tests/` falla en Node 24.14.1 al intentar cargar el directorio como módulo. El script usa `node --test "tests/*.test.js"`.
- La maqueta de Claude solicita iniciar sesión. La estructura visual se implementó según P-03 del diseño del repositorio.

## Verificación

- Pasaron las 14 pruebas de `npm test`, `node --check`, `prisma validate`, `prisma generate`, `prisma migrate deploy` en la copia aislada y `vite build`. Vite conserva el aviso por archivos mayores de 500 kB.
- Se probaron las asignaciones propias y externas, el alcance por usuario, el registro tardío, la descarga por el responsable y el superior, y el rechazo de acceso por otras cuentas. El archivo se leyó en `docs/entidad{CIA}/planes/{PERIODO}/{CODIGO_PLAN}/{timestamp}__{nombre}` usando un directorio temporal.
- El corte cerrado con `P` u `O` apareció `por_verificar`. Al editar el registro `O` pasó a `P`. El registro `V` se mostró cumplido y rechazó edición y baja. La lista de riesgos devolvió el 2,78 % esperado para 1 corte cumplido entre 36 cerrados.
- Se verificaron el envío, la lectura en ambos sentidos y el contador de no leídos. En el navegador se comprobó el periodo vigente por defecto, el panel del corte, la etiqueta «Fuera de plazo», el adjunto y el hilo del chat.

La base habitual y el directorio de documentos del proyecto se conservaron. Se usó una instancia desechable para las verificaciones.
