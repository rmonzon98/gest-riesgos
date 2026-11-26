# Prompt 08 · Dashboard y reportes de planes

> Etapa 8 de 10. Requiere las etapas 04 y 05. Lee `AGENTS.md`, `01-decisiones.md` (12, 17, 18 y 19), `02-modelo-datos.md` (3.1) y `03-pantallas.md` (P-11 y P-12). Reporte en `planificacion/MARN/entregas/08-dashboard-reportes.md`.

## 1. Riesgos vinculados en reportes y métricas (pendiente de la etapa 03)

Decisión 12: las direcciones vinculadas **cuentan** el riesgo en sus reportes.

En los reportes y métricas **por dirección** (`reportesFinalizados.js`, `reportes.js`, `administracion.js` → métricas), un filtro por dirección X incluye los riesgos de X **más** los vinculados a X, marcados como "(vinculado)". **No los dupliques en los totales institucionales**: a nivel institución, cada riesgo cuenta una sola vez.

Cambia lo mínimo y lista cada consulta tocada en el reporte.

## 2. Métricas (P-11)

En `MetricasDashboard.jsx` y su endpoint, agrega:
- total de planes de acción activos y total de eventos del periodo;
- top 10 de direcciones con más riesgos (gráfico de barras horizontal, con la misma librería de gráficos que ya usa la pantalla);
- cumplimiento de cortes por dirección: cumplidos, pendientes o por verificar, y vencidos, en barras apiladas, con el servicio `cumplimientoPlanes`.

El cálculo va en el backend. Si es lento, calcula por responsable-plan y agrega en memoria, y anota el tiempo con los datos de prueba.

## 3. Inicio

Para usuarios con planes asignados, una tarjeta "Mis planes" con vencidos y por vencer (15 días) y un enlace a `mis-planes`. El "concepto destacado" del glosario llega en la etapa 09.

## 4. Reportes de planes (P-12)

Tarjeta nueva en `ReportesMain.jsx`: **"Planes de acción"**. Filtros: periodo, dirección, responsable y rango de fechas. Cada reporte en **PDF** (con el mismo mecanismo y encabezado con logo de los reportes actuales) y **Excel** (con `funciones/ExcelFormato.js`):

1. **Plan de trabajo en evaluación de riesgos:** por riesgo, sus planes con % de mitigación, responsables, frecuencia, método, recurso y fechas.
2. **Avance del seguimiento de riesgos:** por responsable-plan, cortes y % de cumplimiento.
3. **Avance consolidado por dirección:** totales de cortes por estado y % por dirección.
4. **Informe de incumplimiento de actividades:** solo cortes **vencidos**, con responsable, superior, riesgo, plan y corte.
5. **Informe de actividades:** actividades del rango de fechas, con estado, verificador, comentario y cantidad de archivos.
6. **Designación del responsable:** listado formal de responsables por plan, con cargo vigente, para firma.
7. **Riesgos por responsable:** por persona, sus riesgos y planes, con su registro de actividades.

**Filtro por dirección:** si el usuario está limitado a su dirección (misma regla que los reportes actuales), los reportes solo muestran esa dirección.

## Criterios de aceptación

- Los totales del dashboard cuadran con un conteo manual en la base de prueba (anótalo).
- Un riesgo vinculado aparece en el reporte de las dos direcciones y una sola vez en el total institucional.
- Los 7 reportes se generan en PDF y Excel con datos de prueba.
- Los reportes existentes que no tocaste dan el mismo resultado que antes.
- `npm test` y `vite build` pasan.
