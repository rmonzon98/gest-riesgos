# Etapa 07 · Responsables, roles y licencias

## Archivos y migraciones

- `Controller/general/responsables.js` registra al superior como usuario y conserva los textos de firma. Los formularios de Administración General y de Dirección comparten el buscador y el historial de cargos.
- `Controller/general/cargos.js` y `services/cargos.js` cubren el historial, las correcciones y el cargo vigente. El buscador de responsables de planes usa la misma regla para el cargo vigente.
- `Controller/riesgos/roles.js`, `Controller/menu/General.js`, `services/permisosRiesgos.js`, `RequirePermission.jsx` y `RiesgosRoutes.jsx` integran las fechas con la asignación, el menú y el acceso. Las dos vistas de asignación comparten el formulario por rol y muestran vencimientos.
- `services/administracionRiesgos.js`, `Controller/login.js` y Administración General integran licencia, límite y aviso de vigencia.
- Se reutilizó el esquema de la etapa 01. No hubo migraciones ni dependencias nuevas.

## Endpoints

| Método y ruta | Acceso |
|---|---|
| `GET /api/responsables-actualizados/licencia` | Administración General. |
| `GET /api/responsables-actualizados/superiores?q=` | Administración General o de Dirección. Busca personas activas de la institución. |
| `GET` y `POST /api/responsables-actualizados/:persona/cargos` | Administración General o de la dirección de la persona. |
| `PUT /api/responsables-actualizados/:persona/cargos/:cargo` | Administración General o de la dirección de la persona. |
| `POST` y `PUT /api/responsables-actualizados` y sus variantes `/direccion` | Alta y edición con `codigo_superior` opcional. Respeta el ámbito administrativo. |
| `POST /api/roles-actualizados/crear-personas-con-roles` y `PUT /api/roles-actualizados/actualizar-personas-con-roles` | Administración dentro del ámbito aplicable. Reciben las fechas opcionales de cada asignación. |

## Decisiones

- El cargo vigente cubre la fecha actual de Guatemala. Para registrar un nuevo cargo, la fecha de posesión debe ser posterior al último registro. Las correcciones rechazan intervalos superpuestos.
- Las fechas de rol incluyen ambos extremos. Los clientes anteriores pueden seguir enviando números de rol. Si ya existía la asignación, ese formato conserva sus fechas.
- El límite cuenta personas activas con al menos un rol vigente de la aplicación 1. Las operaciones que consumen cupo se serializan por institución. Un rol futuro o vencido no consume cupo hoy.
- ~~Una licencia vencida de la aplicación 1 muestra un aviso a Administración General. El inicio de sesión sigue disponible.~~ **Corregido en la revisión (decisión del usuario):** la licencia fuera de vigencia **bloquea** el acceso, como hacía el sistema antes de esta etapa. La regla está en `licenciaVigente()` (`services/administracionRiesgos.js`): `VIGENTE = '1'`, `FECHA_INICIO_VIGENCIA` ya alcanzada y `FECHA_VIGENCIA` no vencida. La usan:
  - el login (`Controller/login.js`): responde 403 con un mensaje claro, después de validar la contraseña;
  - el menú y `checkApp` (`Controller/menu/General.js`): toda aplicación requiere licencia vigente, y la de riesgos además requiere un rol vigente;
  - el aviso de Administración General (`fueraDeVigencia`).
  
  Las sesiones abiertas antes del vencimiento siguen activas hasta que expiren, porque `verifyJWT` no revisa la licencia.
- Las firmas conservan los campos de texto y no se modificó el código de generación de reportes en esta etapa.

## Verificación

- Pasaron `node --check`, las 14 pruebas de `npm test`, `prisma validate`, `prisma generate` y `vite build`. Vite mantuvo el aviso de archivos mayores a 500 kB. `prisma migrate deploy` confirmó las siete migraciones aplicadas.
- La API excluyó del menú un rol que venció ayer e impidió acceder a la aplicación a una persona que solo tenía roles vencidos. Un rol que inicia y termina hoy sí dio acceso.
- Con dos cupos y dos personas contabilizadas, crear una persona, reactivarla y asignarle el primer rol vigente devolvieron 409. Con límite nulo se verificaron las tres operaciones. Una licencia marcada con `N` y fecha vencida mostró su estado en la API y permitió el inicio de sesión y la consulta de sesión.
- Registrar un cargo para el 29 de febrero cerró el anterior el 28 de febrero. Se comprobaron la corrección válida, el rechazo de solapamientos, el cargo vigente en el buscador, la lectura de un registro con solo texto, el rechazo de la autoasignación y del ciclo directo, y el texto editable que leen las firmas.
