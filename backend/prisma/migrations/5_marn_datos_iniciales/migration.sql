START TRANSACTION;

UPDATE `riesgos_frecuencia` AS frecuencia
JOIN (
    SELECT 'semanal' AS descripcion, 52 AS cortes
    UNION ALL SELECT 'quincenal', 24
    UNION ALL SELECT 'mensual', 12
    UNION ALL SELECT 'bimestral', 6
    UNION ALL SELECT 'trimestral', 4
    UNION ALL SELECT 'cuatrimestral', 3
    UNION ALL SELECT 'semestral', 2
    UNION ALL SELECT 'anual', 1
    UNION ALL SELECT 'cuando se necesite', NULL
) AS calendario ON LOWER(TRIM(frecuencia.`DESCRIPCION`)) = calendario.descripcion
SET frecuencia.`CORTES_ANIO` = calendario.cortes
WHERE NOT (frecuencia.`CORTES_ANIO` <=> calendario.cortes);

INSERT INTO `seguridad_menu_urls` (`CODIGO_APLICACION`, `CODIGO_URL`, `NOMBRE`, `URL`)
SELECT 1, existente.ultimo_codigo + ROW_NUMBER() OVER (ORDER BY nueva.orden), nueva.nombre, nueva.url
FROM (
    SELECT 1 AS orden, 'Mis planes' AS nombre, '/mis-planes' AS url
    UNION ALL SELECT 2, 'Verificación de actividades', '/verificacion-actividades'
    UNION ALL SELECT 3, 'Planes por viceministerio', '/planes-viceministerio'
    UNION ALL SELECT 4, 'Autorizaciones de eliminación', '/autorizaciones-eliminacion'
    UNION ALL SELECT 5, 'Reasignar', '/reasignar'
    UNION ALL SELECT 6, 'Ejes estratégicos', '/ejes-estrategicos'
    UNION ALL SELECT 7, 'Glosario', '/glosario'
    UNION ALL SELECT 8, 'Eliminar riesgos sin autorización', '/permiso/eliminar-sin-autorizacion'
) AS nueva
CROSS JOIN (
    SELECT COALESCE(MAX(`CODIGO_URL`), 0) AS ultimo_codigo
    FROM `seguridad_menu_urls`
    WHERE `CODIGO_APLICACION` = 1
) AS existente
WHERE EXISTS (SELECT 1 FROM `seguridad_aplicacion` WHERE `CODIGO_APLICACION` = 1)
  AND NOT EXISTS (
      SELECT 1 FROM `seguridad_menu_urls` AS registrada
      WHERE registrada.`CODIGO_APLICACION` = 1 AND registrada.`URL` = nueva.url
  );

COMMIT;
