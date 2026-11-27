# Etapa 09 · Glosario y recorridos guiados

## Archivos y migración

- `backend/prisma/migrations/7_marn_glosario/migration.sql` agrega ocho términos con descripciones propias, activos y destacados, a las instituciones que todavía no tienen glosario.
- `glosarioMarn.js`, `recorridosMarn.js` y el router de MARN implementan el catálogo, el concepto destacado y los recorridos vistos.
- `Glosario.jsx`, `Home.jsx`, `RiesgosRoutes.jsx` y el menú integran el catálogo y la tarjeta de inicio. El permiso `/glosario` ya estaba registrado desde la etapa 01.
- `RecorridoGuiado.jsx` y `frontend/src/Riesgos/Recorridos/` integran cinco recorridos de cuatro a siete pasos. Los elementos se identifican con `data-tour`.
- `cargarObjetivosRiesgo` permite que la lista y el detalle abran en instituciones sin un catálogo de objetivos legados. El endpoint histórico conserva su contrato.

## Endpoints

| Método y ruta | Acceso |
|---|---|
| `GET /api/marn/glosario` y `POST /api/marn/glosario` | Usuario con la URL vigente `/glosario`. La consulta y el alta se limitan a la institución. |
| `PUT /api/marn/glosario/:termino` y `DELETE /api/marn/glosario/:termino` | Usuario con la URL vigente `/glosario`. La baja es lógica y el estado puede editarse en el formulario. |
| `GET /api/marn/glosario/destacado` | Usuario autenticado. Devuelve el concepto de su institución o `null` si no hay destacados activos. |
| `GET /api/marn/tour/vistos` y `POST /api/marn/tour/visto` | Usuario autenticado. Consulta o registra los recorridos mostrados a su propia persona. |

## Decisiones

- `react-joyride` 3.2.0 es la única dependencia directa nueva. Se carga al abrir la ayuda y proporciona posicionamiento, navegación por teclado, foco y controles localizados. La versión declara compatibilidad con React 18. [Ficha oficial de la versión](https://github.com/gilbarbara/react-joyride/tree/v3.2.0)
- Se guarda la primera fecha en que el recorrido muestra una indicación. El registro puede terminar aunque se cierre la página. El botón de ayuda puede abrir el recorrido de nuevo. La UI omite los pasos cuyos elementos no están disponibles por datos o permisos.
- El destacado se elige por orden de código con `díaDelAño % cantidad` y la fecha civil de Guatemala. La selección permanece estable durante el día mientras se conserva el conjunto de términos destacados.

## Verificación

- Pasaron `node --check`, las 14 pruebas de `npm test`, `prisma validate`, `prisma generate` y `vite build`. Vite mantuvo el aviso de archivos superiores a 500 kB.
- `prisma migrate deploy` aplicó la octava migración. Al repetir su SQL, el catálogo inicial conservó ocho términos y la institución que ya tenía un término propio conservó ese único término.
- La API comprobó el alta, la edición, la baja lógica, el permiso de edición, el aislamiento por institución y la lectura de Inicio para un usuario sin permiso de catálogo. También comprobó que dos consultas el mismo día devuelven el mismo término y que el selector avanza en dos fechas consecutivas, incluida una fecha bisiesta.
- Se abrieron los cinco recorridos en la interfaz y se confirmaron sus cinco registros en MariaDB. Mis planes se abrió automáticamente en la primera sesión. En una segunda sesión del navegador con cookies independientes no se abrió automáticamente y el botón de ayuda lo reabrió. La lista de riesgos conservó su registro al cambiar de página inmediatamente. Se observó la tarjeta de concepto destacado y el formulario del catálogo.
- El recorrido de detalle quedó verificado sobre una institución de prueba con catálogo de objetivos legados vacío.
