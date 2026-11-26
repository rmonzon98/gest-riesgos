# MARN: decisiones de alcance

Rama: `MARN` · Fecha: 2026-11-26

Este documento compara el portal que MARN usa hoy (MyAuditSystem `wbRiesgo`) con gest-riesgos y registra con qué opción nos quedamos en cada punto. Es la base para el diseño (modelo de datos y pantallas) y el desarrollo.

Etapas: **1. Planificar (este documento) → 2. Diseñar → 3. Desarrollar.**

| # | Elemento | Decisión | Qué implica |
|---|---|---|---|
| 1 | Estructura organizacional | **MARN** | Las áreas de evaluación pasan a depender de cada dirección (Dirección → Área). Hoy `riesgos_area` es un catálogo general. |
| 2 | Periodos | **Nuestro** | Un periodo institucional (`riesgos_periodo`). Las áreas que no aplican se desactivan. Al migrar, los periodos por área de MARN se agrupan por año. |
| 3 | Catálogos de evaluación | **Nuestro** | Usamos las propiedades con versión por periodo y cargamos las escalas de MARN como una versión. **Pendiente:** tabla de equivalencias MARN → nuestro sistema para la migración (probabilidad, impacto/severidad, eficiencia del mitigador, tolerancia, capacidad de mitigación). |
| 4 | Tipo de objetivo y objetivos | **Nuestro, modificado** | Se cargan los 4 tipos de objetivo de MARN. El objetivo específico **deja de depender del tipo de objetivo**: se escribe libremente y se puede elegir de un **catálogo histórico** con los que ya se escribieron. |
| 5 | Eje estratégico | **MARN, configurable** | Catálogo nuevo de ejes estratégicos por institución (opcional) y campo en el riesgo. MARN carga sus 7 ejes; quien no lo use no lo ve. |
| 6 | Tipo de reporte del riesgo | **Nuestro sin cambios** | Se queda `MOSTRAR_GENERAL`. Al migrar: Control Interno → `S`, Interno → `N` (confirmar). |
| 7 | Eventos del riesgo | **Opción nueva** | Varios eventos por riesgo, solo con descripción. La probabilidad y la severidad se siguen calificando en el riesgo. |
| 8 | Plan de acción | **MARN** | Tablas nuevas: plan de acción (acción, % de mitigación) y responsables por plan (usuario, frecuencia, método, recurso interno o externo, fecha de inicio y fin). `CONTROL` y `MONITOREO` se quedan como texto del riesgo. |
| 9 | Seguimiento | **MARN** | Seguimiento por actividades: el responsable registra fecha, descripción, documento generado y archivo adjunto; chat con el supervisor; el supervisor verifica o comenta. El seguimiento mensual por dirección se oculta para MARN. |
| 10 | Revisión y aprobación | **Ambos** | El riesgo se aprueba con nuestro flujo jefe → superior (ME/MC/MCE). Los planes se ejecutan con la verificación de actividades de MARN. |
| 11 | Continuidad entre periodos | **Nuestro + copiar planes** | Nuestro mecanismo (copiar, relacionar, año de origen, riesgos nuevos). Al copiar un riesgo se copian sus planes y responsables con fechas nuevas, sin las actividades del año anterior. |
| 12 | Vincular o compartir riesgo | **MARN** | Un riesgo se puede vincular a áreas de otras direcciones. El dueño sigue siendo la dirección original; las vinculadas lo ven y lo cuentan en sus reportes. |
| 13 | Reasignar | **MARN** | Dueño del riesgo por persona, que se puede reasignar, y traslado de planes de un responsable a otro. |
| 14 | Eliminación de riesgos | **Nuestro + autorización** | Se mantiene la eliminación lógica con restablecer. Se agrega solicitud de autorización con bandeja, controlada por permiso (no por nivel "maestro"). |
| 15 | Responsables y supervisores | **MARN** | Historial de cargos por persona (dirección, cargo, fecha de toma de posesión y de entrega). El supervisor es el mismo superior de `riesgos_colaborador_superior` (ver P2). |
| 16 | Usuarios y roles | **Nuestro + vigencia y licencias** | Roles configurables. Se crean roles equivalentes a los 8 de MARN (incluidos responsable, supervisor y asesor de planes). Se agrega **vigencia por rol asignado** y **límite de licencias por institución**. |
| 17 | Dashboard | **Nuestro + indicadores MARN** | Se agregan los totales de planes y eventos, el top 10 de direcciones con más riesgos y el avance de actividades (cumplidas, pendientes, vencidas). |
| 18 | Reportes de riesgos | **Nuestros** | Sin reportes nuevos de riesgos. |
| 19 | Reportes de plan y actividades | **Todos (MARN)** | 7 reportes: plan de trabajo, avance del seguimiento (por riesgo y consolidado por dirección), incumplimiento de actividades, informe de actividades, designación del responsable, riesgos por responsable y registro de actividad del responsable. En nuestro formato (PDF y Excel). |
| 20 | Ayuda y glosario | **MARN** | Recorridos guiados por pantalla (se muestran la primera vez y se pueden volver a abrir) y glosario administrable con "concepto destacado" en el inicio. |
| 21 | Anexo 1 y Anexo 2 | **Nuestro, se mantienen** | Se conservan el **Módulo de Control Interno y Gobernanza** (Anexo 1) y el **Módulo de Evaluación de Riesgos asociados al Fraude o Corrupción** (Anexo 2). MARN no los tiene en su portal. |

