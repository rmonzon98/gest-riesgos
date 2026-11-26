# MARN: diseño de pantallas

Rama: `MARN` · Fecha: 2026-11-26 · Se basa en [01-decisiones.md](01-decisiones.md) y [02-modelo-datos.md](02-modelo-datos.md).

Las pantallas usan los mismos componentes que el sistema actual (MUI, DataGrid, `apiClient`, `RequirePermission`, `UpdatedNavBar`). Cada pantalla nueva se registra como URL en `seguridad_menu_urls` para que se pueda asignar a roles.

## Decisiones de pantalla

| # | Tema | Decisión |
|---|---|---|
| U1 | Edición de eventos, planes y vínculos | **Página de detalle del riesgo** con pestañas. El modal actual queda solo para crear rápido. |
| U2 | "Mis planes" del responsable | **Por cortes**: una tarjeta por plan con la línea de cortes coloreada por estado. |
| U3 | Menú | Las pantallas de planes van **dentro del grupo Monitoreo**. Autorizaciones y Reasignar van en Administración; Glosario y Ejes, en Catálogos. |

## Menú resultante

```
Monitoreo del comportamiento de los riesgos
  ├─ Seguimiento de riesgos ............ (oculto para MARN, P5)
  ├─ Seguimiento institucional ......... (oculto para MARN, P5)
  ├─ Continuidad y monitoreo ........... (existente)
  ├─ Mis planes ........................ NUEVA · rol Responsable de plan
  ├─ Verificación de actividades ....... NUEVA · rol Supervisor de plan
  └─ Planes por viceministerio ......... NUEVA · rol Asesor de plan
Administración
  ├─ … (existente)
  ├─ Autorizaciones de eliminación ..... NUEVA · rol Autorizador
  └─ Reasignar ......................... NUEVA · rol Reasignar
Catálogos
  ├─ Áreas ............................. CAMBIA (por dirección)
  ├─ Ejes estratégicos ................. NUEVA
  └─ Glosario .......................... NUEVA
```

Rutas nuevas en `RiesgosRoutes.jsx`: `riesgo/:entidad/:periodo/:codigo`, `mis-planes`, `verificacion-actividades`, `planes-viceministerio`, `autorizaciones-eliminacion`, `reasignar`, `ejes-estrategicos`, `glosario`.

---

## P-01 · Lista de riesgos (cambia)

Ruta existente: `evaluacion-gestion-riesgos` (`IngresoRiesgos` + `TablaRiesgosBasica`).

