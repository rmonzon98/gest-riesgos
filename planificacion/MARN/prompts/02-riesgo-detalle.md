# Prompt 02 · Riesgo: áreas por dirección, nuevos campos, eventos y página de detalle

> Etapa 2 de 10. Requiere la etapa 01. Lee `AGENTS.md`, `01-decisiones.md` (puntos 1, 4, 5, 7, 13 y P1), `02-modelo-datos.md` (1.1, 1.2, 2.1, 2.2 y 3.3) y `03-pantallas.md` (P-01, P-02 pestañas Datos, Eventos e Historial, y P-10). Reporte en `planificacion/MARN/entregas/02-riesgo-detalle.md`.

## Objetivo

El riesgo gana áreas por dirección, objetivo libre con histórico, eje estratégico, dueño, eventos y eficiencia informativa, y una **página de detalle** con pestañas.

## Backend (Prisma, rutas nuevas bajo `/api/marn/...` o dentro de los routers existentes, según convenga; explícalo en el reporte)

1. **Áreas:**
   - `GET` de áreas acepta `entidad` y devuelve las áreas de esa dirección más las generales (`CODIGO_ENTIDAD IS NULL`).
   - Crear y editar un área acepta `codigoEntidad` (nullable).
   - Cambia el controlador existente `Controller/riesgos/areas.js` sin romper sus respuestas actuales.
2. **Ejes estratégicos:** CRUD completo (listar, crear, editar, activar/desactivar) por `CODIGO_CIA`.
3. **Objetivo histórico:** `GET` que devuelve los `OBJETIVO_TEXTO` distintos de la institución, filtrados por texto (`q`, mínimo 3 caracteres, máximo 20 resultados).
4. **Riesgo:**
   - Crear y actualizar aceptan `objetivoTexto`, `codigoEje` y `codigoDueno`. Al crear, el dueño por defecto es `req.user`.
   - `EFICIENCIA_MITIGADOR` es de solo lectura (no se acepta en el request).
   - Cambia `riesgosVariables.js` respetando el mecanismo de propiedades por versión: los campos nuevos solo se validan si la versión del periodo los incluye.
5. **Detalle:** `GET /riesgo/:entidad/:periodo/:codigo` devuelve los datos del riesgo, sus eventos activos, conteos (planes, vínculos) y la bitácora del riesgo desde `riesgos_logs`.
   - Valida que el usuario pertenezca a esa dirección o tenga acceso institucional, con la misma regla que la lista de riesgos actual.
6. **Eventos:** endpoints para listar, agregar, editar, desactivar y reordenar.
   - Cada cambio **recalcula `EVENTO`** del riesgo como la lista de descripciones activas, una por línea y en orden.
   - Editar solo se permite si el riesgo es editable: mismas reglas de estado y aprobación que la edición actual del riesgo.

## Frontend

1. **P-01 Lista de riesgos** (`TablaRiesgosBasica` / `IngresoRiesgos`):
   - Columnas Dueño y Eventos (#). Planes y Cumplimiento se dejan para las etapas 03 y 04.
   - La fila navega al detalle.
   - "Nuevo riesgo" usa el modal actual reducido a los datos básicos y, al guardar, navega al detalle.
2. **P-02 Detalle** (`src/Riesgos/Evaluacion riesgos F/Detalle/RiesgoDetalle.jsx`, ruta `riesgo/:entidad/:periodo/:codigo`):
   - Encabezado (REF, chips de estado ME/MC/MCE, inherente y residual con color de tolerancia, dueño).
   - Pestañas **Datos**, **Eventos**, **Planes y responsables** (placeholder "Disponible en la siguiente versión"), **Vínculos** (placeholder) e **Historial**.
   - **Datos** reutiliza la lógica de cálculo de `ModalIngresoRiesgosPropiedades.jsx` (no la dupliques: extráela a un hook o a funciones en `funciones/`).
   - Objetivo con `Autocomplete` `freeSolo` contra el histórico. Eje como select, solo si la versión lo incluye. Eficiencia del mitigador en solo lectura, si tiene valor.
3. **P-10:** catálogo de **Ejes estratégicos** (nuevo, en Catálogos) y **Áreas** con columna y filtro de Dirección, y selector de dirección o "General" al crear.

## Criterios de aceptación

- Un riesgo existente (sin campos nuevos) se ve y edita igual que antes.
- El cálculo de inherente, residual y tolerancia da los mismos resultados que el modal actual (prueba 3 casos y anótalos).
- Después de agregar o reordenar eventos, `EVENTO` refleja la lista, y la matriz y reportes existentes lo muestran.
- Un usuario de otra dirección sin acceso institucional recibe **403** en el detalle.
- `vite build` pasa.
