-- Conserva la eliminación directa de riesgos en las instituciones existentes.
-- Desde la etapa 06, eliminar sin autorización exige la URL técnica `/permiso/eliminar-sin-autorizacion`.
-- Antes bastaba con la URL de la lista (`/evaluacion-gestion-riesgos`), así que se asigna el permiso
-- a todos los roles que ya la tienen. Las instituciones que se den de alta después (MARN) no lo reciben
-- y usan el flujo de autorización, salvo que un administrador lo asigne.
START TRANSACTION;

INSERT INTO `seguridad_menu_rol_url` (`CODIGO_APLICACION`, `CODIGO_CIA`, `CODIGO_ROL`, `CODIGO_URL`)
SELECT DISTINCT rol_url.`CODIGO_APLICACION`, rol_url.`CODIGO_CIA`, rol_url.`CODIGO_ROL`, permiso.`CODIGO_URL`
FROM `seguridad_menu_rol_url` AS rol_url
JOIN `seguridad_menu_urls` AS lista
    ON lista.`CODIGO_APLICACION` = rol_url.`CODIGO_APLICACION`
   AND lista.`CODIGO_URL` = rol_url.`CODIGO_URL`
   AND lista.`URL` = '/evaluacion-gestion-riesgos'
JOIN `seguridad_menu_urls` AS permiso
    ON permiso.`CODIGO_APLICACION` = rol_url.`CODIGO_APLICACION`
   AND permiso.`URL` = '/permiso/eliminar-sin-autorizacion'
WHERE rol_url.`CODIGO_APLICACION` = 1
  AND NOT EXISTS (
      SELECT 1 FROM `seguridad_menu_rol_url` AS asignada
      WHERE asignada.`CODIGO_APLICACION` = rol_url.`CODIGO_APLICACION`
        AND asignada.`CODIGO_CIA` = rol_url.`CODIGO_CIA`
        AND asignada.`CODIGO_ROL` = rol_url.`CODIGO_ROL`
        AND asignada.`CODIGO_URL` = permiso.`CODIGO_URL`
  );

COMMIT;