- Columnas nuevas: **Dueño**, **Eventos (#)**, **Planes (#)** y **Cumplimiento** (barra con % de cortes cumplidos).
- Los riesgos vinculados de otra dirección aparecen con la etiqueta "Vinculado de {dirección}" y solo en lectura.
- La fila abre la **página de detalle** (P-02). "Nuevo riesgo" abre el modal actual reducido a los datos básicos y, al guardar, lleva al detalle.
- El botón "Eliminar" se vuelve "Solicitar eliminación" si el usuario no tiene el permiso de eliminar sin autorización. Si hay una solicitud pendiente, la fila muestra la etiqueta "Eliminación solicitada".

## P-02 · Detalle del riesgo (nueva)

Ruta: `riesgo/:entidad/:periodo/:codigo`. Encabezado fijo con REF, descripción corta, dirección, periodo, dueño (con botón "Cambiar" si tiene el rol Reasignar), estado de revisión (ME/MC/MCE) y nivel inherente y residual en chips de color.

Las pestañas solo se pueden editar si el usuario edita riesgos de esa dirección y el riesgo no está aprobado (misma regla que hoy).

### Pestaña Datos
Los campos del modal actual, en secciones:
1. **Clasificación**: viceministerio, órgano, área (filtrada por dirección), tipo de objetivo, **objetivo (texto con autocompletar del histórico)**, **eje estratégico** (si la versión lo incluye), REF.
2. **Evaluación**: probabilidad, severidad, inherente (calculado), capacidad de mitigación, enfoque P/S, ajustadas, residual y tolerancia (calculados). **Eficiencia del mitigador** solo en lectura, si existe (dato migrado).
3. **Control y monitoreo**: control interno, método de monitoreo, frecuencia, responsable de monitoreo (texto para el Anexo V), severidad narración, observaciones.
4. **Mostrar en reportes generales** (`MOSTRAR_GENERAL`).

### Pestaña Eventos
Lista ordenable de eventos (descripción). Agregar, editar, quitar y reordenar. Debajo, un aviso: "La probabilidad y la severidad se califican en la pestaña Datos".

### Pestaña Planes y responsables
- Tabla de planes: acción, % de mitigación, # de responsables y cumplimiento. Se puede expandir cada plan.
- Al expandir: tabla de responsables con persona (o "Externo: nombre, puesto"), dirección, frecuencia, método, recurso, inicio, fin, cumplimiento y la línea de cortes en miniatura.
- Agregar o editar un plan: modal pequeño (acción, %).
- Agregar o editar un responsable: modal con un selector **Usuario / Externo**. Para un usuario, se busca en toda la institución; para un externo, nombre y puesto. Además frecuencia, método, recurso y fechas (por defecto, el año del periodo).
- No se puede quitar un responsable que ya tiene actividades verificadas; se puede **desactivar**.

### Pestaña Vínculos
Tabla de direcciones y áreas vinculadas, más el botón "Vincular" con selector de dirección y área. Aviso: "Las direcciones vinculadas ven este riesgo y lo cuentan en sus reportes".

### Pestaña Historial
Bitácora del riesgo (`riesgos_logs`): cambios de datos, revisiones, reasignaciones y solicitudes de eliminación.

## P-03 · Mis planes (nueva, responsable)

Ruta: `mis-planes`.

- Arriba: selector de periodo y resumen en chips: **cortes vencidos**, **por vencer en 15 días**, **pendientes de verificar**, **observadas**.
- Una tarjeta por cada responsable-plan asignado, ordenadas con primero las que tienen cortes vencidos:
  - REF del riesgo, descripción del riesgo (2 líneas), acción del plan, frecuencia, fechas y supervisor.
  - **Línea de cortes**: un bloque por corte (p. ej. ENE…DIC) con color por estado: verde cumplido, ámbar pendiente o por verificar, rojo vencido, gris futuro. Una actividad observada muestra un punto rojo.
  - Botones: **Registrar actividad** e ícono de **chat** con el contador de no leídos.
- Al hacer clic en un corte se abre un panel lateral con sus actividades (fecha, descripción, documento, archivos, estado y comentario del verificador) y el botón para registrar una en ese corte.
- El modal **Registrar actividad** pide fecha (por defecto hoy; el corte se deduce de ella), descripción, documento generado y archivos (varios, arrastrar y soltar).
- Los responsables **externos** no tienen acceso. Sus planes aparecen aquí para el **dueño del riesgo**, con la etiqueta "Externo: {nombre}".

## P-04 · Verificación de actividades (nueva, supervisor)

Ruta: `verificacion-actividades`.

- Pestaña **Por verificar** (por defecto): tabla de actividades pendientes de sus colaboradores (y de los externos de riesgos cuyo dueño supervisa) con fecha, responsable, REF, plan, corte, descripción y archivos. Acciones **Verificar** y **Observar** (pide comentario). Permite verificar varias seleccionadas.
- Pestaña **Mis colaboradores**: una fila por responsable-plan con la línea de cortes, para ver quién está atrasado. Filtros con actividades / sin actividades (como MARN).
- Chat con el responsable desde cada fila.

## P-05 · Planes por viceministerio (nueva, asesor)

Ruta: `planes-viceministerio`. Solo lectura. Filtros de periodo, dirección y estado. Tabla de responsables-planes del viceministerio del asesor con cumplimiento y línea de cortes. Exporta a Excel con el formato del PR #11.

## P-06 · Autorizaciones de eliminación (nueva)

Ruta: `autorizaciones-eliminacion`. Tabla de solicitudes (dirección, área, periodo, REF, descripción, solicitante, fecha, motivo y estado). Filtro por estado (pendientes por defecto). Acciones **Autorizar** y **Denegar**, ambas con comentario. El solicitante ve el resultado en el historial del riesgo.

## P-07 · Reasignar (nueva)

Ruta: `reasignar`. Dos pestañas:
1. **Dueño de riesgos**: filtros de dirección, área y periodo; tabla con selección múltiple; "Asignar a…" con buscador de usuario.
2. **Responsables de planes**: se elige la persona de origen, se ven sus responsabilidades activas, se marcan y se pasan a otra persona.

La continuidad al siguiente periodo **no** va aquí: sigue en Continuidad y monitoreo (decisión 11).

## P-08 · Responsables (cambia)

Pantallas existentes `administracion` y `administracion-direccion` (`ResponsablesMain` / `FormResponsable`):
- **Superior**: buscador de usuario y, debajo, nombre y puesto para la firma (se llenan solos y se pueden editar).
- Sección **Historial de cargos**: tabla (dirección, cargo, posesión, entrega) y "Registrar nuevo cargo", que cierra el vigente.

## P-09 · Usuarios y roles (cambia)

- Al asignar roles: fechas **desde** y **hasta** opcionales por rol. Los roles vencidos se ven tachados con su fecha.
- Encabezado de la administración general con las **licencias**: "81 de 109 usadas · vigentes del 01/03/2022 al 31/12/2026". Si se llega al límite, "Crear usuario" se deshabilita y explica por qué.

## P-10 · Catálogos nuevos y Áreas

- **Áreas** (cambia): columna y filtro de Dirección; al crear un área se elige la dirección o "General".
- **Ejes estratégicos** (nueva): nombre, descripción, orden y estado.
- **Glosario** (nueva): título, descripción, "destacar en inicio" y estado.

## P-11 · Inicio y métricas (cambia)

- **Inicio**: tarjeta "Concepto destacado" (rota por día entre los términos con `DESTACAR`). Para el responsable, además, el resumen de Mis planes (vencidos y por vencer) con enlace.
- **Métricas**: tarjetas de total de planes y de eventos; top 10 de direcciones con más riesgos; cumplimiento de cortes (cumplidos, pendientes y vencidos) por dirección.

## P-12 · Reportes de planes (decisión 19)

Se agregan a `ReportesMain` en una tarjeta nueva, **"Planes de acción"**, con filtros de periodo, dirección, responsable y rango de fechas, en PDF y Excel:
1. Plan de trabajo en evaluación de riesgos
2. Avance del seguimiento de riesgos
3. Avance del seguimiento consolidado por dirección
4. Informe de incumplimiento de actividades
5. Informe de actividades
6. Designación del responsable
7. Riesgos por responsable (incluye el registro de actividad del responsable)

## P-13 · Recorridos guiados y glosario en pantalla

- Botón **?** en el encabezado de cada pantalla principal para abrir su recorrido. Se abre solo la primera vez (`seguridad_persona_tour`).
- Pantallas con recorrido en la primera entrega: lista de riesgos, detalle del riesgo, Mis planes, Verificación y Reasignar.
- Librería: `react-joyride`, con los textos en español en un archivo por pantalla.
