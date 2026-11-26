# Prompt 03 · Planes de acción, responsables y vínculos

> Etapa 3 de 10. Requiere la etapa 02. Lee `AGENTS.md`, `01-decisiones.md` (8, 12, 13 y diseños 3, 4 y 4b en `02-modelo-datos.md` 2.5), `02-modelo-datos.md` (2.3–2.5) y `03-pantallas.md` (P-02 pestañas Planes y Vínculos, y P-01). Reporte en `planificacion/MARN/entregas/03-planes-vinculos.md`.

## Backend (Prisma)

1. **Planes:** listar los de un riesgo (con responsables), crear, editar y desactivar. Valida `PORCENTAJE_MITIGACION` entre 1 y 100.
2. **Responsables de plan:** crear, editar y desactivar.
   - Tipo **usuario**: `CODIGO_COLABORADOR` de **cualquier dirección** de la institución, activo.
   - Tipo **externo**: `NOMBRE_EXTERNO` + `PUESTO_EXTERNO`.
   - Valida `FECHA_INICIO <= FECHA_FIN` y que ambas caigan dentro del año del periodo. Si no, error claro.
   - **No se puede desactivar** un responsable con actividades verificadas: responde 409 con mensaje. (La tabla de actividades existe desde la etapa 01; en esta etapa estará vacía, pero deja la regla.)
3. **Buscador de usuarios** para elegir responsable: `GET` con `q` (mínimo 3 caracteres) sobre personas activas de la institución. Devuelve nombre, dirección y cargo vigente si existe.
4. **Vínculos:** listar, crear y desactivar. Valida que la dirección vinculada sea distinta de la dueña y que el área pertenezca a esa dirección (o sea general). Sin duplicados activos.
5. **Visibilidad de vinculados:** la lista de riesgos de una dirección incluye los riesgos vinculados a ella con `vinculado: true` y el nombre de la dirección dueña.
   - Son de **solo lectura** para la dirección vinculada: el backend rechaza su edición con 403.
   - **Reportes y métricas:** déjalo anotado en el reporte. Se resuelve en la etapa 08, no lo cambies aquí.
6. **Permisos de edición:** planes, responsables y vínculos se editan con la misma regla que el riesgo (dirección dueña, rol y estado de aprobación).

## Frontend

1. **Pestaña Planes y responsables** en `RiesgoDetalle`:
   - Tabla de planes expandible, con los responsables dentro, como en la maqueta.
   - Modal de plan (acción, %).
   - Modal de responsable con el selector **Usuario / Externo**, buscador de usuarios, frecuencia, método, recurso (Interno/Externo) y fechas (por defecto, 1 de enero a 31 de diciembre del periodo).
   - Columna "Cortes" en blanco por ahora (llega en la etapa 04).
2. **Pestaña Vínculos:** tabla y modal "Vincular" (dirección → áreas de esa dirección o generales). Aviso sobre visibilidad.
3. **Lista de riesgos (P-01):**
   - Columna Planes (#).
   - Etiqueta "Vinculado de {dirección}" en solo lectura; la fila abre el detalle en modo lectura.

## Criterios de aceptación

- Un plan con 2 responsables (uno usuario de otra dirección y uno externo) se guarda y se vuelve a cargar bien.
- El `CHECK` usuario/externo nunca se dispara desde la UI (la validación previa lo evita).
- La dirección vinculada ve el riesgo y no puede editarlo (403 en el backend, botones ocultos en el frontend).
- `vite build` pasa.
