# AGENTS.md: gest-riesgos

Instrucciones para agentes de código (Codex u otros) que trabajen en este repositorio.

## Proyecto

Sistema de gestión de riesgos institucionales (metodología de la **Guía I – Informe Anual de Control Interno**). Se usa en varias instituciones dentro de una misma base, separadas por `CODIGO_CIA`.

- `backend/`: Node + Express (CommonJS). Entrada `index.js`. Rutas en `Routes/`, lógica en `Controller/`, servicios en `services/`.
- `frontend/`: React + Vite + MUI. Rutas en `src/Routes/RiesgosRoutes.jsx`. Pantallas en `src/Riesgos/`. Alias de import en `vite.config.mjs` (`api`, `funciones`, `Riesgos`, etc.).
- Base de datos: MariaDB, esquema `gestion_riesgos`.

## Trabajo actual: cliente MARN (rama `MARN`)

Antes de tocar código, **lee**:
1. `planificacion/MARN/01-decisiones.md`: qué se decidió y por qué.
2. `planificacion/MARN/02-modelo-datos.md`: tablas, columnas y reglas de negocio.
3. `planificacion/MARN/03-pantallas.md`: pantallas, rutas y menú.

Si algo del prompt contradice esos documentos, **detente y repórtalo**; no elijas tú. Si el diseño no cubre un caso, toma la opción más simple, déjala anotada en el reporte final y sigue.

## Reglas de backend

- **Autenticación:** todo router usa `router.use(verifyJWT)` (`services/verifyJWTUpd.js`). El middleware llena `req.codigo_cia`, `req.codigo_entidad` y `req.user`.
- **Aislamiento por institución:** toda consulta filtra por `CODIGO_CIA = req.codigo_cia`. Nunca aceptes `codigo_cia` del cliente.
- **Autorización en el servidor:** valida en el backend que el usuario puede ver o editar el recurso (su dirección, su rol, o que sea responsable o superior según corresponda). No confíes en que el frontend oculte botones.
- **ORM:** el código nuevo usa **Prisma** (cliente en `backend/prisma/client.js`, adaptador MariaDB). El código existente usa `mysql2` (`bd/mySQLConnection.js`); no lo reescribas salvo que el prompt lo pida.
- **SQL crudo:** si lo necesitas (`$queryRaw` o `mysql2`), siempre con parámetros. Nunca concatenes valores del request en el SQL.
- **Migraciones:** todo cambio de esquema va en una migración de Prisma (`backend/prisma/migrations/`). Nunca modifiques la base a mano ni edites una migración ya aplicada.
- **Bitácora:** `riesgos_logs` se llena con triggers `trg_<tabla>_insert|update|delete` (mira `trg_riesgos_area_*` en el dump). Toda tabla nueva lleva sus tres triggers en SQL dentro de su migración, con el mismo formato.
- **Auditoría:** las tablas nuevas tienen `USUARIO_CREACION`, `FECHA_CREACION`, `USUARIO_MODIFICACION` y `FECHA_MODIFICACION`; llénalos con `req.user` y la fecha del servidor.
- **Borrado lógico:** usa `ACTIVO = 0` o `ELIMINADO = 1`. No hagas `DELETE` de datos de negocio.
- **Respuestas:** sigue el formato de los controladores vecinos (`{ result }` / `{ error }` con códigos 400/403/404/500) y escribe los mensajes de error en español.
- Documenta cada función exportada con JSDoc, como en los controladores existentes.

## Reglas de frontend

- Llamadas HTTP solo con `apiClient` (`src/api/apiClient.js`).
- Las rutas nuevas van en `RiesgosRoutes.jsx` con `lazy()`. Su URL se registra en `seguridad_menu_urls` (con una migración) para poder asignarla a roles; protégelas con `RequirePermission` como las demás.
- Usa componentes MUI y el tema existente (`src/theme`); para tablas, `DataGrid` con `localeTextES`. No agregues otra librería de UI.
- Todo el texto visible va en español, con el vocabulario de la Guía I (probabilidad, severidad, riesgo inherente y residual, tolerancia, capacidad de mitigación, plan de acción).
- Fechas: usa los helpers de `src/funciones/Fechas.js`.

## Qué no hacer

- No hagas commit, push ni cambios de rama; deja los cambios en el árbol de trabajo.
- No toques `.env`, credenciales ni `backend/docs/` (archivos subidos).
- No reformatees archivos que no estás cambiando ni renombres carpetas existentes (tienen espacios, como `Evaluacion riesgos F`; respétalos).
- No agregues dependencias sin decirlo en el reporte y sin justificarlo.
- No cambies el comportamiento de los Anexos 1 y 2 ni de los reportes existentes, salvo que el prompt lo pida.

## Verificación obligatoria antes de terminar

```bash
# backend: sintaxis de todo lo que tocaste
node --check <archivo.js>
cd backend && npx prisma validate && npx prisma generate
# frontend
cd frontend && npx vite build
```

Si tienes una base local, aplica las migraciones (`npx prisma migrate deploy`) y prueba los endpoints nuevos.

## Reporte final (obligatorio)

Al terminar, escribe `planificacion/MARN/entregas/<NN>-<etapa>.md` con:
1. Archivos creados y modificados.
2. Migraciones agregadas y qué hace cada una.
3. Endpoints nuevos (método, ruta, quién puede usarlo).
4. Decisiones que tomaste porque el diseño no las cubría.
5. Lo que quedó pendiente o no pudiste verificar, y por qué.
6. Resultado de los comandos de verificación.
