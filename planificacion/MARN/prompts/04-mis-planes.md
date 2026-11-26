# Prompt 04 · Cumplimiento por cortes, Mis planes, actividades y chat

> Etapa 4 de 10. Requiere la etapa 03. Lee `AGENTS.md`, `01-decisiones.md` (9 y diseño 2), `02-modelo-datos.md` (2.5–2.8 y **3.1**) y `03-pantallas.md` (P-03). Mira la maqueta: https://claude.ai/artifact/TM42BncK2Vp7vokPcaw1Za (vista "Mis planes"). Reporte en `planificacion/MARN/entregas/04-mis-planes.md`.

## 1. Servicio de cumplimiento (el núcleo; hazlo primero y con pruebas)

`backend/services/cumplimientoPlanes.js`: funciones **puras**, sin base de datos.

- `calcularCortes({ fechaInicio, fechaFin, cortesAnio, hoy })` → lista de cortes `{ indice, etiqueta, desde, hasta }`.
  - Son cortes de **calendario**: mensual → meses (ENE…DIC); trimestral → T1…T4; semestral → S1–S2; anual → año; cuatrimestral → C1–C3; bimestral → B1–B6; quincenal → días 1–15 y 16–fin de mes; semanal → semanas ISO.
  - Solo los cortes que se cruzan con `[fechaInicio, fechaFin]`, recortados a ese rango.
  - `cortesAnio = null` → lista vacía (sin incumplimiento).
- `estadoCortes(cortes, actividades, hoy)` → para cada corte, un estado:
  - `cumplido`: hay al menos una actividad `V` con fecha en el corte;
  - `por_verificar`: hay actividades `P` y ninguna `V`;
  - `observado`: hay alguna `O` y ninguna `V`;
  - `vencido`: el corte terminó (`hasta < hoy`) sin actividades `V`, `P` ni `O`;
  - `pendiente`: está en curso sin actividades;
  - `futuro`: todavía no empieza.
- `resumen(estados)` → conteos y `% cumplimiento = cumplidos / (cortes con hasta < hoy)`.

**Pruebas:** agrega `node --test` (incluido en Node, sin dependencias nuevas) en `backend/tests/cumplimientoPlanes.test.js`. Cubre:
- cada frecuencia;
- rangos que empiezan o terminan a mitad de un corte;
- año bisiesto;
- "cuando se necesite";
- un corte con actividades `V` y `O` a la vez.

Agrega el script `"test": "node --test tests/"` a `backend/package.json`.

## 2. Backend de actividades (Prisma)

1. `GET /mis-planes?periodo=`: responsables-plan activos donde `CODIGO_COLABORADOR = req.user`, **más** los responsables **externos** de riesgos cuyo `CODIGO_DUENO = req.user`. Cada uno incluye riesgo (REF y descripción), plan, frecuencia, fechas, superior que verifica, cortes con su estado, resumen y mensajes no leídos.
2. **Actividades:**
   - **Crear:** fecha, descripción, documento generado y hasta 10 archivos con `multer`, mismo patrón que `seguimientos.js`, en la ruta de `02-modelo-datos.md` 2.7.
   - **Editar** (solo si el estado es `P` u `O`; si estaba `O`, vuelve a `P`), **desactivar** (solo `P` u `O`), **listar por corte**, **descargar archivo**.
3. **Quién puede registrar:**
   - el responsable (si es usuario);
   - si es externo, el dueño del riesgo o un usuario con rol de operador en la dirección dueña.

   Lo demás, 403.
4. **Un corte vencido acepta actividades** (registro tardío). Agrega a la respuesta `fueraDePlazo: true` cuando la fecha de registro es posterior al fin del corte. No lo guardes en la base: se calcula con `FECHA_CREACION`.
5. **Chat** (`riesgos_plan_mensaje`):
   - Listar el hilo de un responsable-plan.
   - Enviar.
   - Marcar como leídos los mensajes del otro participante.

   Participantes: el responsable (o el dueño, si es externo) y su superior (`riesgos_colaborador_superior.CODIGO_SUPERIOR`).

## 3. Frontend: P-03 Mis planes

Ruta `mis-planes`, dentro del grupo **Monitoreo** del menú. Igual que la maqueta:
- resumen en tarjetas;
- leyenda;
- una tarjeta por plan con la **línea de cortes** clicable (componente reutilizable `LineaCortes.jsx` en `src/Riesgos/Planes/`, con variante `mini` para tablas);
- panel lateral del corte con sus actividades;
- modal **Registrar actividad** (fecha, descripción, documento, archivos con arrastrar y soltar);
- chat en un `Drawer` con el contador de no leídos.

Usa `LineaCortes` (variante mini) también en la columna "Cortes" de la pestaña de planes del detalle, y agrega la columna **Cumplimiento** en la lista de riesgos (P-01).

## Criterios de aceptación

- `npm test` en `backend/` pasa.
- Un responsable ve sus planes y los externos de sus riesgos, y no ve los de otros.
- Registrar → aparece como "por verificar". Editar una observada → vuelve a "por verificar".
- Un usuario que no es el responsable ni el dueño recibe 403 al registrar.
- Los archivos se guardan en la ruta correcta y se pueden descargar.
- `vite build` pasa.
