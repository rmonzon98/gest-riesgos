# Prompts de desarrollo MARN (Codex)

Cada etapa es **un prompt para una sesión de Codex**. Codex lee `AGENTS.md` en la raíz, que tiene las reglas comunes, el contexto y la verificación obligatoria. Por eso el prompt de cada etapa solo trae lo propio.

| Etapa | Prompt | Depende de | Qué entrega |
|---|---|---|---|
| 00 | [00-base-prisma.md](00-base-prisma.md) | — | Prisma con MariaDB como base; quita sequelize; baseline con triggers. |
| 01 | [01-esquema-marn.md](01-esquema-marn.md) | 00 | Todas las tablas y columnas nuevas, triggers y URLs de menú. |
| 02 | [02-riesgo-detalle.md](02-riesgo-detalle.md) | 01 | Áreas por dirección, ejes, objetivo libre, dueño, eventos y página de detalle. |
| 03 | [03-planes-vinculos.md](03-planes-vinculos.md) | 02 | Planes, responsables (usuario o externo) y vínculos. |
| 04 | [04-mis-planes.md](04-mis-planes.md) | 03 | Servicio de cortes con pruebas, Mis planes, actividades y chat. |
| 05 | [05-verificacion-asesor.md](05-verificacion-asesor.md) | 04 | Bandeja del superior y vista del asesor. |
| 06 | [06-continuidad-reasignar-eliminar.md](06-continuidad-reasignar-eliminar.md) | 05 | Continuidad con planes, Reasignar y autorización de eliminación. |
| 07 | [07-responsables-roles-licencias.md](07-responsables-roles-licencias.md) | 01 (y 04 para probar) | Superior como usuario, cargos, vigencia de roles y licencias. |
| 08 | [08-dashboard-reportes.md](08-dashboard-reportes.md) | 04, 05 | Vinculados en reportes, métricas, inicio y 7 reportes de planes. |
| 09 | [09-glosario-recorridos.md](09-glosario-recorridos.md) | 01 | Glosario y recorridos guiados. |

Falta la migración de datos desde el portal de MARN: necesita su propio documento de diseño (`04-migracion.md`) antes de tener prompt.

## Cómo usar cada prompt

1. Asegúrate de que la etapa anterior esté **revisada y commiteada** en `MARN`.
2. Abre Codex en la raíz del repositorio, en la rama `MARN`, y pega el contenido del prompt.
3. Codex deja los cambios sin commit y escribe su reporte en `planificacion/MARN/entregas/NN-*.md`.
4. Pídeme la revisión: "revisa la entrega NN".

## Cómo reviso cada entrega

1. Leo el reporte de Codex y el `git diff` completo de la etapa.
2. Compruebo el prompt punto por punto: cada tarea y cada criterio de aceptación, cumplido o no.
3. Reviso con especial cuidado:
   - **Seguridad:** filtro por `CODIGO_CIA`, autorización en el backend (403), SQL parametrizado, rutas de archivos sin path traversal.
   - **Datos:** que la migración sea reversible o al menos segura sobre la base actual, con triggers de bitácora, transacciones donde el prompt las pide y sin `DELETE` de datos de negocio.
   - **No regresión:** que los Anexos 1 y 2, los reportes existentes y el cálculo de inherente, residual y tolerancia sigan igual.
   - **Coherencia con el diseño:** nombres, estados y reglas de `02-modelo-datos.md`.
4. Corro `node --check`, `npm test`, `prisma validate` y `vite build`.
5. Te entrego la lista de hallazgos por severidad y te propongo: corregirlos yo, devolverlos a Codex con un prompt de corrección, o aceptar la etapa.
