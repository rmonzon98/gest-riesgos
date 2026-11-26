# Prompt 06 · Continuidad con planes, reasignar y autorización de eliminación

> Etapa 6 de 10. Requiere la etapa 05. Lee `AGENTS.md`, `01-decisiones.md` (11, 13, 14 y P3), `02-modelo-datos.md` (2.4, 2.10 y **3.2**) y `03-pantallas.md` (P-01, P-06 y P-07). Reporte en `planificacion/MARN/entregas/06-continuidad-reasignar-eliminar.md`.

## 1. Continuidad (cambia `seguimientos.js` → `copiarSiguientePeriodo`)

Al copiar un riesgo al siguiente periodo, copia también, en la **misma transacción**:
- los eventos activos;
- los planes activos, con `CODIGO_PLAN_ANTERIOR` apuntando al original;
- los responsables activos, con las mismas personas o externos, frecuencia, método y recurso, y **fechas movidas al año nuevo** (mismo día y mes; si era 29 de febrero y el año nuevo no es bisiesto, 28 de febrero);
- los vínculos activos;
- el dueño y el eje.

**No** copies actividades, documentos ni mensajes.

Hoy ese endpoint usa `mysql2`. Puedes seguir con `mysql2` en esa función para no partir la transacción, o pasar toda la función a Prisma. Elige una de las dos, sin mezclarlas en la misma transacción, y explícalo en el reporte.

Respeta el comportamiento actual de `ES_NUEVO`, `PERIODO_ANTERIOR` y año de origen (PR #12).

## 2. Reasignar (P-07, Administración, ruta `reasignar`)

1. **Dueño de riesgos:** con filtros de dirección, área y periodo, selección múltiple y "Asignar a…" (buscador de usuarios). Actualiza `CODIGO_DUENO`.
2. **Responsables de planes:** se elige la persona de origen y se ven sus `riesgos_plan_responsable` activos (de usuario). Se marcan y se pasan a otra persona (`CODIGO_COLABORADOR`).
   - Las actividades ya registradas **siguen** con su autor original. Solo cambia quién registra desde ahora.
3. Solo con el rol que tenga la URL `/reasignar`; valida en el backend que el usuario tenga esa URL asignada y vigente.
4. Todo queda en `riesgos_logs` por los triggers (verifica que el `USUARIO_MODIFICACION` sea quien reasigna).

## 3. Autorización de eliminación (P-06 y P-01)

1. **Solicitar:** si el usuario **no** tiene el permiso `/permiso/eliminar-sin-autorizacion`, el botón "Eliminar" de la lista y del detalle pasa a "Solicitar eliminación" (motivo obligatorio).
   - Crea `riesgos_solicitud_eliminacion` en estado `P`.
   - Solo una pendiente por riesgo.
   - El riesgo muestra la etiqueta "Eliminación solicitada".
2. **Eliminar directo:** quien **sí** tiene el permiso elimina como hoy (`ELIMINADO=1`).
3. **Bandeja** `autorizaciones-eliminacion` (Administración, rol con esa URL):
   - Tabla filtrable por estado.
   - **Autorizar** (comentario opcional): pone `ELIMINADO=1` en el riesgo y `A` en la solicitud, en la **misma transacción**.
   - **Denegar** (comentario obligatorio).
4. **Cancelar:** el solicitante puede cancelar su solicitud pendiente (`C`).
5. **Historial:** las solicitudes se ven en la pestaña Historial del detalle.
6. **Restablecer** sigue igual que hoy.

## Criterios de aceptación

- Copiar un riesgo con 2 planes y 3 responsables (uno externo) crea todo en el nuevo periodo con fechas correctas y sin actividades. Si falla un paso, no queda nada a medias.
- Reasignar 5 responsabilidades de A a B: B las ve en Mis planes y A ya no. Las actividades viejas conservan su autor.
- Un usuario sin el permiso no puede eliminar por API (403) y sí puede solicitar.
- Autorizar elimina el riesgo; denegar no lo toca.
- `npm test` y `vite build` pasan.
