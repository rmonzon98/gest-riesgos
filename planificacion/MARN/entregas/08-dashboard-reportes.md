# Etapa 08 · Dashboard y reportes de planes

## Archivos y consultas

- `Controller/riesgos/reportesFinalizados.js` cambia dos consultas. `obtenerValores` y `obtenerValoresInst` incluyen los vínculos activos cuando se filtra una dirección. La consulta usa `EXISTS`, de modo que varios vínculos a áreas de la misma dirección no repiten el riesgo. Las filas vinculadas muestran el nombre de la dirección dueña con «(vinculado)». `Routes/riesgos/reportes.js` ya dirige ambas consultas a ese controlador.
- `Controller/general/administracion.js` y `services/indicadoresPlanes.js` agregan a `obtenerMetricas` el mapa de direcciones vinculadas y los indicadores de planes. Las consultas de matrices históricas y seguimiento mensual se conservaron.
- `reportesPlanes.js` entrega siete tablas para los exportadores. `ReportesPlanesCard.jsx` y `exportarReportesPlanes.js` agregan los filtros y las exportaciones a la pantalla de reportes. Los PDF usan pdfMake y el logo institucional. Los libros usan `ExcelFormato.js`.
- `MetricasDashboard.jsx` y `MetricasPlanes.jsx` muestran los indicadores y dos gráficos en Recharts. `Home.jsx` muestra el resumen de Mis planes.
- Se reutilizaron el esquema y las dependencias del proyecto. No se agregaron migraciones, roles ni permisos.

## Endpoints

| Método y ruta | Acceso |
|---|---|
| `GET /api/administracion-actualizados/obtener-metricas?periodo=&entidades=` | Usuario con la URL vigente `/metricas`. |
| `GET /api/marn/reportes-planes/filtros` | Usuario con `/reportes-riesgos`. Devuelve los siete informes y las direcciones que puede consultar. |
| `GET /api/marn/reportes-planes/busqueda-responsables?q=&entidad=` | Usuario con `/reportes-riesgos`. Busca responsables en el ámbito de la consulta. |
| `GET /api/marn/reportes-planes/:tipo?periodo=&entidad=&responsable=&desde=&hasta=` | Usuario con `/reportes-riesgos`. La URL `/riesgos-institucional` habilita los filtros institucionales. |
| `GET /api/marn/mis-planes/resumen-inicio` | Usuario con `/mis-planes`. Devuelve los cortes vencidos y por vencer de sus asignaciones del periodo. |

## Decisiones

- Se reutiliza `/riesgos-institucional` como indicador de alcance institucional para los reportes nuevos. Con permiso de reportes y alcance por dirección, el backend incluye riesgos propios y vinculados de esa dirección.
- Cada dirección suma el riesgo vinculado una vez. El total institucional de riesgos y los totales de planes, eventos y cortes se calculan sobre sus registros originales.
- El total de eventos considera el evento histórico cuando el riesgo aún no tiene eventos activos en la nueva tabla. El ranking mantiene la regla anterior de las métricas y cuenta los riesgos identificados en el periodo por separado.
- Los cortes se calculan con el servicio de la etapa 04. Un corte con actividad pendiente u observada sigue por verificar. El gráfico combina pendiente y por verificar y omite los futuros. El consolidado muestra cada uno por separado.
- En los reportes, el rango acota las actividades por fecha y selecciona las asignaciones y cortes que se cruzan con él. La tarjeta de inicio toma el periodo activo más reciente que ya comenzó.

## Verificación

- Pasaron `node --check`, las 14 pruebas de `npm test`, `prisma validate`, `prisma generate`, `prisma migrate deploy` y `vite build`. Vite mantuvo el aviso de archivos superiores a 500 kB.
- La prueba sintética tenía dos riesgos, dos planes y tres eventos contando un evento histórico. Las direcciones mostraron uno y dos riesgos respectivamente. El total institucional fue dos, aunque el mismo riesgo tenía dos vínculos hacia la segunda dirección. Se comprobaron un corte cumplido, uno por verificar y uno vencido en ambas direcciones. La consulta HTTP del dashboard tardó 160 ms con estos datos en la instancia local.
- Los dos reportes de riesgos probados devolvieron el riesgo en la dirección dueña y en la vinculada con su marca, y una vez en la consulta sin filtro de institución. Se comprobó que las consultas de los Anexos I y II no fueron modificadas. No se regeneraron todos los documentos históricos.
- Los siete reportes nuevos generaron tanto PDF como Excel con filas reales de la prueba. Se reabrieron los siete XLSX para verificar título, filas y orientación. Se renderizaron y revisaron visualmente los siete PDF con el logo y las tablas. Se comprobó el rechazo 403 para reportes fuera de alcance, el filtro de responsable y fechas, y el resumen de Inicio.