## Pendientes resueltos

Referencia metodológica: **Guía I – Informe Anual de Control Interno, Evaluación y Opinión**. Nuestro cálculo ya sigue la guía: criterio de eficiencia del control 1–5 → capacidad de mitigación 0–4 (nivel − 1), que se resta a la probabilidad **o** a la severidad (enfoque P/S); RR = PD × SD; tolerancia 0–10 Tolerable, 10.1–15 Gestionable, 15.1–25 No tolerable.

### P1. Equivalencias de escalas (punto 3)

Datos revisados en el portal: 391 riesgos 2022–2026. Escalas v1 en 2022–2023 (y 84 de 2024); v2 desde 2024.

| Dato en MARN | Destino en gest-riesgos | Regla |
|---|---|---|
| Probabilidad 1–5 | `CODIGO_PROBABILIDAD` | 1 a 1 por nivel (mismos nombres). |
| Impacto 1–5 | `CODIGO_SEVERIDAD` | 1 a 1 por nivel (mismos nombres). |
| Nivel (capacidad de mitigación) 1–5 | `CAPACIDAD_MITIGACION` (`riesgos_mitigacion` 1–5) | 1 a 1. Está en los 391 riesgos. |
| Eficiencia del mitigador 1–5 | **Campo nuevo informativo** en el riesgo | Se guarda tal cual; no entra en el cálculo. Existe en 108 riesgos (v2); difiere del nivel en 35, que van a la lista de revisión. |
| (no existe) | `VARIABLE_MITIGACION` (P/S) | **Se migra vacío.** El residual queda pendiente hasta que cada dirección indique P o S. |
| Acción / tolerancia (escogida a mano) | `CODIGO_TOLERANCIA` | **Se recalcula** con el residual. Los riesgos donde cambie van a la lista de revisión. (En v2, 104 de 114 tienen "Gestionable", probablemente por valor por defecto.) |
| Frecuencia del responsable | `riesgos_frecuencia` | 1 a 1 por nombre (MARN no usa bimestral ni "cuando se necesite"). |
| Recurso (interno/externo) | Campo nuevo del responsable del plan | Catálogo nuevo de dos valores. |
| Valor de riesgo (P × I) | `RIESGO_INHERENTE` | Se recalcula con P × S. |

**Entregable de la migración:** una lista de revisión para MARN con (a) los riesgos sin enfoque P/S, (b) los riesgos donde la tolerancia recalculada no coincide con la que escogieron y (c) los 35 riesgos donde la eficiencia y el nivel no coinciden.

### P2. Supervisor y superior (puntos 10 y 15)

**Son la misma persona.** El superior que aprueba los riesgos (`riesgos_colaborador_superior`) es también el supervisor que verifica las actividades. Se asigna una sola vez. Del punto 15 se mantiene el historial de cargos (dirección, cargo, fechas de toma de posesión y de entrega).

### P3. Dueño del riesgo (punto 13)

**El dueño es el responsable visible**: aparece en reportes y bandejas y recibe los avisos. No cambia quién edita (dirección + rol, como hoy) ni quién aprueba. Se puede reasignar.

### P4. Migración de la historia

**Se migra todo 2022–2026**, con la continuidad entre periodos, eventos, planes, responsables y actividades. Hay que mapear las escalas v1 y v2.

### P5. Informe anual y seguimiento mensual

- **Informe anual: activo para MARN.**
- **Seguimiento mensual: oculto para MARN** (se mantiene la decisión 9: solo seguimiento por actividades). Nota: la Guía I (inciso l) pide supervisar mensualmente el comportamiento de los riesgos (ajustes a las medidas de gravedad y efectividad de los mitigadores, Anexo V). Con esta decisión, ese monitoreo se cubre con las actividades y con la recalificación del riesgo en la matriz de continuidad y monitoreo (MCE).
