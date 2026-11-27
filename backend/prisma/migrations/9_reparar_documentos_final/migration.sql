-- Repara documentos dañados por un bug de actualizarFinalDocumento (Controller/riesgos/cargaArchivos.js):
-- pasaba los parámetros invertidos y guardaba el código del usuario en FINAL y el valor de FINAL (0/1)
-- en USUARIO_MODIFICACION. Esos documentos no contaban como finales (el consolidado filtra FINAL = 1).
--
-- Solo se tocan las filas donde el error es inequívoco: FINAL fuera de 0/1 y USUARIO_MODIFICACION en 0/1.
-- Se intercambian los dos valores; los triggers de bitácora registran el cambio. Es idempotente.
-- Se usa un self-join porque MariaDB evalúa las asignaciones de un UPDATE de izquierda a derecha.
START TRANSACTION;

UPDATE `riesgos_documentos` AS d
JOIN (
    SELECT `CODIGO_CIA`, `CODIGO_ENTIDAD`, `CODIGO_DOCUMENTO`,
           `FINAL` AS usuario_real, `USUARIO_MODIFICACION` AS final_real
    FROM `riesgos_documentos`
    WHERE `FINAL` NOT IN (0, 1) AND `USUARIO_MODIFICACION` IN (0, 1)
) AS danado
    ON danado.`CODIGO_CIA` = d.`CODIGO_CIA`
   AND danado.`CODIGO_ENTIDAD` = d.`CODIGO_ENTIDAD`
   AND danado.`CODIGO_DOCUMENTO` = d.`CODIGO_DOCUMENTO`
SET d.`FINAL` = danado.final_real,
    d.`USUARIO_MODIFICACION` = danado.usuario_real;

COMMIT;
