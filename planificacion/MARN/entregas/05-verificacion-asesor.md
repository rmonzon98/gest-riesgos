# Etapa 05 · Verificación de actividades y vista del asesor

## Archivos y migraciones

- `backend/Controller/riesgos/verificacionMarn.js` y `backend/Routes/riesgos/detalleMarn.js` exponen la bandeja de verificación, las transiciones de estado y la consulta por viceministerio.
- `VerificacionActividades.jsx`, `PlanesViceministerio.jsx` y `VistaAdjunto.jsx` agregan las dos pantallas y la vista previa de archivos. `exportarPlanesViceministerio.js` genera el Excel con `ExcelFormato.js`.
- Las pantallas reutilizan `LineaCortes.jsx` y `ChatPlan.jsx`. `usePeriodosPlanes.js` comparte el selector de periodo con `MisPlanes.jsx`. `RiesgosRoutes.jsx`, `RequirePermission.jsx` y `UpdatedNavBar.jsx` integran las rutas y los permisos.
- Se reutilizaron las tablas y las URLs de la etapa 01. No se agregaron migraciones ni dependencias.

## Endpoints

| Método y ruta | Acceso |
|---|---|
| `GET /api/marn/verificacion/pendientes?periodo=` | Superiores con `/verificacion-actividades`, cada uno con sus actividades. Los usuarios con `/administracion` o `/administracion-direccion` pueden consultar la sección Sin superior asignado dentro de su ámbito. |
| `POST /api/marn/verificacion/verificar` | Superior asignado de cada actividad. Admite un código o una lista y un comentario opcional. La verificación del lote es atómica. |
| `POST /api/marn/verificacion/observar` | Superior asignado de la actividad pendiente. Requiere comentario. |
| `GET /api/marn/verificacion/colaboradores?periodo=&filtro=` | Superior con `/verificacion-actividades`. Incluye usuarios que supervisa y externos de cuyos dueños es superior. |
| `GET /api/marn/planes-viceministerio?periodo=&entidad=&estado=` | Asesor con `/planes-viceministerio`. Consulta de solo lectura para las direcciones de su viceministerio. |

## Decisiones

- Se usan las URLs existentes de administración para reconocer a los usuarios que gestionan responsables. Administración de dirección solo ve faltantes de la dirección propia. La sección de faltantes ofrece contexto para corregir la asignación y queda sin acciones de verificación ni acceso a sus adjuntos.
- Una actividad observada regresa a la bandeja cuando se corrige y vuelve a `P`. El lote comprueba las actividades antes de escribir, bloquea las asignaciones y vuelve a comprobarlas en la misma transacción.
- En la consulta del asesor, el filtro de estado selecciona asignaciones que tengan al menos un corte con ese estado. La vista previa cubre PDF, imágenes comunes, texto, DOCX y la primera hoja de XLSX. Los demás formatos se descargan.
- La maqueta solicita iniciar sesión. Se utilizó el diseño P-04 y P-05 del repositorio.

## Verificación

- `node --check`, las 14 pruebas de `npm test`, `prisma validate`, `prisma generate` y `vite build` pasaron. Vite reportó archivos superiores a 500 kB.
- En MariaDB, A vio las actividades de B y de un externo en un riesgo de B. D vio las de C. Un lote mixto de A con una actividad de C devolvió 403 con el código que falló, y ambas actividades de A permanecieron pendientes.
- Se verificaron el comentario obligatorio para observar, el retorno a pendiente al corregir y el 409 al editar o desactivar una actividad verificada. Administración vio la sección Sin superior. Se probaron los filtros de colaboradores, el archivo de una actividad autorizada y los rechazos de asesor sin viceministerio o con una dirección ajena.
- En el navegador, verificar una selección retiró la fila de la bandeja sin recargar. La vista del asesor mostró los planes y los cortes del viceministerio autorizado. La espera del evento de descarga se interrumpió en la automatización del navegador. El generador de Excel se verificó en memoria al reabrir el XLSX y comprobar sus filas, porcentaje, encabezado institucional y orientación horizontal.
