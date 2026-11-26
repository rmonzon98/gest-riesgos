# Prompt 07 · Superior como usuario, historial de cargos, vigencia de roles y licencias

> Etapa 7 de 10. Puede hacerse en paralelo a las etapas 04–06 si se trabaja con cuidado, porque toca otros archivos (salvo la regla de verificación, que lee `CODIGO_SUPERIOR`). Lee `AGENTS.md`, `01-decisiones.md` (15, 16, P2 y diseño 1), `02-modelo-datos.md` (1.3–1.5 y 2.9) y `03-pantallas.md` (P-08 y P-09). Reporte en `planificacion/MARN/entregas/07-responsables-roles-licencias.md`.

## 1. Superior como usuario (P-08, cambia `Controller/general/responsables.js` y `FormResponsable.jsx` en Admin General y Admin Dirección)

- **Formulario:** el superior se elige con un buscador de usuarios (`CODIGO_SUPERIOR`). Al elegirlo se **prellenan** `NOMBRE_SUPERIOR` y `PUESTO_SUPERIOR` (nombre completo y cargo vigente), que **siguen siendo editables** para la firma.
- **Validaciones:** el superior no puede ser la misma persona ni crear un ciclo directo (A superior de B y B superior de A).
- **Datos existentes:** los registros con solo texto siguen funcionando. Muestra un aviso "Superior sin usuario asignado: no podrá verificar actividades".
- **Firmas:** los reportes que hoy leen `NOMBRE_SUPERIOR` / `PUESTO_SUPERIOR` (`reportesFinalizados.js`) no cambian.

## 2. Historial de cargos

- **Backend:** endpoints para listar el historial de una persona y para **registrar un cargo nuevo**: dirección, nombre del cargo y fecha de posesión. Al registrar, se cierra el vigente con `FECHA_ENTREGA` = día anterior a la nueva posesión, todo en una transacción. También se puede corregir un registro.
- **Frontend:** sección "Historial de cargos" en el formulario del responsable.
- **Cargo vigente:** debe estar disponible para el buscador de usuarios (etapa 03) y para el prellenado del superior.

## 3. Vigencia de roles (P-09)

- **Al asignar roles:** fechas desde y hasta opcionales, guardadas en `seguridad_menu_rol_usuario.FECHA_INICIO/FECHA_FIN`.
- **El acceso solo considera roles vigentes:** cambia las consultas que arman el menú y los permisos para que solo cuenten si `CURDATE()` está dentro de la vigencia (o las fechas son NULL). Revisa `Controller/menu/General.js` (`/api/general`, `/auth/puede-acceder`), `roles.js` y `RequirePermission.jsx`.
- **Pantalla:** los roles vencidos se ven tachados con su fecha.

## 4. Licencias

- **Encabezado de Administración General:** "{usados} de {LIMITE_USUARIO} usuarios · vigente del {FECHA_INICIO_VIGENCIA} al {FECHA_VIGENCIA}" (`seguridad_institucion_acceso_app`, aplicación 1).
- **Qué cuenta como usado:** personas activas de la institución con al menos un rol vigente en la aplicación.
- **Al llegar al límite:**
  - crear usuario, activar uno inactivo o asignar el primer rol a alguien sin roles responde **409** con un mensaje claro;
  - el botón "Crear usuario" se deshabilita con una explicación.
- **Sin límite:** si `LIMITE_USUARIO` es NULL, no hay límite (comportamiento actual).
- **Fuera de vigencia:** si `VIGENTE='N'` o `FECHA_VIGENCIA` ya pasó, el login sigue funcionando, pero se muestra un aviso a los administradores. **No bloquees el acceso**; anótalo en el reporte como decisión a confirmar.

## Criterios de aceptación

- Un rol con `FECHA_FIN` ayer ya no da acceso a su pantalla (backend y menú).
- Con límite 2 y 2 usados, crear el tercero da 409; con `LIMITE_USUARIO` NULL, no.
- Registrar un cargo nuevo cierra el anterior.
- Las firmas de los reportes existentes no cambian.
- `vite build` pasa.
