ALTER TABLE `seguridad_entidad`
    DROP FOREIGN KEY `seguridad_entidad_seguridad_viceministerio_FK`,
    ADD CONSTRAINT `seguridad_entidad_riesgos_viceministerio_FK`
        FOREIGN KEY (`CODIGO_CIA`, `CODIGO_VICEMINISTERIO`)
        REFERENCES `riesgos_viceministerio` (`CODIGO_CIA`, `CODIGO_VICEMINISTERIO`)
        ON DELETE RESTRICT ON UPDATE CASCADE;
