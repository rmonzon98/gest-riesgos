# Prompt 05 · Verificación de actividades y vista del asesor

> Etapa 5 de 10. Requiere la etapa 04. Lee `AGENTS.md`, `01-decisiones.md` (9, 10 y P2), `02-modelo-datos.md` (1.3, 2.5 y 2.6) y `03-pantallas.md` (P-04 y P-05). Maqueta: https://claude.ai/artifact/TM42BncK2Vp7vokPcaw1Za (vista "Verificación"). Reporte en `planificacion/MARN/entregas/05-verificacion-asesor.md`.

## Regla central: quién verifica

Una actividad la verifica el **superior** (`riesgos_colaborador_superior.CODIGO_SUPERIOR`):
- del **responsable**, si es usuario;
- del **dueño del riesgo**, si el responsable es externo.

Si no hay superior asignado, la actividad aparece en una sección **"Sin superior asignado"**, visible solo para usuarios con el rol de administración de responsables, para que se corrija.

## Backend (Prisma)

1. `GET /verificacion/pendientes?periodo=`: actividades en estado `P` que le tocan a `req.user` según la regla, con fecha, responsable (o "Externo: nombre (registró: usuario)"), REF, plan, corte, descripción y archivos.
2. `POST /verificacion/verificar`: recibe **uno o varios** `codigoActividad`.
   - Valida, **una por una**, que le toquen al usuario.
   - Pone `ESTADO='V'`, `CODIGO_VERIFICADOR`, `FECHA_VERIFICACION` y comentario opcional.
   - Todo dentro de una transacción.
3. `POST /verificacion/observar`: una actividad, **comentario obligatorio**. Pone `ESTADO='O'`.
4. `GET /verificacion/colaboradores?periodo=&filtro=con|sin|todos`: responsables-plan de sus colaboradores (y externos de los riesgos cuyo dueño supervisa), con la línea de cortes y el % de cumplimiento (servicio de la etapa 04).
5. **Asesor (P-05):** `GET /planes-viceministerio?periodo=&entidad=&estado=`. Devuelve los responsables-plan de riesgos de direcciones del **viceministerio del usuario** (`seguridad_entidad.CODIGO_VICEMINISTERIO` de su dirección). Solo lectura. Si el usuario no tiene viceministerio, responde 400 con un mensaje claro.
6. Una actividad verificada **no se puede editar ni desactivar** (la etapa 04 ya lo valida; confírmalo).

## Frontend

1. **P-04 `verificacion-actividades`** (Monitoreo):
   - Pestaña **Por verificar**: DataGrid con selección múltiple, "Verificar seleccionadas", acciones por fila (Verificar, Observar con modal de comentario obligatorio, Chat), vista previa y descarga de archivos.
   - Pestaña **Mis colaboradores**: tabla con `LineaCortes` mini, % de cumplimiento y filtro con/sin actividades.
2. **P-05 `planes-viceministerio`** (Monitoreo): filtros de periodo, dirección y estado; tabla de solo lectura con cortes; exportar a Excel con `funciones/ExcelFormato.js` (PR #11).
3. Al verificar u observar se actualiza la bandeja sin recargar la página.

## Criterios de aceptación

- El superior A ve las actividades de su colaborador B y no las de C (superior distinto). Si A intenta verificar una actividad de C por API, recibe 403.
- La actividad de un externo en un riesgo cuyo dueño es B la verifica el superior de B.
- Verificar varias es atómico: si una no le toca al usuario, no se verifica ninguna y la respuesta dice cuál falló.
- El asesor solo ve su viceministerio.
- `npm test` y `vite build` pasan.
